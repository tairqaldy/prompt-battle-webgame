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
    const wordMatchScore = (overlap.matchedCount / overlap.originalCount) * 60;
    
    // Secondary score: penalty for extra words (but not too harsh)
    const extraPenalty = Math.min(overlap.extra.length * 1.5, 15);
    
    // Tertiary score: length similarity bonus
    let lengthBonus = 0;
    const lengthRatio = Math.min(overlap.attemptCount, overlap.originalCount) / Math.max(overlap.attemptCount, overlap.originalCount);
    if (lengthRatio >= 0.8) {
      lengthBonus = 10; // Bonus for similar length
    } else if (lengthRatio >= 0.6) {
      lengthBonus = 5; // Smaller bonus
    }
    
    score = Math.max(0, wordMatchScore - extraPenalty + lengthBonus);
  }
  
  // Bonus for exact phrase matches (case insensitive)
  const originalLower = original.toLowerCase();
  const attemptLower = attempt.toLowerCase();
  
  if (originalLower === attemptLower) {
    score = 100; // Perfect match
  } else if (attemptLower.includes(originalLower) || originalLower.includes(attemptLower)) {
    score = Math.max(score, 90); // High score for substring matches
  }
  
  // Enhanced semantic matching for common AI art concepts
  const semanticCategories = {
    // Characters and people
    people: ['person', 'man', 'woman', 'child', 'boy', 'girl', 'people', 'character', 'figure', 'human', 'individual', 'someone', 'guy', 'lady'],
    // Actions and activities
    actions: ['standing', 'sitting', 'walking', 'running', 'jumping', 'climbing', 'eating', 'drinking', 'playing', 'working', 'holding', 'carrying', 'wearing', 'looking', 'smiling', 'laughing'],
    // Objects and items
    objects: ['car', 'vehicle', 'house', 'building', 'tree', 'mountain', 'road', 'path', 'table', 'chair', 'book', 'phone', 'umbrella', 'frisbee', 'clock', 'apple', 'barbershop', 'train', 'laptop', 'cabin', 'village', 'factory', 'bar', 'spaceship', 'tenement', 'cutter', 'sand', 'fence', 'plant', 'fruits', 'vegetables', 'cyprinodont', 'installation', 'art', 'piece', 'claymation', 'dslr', 'photograph', 'rembrandt', 'painting', 'riesling', 'hoopoe', 'curve', 'fisheye', 'lens'],
    // Art styles and techniques
    styles: ['painting', 'drawing', 'photograph', 'photo', 'render', '3d', 'vector', 'digital', 'oil', 'watercolor', 'sketch', 'style', 'fashion', 'show', 'batters', 'box', 'pitcher', 'pitches', 'elastic', 'frightening', 'father', 'throwing', 'white', 'fresh', 'bumpy', 'green', 'wild', 'daring', 'boys', 'sitting', 'tall', 'building', 'big', 'city', 'average', 'young', 'men', 'tilting', 'around'],
    // Colors and visual properties
    colors: ['red', 'blue', 'green', 'yellow', 'black', 'white', 'colorful', 'bright', 'dark', 'light', 'golden', 'silver', 'brown', 'purple', 'orange', 'pink', 'gray', 'grey'],
    // Settings and environments
    settings: ['indoor', 'outdoor', 'street', 'park', 'forest', 'city', 'village', 'beach', 'mountain', 'desert', 'town', 'factory', 'bar', 'cabin', 'village', 'spaceship', 'tenement', 'installation', 'art', 'piece', 'big', 'city'],
    // Time and weather
    time: ['day', 'night', 'morning', 'evening', 'sunny', 'cloudy', 'rainy', 'snowy', 'foggy', 'old', 'fashioned', 'photograph', 'soft', 'pretzel', 'street', 'lights', 'night', 'young', 'man', 'eating', 'plant', 'fence', 'style', 'old', 'fashioned', 'photograph', 'clown', 'cutter', 'playing', 'sand', 'style', 'vector', 'drawing', 'judge', 'fashion', 'show', 'town', 'batters', 'box', 'pitcher', 'pitches', 'style', '3d', 'render', 'elastic', 'old', 'man', 'saying', 'something', 'frightening', 'father', 'throwing', 'white', 'frisbee', 'factory', 'selling', 'fresh', 'fruits', 'vegetables', 'bumpy', 'clock', 'cyprinodont', 'tenement', 'cabin', 'style', 'installation', 'art', 'piece', 'green', 'wild', 'apple', 'village', 'style', 'claymation', 'figure', 'group', 'daring', 'boys', 'sitting', 'tall', 'building', 'spaceship', 'style', 'dslr', 'photograph', 'barbershop', 'umbrella', 'train', 'style', 'rembrandt', 'painting', 'dangerous', 'riesling', 'bar', 'four', 'average', 'young', 'men', 'tilting', 'curve', 'style', 'fisheye', 'lens', 'photograph', 'drawing', 'hoopoe', 'leaning', 'laptop', 'big', 'city']
  };
  
  // Calculate semantic category matches
  let semanticBonus = 0;
  for (const [category, keywords] of Object.entries(semanticCategories)) {
    const originalMatches = keywords.filter(keyword => originalLower.includes(keyword));
    const attemptMatches = keywords.filter(keyword => attemptLower.includes(keyword));
    
    if (originalMatches.length > 0 && attemptMatches.length > 0) {
      const categoryScore = (attemptMatches.length / originalMatches.length) * 5;
      semanticBonus += Math.min(categoryScore, 10); // Cap per category
    }
  }
  
  score += semanticBonus;
  
  // Bonus for maintaining word order (partial)
  const originalWords = originalLower.split(/\s+/);
  const attemptWords = attemptLower.split(/\s+/);
  let orderBonus = 0;
  
  if (originalWords.length > 1 && attemptWords.length > 1) {
    let consecutiveMatches = 0;
    let maxConsecutive = 0;
    
    for (let i = 0; i < originalWords.length - 1; i++) {
      const currentWord = originalWords[i];
      const nextWord = originalWords[i + 1];
      
      const currentIndex = attemptWords.indexOf(currentWord);
      const nextIndex = attemptWords.indexOf(nextWord);
      
      if (currentIndex !== -1 && nextIndex !== -1 && nextIndex === currentIndex + 1) {
        consecutiveMatches++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
      } else {
        consecutiveMatches = 0;
      }
    }
    
    if (maxConsecutive > 0) {
      orderBonus = Math.min(maxConsecutive * 3, 15); // Bonus for word order
    }
  }
  
  score += orderBonus;
  
  // Penalty for completely unrelated content
  if (overlap.matchedCount === 0 && originalWords.length > 3) {
    score = Math.max(0, score - 20); // Penalty for no matches
  }
  
  return Math.min(100, Math.round(score));
}

