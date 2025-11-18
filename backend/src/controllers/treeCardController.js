const Card = require('../models/Card');
const Item = require('../models/Item');
const Deck = require('../models/Deck');
const { isLeafItem, getDescendantIds } = require('../utils/tree');

/**
 * Auto-generate cards from tree structure
 * For each item with children, create a card:
 * - Front: item title
 * - Back: children titles (comma-separated or newline-separated)
 */
const generateTreeCards = async (req, res) => {
  try {
    const deckId = req.params.id; // Route uses :id, not :deckId
    const { itemId, separator = '\n' } = req.body; // separator: '\n' for newline, ', ' for comma

    console.log('generateTreeCards called with deckId:', deckId, 'userId:', req.userId);

    // Verify deck ownership
    const deck = await Deck.findOne({ _id: deckId, owner: req.userId });
    if (!deck) {
      console.log('Deck not found. deckId:', deckId, 'userId:', req.userId);
      // Try to find deck without owner check for debugging
      const deckWithoutOwner = await Deck.findById(deckId);
      console.log('Deck exists without owner check:', !!deckWithoutOwner);
      if (deckWithoutOwner) {
        console.log('Deck owner:', deckWithoutOwner.owner, 'Request userId:', req.userId);
      }
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Get all items in deck
    const allItems = await Item.find({ deck: deckId, owner: req.userId }).sort({ level: 1, order: 1 });

    let itemsToProcess = [];
    
    if (itemId) {
      // Process specific item and its descendants
      const item = allItems.find(i => i._id.toString() === itemId);
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      const descendantIds = getDescendantIds(itemId, allItems);
      itemsToProcess = [item, ...allItems.filter(i => descendantIds.includes(i._id.toString()))];
    } else {
      // Process all items in deck
      itemsToProcess = allItems;
    }

    const cardsCreated = [];
    const cardsSkipped = [];

    for (const item of itemsToProcess) {
      // Only create cards for items that have children
      const children = allItems.filter(i => 
        i.parent && i.parent.toString() === item._id.toString()
      );

      if (children.length === 0) {
        // Skip leaf items (they should have regular cards)
        continue;
      }

      // Check if card already exists for this item
      const existingCard = await Card.findOne({ 
        item: item._id,
        deck: deckId,
        front: item.title
      });

      if (existingCard) {
        cardsSkipped.push({
          item: item.title,
          reason: 'Card already exists'
        });
        continue;
      }

      // Create back content from children titles
      // Each child on a new line with bullet point (use \r\n for Windows compatibility)
      const backContent = children.map(child => `• ${child.title}`).join('\r\n');

      // Create card directly (tree-generated cards can be on non-leaf items)
      const card = new Card({
        item: item._id,
        deck: deckId,
        front: item.title,
        back: backContent,
        tags: [],
        frontMedia: [],
        backMedia: [],
        isTreeGenerated: true
      });

      await card.save();
      cardsCreated.push({
        item: item.title,
        front: item.title,
        back: backContent,
        childrenCount: children.length
      });
    }

    res.json({
      message: `Generated ${cardsCreated.length} cards from tree structure`,
      cardsCreated,
      cardsSkipped,
      total: cardsCreated.length + cardsSkipped.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Generate cards for a specific item
 */
const generateItemCard = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { separator = '\n', overwrite = false } = req.body;

    // Verify item ownership
    const item = await Item.findOne({ _id: itemId, owner: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get all items in deck to find children
    const allItems = await Item.find({ deck: item.deck, owner: req.userId });
    
    // Get children
    const children = allItems.filter(i => 
      i.parent && i.parent.toString() === itemId
    );

    if (children.length === 0) {
      return res.status(400).json({ error: 'Item has no children. Cards can only be generated for items with children.' });
    }

    // Check if card already exists
    const existingCard = await Card.findOne({ 
      item: item._id,
      front: item.title
    });

    if (existingCard && !overwrite) {
      return res.status(400).json({ 
        error: 'Card already exists for this item',
        existingCard: existingCard._id
      });
    }

    // Create back content from children titles
    // Each child on a new line with bullet point (use \r\n for Windows compatibility)
    const backContent = children.map(child => `• ${child.title}`).join('\r\n');

    let card;
    if (existingCard && overwrite) {
      // Update existing card
      existingCard.back = backContent;
      existingCard.isTreeGenerated = true;
      await existingCard.save();
      card = existingCard;
    } else {
      // Create new card (tree-generated cards can be on non-leaf items)
      card = new Card({
        item: item._id,
        deck: item.deck,
        front: item.title,
        back: backContent,
        tags: [],
        frontMedia: [],
        backMedia: [],
        isTreeGenerated: true
      });
      await card.save();
    }

    res.json({
      message: overwrite ? 'Card updated' : 'Card created',
      card: {
        _id: card._id,
        front: card.front,
        back: card.back,
        item: item.title,
        children: children.map(c => c.title)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  generateTreeCards,
  generateItemCard
};

