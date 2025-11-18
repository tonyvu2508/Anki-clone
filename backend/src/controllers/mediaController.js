const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

// Configure multer for media upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.userId;
    const mediaDir = path.join(__dirname, '../../media', userId.toString());
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }
    cb(null, mediaDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    const mimeType = mime.lookup(file.originalname);
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
      'video/mp4', 'video/webm', 'video/ogg'
    ];
    
    if (allowedTypes.includes(mimeType)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, audio, and video are allowed'));
    }
  }
});

/**
 * Upload media file
 */
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/api/media/${req.userId}/${req.file.filename}`;
    const mimeType = mime.lookup(req.file.filename);
    
    // Determine media type
    let mediaType = 'image';
    if (mimeType.startsWith('audio/')) {
      mediaType = 'audio';
    } else if (mimeType.startsWith('video/')) {
      mediaType = 'video';
    }

    res.json({
      url: fileUrl,
      filename: req.file.filename,
      type: mediaType,
      size: req.file.size
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  uploadMedia,
  upload: upload.single('mediaFile')
};

