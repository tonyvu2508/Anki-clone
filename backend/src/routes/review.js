const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getTodayCards,
  getItemTreeCards,
  submitReviewResult
} = require('../controllers/reviewController');

router.use(authMiddleware);

router.get('/today', getTodayCards);
router.get('/item/:itemId/tree', getItemTreeCards); // New endpoint for tree review mode
router.post('/:cardId/result', submitReviewResult);

module.exports = router;

