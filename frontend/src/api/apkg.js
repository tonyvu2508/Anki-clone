import client from './client';

export const importApkg = (formData) => {
  return client.post('/apkg/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

