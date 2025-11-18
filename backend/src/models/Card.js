const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  deck: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
  front: { type: String, required: true },
  back: { type: String, required: true },
  tags: [String],
  // Media files
  frontMedia: [{
    type: { type: String, enum: ['image', 'audio', 'video'] },
    url: String,
    filename: String
  }],
  backMedia: [{
    type: { type: String, enum: ['image', 'audio', 'video'] },
    url: String,
    filename: String
  }],
  // Tree-generated card flag
  isTreeGenerated: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  // SRS fields
  interval: { type: Number, default: 0 }, // days
  ef: { type: Number, default: 2.5 }, // ease factor
  repetitions: { type: Number, default: 0 },
  dueDate: { type: Date, default: Date.now }
});

// Indexes for review queries
cardSchema.index({ deck: 1, dueDate: 1 });
cardSchema.index({ item: 1 });

module.exports = mongoose.model('Card', cardSchema);

