const Card = require('../models/Card');
const Item = require('../models/Item');
const Deck = require('../models/Deck');
const { isLeafItem } = require('../utils/tree');

const getCards = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    const item = await Item.findOne({ _id: itemId, owner: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get cards for this item (both regular and tree-generated)
    const cards = await Card.find({ item: itemId });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCard = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { front, back, tags, frontMedia, backMedia, isTreeGenerated } = req.body;

    if (!front || !back) {
      return res.status(400).json({ error: 'Front and back are required' });
    }

    const item = await Item.findOne({ _id: itemId, owner: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Verify deck ownership
    const deck = await Deck.findOne({ _id: item.deck, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Check if item is a leaf (only for manually created cards)
    // Tree-generated cards can be on non-leaf items
    const allItems = await Item.find({ deck: item.deck });
    const isTreeGeneratedFlag = isTreeGenerated === true;
    
    if (!isTreeGeneratedFlag && !isLeafItem(itemId, allItems)) {
      return res.status(400).json({ error: 'Regular cards can only be attached to leaf items. Use tree card generation for items with children.' });
    }

    const card = new Card({
      item: itemId,
      deck: item.deck,
      front,
      back,
      tags: tags || [],
      frontMedia: frontMedia || [],
      backMedia: backMedia || [],
      isTreeGenerated: isTreeGeneratedFlag || false
    });

    await card.save();
    res.status(201).json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id).populate('item');
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Verify ownership through item
    const item = await Item.findOne({ _id: card.item._id, owner: req.userId });
    if (!item) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCard = async (req, res) => {
  try {
    const { front, back, tags, frontMedia, backMedia } = req.body;
    const card = await Card.findById(req.params.id).populate('item');
    
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Verify ownership
    const item = await Item.findOne({ _id: card.item._id, owner: req.userId });
    if (!item) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (front) card.front = front;
    if (back) card.back = back;
    if (tags !== undefined) card.tags = tags;
    if (frontMedia !== undefined) card.frontMedia = frontMedia;
    if (backMedia !== undefined) card.backMedia = backMedia;

    await card.save();
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteCard = async (req, res) => {
  try {
    const card = await Card.findById(req.params.id).populate('item');
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Verify ownership
    const item = await Item.findOne({ _id: card.item._id, owner: req.userId });
    if (!item) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await Card.deleteOne({ _id: card._id });
    res.json({ message: 'Card deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDeckCards = async (req, res) => {
  try {
    const { deckId } = req.params;
    
    const deck = await Deck.findOne({ _id: deckId, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const cards = await Card.find({ deck: deckId });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getCards,
  createCard,
  getCard,
  updateCard,
  deleteCard,
  getDeckCards
};

