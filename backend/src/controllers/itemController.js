const Item = require('../models/Item');
const Deck = require('../models/Deck');
const { buildTree, getItemPath, isLeafItem, getDescendantIds } = require('../utils/tree');

const getItems = async (req, res) => {
  try {
    const { deckId } = req.params;
    const { parentId } = req.query;

    // Verify deck ownership
    const deck = await Deck.findOne({ _id: deckId, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    if (parentId !== undefined) {
      // Get children of specific parent
      const parent = parentId === 'null' ? null : parentId;
      const items = await Item.find({ deck: deckId, parent }).sort({ order: 1 });
      res.json(items);
    } else {
      // Get full tree
      const items = await Item.find({ deck: deckId });
      const tree = buildTree(items);
      res.json(tree);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createItem = async (req, res) => {
  try {
    const { deckId } = req.params;
    const { title, parentId, order } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Verify deck ownership
    const deck = await Deck.findOne({ _id: deckId, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Calculate level
    let level = 0;
    if (parentId) {
      const parent = await Item.findOne({ _id: parentId, deck: deckId });
      if (!parent) {
        return res.status(404).json({ error: 'Parent item not found' });
      }
      level = parent.level + 1;
    }

    const item = new Item({
      title,
      deck: deckId,
      parent: parentId || null,
      order: order || 0,
      level,
      owner: req.userId
    });

    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getItem = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, owner: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get children
    const children = await Item.find({ parent: item._id }).sort({ order: 1 });
    res.json({ ...item.toObject(), children });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const { title, parentId, order } = req.body;
    const item = await Item.findOne({ _id: req.params.id, owner: req.userId });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Prevent moving item to be its own descendant
    if (parentId && parentId !== item.parent?.toString()) {
      const allItems = await Item.find({ deck: item.deck });
      const descendants = getDescendantIds(item._id, allItems);
      if (descendants.some(id => id.toString() === parentId)) {
        return res.status(400).json({ error: 'Cannot move item to its own descendant' });
      }

      // Update level based on new parent
      const newParent = await Item.findById(parentId);
      if (newParent) {
        item.level = newParent.level + 1;
      }
    }

    if (title) item.title = title;
    if (parentId !== undefined) item.parent = parentId || null;
    if (order !== undefined) item.order = order;

    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, owner: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get all descendants for cascade delete
    const allItems = await Item.find({ deck: item.deck });
    const descendantIds = getDescendantIds(item._id, allItems);
    const idsToDelete = [item._id, ...descendantIds];

    // Delete items and their cards
    await Item.deleteMany({ _id: { $in: idsToDelete } });
    const Card = require('../models/Card');
    await Card.deleteMany({ item: { $in: idsToDelete } });

    res.json({ message: 'Item and descendants deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getItemPathRoute = async (req, res) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, owner: req.userId });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const allItems = await Item.find({ deck: item.deck });
    const path = getItemPath(item, allItems);
    res.json(path);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getItems,
  createItem,
  getItem,
  updateItem,
  deleteItem,
  getItemPath: getItemPathRoute
};

