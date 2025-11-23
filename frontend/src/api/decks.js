import client from './client';

export const getDecks = () => {
  return client.get('/decks');
};

export const createDeck = (title) => {
  return client.post('/decks', { title });
};

export const getDeck = (id) => {
  return client.get(`/decks/${id}`);
};

export const updateDeck = (id, data) => {
  return client.put(`/decks/${id}`, data);
};

export const togglePublicDeck = (id) => {
  return client.post(`/decks/${id}/toggle-public`);
};

export const deleteDeck = (id) => {
  return client.delete(`/decks/${id}`);
};

export const exportDeck = async (id) => {
  const response = await client.get(`/decks/${id}/export`);
  
  // Create JSON string and download
  const jsonString = JSON.stringify(response.data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Get filename from Content-Disposition header or use default
  const contentDisposition = response.headers['content-disposition'];
  let filename = 'deck-export.json';
  if (contentDisposition) {
    const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
    if (filenameMatch) {
      filename = filenameMatch[1];
    }
  }
  
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const importDeck = (deckData) => {
  return client.post('/decks/import', { deckData });
};

export const generateTreeCards = (deckId, itemId = null, separator = '\n') => {
  return client.post(`/decks/${deckId}/generate-tree-cards`, { itemId, separator });
};

export const uploadDeckAudio = (deckId, file) => {
  const formData = new FormData();
  formData.append('audioFile', file);
  return client.post(`/decks/${deckId}/audio`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteDeckAudio = (deckId, audioId) => {
  return client.delete(`/decks/${deckId}/audio/${audioId}`);
};
