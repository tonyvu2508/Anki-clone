require('dotenv').config();
const mongoose = require('mongoose');
const Deck = require('../src/models/Deck');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/anki_clone';

async function fixPublicDeck(publicId) {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const deck = await Deck.findOne({ publicId });
    
    if (!deck) {
      console.log(`❌ No deck found with publicId: ${publicId}`);
      process.exit(1);
      return;
    }

    console.log(`Found deck: ${deck.title}`);
    console.log(`Current isPublic: ${deck.isPublic}`);

    if (!deck.isPublic) {
      deck.isPublic = true;
      await deck.save();
      console.log(`✅ Fixed! Deck is now public.`);
      console.log(`   Access at: http://localhost:3000/public/${publicId}`);
    } else {
      console.log(`✅ Deck is already public.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const publicId = process.argv[2];
if (!publicId) {
  console.log('Usage: node scripts/fixPublicDeck.js <publicId>');
  console.log('Example: node scripts/fixPublicDeck.js 9ZGK1X');
  process.exit(1);
}

fixPublicDeck(publicId);

