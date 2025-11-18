const path = require('path');
const fs = require('fs');
const ApkgParser = require('../services/apkgParser');
const Deck = require('../models/Deck');
const Item = require('../models/Item');
const Card = require('../models/Card');
const { buildTree } = require('../utils/tree');

/**
 * Import deck from .apkg file
 */
const importApkg = async (req, res) => {
  let apkgPath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    apkgPath = req.file.path;

    const { title } = req.body;
    const userId = req.userId;

    // Create parser
    const outputDir = path.join(__dirname, '../../');
    const parser = new ApkgParser(apkgPath, outputDir);

    // Extract .apkg file
    await parser.extract();

    // Parse database
    const { notes, models, mediaMapping } = parser.parseDatabase();

    if (!notes || notes.length === 0) {
      throw new Error('No notes found in apkg file');
    }

    // Create deck
    const deckTitle = title || notes[0].mid || 'Imported Deck';
    const newDeck = new Deck({
      title: deckTitle,
      owner: userId,
    });
    await newDeck.save();

    // Create root item for the deck
    const rootItem = new Item({
      title: deckTitle,
      deck: newDeck._id,
      parent: null,
      order: 0,
      level: 0,
      owner: userId,
    });
    await rootItem.save();

    // Get model (note type) - handle case where models array might be empty
    let model = null;
    if (models.length > 0 && notes.length > 0) {
      const noteModelId = notes[0].mid;
      model = models.find(m => m.id === noteModelId || m.ntid === noteModelId) || models[0];
    }

    // Process notes and create cards
    const cardsToCreate = [];
    let skippedCount = 0;
    
    for (const note of notes) {
      try {
        const cardData = parser.convertNoteToCard(note, model, mediaMapping);
        
        // Validate required fields
        if (!cardData.front || !cardData.back) {
          console.warn(`Skipping note ${note.id || note._id}: missing front or back`);
          skippedCount++;
          continue;
        }
        
        // Copy media files
        const frontMedia = await parser.copyMediaFiles(cardData.frontMedia, userId);
        const backMedia = await parser.copyMediaFiles(cardData.backMedia, userId);

        // Create card
        const card = new Card({
          item: rootItem._id,
          deck: newDeck._id,
          front: cardData.front,
          back: cardData.back,
          tags: cardData.tags,
          frontMedia: frontMedia,
          backMedia: backMedia,
        });

        cardsToCreate.push(card);
      } catch (error) {
        console.error(`Error processing note ${note.id || note._id}:`, error.message);
        skippedCount++;
      }
    }

    // Save all cards
    if (cardsToCreate.length > 0) {
      await Card.insertMany(cardsToCreate);
    }

    // Cleanup temp files
    parser.cleanup();
    if (fs.existsSync(apkgPath)) {
      fs.unlinkSync(apkgPath);
    }

    // Return deck with tree
    const items = await Item.find({ deck: newDeck._id });
    const tree = buildTree(items);

    const message = skippedCount > 0
      ? `Imported ${cardsToCreate.length} cards from apkg file (${skippedCount} skipped)`
      : `Imported ${cardsToCreate.length} cards from apkg file`;

    res.status(201).json({
      ...newDeck.toObject(),
      items: tree,
      message: message
    });

  } catch (error) {
    // Cleanup on error
    if (apkgPath && fs.existsSync(apkgPath)) {
      fs.unlinkSync(apkgPath);
    }
    
    res.status(500).json({ error: error.message || 'Failed to import apkg file' });
  }
};

module.exports = {
  importApkg
};

