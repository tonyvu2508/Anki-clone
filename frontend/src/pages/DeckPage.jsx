import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck, togglePublicDeck, exportDeck, generateTreeCards } from '../api/decks';
import { getItems, createItem } from '../api/items';
import TreeView from '../components/TreeView';
import CardList from '../components/CardList';

function DeckPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddRootForm, setShowAddRootForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [generatingCards, setGeneratingCards] = useState(false);

  useEffect(() => {
    loadDeck();
    loadItems();
  }, [id]);

  const loadDeck = async () => {
    try {
      const response = await getDeck(id);
      setDeck(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load deck');
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await getItems(id);
      setItems(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
  };

  const handleAddRootItem = async (e) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    try {
      await createItem(id, {
        title: newItemTitle,
        parentId: null,
        order: items.length,
      });
      setNewItemTitle('');
      setShowAddRootForm(false);
      loadItems();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create item');
    }
  };

  const handleTogglePublic = async () => {
    try {
      const response = await togglePublicDeck(id);
      setDeck(response.data);
      if (response.data.isPublic && response.data.publicId) {
        alert(`Deck is now public! Share link: ${window.location.origin}/public/${response.data.publicId}`);
      } else {
        alert('Deck is now private');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to toggle public status');
    }
  };

  const copyPublicLink = () => {
    if (!deck?.publicId) return;
    const link = `${window.location.origin}/public/${deck.publicId}`;
    navigator.clipboard.writeText(link);
    alert('Public link copied to clipboard!');
  };

  const handleExport = async () => {
    try {
      await exportDeck(id);
      alert('Deck exported successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to export deck');
    }
  };

  const handleGenerateTreeCards = async () => {
    if (!window.confirm('Generate cards from tree structure? This will create cards for all items with children.\nFront = item title, Back = children titles.')) {
      return;
    }

    setGeneratingCards(true);
    try {
      // Separator is ignored, backend always uses bullet points
      const response = await generateTreeCards(id, null, '\n');
      alert(`Generated ${response.data.cardsCreated.length} cards!`);
      loadItems(); // Refresh tree
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate cards');
    } finally {
      setGeneratingCards(false);
    }
  };

  const isLeaf = selectedItem && (!selectedItem.children || selectedItem.children.length === 0);

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/decks')} style={styles.backButton}>
          ← Back to Decks
        </button>
        <h1>{deck?.title || 'Deck'}</h1>
        <div style={styles.headerActions}>
          {deck?.isPublic && deck?.publicId && (
            <button
              onClick={copyPublicLink}
              style={styles.shareButton}
              title="Copy public link"
            >
              📋 Share Link
            </button>
          )}
          <button
            onClick={handleTogglePublic}
            style={{
              ...styles.toggleButton,
              backgroundColor: deck?.isPublic ? '#28a745' : '#6c757d'
            }}
          >
            {deck?.isPublic ? '🔓 Public' : '🔒 Private'}
          </button>
          <button
            onClick={handleExport}
            style={styles.exportButton}
            title="Export deck as JSON"
          >
            📥 Export
          </button>
          <button
            onClick={handleGenerateTreeCards}
            disabled={generatingCards}
            style={styles.generateButton}
            title="Generate cards from tree: Front = item title, Back = children titles"
          >
            {generatingCards ? 'Generating...' : '🎴 Generate Tree Cards'}
          </button>
          <button
            onClick={() => navigate(`/review?deckId=${id}`)}
            style={styles.reviewButton}
          >
            Review
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.content}>
        <div style={styles.treeSection}>
          <div style={styles.treeHeader}>
            <h2>Tree Structure</h2>
            {!showAddRootForm && (
              <button
                onClick={() => setShowAddRootForm(true)}
                style={styles.addButton}
              >
                + Add Root Item
              </button>
            )}
          </div>

          {showAddRootForm && (
            <form onSubmit={handleAddRootItem} style={styles.addForm}>
              <input
                type="text"
                placeholder="Root item title"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                style={styles.input}
                autoFocus
              />
              <button type="submit" style={styles.submitButton}>Add</button>
              <button
                type="button"
                onClick={() => {
                  setShowAddRootForm(false);
                  setNewItemTitle('');
                }}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </form>
          )}

          <div style={styles.treeContainer}>
            <TreeView
              items={items}
              deckId={id}
              onItemSelect={handleItemSelect}
              selectedItemId={selectedItem?._id}
              onRefresh={loadItems}
            />
          </div>
        </div>

        <div style={styles.cardsSection}>
          <CardList
            itemId={selectedItem?._id}
            isLeaf={isLeaf}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '2rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  reviewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  shareButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '0.5rem',
  },
  toggleButton: {
    padding: '0.5rem 1rem',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '0.5rem',
  },
  exportButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '0.5rem',
  },
  generateButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6f42c1',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '0.5rem',
  },
  headerActions: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
  },
  treeSection: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  treeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  addButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  addForm: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  input: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  submitButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  treeContainer: {
    maxHeight: '600px',
    overflowY: 'auto',
  },
  cardsSection: {
    minHeight: '400px',
  },
  error: {
    color: 'red',
    marginBottom: '1rem',
    padding: '0.5rem',
    backgroundColor: '#ffe6e6',
    borderRadius: '4px',
  },
};

export default DeckPage;

