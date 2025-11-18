const mongoose = require('mongoose');

const deckSchema = new mongoose.Schema({
  title: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publicId: { type: String, unique: true, sparse: true }, // 6-character unique ID
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Index for publicId lookup
deckSchema.index({ publicId: 1 });

module.exports = mongoose.model('Deck', deckSchema);

