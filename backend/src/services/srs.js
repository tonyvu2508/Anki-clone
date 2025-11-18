/**
 * SM-2 Simplified Spaced Repetition Algorithm
 * @param {Object} card - Card document with current SRS fields
 * @param {Number} quality - Quality of recall: 0=Again, 1=Hard, 2=Good, 3=Easy
 * @returns {Object} - Updated SRS fields
 */
function updateSRS(card, quality) {
  let { interval, ef, repetitions, dueDate } = card;
  const dayMs = 24 * 60 * 60 * 1000;
  let intervalDaysForDue = interval;
  
  // Quality: 0=Again, 1=Hard, 2=Good, 3=Easy
  if (quality === 0) {
    // Failed - immediate retry
    repetitions = 0;
    interval = 0;
    intervalDaysForDue = 0; // Due immediately (will still be queued locally)
  } else {
    // Success
    repetitions += 1;
    
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * ef);
    }
    
    // Update ease factor
    ef = ef + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
    if (ef < 1.3) {
      ef = 1.3;
    }
    
    // Hard (quality=1) should reappear after 1 hour
    if (quality === 1 && interval > 0) {
      intervalDaysForDue = 1 / 24; // 1 hour
      interval = intervalDaysForDue;
    } else {
      intervalDaysForDue = interval;
    }
  }
  
  // Calculate new due date
  const now = new Date();
  const dueOffset = intervalDaysForDue * dayMs;
  dueDate = new Date(now.getTime() + dueOffset);
  
  return {
    interval,
    ef,
    repetitions,
    dueDate
  };
}

module.exports = {
  updateSRS
};

