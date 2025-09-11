/**
 * Scoring module for Prompt Battle WebGame
 * Provides deterministic, explainable scoring between original and attempt prompts
 */

/**
 * Normalize text for comparison
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
function normalizeText(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')     // Replace multiple spaces with single space
    .trim();
}

/**
 * Extract words from text
 * @param {string} text - Text to extract words from
 * @returns {Array} Array of unique words
 */
function extractWords(text) {
  const normalized = normalizeText(text);
  const words = normalized.split(' ').filter(word => word.length > 0);
  return [...new Set(words)]; // Remove duplicates
}

/**
 * Calculate word overlap between two texts
 * @param {string} original - Original text
 * @param {string} attempt - Attempt text
 * @returns {object} Overlap analysis
 */
function calculateWordOverlap(original, attempt) {
  const originalWords = extractWords(original);
  const attemptWords = extractWords(attempt);
  
  const matchedWords = originalWords.filter(word => 
    attemptWords.includes(word)
  );
  
  const missedWords = originalWords.filter(word => 
    !attemptWords.includes(word)
  );
  
  const extraWords = attemptWords.filter(word => 
    !originalWords.includes(word)
  );
  
  return {
    matched: matchedWords,
    missed: missedWords,
    extra: extraWords,
    originalCount: originalWords.length,
    attemptCount: attemptWords.length,
    matchedCount: matchedWords.length
  };
}

/**
 * Calculate semantic similarity score
 * @param {string} original - Original prompt
 * @param {string} attempt - Attempt prompt
 * @returns {number} Similarity score (0-100)
 */
function calculateSemanticScore(original, attempt) {
  const overlap = calculateWordOverlap(original, attempt);
  
  // Base score from word overlap
  let score = 0;
  
  if (overlap.originalCount > 0) {
    // Primary score: percentage of original words matched
    const wordMatchScore = (overlap.matchedCount / overlap.originalCount) * 70;
    
    // Secondary score: penalty for extra words (but not too harsh)
    const extraPenalty = Math.min(overlap.extra.length * 2, 20);
    
    // Tertiary score: length similarity bonus
    const lengthBonus = 0;
    if (Math.abs(overlap.originalCount - overlap.attemptCount) <= 2) {
      lengthBonus = 10; // Small bonus for similar length
    }
    
    score = Math.max(0, wordMatchScore - extraPenalty + lengthBonus);
  }
  
  // Bonus for exact phrase matches (case insensitive)
  const originalLower = original.toLowerCase();
  const attemptLower = attempt.toLowerCase();
  
  if (originalLower === attemptLower) {
    score = 100; // Perfect match
  } else if (attemptLower.includes(originalLower) || originalLower.includes(attemptLower)) {
    score = Math.max(score, 85); // High score for substring matches
  }
  
  // Bonus for key concept matches (simple keyword weighting)
  const keyConcepts = ['mountain', 'climbing', 'person', 'vehicle', 'car', 'jeep', 'path', 'road'];
  const keyMatches = keyConcepts.filter(concept => 
    originalLower.includes(concept) && attemptLower.includes(concept)
  );
  
  if (keyMatches.length > 0) {
    score += keyMatches.length * 5; // Small bonus for key concepts
  }
  
  return Math.min(100, Math.round(score));
}

/**
 * Score a player's attempt against the original prompt
 * @param {string} original - The original prompt used to generate the image
 * @param {string} attempt - The player's attempt prompt
 * @returns {object} Score result with score, matched, and missed components
 */
function scoreAttempt(original, attempt) {
  if (!original || !attempt) {
    throw new Error('Both original and attempt prompts are required');
  }

  if (original.trim().length === 0 || attempt.trim().length === 0) {
    return {
      score: 0,
      matched: [],
      missed: extractWords(original),
      explanation: 'Empty prompt submitted'
    };
  }

  const overlap = calculateWordOverlap(original, attempt);
  const score = calculateSemanticScore(original, attempt);
  
  return {
    score: score,
    matched: overlap.matched,
    missed: overlap.missed,
    extra: overlap.extra,
    explanation: generateExplanation(score, overlap),
    details: {
      originalWordCount: overlap.originalCount,
      attemptWordCount: overlap.attemptCount,
      matchedWordCount: overlap.matchedCount,
      extraWordCount: overlap.extra.length
    }
  };
}

/**
 * Generate human-readable explanation of the score
 * @param {number} score - Calculated score
 * @param {object} overlap - Word overlap analysis
 * @returns {string} Explanation text
 */
function generateExplanation(score, overlap) {
  const matchedCount = overlap.matchedCount;
  const totalOriginal = overlap.originalCount;
  const missedCount = overlap.missed.length;
  const extraCount = overlap.extra.length;
  
  let explanation = `You matched ${matchedCount} out of ${totalOriginal} key words from the original prompt. `;
  
  if (score >= 90) {
    explanation += "Excellent! You captured almost everything important.";
  } else if (score >= 70) {
    explanation += "Great job! You got most of the key concepts.";
  } else if (score >= 50) {
    explanation += "Good attempt! You got some key words but missed others.";
  } else if (score >= 30) {
    explanation += "Not bad, but you missed several important elements.";
  } else {
    explanation += "Try to focus on the main subjects and actions in the image.";
  }
  
  if (missedCount > 0) {
    explanation += ` You missed: ${overlap.missed.slice(0, 3).join(', ')}`;
    if (missedCount > 3) explanation += ` and ${missedCount - 3} more.`;
  }
  
  if (extraCount > 0) {
    explanation += ` You also included some extra words not in the original.`;
  }
  
  return explanation;
}

/**
 * Get scoring statistics for a round
 * @param {Array} results - Array of scoring results
 * @returns {object} Statistics
 */
function getScoringStats(results) {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return { average: 0, highest: 0, lowest: 0, count: 0 };
  }
  
  const scores = results.map(r => r.score || 0);
  const sum = scores.reduce((a, b) => a + b, 0);
  
  return {
    average: Math.round(sum / scores.length),
    highest: Math.max(...scores),
    lowest: Math.min(...scores),
    count: scores.length,
    median: scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)]
  };
}

module.exports = {
  scoreAttempt,
  calculateWordOverlap,
  calculateSemanticScore,
  getScoringStats,
  normalizeText,
  extractWords
};
