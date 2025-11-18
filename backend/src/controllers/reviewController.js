const Card = require('../models/Card');
const Deck = require('../models/Deck');
const Item = require('../models/Item');
const { updateSRS } = require('../services/srs');

const getTimezoneAdjustedNow = (offsetHours = 7) => {
  const now = new Date();
  return new Date(now.getTime() + offsetHours * 60 * 60 * 1000);
};

const getTodayCards = async (req, res) => {
  try {
    const { deckId, itemId, includeAll } = req.query;
    const now = getTimezoneAdjustedNow();

    let query = {};
    
    // If includeAll is true, get all cards regardless of due date
    if (includeAll !== 'true') {
      query.dueDate = { $lte: now };
    }

    if (deckId) {
      // Verify deck ownership
      const deck = await Deck.findOne({ _id: deckId, owner: req.userId });
      if (!deck) {
        return res.status(404).json({ error: 'Deck not found' });
      }
      query.deck = deckId;
    }

    if (itemId) {
      // Verify item ownership and get all descendant items
      const item = await Item.findOne({ _id: itemId, owner: req.userId });
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // Get all items in the subtree (item + descendants)
      const allItems = await Item.find({ deck: item.deck });
      const { getDescendantIds } = require('../utils/tree');
      const descendantIds = getDescendantIds(itemId, allItems);
      const itemIds = [item._id, ...descendantIds];
      
      query.item = { $in: itemIds };
    }

    const cards = await Card.find(query).populate('item');
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get cards for item tree review mode
 * Returns cards from the item and all its descendants
 */
const getItemTreeCards = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { includeAll } = req.query;

    // Verify item ownership
    const item = await Item.findOne({ _id: itemId, owner: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get all items in the subtree (item + descendants)
    const allItems = await Item.find({ deck: item.deck });
    const { getDescendantIds, getItemPath } = require('../utils/tree');
    const descendantIds = getDescendantIds(itemId, allItems);
    const itemIds = [item._id, ...descendantIds];

    // Build query
    let query = { item: { $in: itemIds } };
    
    // If includeAll is not true, only get cards due today
    if (includeAll !== 'true') {
      const now = getTimezoneAdjustedNow();
      query.dueDate = { $lte: now };
    }

    // Get cards with item path information
    const cards = await Card.find(query).populate('item');
    
    // Add item path to each card
    const cardsWithPath = cards.map(card => {
      const itemPath = getItemPath(card.item, allItems);
      return {
        ...card.toObject(),
        itemPath: itemPath.map(i => ({ _id: i._id, title: i.title, level: i.level }))
      };
    });

    // Get item info with path
    const itemPath = getItemPath(item, allItems);

    res.json({
      item: {
        ...item.toObject(),
        path: itemPath.map(i => ({ _id: i._id, title: i.title, level: i.level }))
      },
      cards: cardsWithPath,
      totalCards: cardsWithPath.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const submitReviewResult = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { quality } = req.body;

    if (quality === undefined || quality < 0 || quality > 3) {
      return res.status(400).json({ error: 'Quality must be 0, 1, 2, or 3' });
    }

    const card = await Card.findById(cardId).populate('item');
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Verify ownership
    const item = await Item.findOne({ _id: card.item._id, owner: req.userId });
    if (!item) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update SRS fields
    const updatedFields = updateSRS(card, quality);
    Object.assign(card, updatedFields);
    await card.save();

    res.json({
      card,
      nextDueDate: card.dueDate,
      interval: card.interval,
      easeFactor: card.ef
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getTodayCards,
  getItemTreeCards,
  submitReviewResult
};

