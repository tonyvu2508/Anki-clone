import client from './client';

export const register = (email, password) => {
  return client.post('/auth/register', { email, password });
};

export const login = (email, password) => {
  return client.post('/auth/login', { email, password });
};

