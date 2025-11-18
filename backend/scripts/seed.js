require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Deck = require('../src/models/Deck');
const Item = require('../src/models/Item');
const Card = require('../src/models/Card');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/anki_clone';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Deck.deleteMany({});
    await Item.deleteMany({});
    await Card.deleteMany({});
    console.log('Cleared existing data');

    // Create user
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = new User({
      email: 'test@example.com',
      passwordHash,
    });
    await user.save();
    console.log('Created user:', user.email);

    // Create deck
    const deck = new Deck({
      title: 'Lịch sử Việt Nam',
      owner: user._id,
    });
    await deck.save();
    console.log('Created deck:', deck.title);

    // Create items (tree structure)
    const item1 = new Item({
      title: 'Thời kỳ cổ đại',
      deck: deck._id,
      parent: null,
      order: 0,
      level: 0,
      owner: user._id,
    });
    await item1.save();

    const item1a = new Item({
      title: 'Văn Lang - Âu Lạc',
      deck: deck._id,
      parent: item1._id,
      order: 0,
      level: 1,
      owner: user._id,
    });
    await item1a.save();

    const item1b = new Item({
      title: 'Bắc thuộc',
      deck: deck._id,
      parent: item1._id,
      order: 1,
      level: 1,
      owner: user._id,
    });
    await item1b.save();

    const item2 = new Item({
      title: 'Thời kỳ phong kiến',
      deck: deck._id,
      parent: null,
      order: 1,
      level: 0,
      owner: user._id,
    });
    await item2.save();

    const item2a = new Item({
      title: 'Nhà Lý',
      deck: deck._id,
      parent: item2._id,
      order: 0,
      level: 1,
      owner: user._id,
    });
    await item2a.save();

    const item2b = new Item({
      title: 'Nhà Trần',
      deck: deck._id,
      parent: item2._id,
      order: 1,
      level: 1,
      owner: user._id,
    });
    await item2b.save();

    console.log('Created items tree');

    // Create cards for leaf items
    const card1 = new Card({
      item: item1a._id,
      deck: deck._id,
      front: 'Ai là vua Hùng đầu tiên?',
      back: 'Vua Hùng Vương',
      tags: ['lịch sử', 'cổ đại'],
    });
    await card1.save();

    const card2 = new Card({
      item: item1b._id,
      deck: deck._id,
      front: 'Triều đại nào đô hộ Việt Nam lâu nhất?',
      back: 'Nhà Hán',
      tags: ['lịch sử', 'bắc thuộc'],
    });
    await card2.save();

    const card3 = new Card({
      item: item2a._id,
      deck: deck._id,
      front: 'Kinh đô nhà Lý?',
      back: 'Thăng Long',
      tags: ['lịch sử', 'nhà Lý'],
    });
    await card3.save();

    const card4 = new Card({
      item: item2b._id,
      deck: deck._id,
      front: 'Ai là vua đầu tiên nhà Trần?',
      back: 'Trần Thái Tông',
      tags: ['lịch sử', 'nhà Trần'],
    });
    await card4.save();

    console.log('Created cards');

    console.log('\n✅ Seed completed successfully!');
    console.log('\nLogin credentials:');
    console.log('Email: test@example.com');
    console.log('Password: password123');
    console.log('\nYou can now start the application with: docker-compose up');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

