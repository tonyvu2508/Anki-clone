const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function MediaDisplay({ media, side = 'front' }) {
  if (!media || media.length === 0) {
    return null;
  }

  return (
    <div style={styles.container}>
      {media.map((item, index) => {
        const mediaUrl = item.url.startsWith('http') 
          ? item.url 
          : `${API_URL}${item.url}`;

        if (item.type === 'image') {
          return (
            <img
              key={index}
              src={mediaUrl}
              alt={item.filename}
              style={styles.image}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          );
        } else if (item.type === 'audio') {
          return (
            <audio
              key={index}
              controls
              style={styles.audio}
            >
              <source src={mediaUrl} />
              Your browser does not support the audio element.
            </audio>
          );
        } else if (item.type === 'video') {
          return (
            <video
              key={index}
              controls
              style={styles.video}
            >
              <source src={mediaUrl} />
              Your browser does not support the video element.
            </video>
          );
        }
        return null;
      })}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '4px',
    objectFit: 'contain',
  },
  audio: {
    width: '100%',
    maxWidth: '400px',
  },
  video: {
    width: '100%',
    maxWidth: '600px',
    maxHeight: '400px',
    borderRadius: '4px',
  },
};

export default MediaDisplay;