/**
 * Score a player's attempt against the original prompt with difficulty-based multipliers
 * @param {string} original - The original prompt used to generate the image
 * @param {string} attempt - The player's attempt prompt
 * @param {string} difficulty - Difficulty level: 'easy', 'medium', or 'hard'
 * @param {object} difficultyData - Additional difficulty information
 * @returns {object} Enhanced score result with difficulty multipliers
 */
function scoreAttempt(original, attempt, difficulty = 'medium', difficultyData = {}) {
  if (!original || !attempt) {
    throw new Error('Both original and attempt prompts are required');
  }

  if (original.trim().length === 0 || attempt.trim().length === 0) {
    return {
      score: 0,
      baseScore: 0,
      difficultyMultiplier: 1,
      finalScore: 0,
      matched: [],
      missed: extractWords(original),
      explanation: 'Empty prompt submitted',
      difficulty: difficulty,
      bonuses: []
    };
  }

  const overlap = calculateWordOverlap(original, attempt);
  const baseScore = calculateSemanticScore(original, attempt);
  
  // Calculate difficulty-based multiplier
  const difficultyMultipliers = {
    easy: 1.0,      // Standard scoring
    medium: 1.2,    // 20% bonus for medium difficulty
    hard: 1.5       // 50% bonus for hard difficulty
  };
  
  const multiplier = difficultyMultipliers[difficulty] || 1.0;
  
  // Calculate additional bonuses
  const bonuses = calculateBonuses(original, attempt, overlap, difficultyData);
  
  // Apply bonuses to base score
  let enhancedScore = baseScore;
  bonuses.forEach(bonus => {
    enhancedScore += bonus.points;
  });
  
  // Apply difficulty multiplier
  const finalScore = Math.round(enhancedScore * multiplier);
  
  return {
    score: finalScore,
    baseScore: baseScore,
    difficultyMultiplier: multiplier,
    finalScore: finalScore,
    matched: overlap.matched,
    missed: overlap.missed,
    extra: overlap.extra,
    explanation: generateEnhancedExplanation(finalScore, overlap, difficulty, bonuses, multiplier),
    details: {
      originalWordCount: overlap.originalCount,
      attemptWordCount: overlap.attemptCount,
      matchedWordCount: overlap.matchedCount,
      extraWordCount: overlap.extra.length,
      difficulty: difficulty,
      bonuses: bonuses
    },
    difficulty: difficulty,
    bonuses: bonuses
  };
}

