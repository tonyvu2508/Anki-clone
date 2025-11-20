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

  const setAudioRef = useCallback((node) => {
    audioRef.current = node || null;
    setAudioElement(node || null);
  }, []);

  const playDeckAudio = useCallback(async ({ deckId, title, src }) => {
    if (!src) return;
    try {
      if (audioRef.current) {
        if (audioRef.current.src !== src) {
          audioRef.current.src = src;
        }
        await audioRef.current.play();
        setTrack({
          deckId,
          title,
          src,
          isVisible: true,
        });
        setError('');
      }
    } catch (err) {
      console.error('Failed to play audio', err);
      setError(err?.message || 'Failed to play audio');
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
      error,
      playDeckAudio,
      pauseAudio,
      resumeAudio,
      restartAudio,
      stopAudio,
      audioRef,
    }),
    [track, isPlaying, error, playDeckAudio, pauseAudio, resumeAudio, restartAudio, stopAudio]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
      <div className={`global-audio-player ${track.isVisible ? 'visible' : ''}`}>
        <div className="global-audio-info">
          <div className="global-audio-title">{track.title || 'Deck audio'}</div>
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

