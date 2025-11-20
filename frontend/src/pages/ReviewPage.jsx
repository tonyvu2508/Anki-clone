import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getTodayCards, getItemTreeCards } from '../api/review';
import { submitReviewResult } from '../api/review';
import MediaDisplay from '../components/MediaDisplay';

function ReviewPage() {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get('deckId');
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itemInfo, setItemInfo] = useState(null);
  const [includeAll, setIncludeAll] = useState(false);
  const [includeTreeCards, setIncludeTreeCards] = useState(true); // Include tree-generated cards by default

  useEffect(() => {
    loadCards();
  }, [itemId, includeAll, includeTreeCards, deckId]);

  const loadCards = async () => {
    setLoading(true);
    try {
      let response;
      if (itemId) {
        // Review mode for specific item tree
        response = await getItemTreeCards(itemId, includeAll);
        setItemInfo(response.data.item);
        let cardsData = response.data.cards;
        
        // Filter out tree-generated cards if checkbox is unchecked
        if (!includeTreeCards) {
          cardsData = cardsData.filter(card => !card.isTreeGenerated);
        }
        
        setCards(cardsData);
      } else {
        // Normal review mode (all cards due today)
        response = await getTodayCards(deckId, null, includeAll);
        setItemInfo(null);
        let cardsData = response.data;
        
        // Filter out tree-generated cards if checkbox is unchecked
        if (!includeTreeCards) {
          cardsData = cardsData.filter(card => !card.isTreeGenerated);
        }
        
        setCards(cardsData);
      }
      setCurrentIndex(0);
      setShowBack(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load cards');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    setShowBack(prev => !prev);
  };

  const handleResult = async (quality) => {
    if (cards.length === 0) return;

    const currentCard = cards[currentIndex];
    try {
      const response = await submitReviewResult(currentCard._id, quality);
      const updatedCard = response.data?.card ? { ...currentCard, ...response.data.card } : currentCard;
      
      // Remove current card and move to next
      const remainingCards = cards.filter((_, i) => i !== currentIndex);
      let newCards = remainingCards;
      
      // If user selected "Again" (quality 0), insert the card at position 10 (after 9 cards)
      if (quality === 0) {
        const insertPosition = Math.min(10, remainingCards.length);
        newCards = [...remainingCards];
        newCards.splice(insertPosition, 0, updatedCard);
      }
      // If user selected "Hard" (quality 1), insert the card at position 20 (after 19 cards)
      else if (quality === 1) {
        const insertPosition = Math.min(20, remainingCards.length);
        newCards = [...remainingCards];
        newCards.splice(insertPosition, 0, updatedCard);
      }
      
      setCards(newCards);
      
      if (newCards.length === 0) {
        // All cards reviewed
        alert('All cards reviewed! Great job!');
        navigate(-1);
      } else {
        // Move to next card (or stay at 0 if we removed the last one)
        setCurrentIndex(Math.min(currentIndex, newCards.length - 1));
        setShowBack(false);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit result');
    }
  };

  if (loading) {
    return <div style={styles.container}>Loading cards...</div>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <button onClick={() => navigate(-1)} style={styles.button}>
          ← Back
        </button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.message}>No cards to review today! 🎉</div>
        <button onClick={() => navigate(-1)} style={styles.button}>
          ← Back
        </button>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Back
        </button>
        <div style={styles.headerInfo}>
          {itemInfo && (
            <div style={styles.itemPath}>
              <strong>Reviewing:</strong> {itemInfo.path?.map(i => i.title).join(' → ') || itemInfo.title}
            </div>
          )}
          <div style={styles.progress}>
            Card {currentIndex + 1} of {cards.length}
          </div>
        </div>
        <div style={styles.headerActions}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={includeAll}
              onChange={(e) => setIncludeAll(e.target.checked)}
            />
            Include all cards
          </label>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={includeTreeCards}
              onChange={(e) => setIncludeTreeCards(e.target.checked)}
            />
            Include tree cards
          </label>
        </div>
      </div>

      {currentCard.itemPath && (
        <div style={styles.cardPath}>
          <strong>Card location:</strong> {currentCard.itemPath.map(i => i.title).join(' → ')}
        </div>
      )}

      <div style={styles.cardContainer}>
        <div
          style={styles.card}
          onClick={handleCardClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleCardClick();
            }
          }}
        >
          <div
            style={{
              ...styles.cardInner,
              ...(showBack ? styles.cardInnerFlipped : {}),
            }}
          >
            <div style={{ ...styles.cardFace, ...styles.cardFaceFront }}>
              <h2>Front</h2>
              <div style={styles.cardContent}>
                <div style={styles.cardText}>{currentCard.front}</div>
                {currentCard.frontMedia && currentCard.frontMedia.length > 0 && (
                  <MediaDisplay media={currentCard.frontMedia} side="front" />
                )}
              </div>
            </div>
            <div style={{ ...styles.cardFace, ...styles.cardFaceBack }}>
              <h2>Back</h2>
              <div style={styles.cardContent}>
                <div style={styles.cardText}>
                  {currentCard.back.split(/\r?\n/).map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
                {currentCard.backMedia && currentCard.backMedia.length > 0 && (
                  <MediaDisplay media={currentCard.backMedia} side="back" />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={styles.controlsContainer}>
        {!showBack ? (
          <div style={styles.flipHint}>Tap or click the card to reveal the answer</div>
        ) : (
          <div style={styles.qualityButtons}>
            <button onClick={() => handleResult(0)} style={styles.qualityButton0}>
              Again
            </button>
            <button onClick={() => handleResult(1)} style={styles.qualityButton1}>
              Hard
            </button>
            <button onClick={() => handleResult(2)} style={styles.qualityButton2}>
              Good
            </button>
            <button onClick={() => handleResult(3)} style={styles.qualityButton3}>
              Easy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
    color: 'var(--text-color)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  headerInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  itemPath: {
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  cardPath: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--accent-color)',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    color: 'var(--primary-color)',
    alignSelf: 'stretch',
  },
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: 'var(--secondary-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  progress: {
    fontSize: '1.1rem',
    color: 'var(--text-muted)',
  },
  cardContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: '600px',
    minHeight: '420px',
    perspective: '1200px',
    cursor: 'pointer',
  },
  cardInner: {
    position: 'relative',
    width: '100%',
    height: '100%',
    transition: 'transform 0.6s',
    transformStyle: 'preserve-3d',
    boxShadow: '0 4px 6px var(--shadow-color)',
    borderRadius: '12px',
  },
  cardInnerFlipped: {
    transform: 'rotateY(180deg)',
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
    backgroundColor: 'var(--card-bg)',
    borderRadius: '12px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    border: '1px solid var(--border-color)',
  },
  cardFaceFront: {
    transform: 'rotateY(0deg)',
  },
  cardFaceBack: {
    transform: 'rotateY(180deg)',
    backgroundColor: 'var(--panel-bg)',
  },
  flipHint: {
    textAlign: 'center',
    fontSize: '1rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  cardContent: {
    fontSize: '1.2rem',
    lineHeight: '1.6',
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: 'var(--accent-color)',
    borderRadius: '4px',
    minHeight: '200px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    overflowY: 'auto',
    color: 'var(--text-color)',
  },
  cardText: {
    whiteSpace: 'pre-line', // Preserve line breaks and wrap text
  },
  qualityButtons: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '1.5rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  qualityButton0: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--danger-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  qualityButton1: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--warning-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  qualityButton2: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--success-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  qualityButton3: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--info-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  buttons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  resultButton: {
    padding: '1rem',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  error: {
    color: 'var(--danger-color)',
    padding: '1rem',
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  message: {
    textAlign: 'center',
    fontSize: '1.5rem',
    color: 'var(--text-muted)',
    marginBottom: '2rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    backgroundColor: 'var(--primary-color)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  controlsContainer: {
    marginTop: '1.5rem',
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
};

export default ReviewPage;