/**
 * Calculate additional scoring bonuses
 * @param {string} original - Original prompt
 * @param {string} attempt - Player's attempt
 * @param {object} overlap - Word overlap analysis
 * @param {object} difficultyData - Difficulty information
 * @returns {Array} Array of bonus objects
 */
function calculateBonuses(original, attempt, overlap, difficultyData) {
  const bonuses = [];
  
  // 1. Conciseness Bonus - Reward for being concise while maintaining accuracy
  const originalWords = original.split(/\s+/).length;
  const attemptWords = attempt.split(/\s+/).length;
  const wordRatio = attemptWords / originalWords;
  
  if (wordRatio <= 0.8 && overlap.matchedCount / overlap.originalCount >= 0.7) {
    bonuses.push({
      type: 'conciseness',
      description: 'Conciseness Bonus',
      points: 5,
      details: `Used ${Math.round((1 - wordRatio) * 100)}% fewer words while maintaining accuracy`
    });
  }
  
  // 2. Creativity Bonus - Reward for creative but valid descriptions
  const creativeWords = ['beautiful', 'stunning', 'dramatic', 'vibrant', 'elegant', 'majestic', 'serene', 'dynamic'];
  const hasCreativeWords = creativeWords.some(word => attempt.toLowerCase().includes(word));
  
  if (hasCreativeWords && overlap.matchedCount >= 3) {
    bonuses.push({
      type: 'creativity',
      description: 'Creativity Bonus',
      points: 3,
      details: 'Added creative descriptive language'
    });
  }
  
  // 3. Technical Accuracy Bonus - Reward for technical terms
  const technicalTerms = ['3D', 'render', 'DSLR', 'fisheye', 'vector', 'claymation', 'installation', 'photograph', 'painting'];
  const technicalMatches = technicalTerms.filter(term => 
    attempt.toLowerCase().includes(term.toLowerCase()) && 
    original.toLowerCase().includes(term.toLowerCase())
  );
  
  if (technicalMatches.length > 0) {
    bonuses.push({
      type: 'technical',
      description: 'Technical Accuracy Bonus',
      points: technicalMatches.length * 2,
      details: `Correctly identified technical terms: ${technicalMatches.join(', ')}`
    });
  }
  
  // 4. Style Recognition Bonus - Reward for identifying art styles
  const artStyles = ['painting', 'drawing', 'photograph', '3D render', 'vector', 'claymation', 'oil', 'watercolor', 'sketch'];
  const styleMatches = artStyles.filter(style => 
    attempt.toLowerCase().includes(style.toLowerCase()) && 
    original.toLowerCase().includes(style.toLowerCase())
  );
  
  if (styleMatches.length > 0) {
    bonuses.push({
      type: 'style',
      description: 'Style Recognition Bonus',
      points: styleMatches.length * 2,
      details: `Correctly identified art styles: ${styleMatches.join(', ')}`
    });
  }
  
  // 5. Perfect Match Bonus
  if (overlap.matchedCount === overlap.originalCount && overlap.extra.length === 0) {
    bonuses.push({
      type: 'perfect',
      description: 'Perfect Match Bonus',
      points: 10,
      details: 'Perfect word-for-word match with no extra words'
    });
  }
  
  return bonuses;
}

/**
 * Generate enhanced explanation with difficulty and bonus information
 * @param {number} score - Final calculated score
 * @param {object} overlap - Word overlap analysis
 * @param {string} difficulty - Difficulty level
 * @param {Array} bonuses - Array of bonus objects
 * @param {number} multiplier - Difficulty multiplier applied
 * @returns {string} Enhanced explanation text
 */
