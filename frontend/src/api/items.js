import client from './client';

export const getItems = (deckId, parentId = null) => {
  const params = parentId !== null ? { parentId } : {};
  return client.get(`/decks/${deckId}/items`, { params });
};

export const createItem = (deckId, data) => {
  return client.post(`/decks/${deckId}/items`, data);
};

export const getItem = (id) => {
  return client.get(`/items/${id}`);
};

export const updateItem = (id, data) => {
  return client.put(`/items/${id}`, data);
};

export const deleteItem = (id) => {
  return client.delete(`/items/${id}`);
};

export const getItemPath = (id) => {
  return client.get(`/items/${id}/path`);
};

export const generateItemCard = (id, separator = '\n', overwrite = false) => {
  return client.post(`/items/${id}/generate-card`, { separator, overwrite });
};

