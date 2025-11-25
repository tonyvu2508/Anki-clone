import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck, togglePublicDeck, exportDeck, generateTreeCards, uploadDeckAudio, deleteDeckAudio, updateDeck } from '../api/decks';
import { getItems, createItem } from '../api/items';
import TreeView from '../components/TreeView';
import CardList from '../components/CardList';
import Modal from '../components/Modal';
import RichTextEditor from '../components/RichTextEditor';
import { getToken } from '../utils/auth';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import './DeckPage.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const API_BASE = API_URL.endsWith('/api')
  ? API_URL
  : API_URL.endsWith('/')
    ? `${API_URL}api`
    : `${API_URL}/api`;

const getResponsiveMaxFilenameLength = () => {
  if (typeof window === 'undefined') {
    return 40;
  }
  const width = window.innerWidth || 1024;
  if (width <= 340) return 16;
  if (width <= 380) return 18;
  if (width <= 420) return 20;
  if (width <= 480) return 24;
  if (width <= 560) return 28;
  if (width <= 640) return 32;
  if (width <= 768) return 36;
  return 40;
};

const formatFilename = (filename, maxLength = 40) => {
  if (!filename) return '';
  if (filename.length <= maxLength) return filename;
  const parts = filename.split('.');
  const extension = parts.length > 1 ? `.${parts.pop()}` : '';
  const baseName = parts.join('.') || filename.replace(extension, '');
  const visibleChars = Math.max(maxLength - extension.length - 3, 5);
  const headLength = Math.max(Math.floor(visibleChars * 0.6), 3);
  const tailLength = Math.max(visibleChars - headLength, 2);
  const head = baseName.slice(0, headLength);
  const tail = baseName.slice(-tailLength);
  return `${head}...${tail}${extension}`;
};

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
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [showAudioList, setShowAudioList] = useState(false);
  const [showDeckNoteModal, setShowDeckNoteModal] = useState(false);
  const [editingDeckNote, setEditingDeckNote] = useState(false);
  const [deckNote, setDeckNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [maxFilenameLength, setMaxFilenameLength] = useState(getResponsiveMaxFilenameLength());
  const audioInputRef = useRef(null);
  const { playDeckAudio, pauseAudio, resumeAudio, track, isPlaying } = useAudioPlayer();
  const isDeckAudioActive = track.deckId === id;

  useEffect(() => {
    loadDeck();
    loadItems();
  }, [id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleResize = () => {
      setMaxFilenameLength(getResponsiveMaxFilenameLength());
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const loadDeck = async () => {
    try {
      const response = await getDeck(id);
      setDeck(response.data);
      setDeckNote(response.data.note || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load deck');
    }
  };

  const handleSaveDeckNote = async () => {
    setSavingNote(true);
    try {
      await updateDeck(id, { note: deckNote });
      setEditingDeckNote(false);
      await loadDeck();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleOpenDeckNote = () => {
    setDeckNote(deck?.note || '');
    setEditingDeckNote(false);
    setShowDeckNoteModal(true);
  };

  const handleCloseDeckNote = () => {
    setShowDeckNoteModal(false);
    setEditingDeckNote(false);
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

  const handleAudioFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    try {
      await uploadDeckAudio(id, file);
      await loadDeck();
      alert('Audio uploaded successfully');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to upload audio');
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAudio = async (audioId) => {
    if (!window.confirm('Remove this audio?')) return;

    setUploadingAudio(true);
    try {
      await deleteDeckAudio(id, audioId);
      await loadDeck();
      alert('Audio removed');
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Failed to remove audio');
    } finally {
      setUploadingAudio(false);
    }
  };

  const getAudioSrc = (audio) => {
    if (!audio) return null;
    const params = new URLSearchParams();
    const token = getToken();
    if (token) {
      params.append('token', token);
    }
    if (audio.uploadedAt) {
      params.append('v', new Date(audio.uploadedAt).getTime());
    } else if (audio.storedFilename) {
      params.append('v', audio.storedFilename);
    }
    const query = params.toString();
    return `${API_BASE}/decks/${id}/audio/${audio._id}/stream${query ? `?${query}` : ''}`;
  };

  const handlePlayPauseAudio = (audio) => {
    const audioSrc = getAudioSrc(audio);
    if (!audioSrc) return;

    const isThisAudioActive = isDeckAudioActive && track.src === audioSrc;
    
    if (isThisAudioActive) {
      // Toggle play/pause for current audio
      if (isPlaying) {
        pauseAudio();
      } else {
        resumeAudio();
      }
    } else {
      // Play new audio
      playDeckAudio({
        deckId: id,
        title: `${deck?.title || 'Deck'} - ${audio.filename || 'Audio track'}`,
        src: audioSrc,
        mimeType: audio.mimeType || 'audio/mpeg',
      });
    }
  };

  const isAudioActive = (audio) => {
    if (!audio || !isDeckAudioActive) return false;
    const audioSrc = getAudioSrc(audio);
    return track.src === audioSrc;
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
            style={{ backgroundColor: deck?.isPublic ? 'var(--success-color)' : 'var(--secondary-color)' }}
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

          <div className="deck-audio-panel">
            <div className="deck-audio-header">
              <h3>Deck Audio</h3>
              <div className="deck-audio-actions">
                <button
                  type="button"
                  className="icon-button deck-audio-toggle"
                  onClick={() => setShowAudioList(!showAudioList)}
                  title={showAudioList ? 'Hide audio list' : 'Show audio list'}
                >
                  {showAudioList ? '▼' : '▶'}
                </button>
                <label className="icon-button deck-audio-upload" title="Upload Audio">
                  {uploadingAudio ? '⏳' : '📤'}
                  <input
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    ref={audioInputRef}
                    onChange={handleAudioFileChange}
                    disabled={uploadingAudio}
                  />
                </label>
              </div>
            </div>
            {showAudioList && (
              <div className="deck-audio-list">
                {deck?.audios && deck.audios.length > 0 ? (
                  deck.audios.map((audio) => {
                    const isActive = isAudioActive(audio);
                    const isCurrentlyPlaying = isActive && isPlaying;
                    return (
                      <div key={audio._id} className="deck-audio-item">
                        <div className="deck-audio-item-info">
                          <p className="deck-audio-item-name" title={audio.filename}>
                            {formatFilename(audio.filename, maxFilenameLength) || 'Audio track'}
                          </p>
                          {isActive && (
                            <p className="deck-audio-item-status">
                              {isCurrentlyPlaying ? 'Playing' : 'Paused'}
                            </p>
                          )}
                        </div>
                        <div className="deck-audio-item-actions">
                          <button
                            type="button"
                            className="icon-button deck-audio-play-pause"
                            onClick={() => handlePlayPauseAudio(audio)}
                            title={isCurrentlyPlaying ? 'Pause' : 'Play'}
                          >
                            {isCurrentlyPlaying ? '⏸️' : '▶️'}
                          </button>
                          <button
                            type="button"
                            className="icon-button deck-audio-remove"
                            onClick={() => handleRemoveAudio(audio._id)}
                            disabled={uploadingAudio}
                            title="Remove audio"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="deck-audio-empty">No audio uploaded for this deck</p>
                )}
              </div>
            )}
          </div>

          <div className="deck-note-button-container">
            <button
              type="button"
              className="icon-button deck-note-open"
              onClick={handleOpenDeckNote}
              title="Open deck note"
            >
              📝 Note
            </button>
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

      <Modal
        isOpen={showDeckNoteModal}
        onClose={handleCloseDeckNote}
        title="Deck Note"
      >
        {editingDeckNote ? (
          <div className="note-modal-content">
            <RichTextEditor
              value={deckNote}
              onChange={setDeckNote}
              placeholder="Add a note for this deck..."
            />
            <div className="note-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={handleSaveDeckNote}
                disabled={savingNote}
              >
                {savingNote ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setEditingDeckNote(false);
                  setDeckNote(deck?.note || '');
                }}
                disabled={savingNote}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="note-modal-content">
            <div
              className="note-display"
              dangerouslySetInnerHTML={{ __html: deck?.note || '<p class="note-empty">No note added yet.</p>' }}
            />
            <div className="note-modal-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setEditingDeckNote(true);
                  setDeckNote(deck?.note || '');
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCloseDeckNote}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DeckPage;

