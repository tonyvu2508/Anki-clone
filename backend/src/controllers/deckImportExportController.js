const Deck = require('../models/Deck');
const Item = require('../models/Item');
const Card = require('../models/Card');
const { buildTree } = require('../utils/tree');

/**
 * Export deck with all items and cards to JSON
 */
const exportDeck = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get deck
    const deck = await Deck.findOne({ _id: id, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Get all items
    const items = await Item.find({ deck: deck._id });
    
    // Get all cards
    const cards = await Card.find({ deck: deck._id });

    // Build export data
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      deck: {
        title: deck.title,
        // Don't export sensitive data like owner, publicId, etc.
      },
      items: items.map(item => ({
        title: item.title,
        parentId: item.parent ? item.parent.toString() : null,
        order: item.order,
        level: item.level,
        _id: item._id.toString(), // Include ID for better parent matching
      })),
      cards: cards.map(card => {
        const item = items.find(i => i._id.toString() === card.item.toString());
        return {
          itemId: card.item.toString(),
          itemTitle: item?.title || null,
          front: card.front,
          back: card.back,
          tags: card.tags || [],
          // Don't export SRS data for import (will reset)
        };
      }),
    };

    const sanitizeFilename = (title) => {
      if (!title) return 'deck';
      const sanitized = title
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_\-]/gi, '');
      return sanitized.length > 0 ? sanitized : 'deck';
    };

    const filename = `${sanitizeFilename(deck.title)}.json`;

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Import deck from JSON
 */
const importDeck = async (req, res) => {
  try {
    const { deckData } = req.body;

    if (!deckData || !deckData.deck || !deckData.deck.title) {
      return res.status(400).json({ error: 'Invalid deck data. Missing deck title.' });
    }

    // Create new deck
    const newDeck = new Deck({
      title: deckData.deck.title,
      owner: req.userId,
    });
    await newDeck.save();

    // Create items - use ID mapping from export
    const oldIdToNewIdMap = new Map(); // Maps old _id -> new _id
    const itemsToCreate = [];

    if (deckData.items && Array.isArray(deckData.items)) {
      // First pass: create all items and save mapping
      for (const itemData of deckData.items) {
        const newItem = new Item({
          title: itemData.title,
          deck: newDeck._id,
          parent: null, // Will update in second pass
          order: itemData.order || 0,
          level: itemData.level || 0,
          owner: req.userId,
        });
        await newItem.save();
        
        // Map old ID to new ID
        if (itemData._id) {
          oldIdToNewIdMap.set(itemData._id, newItem._id);
        }
        
        itemsToCreate.push({ 
          item: newItem, 
          oldParentId: itemData.parentId 
        });
      }

      // Second pass: update parent references using ID mapping
      for (const itemData of itemsToCreate) {
        if (itemData.oldParentId && oldIdToNewIdMap.has(itemData.oldParentId)) {
          const newParentId = oldIdToNewIdMap.get(itemData.oldParentId);
          itemData.item.parent = newParentId;
          await itemData.item.save();
        }
      }
      
      console.log(`✅ Created ${itemsToCreate.length} items, mapped ${oldIdToNewIdMap.size} IDs`);
    }

    // Create cards
    if (deckData.cards && Array.isArray(deckData.cards)) {
      const cardsToCreate = [];
      const skippedCards = [];
      
      // Get all items from database to ensure we have the latest data
      const allItems = await Item.find({ deck: newDeck._id });
      
      // Build a map of new itemId (ObjectId) to item for quick lookup
      const newIdToItemMap = new Map();
      for (const item of allItems) {
        newIdToItemMap.set(item._id.toString(), item);
      }
      
      // Also build a title-to-item map as fallback (handle duplicates by using first match)
      const titleToItemMap = new Map();
      for (const item of allItems) {
        if (!titleToItemMap.has(item.title)) {
          titleToItemMap.set(item.title, item);
        }
      }
      
      console.log(`📋 Processing ${deckData.cards.length} cards, ${oldIdToNewIdMap.size} items mapped`);
      
      for (const cardData of deckData.cards) {
        // Find item by old itemId (from export) or by title (fallback)
        let itemId = null;
        let item = null;
        
        // First try: find by itemId in the oldIdToNewIdMap
        if (cardData.itemId) {
          if (oldIdToNewIdMap.has(cardData.itemId)) {
            itemId = oldIdToNewIdMap.get(cardData.itemId);
            item = newIdToItemMap.get(itemId.toString());
            if (!item) {
              console.warn(`⚠️  Item ID ${itemId} from mapping not found in database for card itemId: ${cardData.itemId}`);
            }
          }
        }
        
        // Fallback: find by title
        if (!item && cardData.itemTitle) {
          item = titleToItemMap.get(cardData.itemTitle);
          if (item) {
            itemId = item._id;
          }
        }
        
        // Last fallback: find in itemsToCreate array (shouldn't be needed but just in case)
        if (!item && cardData.itemTitle) {
          const foundItem = itemsToCreate.find(it => it.item.title === cardData.itemTitle);
          if (foundItem) {
            item = foundItem.item;
            itemId = item._id;
          }
        }
        
        if (itemId && item) {
          const newCard = new Card({
            item: itemId,
            deck: newDeck._id,
            front: cardData.front,
            back: cardData.back,
            tags: cardData.tags || [],
            // SRS fields will use defaults
          });
          cardsToCreate.push(newCard);
        } else {
          skippedCards.push({
            itemId: cardData.itemId,
            itemTitle: cardData.itemTitle,
            front: cardData.front?.substring(0, 50) + '...'
          });
        }
      }

      if (cardsToCreate.length > 0) {
        try {
          await Card.insertMany(cardsToCreate, { ordered: false });
          console.log(`✅ Imported ${cardsToCreate.length} cards for deck ${newDeck._id}`);
        } catch (error) {
          console.error(`❌ Error importing cards:`, error);
          // Try to insert cards one by one to see which ones fail
          let successCount = 0;
          for (const card of cardsToCreate) {
            try {
              await card.save();
              successCount++;
            } catch (err) {
              console.error(`Failed to import card for item ${card.item}:`, err.message);
            }
          }
          console.log(`✅ Imported ${successCount}/${cardsToCreate.length} cards after retry`);
        }
      }
      
      if (skippedCards.length > 0) {
        console.warn(`⚠️ Skipped ${skippedCards.length} cards due to missing items:`, skippedCards);
      }
      
      // Log summary
      const totalCardsInFile = deckData.cards?.length || 0;
      const importedCount = cardsToCreate.length;
      const skippedCount = skippedCards.length;
      console.log(`📊 Import summary: ${importedCount} imported, ${skippedCount} skipped, ${totalCardsInFile} total in file`);
    }

    // Return the new deck with tree structure
    const items = await Item.find({ deck: newDeck._id });
    const tree = buildTree(items);

    res.status(201).json({
      ...newDeck.toObject(),
      items: tree,
      message: 'Deck imported successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  exportDeck,
  importDeck
};

