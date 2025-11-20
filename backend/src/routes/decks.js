const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getDecks,
  createDeck,
  getDeck,
  updateDeck,
  deleteDeck,
  togglePublicDeck,
  uploadDeckAudio,
  deleteDeckAudio,
  streamDeckAudio,
  deckAudioUpload
} = require('../controllers/deckController');
const {
  exportDeck,
  importDeck
} = require('../controllers/deckImportExportController');
const { generateTreeCards } = require('../controllers/treeCardController');

router.use(authMiddleware);

// Debug middleware to log all requests
router.use((req, res, next) => {
  if (req.path.includes('generate-tree-cards')) {
    console.log('DEBUG: Request to generate-tree-cards, method:', req.method, 'path:', req.path, 'params:', req.params);
  }
  next();
});

router.get('/', getDecks);
router.post('/', createDeck);
router.post('/import', importDeck);
// Specific routes must come before /:id routes
router.get('/:id/export', exportDeck);
router.post('/:id/toggle-public', togglePublicDeck);
router.post('/:id/audio', deckAudioUpload, uploadDeckAudio);
router.delete('/:id/audio', deleteDeckAudio);
router.get('/:id/audio/stream', streamDeckAudio);
// Generate tree cards route - must be before generic /:id
router.post('/:id/generate-tree-cards', generateTreeCards);
// Generic routes
router.get('/:id', getDeck);
router.put('/:id', updateDeck);
router.delete('/:id', deleteDeck);

module.exports = router;

