import client from './client';

export const getCards = (itemId) => {
  return client.get(`/items/${itemId}/cards`);
};

export const createCard = (itemId, data) => {
  return client.post(`/items/${itemId}/cards`, data);
};

export const getCard = (id) => {
  return client.get(`/cards/${id}`);
};

export const updateCard = (id, data) => {
  return client.put(`/cards/${id}`, data);
};

export const deleteCard = (id) => {
  return client.delete(`/cards/${id}`);
};

export const getDeckCards = (deckId) => {
  return client.get(`/decks/${deckId}/cards`);
};

