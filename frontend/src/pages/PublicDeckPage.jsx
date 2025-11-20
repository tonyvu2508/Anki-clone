import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicDeck } from '../api/public';
import TreeView from '../components/TreeView';

function PublicDeckPage() {
  const { publicId } = useParams();
  const [deck, setDeck] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPublicDeck();
  }, [publicId]);

  const loadPublicDeck = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getPublicDeck(publicId);
      setDeck(response.data);
      setItems(response.data.items || []);
    } catch (err) {
      console.error('Error loading public deck:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Public deck not found';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/public/${publicId}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <a href="/" style={styles.link}>Go to Home</a>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>{deck?.title}</h1>
        <button onClick={copyLink} style={styles.shareButton}>
          📋 Copy Link
        </button>
      </div>
      <div style={styles.info}>
        <p>This is a public deck. You can view the structure but cannot edit.</p>
      </div>
      <div style={styles.treeSection}>
        <div style={styles.readOnlyNotice}>
          <p>📖 Read-only view - This deck is shared publicly</p>
        </div>
        <TreeView
          items={items}
          deckId={deck?._id}
          onItemSelect={() => {}}
          selectedItemId={null}
          onRefresh={loadPublicDeck}
          readOnly={true}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem',
    color: 'var(--text-color)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  shareButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--primary-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  info: {
    backgroundColor: 'var(--accent-color)',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '2rem',
    color: 'var(--primary-color)',
  },
  readOnlyNotice: {
    backgroundColor: 'rgba(255, 213, 79, 0.2)',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    color: 'var(--warning-color)',
    textAlign: 'center',
  },
  treeSection: {
    backgroundColor: 'var(--panel-bg)',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px var(--shadow-color)',
    border: '1px solid var(--border-color)',
  },
  error: {
    color: 'var(--danger-color)',
    padding: '1rem',
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  link: {
    color: 'var(--primary-color)',
    textDecoration: 'none',
  },
};

export default PublicDeckPage;

