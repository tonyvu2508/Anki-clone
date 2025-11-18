const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getItems,
  createItem,
  getItem,
  updateItem,
  deleteItem,
  getItemPath
} = require('../controllers/itemController');
const { generateItemCard } = require('../controllers/treeCardController');

router.use(authMiddleware);

// Deck-specific routes (must come before /:id routes)
router.get('/decks/:deckId/items', getItems);
router.post('/decks/:deckId/items', createItem);

// Item routes
router.get('/items/:id', getItem);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);
router.get('/items/:id/path', getItemPath);
router.post('/items/:id/generate-card', generateItemCard); // Auto-generate card from tree

module.exports = router;

