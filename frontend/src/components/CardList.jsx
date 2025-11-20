import { useState, useEffect } from 'react';
import { getCards, createCard, updateCard, deleteCard } from '../api/cards';
import { uploadMedia } from '../api/media';
import MediaDisplay from './MediaDisplay';

function CardList({ itemId, isLeaf, hasChildren = false }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [formData, setFormData] = useState({ front: '', back: '', tags: '' });
  const [frontMediaFiles, setFrontMediaFiles] = useState([]);
  const [backMediaFiles, setBackMediaFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (itemId) {
      // Load cards for any item (leaf items can have regular cards, non-leaf items can have tree-generated cards)
      loadCards();
    } else {
      setCards([]);
    }
  }, [itemId]);

  const loadCards = async () => {
    if (!itemId) return;
    setLoading(true);
    try {
      const response = await getCards(itemId);
      setCards(response.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.front.trim() || !formData.back.trim()) return;

    try {
      const tags = formData.tags
        ? formData.tags.split(',').map(t => t.trim()).filter(t => t)
        : [];

      if (editingCard) {
        await updateCard(editingCard._id, {
          front: formData.front,
          back: formData.back,
          tags,
          frontMedia: frontMediaFiles,
          backMedia: backMediaFiles,
        });
        setEditingCard(null);
      } else {
        await createCard(itemId, {
          front: formData.front,
          back: formData.back,
          tags,
          frontMedia: frontMediaFiles,
          backMedia: backMediaFiles,
        });
        setShowAddForm(false);
      }
      setFormData({ front: '', back: '', tags: '' });
      setFrontMediaFiles([]);
      setBackMediaFiles([]);
      loadCards();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save card');
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setFormData({
      front: card.front,
      back: card.back,
      tags: card.tags ? card.tags.join(', ') : '',
    });
    setFrontMediaFiles(card.frontMedia || []);
    setBackMediaFiles(card.backMedia || []);
    setShowAddForm(true);
  };

  const handleDelete = async (cardId) => {
    if (!window.confirm('Delete this card?')) return;

    try {
      await deleteCard(cardId);
      loadCards();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete card');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingCard(null);
    setFormData({ front: '', back: '', tags: '' });
    setFrontMediaFiles([]);
    setBackMediaFiles([]);
  };

  const handleMediaUpload = async (file, side) => {
    setUploading(true);
    try {
      const response = await uploadMedia(file);
      if (side === 'front') {
        setFrontMediaFiles([...frontMediaFiles, response.data]);
      } else {
        setBackMediaFiles([...backMediaFiles, response.data]);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload media');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveMedia = (index, side) => {
    if (side === 'front') {
      setFrontMediaFiles(frontMediaFiles.filter((_, i) => i !== index));
    } else {
      setBackMediaFiles(backMediaFiles.filter((_, i) => i !== index));
    }
  };

  // Show cards for both leaf items and items with tree-generated cards
  // Note: Regular cards can only be added to leaf items, but tree-generated cards can be on any item

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>Cards</h3>
        {!showAddForm && isLeaf && (
          <button
            onClick={() => setShowAddForm(true)}
            style={styles.addButton}
          >
            Add Card
          </button>
        )}
        {hasChildren && (
          <div style={styles.info}>
            ℹ️ This item has children. Use "🎴 Generate" button to create tree cards.
          </div>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="Front"
            value={formData.front}
            onChange={(e) => setFormData({ ...formData, front: e.target.value })}
            required
            style={styles.input}
          />
          <textarea
            placeholder="Back"
            value={formData.back}
            onChange={(e) => setFormData({ ...formData, back: e.target.value })}
            required
            style={styles.textarea}
            rows={4}
          />
          <input
            type="text"
            placeholder="Tags (comma-separated)"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            style={styles.input}
          />
          
          {/* Front Media */}
          <div style={styles.mediaSection}>
            <label style={styles.label}>Front Media:</label>
            <input
              type="file"
              accept="image/*,audio/*,video/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleMediaUpload(file, 'front');
                e.target.value = '';
              }}
              disabled={uploading}
              style={styles.fileInput}
            />
            {frontMediaFiles.length > 0 && (
              <div style={styles.mediaPreview}>
                {frontMediaFiles.map((media, index) => (
                  <div key={index} style={styles.mediaItem}>
                    <MediaDisplay media={[media]} side="front" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index, 'front')}
                      style={styles.removeMediaButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Back Media */}
          <div style={styles.mediaSection}>
            <label style={styles.label}>Back Media:</label>
            <input
              type="file"
              accept="image/*,audio/*,video/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleMediaUpload(file, 'back');
                e.target.value = '';
              }}
              disabled={uploading}
              style={styles.fileInput}
            />
            {backMediaFiles.length > 0 && (
              <div style={styles.mediaPreview}>
                {backMediaFiles.map((media, index) => (
                  <div key={index} style={styles.mediaItem}>
                    <MediaDisplay media={[media]} side="back" />
                    <button
                      type="button"
                      onClick={() => handleRemoveMedia(index, 'back')}
                      style={styles.removeMediaButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.formActions}>
            <button type="submit" style={styles.submitButton} disabled={uploading}>
              {uploading ? 'Uploading...' : editingCard ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={handleCancel} style={styles.cancelButton}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div>Loading cards...</div>
      ) : (
        <div style={styles.cardsList}>
          {cards.map(card => (
            <div key={card._id} style={styles.card}>
              <div style={styles.cardContent}>
                <div>
                  <strong>Front:</strong>
                  <div style={styles.cardText}>{card.front}</div>
                  {card.frontMedia && card.frontMedia.length > 0 && (
                    <MediaDisplay media={card.frontMedia} side="front" />
                  )}
                </div>
                <div>
                  <strong>Back:</strong>
                  <div style={styles.cardText}>
                    {card.back.split(/\r?\n/).map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                  {card.backMedia && card.backMedia.length > 0 && (
                    <MediaDisplay media={card.backMedia} side="back" />
                  )}
                </div>
                {card.tags && card.tags.length > 0 && (
                  <div style={styles.tags}>
                    {card.tags.map((tag, i) => (
                      <span key={i} style={styles.tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div style={styles.cardActions}>
                <button
                  onClick={() => handleEdit(card)}
                  style={styles.editButton}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(card._id)}
                  style={styles.deleteButton}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && cards.length === 0 && (
        <div style={styles.empty}>No cards yet. Add your first card!</div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '1rem',
    backgroundColor: 'transparent',
    borderRadius: '8px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  info: {
    fontSize: '0.85rem',
    color: 'var(--text-muted, #666)',
    fontStyle: 'italic',
  },
  addButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--success-color, #28a745)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
    padding: '1rem',
    backgroundColor: 'var(--form-bg, #f8f9fa)',
    borderRadius: '4px',
    border: '1px solid var(--border-color, #ddd)',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: '4px',
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-color, #212121)',
  },
  textarea: {
    padding: '0.5rem',
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: '4px',
    resize: 'vertical',
    backgroundColor: 'var(--input-bg, #fff)',
    color: 'var(--text-color, #212121)',
  },
  formActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  mediaSection: {
    marginTop: '0.5rem',
    padding: '0.5rem',
    backgroundColor: 'var(--card-bg, #fff)',
    borderRadius: '4px',
    border: '1px solid var(--border-color, #ddd)',
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
  },
  fileInput: {
    marginBottom: '0.5rem',
  },
  mediaPreview: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  mediaItem: {
    position: 'relative',
    padding: '0.5rem',
    border: '1px solid var(--border-color, #eee)',
    borderRadius: '4px',
    backgroundColor: 'var(--card-bg, #fff)',
  },
  removeMediaButton: {
    position: 'absolute',
    top: '5px',
    right: '5px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    cursor: 'pointer',
    fontSize: '18px',
    lineHeight: '1',
  },
  submitButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--primary-color, #007bff)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--text-muted, #6c757d)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    border: '1px solid var(--border-color, #ddd)',
    borderRadius: '4px',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
    backgroundColor: 'var(--card-bg, #fff)',
  },
  cardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  cardText: {
    whiteSpace: 'pre-line', // Preserve line breaks and wrap text
    marginTop: '0.25rem',
    lineHeight: '1.8',
    color: 'var(--text-color, #212121)',
  },
  tags: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginTop: '0.5rem',
  },
  tag: {
    backgroundColor: 'var(--tag-bg, #e3f2fd)',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.875rem',
    color: 'var(--text-color, #212121)',
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  editButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--warning-color, #ffc107)',
    color: 'var(--text-color, black)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--danger-color, #dc3545)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    color: 'var(--text-muted, #666)',
    padding: '2rem',
  },
  message: {
    padding: '2rem',
    textAlign: 'center',
    color: '#666',
    backgroundColor: 'white',
    borderRadius: '8px',
  },
};

export default CardList;

