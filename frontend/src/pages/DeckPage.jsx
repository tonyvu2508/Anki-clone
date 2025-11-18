import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck, togglePublicDeck, exportDeck, generateTreeCards } from '../api/decks';
import { getItems, createItem } from '../api/items';
import TreeView from '../components/TreeView';
import CardList from '../components/CardList';
import './DeckPage.css';

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
    return <div className="deck-page">Loading...</div>;
  }

  return (
    <div className="deck-page">
      <div className="deck-header">
        <button onClick={() => navigate('/decks')} className="back-button">
          ← Back to Decks
        </button>
        <h1 className="deck-title">{deck?.title || 'Deck'}</h1>
        <div className="deck-header-actions">
          {deck?.isPublic && deck?.publicId && (
            <button
              onClick={copyPublicLink}
              className="secondary-button"
              title="Copy public link"
            >
              📋 Share Link
            </button>
          )}
          <button
            onClick={handleTogglePublic}
            className="toggle-button"
            style={{ backgroundColor: deck?.isPublic ? '#28a745' : '#6c757d' }}
          >
            {deck?.isPublic ? '🔓 Public' : '🔒 Private'}
          </button>
          <button
            onClick={handleExport}
            className="secondary-button"
            title="Export deck as JSON"
          >
            📥 Export
          </button>
          <button
            onClick={handleGenerateTreeCards}
            disabled={generatingCards}
            className="secondary-button"
            title="Generate cards from tree: Front = item title, Back = children titles"
          >
            {generatingCards ? 'Generating...' : '🎴 Generate Tree Cards'}
          </button>
          <button
            onClick={() => navigate(`/review?deckId=${id}`)}
            className="primary-button"
          >
            Review
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="deck-content">
        <div className="deck-tree-section">
          <div className="deck-tree-header">
            <h2>Tree Structure</h2>
            {!showAddRootForm && (
              <button
                onClick={() => setShowAddRootForm(true)}
                className="primary-button"
              >
                + Add Root Item
              </button>
            )}
          </div>

          {showAddRootForm && (
            <form onSubmit={handleAddRootItem} className="deck-add-root-form">
              <input
                type="text"
                placeholder="Root item title"
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                className="deck-input"
                autoFocus
              />
              <button type="submit" className="primary-button">Add</button>
              <button
                type="button"
                onClick={() => {
                  setShowAddRootForm(false);
                  setNewItemTitle('');
                }}
                className="secondary-button"
              >
                Cancel
              </button>
            </form>
          )}

          <div className="deck-tree-container">
            <TreeView
              items={items}
              deckId={id}
              onItemSelect={handleItemSelect}
              selectedItemId={selectedItem?._id}
              onRefresh={loadItems}
            />
          </div>
        </div>

        <div className="deck-cards-section">
          <CardList
            itemId={selectedItem?._id}
            isLeaf={isLeaf}
          />
        </div>
      </div>
    </div>
  );
}

export default DeckPage;

