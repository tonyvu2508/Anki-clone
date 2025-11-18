const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  deck: { type: mongoose.Schema.Types.ObjectId, ref: 'Deck', required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
  order: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for efficient tree queries
itemSchema.index({ deck: 1, parent: 1, order: 1 });
itemSchema.index({ deck: 1, level: 1 });

// Virtual for children count
itemSchema.virtual('childrenCount', {
  ref: 'Item',
  localField: '_id',
  foreignField: 'parent',
  count: true
});

// Update updatedAt before save
itemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Item', itemSchema);

