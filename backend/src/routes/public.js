const express = require('express');
const router = express.Router();
const { getPublicDeck } = require('../controllers/publicDeckController');

// Public routes (no authentication required)
router.get('/decks/:publicId', getPublicDeck);

module.exports = router;

