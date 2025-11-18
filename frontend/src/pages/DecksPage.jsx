import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDecks, createDeck, deleteDeck, importDeck } from '../api/decks';
import { importApkg } from '../api/apkg';
import { removeToken } from '../utils/auth';
import './DecksPage.css';

const generateRandomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
};

const reencodeDeckData = (data) => {
  const cloned = JSON.parse(JSON.stringify(data));
  const idMap = new Map();

  if (Array.isArray(cloned.items)) {
    cloned.items = cloned.items.map((item) => {
      const originalId = item._id || item.id || generateRandomId();
      const newId = generateRandomId();
      idMap.set(originalId, newId);
      return {
        ...item,
        _id: newId,
      };
    }).map((item) => ({
      ...item,
      parentId: item.parentId ? idMap.get(item.parentId) || item.parentId : null,
    }));
  }

  if (Array.isArray(cloned.cards)) {
    cloned.cards = cloned.cards.map((card) => ({
      ...card,
      itemId: idMap.get(card.itemId) || card.itemId,
    }));
  }

  return cloned;
};

function DecksPage() {
  const [decks, setDecks] = useState([]);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importingApkg, setImportingApkg] = useState(false);
  const fileInputRef = useRef(null);
  const apkgInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      const response = await getDecks();
      setDecks(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load decks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDeck = async (e) => {
    e.preventDefault();
    if (!newDeckTitle.trim()) return;

    try {
      const response = await createDeck(newDeckTitle);
      setDecks([...decks, response.data]);
      setNewDeckTitle('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create deck');
    }
  };

  const handleDeleteDeck = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deck?')) return;

    try {
      await deleteDeck(id);
      setDecks(decks.filter(deck => deck._id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete deck');
    }
  };

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportApkgClick = () => {
    apkgInputRef.current?.click();
  };

  const handleApkgFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.apkg')) {
      alert('Please select an .apkg file');
      return;
    }

    setImportingApkg(true);
    try {
      const formData = new FormData();
      formData.append('apkgFile', file);
      formData.append('title', file.name.replace('.apkg', ''));

      const response = await importApkg(formData);
      setDecks([response.data, ...decks]);
      alert(response.data.message || 'Deck imported successfully!');
      navigate(`/decks/${response.data._id}`);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to import apkg file');
    } finally {
      setImportingApkg(false);
      if (apkgInputRef.current) {
        apkgInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const deckData = JSON.parse(text);

      // Validate JSON structure
      if (!deckData.deck || !deckData.deck.title) {
        throw new Error('Invalid deck file format');
      }

      const encodedDeckData = reencodeDeckData(deckData);
      const response = await importDeck(encodedDeckData);
      setDecks([response.data, ...decks]);
      alert('Deck imported successfully!');
      navigate(`/decks/${response.data._id}`);
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to import deck');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (loading) {
    return <div className="decks-container">Loading...</div>;
  }

  return (
    <div className="decks-container">
      <div className="decks-header">
        <h1>My Decks</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="decks-actions">
        <form onSubmit={handleCreateDeck} className="decks-form">
          <input
            type="text"
            placeholder="New deck title"
            value={newDeckTitle}
            onChange={(e) => setNewDeckTitle(e.target.value)}
            className="decks-input"
          />
          <button type="submit" className="primary-button full-width-mobile">Create Deck</button>
        </form>
        <div className="decks-imports">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <input
            ref={apkgInputRef}
            type="file"
            accept=".apkg"
            onChange={handleApkgFileChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={handleImportClick}
            disabled={importing || importingApkg}
            className="secondary-button full-width-mobile"
            title="Import from JSON"
          >
            {importing ? 'Importing...' : '📤 Import JSON'}
          </button>
          <button
            onClick={handleImportApkgClick}
            disabled={importing || importingApkg}
            className="secondary-button full-width-mobile"
            title="Import from Anki .apkg file"
          >
            {importingApkg ? 'Importing...' : '📦 Import APKG'}
          </button>
        </div>
      </div>

      <div className="decks-grid">
        {decks.map(deck => (
          <div key={deck._id} className="deck-card">
            <h3 onClick={() => navigate(`/decks/${deck._id}`)} className="deck-title">
              {deck.title}
            </h3>
            <button
              onClick={() => handleDeleteDeck(deck._id)}
              className="danger-button"
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {decks.length === 0 && (
        <p className="empty-state">No decks yet. Create your first deck!</p>
      )}
    </div>
  );
}

export default DecksPage;

