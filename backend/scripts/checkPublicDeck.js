require('dotenv').config();
const mongoose = require('mongoose');
const Deck = require('../src/models/Deck');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/anki_clone';

async function checkPublicDeck(publicId) {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const deck = await Deck.findOne({ publicId });
    
    if (!deck) {
      console.log(`❌ No deck found with publicId: ${publicId}`);
      return;
    }

    console.log(`✅ Deck found:`);
    console.log(`   Title: ${deck.title}`);
    console.log(`   publicId: ${deck.publicId}`);
    console.log(`   isPublic: ${deck.isPublic}`);
    console.log(`   Owner: ${deck.owner}`);

    if (!deck.isPublic) {
      console.log(`\n⚠️  Deck exists but isPublic is false!`);
      console.log(`   To fix: Set isPublic to true in the deck settings.`);
    } else {
      console.log(`\n✅ Deck is public and accessible!`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

const publicId = process.argv[2];
if (!publicId) {
  console.log('Usage: node scripts/checkPublicDeck.js <publicId>');
  process.exit(1);
}

checkPublicDeck(publicId);

