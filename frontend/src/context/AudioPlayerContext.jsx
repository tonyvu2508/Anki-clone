import { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import '../styles/GlobalAudioPlayer.css';

const AudioPlayerContext = createContext(null);

const trackDefaults = {
  deckId: null,
  title: '',
  src: '',
  isVisible: false,
};

export function AudioPlayerProvider({ children }) {
  const audioRef = useRef(null);
  const [audioElement, setAudioElement] = useState(null);
  const [track, setTrack] = useState(trackDefaults);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!audioElement) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setError('');
    };
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Audio playback error', e);
      setError('Unable to play audio');
    };

    audioElement.addEventListener('play', handlePlay);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);

    return () => {
      audioElement.removeEventListener('play', handlePlay);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
    };
  }, [audioElement]);

  useEffect(() => {
    const offset = track.isVisible ? '120px' : '0px';
    const value = `calc(${offset} + env(safe-area-inset-bottom, 0px))`;
    document.documentElement.style.setProperty('--global-audio-offset', value);

    return () => {
      if (!track.isVisible) {
        document.documentElement.style.removeProperty('--global-audio-offset');
      }
    };
  }, [track.isVisible]);

  const setAudioRef = useCallback((node) => {
    audioRef.current = node || null;
    setAudioElement(node || null);
  }, []);

  const playDeckAudio = useCallback(async ({ deckId, title, src }) => {
    if (!src) return;
    if (!audioRef.current) return;

    try {
      setIsLoading(true);
      setError('');
      
      const normalizedSrc = src.toString();
      const audio = audioRef.current;
      
      // If it's a different source, reset and load new source
      if (audio.src !== normalizedSrc) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        audio.src = normalizedSrc;
        
        // Wait for audio to be ready before playing
        await new Promise((resolve, reject) => {
          // Check if already ready
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
            resolve();
            return;
          }
          
          const handleCanPlay = () => {
            cleanup();
            resolve();
          };
          
          const handleError = (e) => {
            cleanup();
            reject(new Error('Failed to load audio'));
          };
          
          // Timeout after 10 seconds
          const timeout = setTimeout(() => {
            cleanup();
            // Try to resolve anyway - sometimes canplay doesn't fire but audio is playable
            if (audio.readyState >= 1) { // HAVE_METADATA
              resolve();
            } else {
              reject(new Error('Audio loading timeout'));
            }
          }, 10000);
          
          const cleanup = () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
            clearTimeout(timeout);
          };
          
          audio.addEventListener('canplay', handleCanPlay, { once: true });
          audio.addEventListener('error', handleError, { once: true });
          audio.load();
        });
      } else {
        // Same source - check if ready
        if (audio.readyState < 2) {
          // Wait a bit for it to be ready
          await new Promise((resolve) => {
            if (audio.readyState >= 2) {
              resolve();
              return;
            }
            const handleCanPlay = () => {
              audio.removeEventListener('canplay', handleCanPlay);
              resolve();
            };
            audio.addEventListener('canplay', handleCanPlay, { once: true });
            // Don't wait too long if same source
            setTimeout(() => {
              audio.removeEventListener('canplay', handleCanPlay);
              resolve();
            }, 2000);
          });
        }
      }
      
      // Now play
      await audio.play();
      
      setTrack({
        deckId,
        title,
        src,
        isVisible: true,
      });
      setError('');
    } catch (err) {
      console.error('Failed to play audio', err);
      const mediaErrorCode = audioRef.current?.error?.code;
      const reason = mediaErrorCode
        ? `Media error code ${mediaErrorCode}`
        : err?.message || 'Failed to play audio';
      setError(reason);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pauseAudio = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resumeAudio = useCallback(async () => {
    try {
      await audioRef.current?.play();
    } catch (err) {
      console.error('Failed to resume audio', err);
      setError(err?.message || 'Failed to resume audio');
    }
  }, []);

  const restartAudio = useCallback(async () => {
    if (!audioRef.current) return;
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setError('');
    } catch (err) {
      console.error('Failed to restart audio', err);
      setError(err?.message || 'Failed to restart audio');
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.removeAttribute('src');
    audioRef.current.load();
    setTrack(trackDefaults);
    setError('');
  }, []);

  const value = useMemo(
    () => ({
      track,
      isPlaying,
      isLoading,
      error,
      playDeckAudio,
      pauseAudio,
      resumeAudio,
      restartAudio,
      stopAudio,
      audioRef,
    }),
    [track, isPlaying, isLoading, error, playDeckAudio, pauseAudio, resumeAudio, restartAudio, stopAudio]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      <div className={`global-audio-player ${track.isVisible ? 'visible' : ''}`}>
        <div className="global-audio-info">
          <div className="global-audio-title">{track.title || 'Deck audio'}</div>
          {isLoading && <div className="global-audio-loading">Loading audio...</div>}
          {error && <div className="global-audio-error">{error}</div>}
        </div>
        <div className="global-audio-controls">
          <audio ref={setAudioRef} controls preload="auto" />
          {track.isVisible && (
            <button type="button" className="global-audio-stop" onClick={stopAudio}>
              ✕
            </button>
          )}
        </div>
      </div>
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
}

