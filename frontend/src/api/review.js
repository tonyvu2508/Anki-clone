import client from './client';

export const getTodayCards = (deckId = null, itemId = null, includeAll = false) => {
  const params = {};
  if (deckId) params.deckId = deckId;
  if (itemId) params.itemId = itemId;
  if (includeAll) params.includeAll = 'true';
  return client.get('/review/today', { params });
};

export const getItemTreeCards = (itemId, includeAll = false) => {
  const params = {};
  if (includeAll) params.includeAll = 'true';
  return client.get(`/review/item/${itemId}/tree`, { params });
};

export const submitReviewResult = (cardId, quality) => {
  return client.post(`/review/${cardId}/result`, { quality });
};

