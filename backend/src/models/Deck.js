const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
  title: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publicId: { type: String, unique: true, sparse: true }, // 6-character unique ID
  isPublic: { type: Boolean, default: false },
  audios: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    url: { type: String },
    filename: { type: String },
    storedFilename: { type: String },
    size: { type: Number },
    mimeType: { type: String },
    uploadedAt: { type: Date }
  }],
  createdAt: { type: Date, default: Date.now }
});

// Index for publicId lookup
deckSchema.index({ publicId: 1 });

module.exports = mongoose.model('Deck', deckSchema);

