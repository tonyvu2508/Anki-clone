import { createContext, useContext, useMemo, useRef, useState, useCallback, useEffect } from 'react';
import '../styles/GlobalAudioPlayer.css';

const AudioPlayerContext = createContext(null);

const trackDefaults = {
  deckId: null,
  title: '',
  src: '',
  mimeType: '',
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

  const playDeckAudio = useCallback(async ({ deckId, title, src, mimeType = 'audio/mpeg' }) => {
    if (!src) return;
    if (!audioRef.current) return;

    try {
      setIsLoading(true);
      setError('');
      
      const normalizedSrc = src.toString();
      const audio = audioRef.current;
      
      // Check if this is a different source than what's currently playing
      const isDifferentSource = track.src !== normalizedSrc || track.deckId !== deckId;
      
      if (isDifferentSource) {
        // Stop current audio completely
        audio.pause();
        audio.currentTime = 0;
        
        // Clear existing sources
        while (audio.firstChild) {
          audio.removeChild(audio.firstChild);
        }
        audio.removeAttribute('src');
        audio.load(); // Reset the audio element
        
        // Small delay to ensure audio element is reset
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Create and add source element with proper MIME type
        const source = document.createElement('source');
        source.src = normalizedSrc;
        source.type = mimeType;
        audio.appendChild(source);
        
        // Wait for audio to be ready before playing
        await new Promise((resolve, reject) => {
          const handleCanPlay = () => {
            cleanup();
            resolve();
          };
          
          const handleError = (e) => {
            cleanup();
            const errorMsg = audio.error 
              ? `Media error: ${audio.error.message || 'Unknown error'}`
              : 'Failed to load audio';
            reject(new Error(errorMsg));
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
        // Same source - just resume or restart from beginning
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
      
      // Update track state first
      setTrack({
        deckId,
        title,
        src,
        mimeType,
        isVisible: true,
      });
      
      // Now play
      await audio.play();
      setError('');
    } catch (err) {
      console.error('Failed to play audio', err);
      const mediaErrorCode = audioRef.current?.error?.code;
      const errorMessage = audioRef.current?.error?.message;
      const reason = mediaErrorCode
        ? `Media error code ${mediaErrorCode}${errorMessage ? `: ${errorMessage}` : ''}`
        : err?.message || 'Failed to play audio';
      setError(reason);
    } finally {
      setIsLoading(false);
    }
  }, [track.src, track.deckId]);

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
    const audio = audioRef.current;
    audio.pause();
    // Clear sources
    while (audio.firstChild) {
      audio.removeChild(audio.firstChild);
    }
    audio.removeAttribute('src');
    audio.load();
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

