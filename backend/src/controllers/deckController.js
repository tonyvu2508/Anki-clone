const Deck = require('../models/Deck');
const Item = require('../models/Item');
const { buildTree } = require('../utils/tree');
const { generateUniquePublicId } = require('../utils/idGenerator');

const getDecks = async (req, res) => {
  try {
    const decks = await Deck.find({ owner: req.userId }).sort({ createdAt: -1 });
    res.json(decks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createDeck = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const deck = new Deck({ title, owner: req.userId });
    await deck.save();
    res.status(201).json(deck);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getDeck = async (req, res) => {
  try {
    const deck = await Deck.findOne({ _id: req.params.id, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Get all items for this deck and build tree
    const items = await Item.find({ deck: deck._id });
    const tree = buildTree(items);

    res.json({ ...deck.toObject(), items: tree });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateDeck = async (req, res) => {
  try {
    const { title, isPublic } = req.body;
    
    const deck = await Deck.findOne({ _id: req.params.id, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Update title if provided
    if (title !== undefined) {
      deck.title = title;
    }

    // Handle public status
    if (isPublic !== undefined) {
      deck.isPublic = isPublic;

      // If making deck public and no publicId exists, generate one
      if (isPublic === true && !deck.publicId) {
        deck.publicId = await generateUniquePublicId(async (id) => {
          const exists = await Deck.findOne({ publicId: id });
          return !!exists;
        });
      }

      // If making deck private, remove publicId
      if (isPublic === false) {
        deck.publicId = null;
      }
    }

    await deck.save();

    res.json(deck);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const togglePublicDeck = async (req, res) => {
  try {
    const deck = await Deck.findOne({ _id: req.params.id, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Toggle public status
    deck.isPublic = !deck.isPublic;

    // If making public and no publicId, generate one
    if (deck.isPublic && !deck.publicId) {
      deck.publicId = await generateUniquePublicId(async (id) => {
        const exists = await Deck.findOne({ publicId: id });
        return !!exists;
      });
    }

    // If making private, remove publicId
    if (!deck.isPublic) {
      deck.publicId = null;
    }

    await deck.save();
    res.json(deck);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDeck = async (req, res) => {
  try {
    const deck = await Deck.findOneAndDelete({ _id: req.params.id, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Cascade delete: delete all items and cards
    await Item.deleteMany({ deck: deck._id });
    const Card = require('../models/Card');
    await Card.deleteMany({ deck: deck._id });

    res.json({ message: 'Deck deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getDecks,
  createDeck,
  getDeck,
  updateDeck,
  deleteDeck,
  togglePublicDeck
};

