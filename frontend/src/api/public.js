import axios from 'axios';

export const getPublicDeck = (publicId) => {
  // Use a separate client without auth token for public routes
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  const url = `${API_URL}/api/public/decks/${publicId}`;
  
  console.log('Fetching public deck from:', url);
  
  return axios.get(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).catch(error => {
    console.error('Public deck API error:', error);
    console.error('Response:', error.response);
    throw error;
  });
};

