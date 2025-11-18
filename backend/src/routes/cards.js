const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getCards,
  createCard,
  getCard,
  updateCard,
  deleteCard,
  getDeckCards
} = require('../controllers/cardController');

router.use(authMiddleware);

// Item-specific routes (must come before /:id routes)
router.get('/items/:itemId/cards', getCards);
router.post('/items/:itemId/cards', createCard);
router.get('/decks/:deckId/cards', getDeckCards);

// Card routes
router.get('/cards/:id', getCard);
router.put('/cards/:id', updateCard);
router.delete('/cards/:id', deleteCard);

module.exports = router;

