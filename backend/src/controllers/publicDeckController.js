const Deck = require('../models/Deck');
const Item = require('../models/Item');
const { buildTree } = require('../utils/tree');

/**
 * Get public deck by publicId (no authentication required)
 */
const getPublicDeck = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (!publicId || publicId.length !== 6) {
      return res.status(400).json({ error: 'Invalid publicId format' });
    }

    // Find deck by publicId (case-insensitive) and isPublic = true
    // Use regex for case-insensitive match
    const deck = await Deck.findOne({ 
      publicId: { $regex: new RegExp(`^${publicId}$`, 'i') },
      isPublic: true 
    });

    if (!deck) {
      // Try to find deck with this publicId (even if not public) for better error message
      const deckWithId = await Deck.findOne({ 
        publicId: { $regex: new RegExp(`^${publicId}$`, 'i') }
      });
      
      if (deckWithId) {
        return res.status(403).json({ 
          error: 'This deck exists but is not set to public. Please make it public first.' 
        });
      }
      
      return res.status(404).json({ error: 'Public deck not found' });
    }

    // Get all items for this deck and build tree
    const items = await Item.find({ deck: deck._id });
    const tree = buildTree(items);

    // Return deck info without sensitive data
    res.json({
      _id: deck._id,
      title: deck.title,
      publicId: deck.publicId,
      createdAt: deck.createdAt,
      items: tree
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getPublicDeck
};

