const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { importApkg } = require('../controllers/apkgImportController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'apkg-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB (Anki decks can be large with media)
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.apkg')) {
      cb(null, true);
    } else {
      cb(new Error('Only .apkg files are allowed'));
    }
  }
});

router.use(authMiddleware);

router.post('/import', upload.single('apkgFile'), importApkg);

module.exports = router;

