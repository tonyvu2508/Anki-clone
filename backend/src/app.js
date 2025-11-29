const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const authRoutes = require('./routes/auth');
const deckRoutes = require('./routes/decks');
const itemRoutes = require('./routes/items');
const cardRoutes = require('./routes/cards');
const reviewRoutes = require('./routes/review');
const publicRoutes = require('./routes/public');
const apkgRoutes = require('./routes/apkg');
const mediaRoutes = require('./routes/media');

const app = express();

// Middleware
app.use(morgan('dev'));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Increase URL-encoded payload limit

// Health check (must be before other routes)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Public routes (no authentication)
app.use('/api/public', publicRoutes);

// Media serving (public)
app.use('/api/media', express.static(path.join(__dirname, '../media')));

// Protected routes
app.use('/api/auth', authRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api', itemRoutes); // Items routes include /decks/:deckId/items
app.use('/api', cardRoutes); // Cards routes include /items/:itemId/cards and /decks/:deckId/cards
app.use('/api/review', reviewRoutes);
app.use('/api/apkg', apkgRoutes); // APKG import
app.use('/api/media', mediaRoutes); // Media upload

module.exports = app;

