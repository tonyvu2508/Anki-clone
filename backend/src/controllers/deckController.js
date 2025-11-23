const Deck = require('../models/Deck');
const Item = require('../models/Item');
const { buildTree } = require('../utils/tree');
const { generateUniquePublicId } = require('../utils/idGenerator');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mime = require('mime-types');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const deckAudioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.userId;
    const deckId = req.params.id || 'unknown';
    const audioDir = path.join(__dirname, '../../media/deck-audio', userId.toString(), deckId.toString());
    ensureDir(audioDir);
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || mime.extension(file.mimetype) || '.mp3';
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const decodeFilename = (name) => {
  if (!name) return '';
  try {
    // Multer stores originalname as latin1 by default; convert to utf8
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch (err) {
    return name;
  }
};

const deckAudioUpload = multer({
  storage: deckAudioStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
  fileFilter: (req, file, cb) => {
    const mimeType = mime.lookup(file.originalname) || file.mimetype;
    if (mimeType && mimeType.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
}).single('audioFile');

const removeDeckAudioFile = (deck, userId, storedFilename) => {
  if (!storedFilename) return;
  const audioPath = path.join(
    __dirname,
    '../../media/deck-audio',
    userId.toString(),
    deck._id.toString(),
    storedFilename
  );
  if (fs.existsSync(audioPath)) {
    fs.unlinkSync(audioPath);
  }
};

const buildContentDisposition = (filename) => {
  if (!filename) {
    return 'inline';
  }
  const fallback = filename.replace(/[^\x20-\x7E]/g, '_') || 'deck-audio';
  const encoded = encodeURIComponent(filename);
  return `inline; filename="${fallback}"; filename*=UTF-8''${encoded}`;
};

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

    // Migrate old audio format to audios array
    if (deck.audio && (!deck.audios || deck.audios.length === 0)) {
      deck.audios = [deck.audio];
      deck.audio = undefined;
      deck.markModified('audios');
      await deck.save();
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
    const { title, isPublic, note } = req.body;
    
    const deck = await Deck.findOne({ _id: req.params.id, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Update title if provided
    if (title !== undefined) {
      deck.title = title;
    }

    // Update note if provided
    if (note !== undefined) {
      deck.note = note;
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

const uploadDeckAudio = async (req, res) => {
  try {
    const deck = await Deck.findOne({ _id: req.params.id, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const originalName = decodeFilename(req.file.originalname);

    const relativePath = path
      .join('deck-audio', req.userId.toString(), deck._id.toString(), req.file.filename)
      .replace(/\\/g, '/');
    const fileUrl = `/api/media/${relativePath}`;

    const newAudio = {
      url: fileUrl,
      filename: originalName,
      storedFilename: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype || mime.lookup(req.file.originalname) || 'audio/mpeg',
      uploadedAt: new Date()
    };

    if (!deck.audios) {
      deck.audios = [];
    }
    deck.audios.push(newAudio);
    await deck.save();

    res.json(deck);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteDeckAudio = async (req, res) => {
  try {
    const deck = await Deck.findOne({ _id: req.params.id, owner: req.userId });
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const audioId = req.params.audioId;
    if (!audioId) {
      return res.status(400).json({ error: 'Audio ID is required' });
    }

    if (!deck.audios || deck.audios.length === 0) {
      return res.status(404).json({ error: 'No audios found' });
    }

    const audioIndex = deck.audios.findIndex(a => a._id.toString() === audioId);
    if (audioIndex === -1) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    const audio = deck.audios[audioIndex];
    removeDeckAudioFile(deck, req.userId, audio.storedFilename);
    deck.audios.splice(audioIndex, 1);
    await deck.save();

    res.json({ message: 'Deck audio removed', deck });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const streamDeckAudio = async (req, res) => {
  try {
    const deck = await Deck.findById(req.params.id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    if (deck.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to access this deck' });
    }

    const audioId = req.params.audioId;
    if (!audioId) {
      return res.status(400).json({ error: 'Audio ID is required' });
    }

    if (!deck.audios || deck.audios.length === 0) {
      return res.status(404).json({ error: 'No audios found' });
    }

    const audio = deck.audios.find(a => a._id.toString() === audioId);
    if (!audio || !audio.storedFilename) {
      return res.status(404).json({ error: 'Audio not found' });
    }

    const audioPath = path.join(
      __dirname,
      '../../media/deck-audio',
      deck.owner.toString(),
      deck._id.toString(),
      audio.storedFilename
    );

    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ error: 'Audio file missing' });
    }

    const stat = fs.statSync(audioPath);
    const fileSize = stat.size;
    const mimeType = audio.mimeType || mime.lookup(audio.filename) || 'audio/mpeg';
    const range = req.headers.range;

    if (!range) {
      // No range header - return full file with 200 OK
      const file = fs.createReadStream(audioPath);
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': buildContentDisposition(audio.filename),
        'Cache-Control': 'no-cache',
      });
      file.on('open', () => file.pipe(res));
      file.on('error', (err) => {
        console.error('Stream error:', err);
        res.status(500).end();
      });
      return;
    }

    // Handle range request
    const parts = range.replace(/bytes=/, '').split('-');
    let start = parseInt(parts[0], 10);
    let end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    start = isNaN(start) ? 0 : start;
    end = isNaN(end) ? fileSize - 1 : Math.min(end, fileSize - 1);

    if (start >= fileSize || end >= fileSize || start > end) {
      return res.status(416).json({ error: 'Requested range not satisfiable' });
    }

    const chunkSize = (end - start) + 1;
    const file = fs.createReadStream(audioPath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
      'Content-Disposition': buildContentDisposition(audio.filename),
      'Cache-Control': 'no-cache',
    });

    file.on('open', () => file.pipe(res));
    file.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(500).end();
    });
  } catch (error) {
    console.error('Error streaming deck audio:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
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
};

