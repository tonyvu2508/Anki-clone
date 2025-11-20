import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createItem, deleteItem, generateItemCard } from '../api/items';

function ItemNode({ item, deckId, level, onItemSelect, selectedItemId, onRefresh, readOnly = false }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);

  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedItemId === item._id;

  const handleToggle = () => {
    if (hasChildren) {
      setExpanded(!expanded);
      if (!expanded && !item.children) {
        // Load children if not loaded
        onRefresh();
      }
    }
    setShowAddForm(false);
  };

  const handleSelect = () => {
    onItemSelect(item);
    setShowAddForm(false);
  };

  const handleAddChild = async (e) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;

    setLoading(true);
    try {
      await createItem(deckId, {
        title: newItemTitle,
        parentId: item._id,
        order: item.children ? item.children.length : 0,
      });
      setNewItemTitle('');
      setShowAddForm(false);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this item and all its children?')) return;

    try {
      await deleteItem(item._id);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleReview = () => {
    navigate(`/review/item/${item._id}`);
  };

  const handleGenerateCard = async () => {
    if (!hasChildren) {
      alert('This item has no children. Cards can only be generated for items with children.');
      return;
    }

    setGeneratingCard(true);
    try {
      // Separator is ignored, backend always uses bullet points
      await generateItemCard(item._id, '\n', false);
      alert('Card generated successfully!');
      onRefresh(); // Refresh to show new card
    } catch (err) {
      if (err.response?.status === 400 && err.response?.data?.error?.includes('already exists')) {
        if (window.confirm('Card already exists. Do you want to overwrite it?')) {
          try {
            await generateItemCard(item._id, '\n', true);
            alert('Card updated successfully!');
            onRefresh();
          } catch (err2) {
            alert(err2.response?.data?.error || 'Failed to update card');
          }
        }
      } else {
        alert(err.response?.data?.error || 'Failed to generate card');
      }
    } finally {
      setGeneratingCard(false);
    }
  };

  return (
    <div style={styles.node}>
      <div
        style={{
          ...styles.itemRow,
          backgroundColor: isSelected ? 'var(--selected-bg, #e3f2fd)' : 'transparent',
          paddingLeft: `${level * 20 + 10}px`,
        }}
      >
        <div style={styles.itemContent}>
          {hasChildren && (
            <button
              onClick={handleToggle}
              style={styles.toggleButton}
            >
              {expanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span style={styles.spacer} />}
          <span
            onClick={handleSelect}
            style={{
              ...styles.itemTitle,
              cursor: 'pointer',
              fontWeight: isSelected ? 'bold' : 'normal',
            }}
          >
            {item.title}
          </span>
        </div>
        {!readOnly && (
          <div style={styles.actions}>
            {hasChildren && (
              <button
                onClick={handleGenerateCard}
                disabled={generatingCard}
                style={styles.generateButton}
                title="Generate card: Front = this item, Back = children titles"
              >
                {generatingCard ? '...' : '🎴 Generate'}
              </button>
            )}
            <button
              onClick={handleReview}
              style={styles.reviewButton}
              title="Review cards in this item and children"
            >
              📚 Review
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={styles.addButton}
              title="Add child"
            >
              +
            </button>
            <button
              onClick={handleDelete}
              style={styles.deleteButton}
              title="Delete"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {showAddForm && !readOnly && (
        <form onSubmit={handleAddChild} style={{ ...styles.addForm, paddingLeft: `${(level + 1) * 20 + 10}px` }}>
          <input
            type="text"
            placeholder="New item title"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            style={styles.input}
            autoFocus
          />
          <button type="submit" disabled={loading} style={styles.submitButton}>
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddForm(false);
              setNewItemTitle('');
            }}
            style={styles.cancelButton}
          >
            Cancel
          </button>
        </form>
      )}

      {expanded && hasChildren && (
        <div style={styles.children}>
          {item.children.map(child => (
            <ItemNode
              key={child._id}
              item={child}
              deckId={deckId}
              level={level + 1}
              onItemSelect={onItemSelect}
              selectedItemId={selectedItemId}
              onRefresh={onRefresh}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  node: {
    marginBottom: '2px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  itemContent: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 0.5rem',
    fontSize: '0.8rem',
  },
  spacer: {
    width: '1.5rem',
  },
  itemTitle: {
    flex: 1,
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  generateButton: {
    backgroundColor: '#17a2b8',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 8px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  reviewButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    padding: '3px 8px',
    cursor: 'pointer',
    fontSize: '12px',
  },
  addButton: {
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  deleteButton: {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  addForm: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.5rem',
    marginTop: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  submitButton: {
    padding: '0.5rem 1rem',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  children: {
    marginLeft: '1rem',
  },
};

export default ItemNode;

