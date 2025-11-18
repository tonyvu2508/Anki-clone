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
    }

    // Create cards
    if (deckData.cards && Array.isArray(deckData.cards)) {
      const cardsToCreate = [];
      
      for (const cardData of deckData.cards) {
        // Find item by old itemId (from export) or by title (fallback)
        let itemId = null;
        
        if (cardData.itemId && oldIdToNewIdMap.has(cardData.itemId)) {
          itemId = oldIdToNewIdMap.get(cardData.itemId);
        } else if (cardData.itemTitle) {
          // Fallback: find by title
          const item = itemsToCreate.find(it => it.item.title === cardData.itemTitle);
          if (item) {
            itemId = item.item._id;
          }
        }
        
        if (itemId) {
          const newCard = new Card({
            item: itemId,
            deck: newDeck._id,
            front: cardData.front,
            back: cardData.back,
            tags: cardData.tags || [],
            // SRS fields will use defaults
          });
          cardsToCreate.push(newCard);
        }
      }

      if (cardsToCreate.length > 0) {
        await Card.insertMany(cardsToCreate);
      }
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

