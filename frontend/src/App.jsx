import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DecksPage from './pages/DecksPage';
import DeckPage from './pages/DeckPage';
import ReviewPage from './pages/ReviewPage';
import PublicDeckPage from './pages/PublicDeckPage';
import { getToken } from './utils/auth';
import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider>
      <AudioPlayerProvider>
        <Router>
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/decks" /> : <LoginPage setIsAuthenticated={setIsAuthenticated} />
          } 
        />
        <Route 
          path="/register" 
          element={
            isAuthenticated ? <Navigate to="/decks" /> : <RegisterPage setIsAuthenticated={setIsAuthenticated} />
          } 
        />
        <Route 
          path="/decks" 
          element={
            isAuthenticated ? <DecksPage /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/decks/:id" 
          element={
            isAuthenticated ? <DeckPage /> : <Navigate to="/login" />
          } 
        />
        <Route
          path="/review/item/:itemId"
          element={
            isAuthenticated ? <ReviewPage /> : <Navigate to="/login" />
          }
        />
        <Route 
          path="/review" 
          element={
            isAuthenticated ? <ReviewPage /> : <Navigate to="/login" />
          } 
        />
        <Route 
          path="/public/:publicId" 
          element={<PublicDeckPage />} 
        />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/decks" : "/login"} />} />
      </Routes>
    </Router>
      </AudioPlayerProvider>
    </ThemeProvider>
  );
}

export default App;