function generateEnhancedExplanation(score, overlap, difficulty, bonuses, multiplier) {
  const matchedCount = overlap.matchedCount;
  const totalOriginal = overlap.originalCount;
  const missedCount = overlap.missed.length;
  const extraCount = overlap.extra.length;
  
  let explanation = `🎯 **Difficulty Level: ${difficulty.toUpperCase()}** (${Math.round((multiplier - 1) * 100)}% bonus)\n\n`;
  explanation += `You matched ${matchedCount} out of ${totalOriginal} key words from the original prompt. `;
  
  // Base score feedback
  const baseScore = Math.round(score / multiplier);
  if (baseScore >= 90) {
    explanation += "🏆 Excellent! You captured almost everything important. This is a very accurate description!";
  } else if (baseScore >= 80) {
    explanation += "🎯 Great job! You got most of the key concepts and details.";
  } else if (baseScore >= 70) {
    explanation += "👍 Good attempt! You captured the main elements well.";
  } else if (baseScore >= 60) {
    explanation += "👌 Not bad! You got some key words but missed others.";
  } else if (baseScore >= 40) {
    explanation += "🤔 Decent effort, but you missed several important elements.";
  } else if (baseScore >= 20) {
    explanation += "📝 Try to focus more on the main subjects, actions, and visual details in the image.";
  } else {
    explanation += "🔄 This doesn't seem to match the image well. Look more carefully at what you see.";
  }
  
  // Add bonus information
  if (bonuses.length > 0) {
    explanation += "\n\n🎁 **Bonuses Earned:**";
    bonuses.forEach(bonus => {
      explanation += `\n• ${bonus.description}: +${bonus.points} points - ${bonus.details}`;
    });
  }
  
  // Show missed and matched words
  if (missedCount > 0) {
    const importantMissed = overlap.missed.slice(0, 5);
    explanation += `\n\n❌ **You missed:** ${importantMissed.join(', ')}`;
    if (missedCount > 5) explanation += ` and ${missedCount - 5} more.`;
  }
  
  if (matchedCount > 0) {
    const importantMatched = overlap.matched.slice(0, 5);
    explanation += `\n\n✅ **You correctly included:** ${importantMatched.join(', ')}`;
    if (matchedCount > 5) explanation += ` and ${matchedCount - 5} more.`;
  }
  
  if (extraCount > 0) {
    explanation += `\n\nℹ️ **Extra words:** ${extraCount} words not in the original.`;
  }
  
  // Difficulty-specific tips
  if (difficulty === 'hard') {
    explanation += `\n\n💡 **Hard Level Tips:**
    • Focus on technical terms and art styles
    • Pay attention to specific details and named entities
    • Complex prompts require more precision`;
  } else if (difficulty === 'medium') {
    explanation += `\n\n💡 **Medium Level Tips:**
    • Balance accuracy with creativity
    • Include both main subjects and artistic style
    • Look for specific visual elements`;
  }
  
  return explanation;
}

/**
 * Generate human-readable explanation of the score (legacy function for backward compatibility)
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
    explanation += "🏆 Excellent! You captured almost everything important. This is a very accurate description!";
  } else if (score >= 80) {
    explanation += "🎯 Great job! You got most of the key concepts and details.";
  } else if (score >= 70) {
    explanation += "👍 Good attempt! You captured the main elements well.";
  } else if (score >= 60) {
    explanation += "👌 Not bad! You got some key words but missed others.";
  } else if (score >= 40) {
    explanation += "🤔 Decent effort, but you missed several important elements.";
  } else if (score >= 20) {
    explanation += "📝 Try to focus more on the main subjects, actions, and visual details in the image.";
  } else {
    explanation += "🔄 This doesn't seem to match the image well. Look more carefully at what you see.";
  }
  
  if (missedCount > 0) {
    const importantMissed = overlap.missed.slice(0, 5);
    explanation += `\n\n❌ You missed these important words: ${importantMissed.join(', ')}`;
    if (missedCount > 5) explanation += ` and ${missedCount - 5} more.`;
  }
  
  if (matchedCount > 0) {
    const importantMatched = overlap.matched.slice(0, 5);
    explanation += `\n\n✅ You correctly included: ${importantMatched.join(', ')}`;
    if (matchedCount > 5) explanation += ` and ${matchedCount - 5} more.`;
  }
  
  if (extraCount > 0) {
    explanation += `\n\nℹ️ You also included some extra words not in the original (${extraCount} words).`;
  }
  
  // Add specific tips based on score
  if (score < 50) {
    explanation += `\n\n💡 Tips for better scoring:
    • Focus on the main subjects and objects
    • Include actions and activities you see
    • Mention the art style or visual quality
    • Describe colors, lighting, and mood
    • Be specific about settings and environments`;
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
