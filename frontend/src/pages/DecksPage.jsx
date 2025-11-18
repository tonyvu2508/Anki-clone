import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDecks, createDeck, deleteDeck, importDeck } from '../api/decks';
import { importApkg } from '../api/apkg';
import { removeToken } from '../utils/auth';

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

      const response = await importDeck(deckData);
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
    return <div style={styles.container}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>My Decks</h1>
        <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.actionsRow}>
        <form onSubmit={handleCreateDeck} style={styles.form}>
          <input
            type="text"
            placeholder="New deck title"
            value={newDeckTitle}
            onChange={(e) => setNewDeckTitle(e.target.value)}
            style={styles.input}
          />
          <button type="submit" style={styles.button}>Create Deck</button>
        </form>
        <div style={styles.importSection}>
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
            style={styles.importButton}
            title="Import from JSON"
          >
            {importing ? 'Importing...' : '📤 Import JSON'}
          </button>
          <button
            onClick={handleImportApkgClick}
            disabled={importing || importingApkg}
            style={styles.importButton}
            title="Import from Anki .apkg file"
          >
            {importingApkg ? 'Importing...' : '📦 Import APKG'}
          </button>
        </div>
      </div>

      <div style={styles.decksGrid}>
        {decks.map(deck => (
          <div key={deck._id} style={styles.deckCard}>
            <h3 onClick={() => navigate(`/decks/${deck._id}`)} style={styles.deckTitle}>
              {deck.title}
            </h3>
            <button
              onClick={() => handleDeleteDeck(deck._id)}
              style={styles.deleteButton}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {decks.length === 0 && (
        <p style={styles.empty}>No decks yet. Create your first deck!</p>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  actionsRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    alignItems: 'flex-start',
  },
  form: {
    display: 'flex',
    gap: '1rem',
    flex: 1,
  },
  importSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  importButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  input: {
    flex: 1,
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  decksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1rem',
  },
  deckCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deckTitle: {
    cursor: 'pointer',
    color: '#007bff',
    margin: 0,
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  error: {
    color: 'red',
    marginBottom: '1rem',
    padding: '0.5rem',
    backgroundColor: '#ffe6e6',
    borderRadius: '4px',
  },
  empty: {
    textAlign: 'center',
    color: '#666',
    marginTop: '2rem',
  },
};

export default DecksPage;

