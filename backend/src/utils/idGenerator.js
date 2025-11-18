/**
 * Generate a unique 6-character alphanumeric ID
 * Uses uppercase letters and numbers (A-Z, 0-9) = 36 characters
 * Total combinations: 36^6 = 2,176,782,336
 */
function generatePublicId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a unique public ID that doesn't exist in the database
 * @param {Function} checkExists - Function to check if ID exists (returns Promise<boolean>)
 * @param {Number} maxAttempts - Maximum attempts to generate unique ID
 * @returns {Promise<String>} - Unique public ID
 */
async function generateUniquePublicId(checkExists, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const id = generatePublicId();
    const exists = await checkExists(id);
    if (!exists) {
      return id;
    }
  }
  throw new Error('Failed to generate unique public ID after maximum attempts');
}

module.exports = {
  generatePublicId,
  generateUniquePublicId
};

