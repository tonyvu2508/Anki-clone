const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { uploadMedia, upload } = require('../controllers/mediaController');

router.use(authMiddleware);

router.post('/upload', upload, uploadMedia);

module.exports = router;

