/**
 * Difficulty Analysis System for Prompt Battle WebGame
 * Analyzes all prompts in the dataset and classifies them by difficulty level
 */

const fs = require('fs');
const path = require('path');

class DifficultyAnalyzer {
    constructor() {
        this.difficultyFactors = {
            // Word count factors
            wordCount: {
                easy: { min: 1, max: 8 },
                medium: { min: 9, max: 15 },
                hard: { min: 16, max: 50 }
            },
            
            // Complexity indicators
            complexityKeywords: {
                easy: ['photo', 'image', 'picture', 'simple', 'basic', 'clear', 'cute', 'young', 'standing', 'sitting'],
                medium: ['style', 'art', 'painting', 'drawing', 'render', 'design', 'fashion', 'show', 'old', 'fashioned', 'photograph'],
                hard: ['installation', 'claymation', 'fisheye', 'DSLR', 'Rembrandt', 'vector', '3D', 'barbershop', 'microtome', 'cyprinodont', 'tenement', 'caricature', 'pop', 'art', 'piece']
            },
            
            // Named entities and specific references
            namedEntities: {
                easy: 0, // No specific names
                medium: 1, // 1-2 specific references
                hard: 3   // 3+ specific references
            },
            
            // Art style references
            artStyles: {
                easy: ['photo', 'image'],
                medium: ['painting', 'drawing', 'render'],
                hard: ['Rembrandt', 'claymation', 'vector', 'DSLR', 'fisheye', 'installation']
            },
            
            // Abstract concepts
            abstractConcepts: {
                easy: ['standing', 'sitting', 'walking', 'holding'],
                medium: ['fashion show', 'dangerous', 'elastic', 'frightening'],
                hard: ['installation art piece', 'cyprinodont', 'tenement', 'microtome']
            }
        };
        
        this.difficultyWeights = {
            wordCount: 0.3,
            complexityKeywords: 0.25,
            namedEntities: 0.2,
            artStyles: 0.15,
            abstractConcepts: 0.1
        };
    }

    /**
     * Analyze a single prompt and return difficulty score
     * @param {string} prompt - The prompt text to analyze
     * @returns {object} Difficulty analysis result
     */
    analyzePrompt(prompt) {
        const words = prompt.toLowerCase().split(/\s+/);
        const wordCount = words.length;
        
        let scores = {
            wordCount: 0,
            complexityKeywords: 0,
            namedEntities: 0,
            artStyles: 0,
            abstractConcepts: 0
        };
        
        // 1. Word Count Analysis
        if (wordCount <= this.difficultyFactors.wordCount.easy.max) {
            scores.wordCount = 1; // Easy
        } else if (wordCount <= this.difficultyFactors.wordCount.medium.max) {
            scores.wordCount = 2; // Medium
        } else {
            scores.wordCount = 3; // Hard
        }
        
        // 2. Complexity Keywords Analysis
        const complexityScore = this.analyzeComplexityKeywords(words);
        scores.complexityKeywords = complexityScore;
        
        // 3. Named Entities Analysis
        const namedEntityCount = this.countNamedEntities(prompt);
        if (namedEntityCount === 0) {
            scores.namedEntities = 1; // Easy
        } else if (namedEntityCount <= 2) {
            scores.namedEntities = 2; // Medium
        } else {
            scores.namedEntities = 3; // Hard
        }
        
        // 4. Art Styles Analysis
        const artStyleScore = this.analyzeArtStyles(words);
        scores.artStyles = artStyleScore;
        
        // 5. Abstract Concepts Analysis
        const abstractScore = this.analyzeAbstractConcepts(words);
        scores.abstractConcepts = abstractScore;
        
        // Calculate weighted total score
        let totalScore = 0;
        for (const [factor, weight] of Object.entries(this.difficultyWeights)) {
            totalScore += scores[factor] * weight;
        }
        
        // Determine difficulty level with adjusted thresholds for better distribution
        let difficulty;
        if (totalScore <= 1.8) {
            difficulty = 'easy';
        } else if (totalScore <= 2.3) {
            difficulty = 'medium';
        } else {
            difficulty = 'hard';
        }
        
        // Additional heuristics for better difficulty distribution
        const hasMultipleComplexFactors = Object.values(scores).filter(s => s >= 2).length >= 2;
        const isVeryVerbose = wordCount >= 20;
        const hasSpecificArtStyle = scores.artStyles >= 3;
        
        // Promote to higher difficulty if multiple complex factors present
        if (difficulty === 'medium' && (hasMultipleComplexFactors || isVeryVerbose)) {
            difficulty = 'hard';
        } else if (difficulty === 'easy' && (hasMultipleComplexFactors || hasSpecificArtStyle || wordCount >= 15)) {
            difficulty = 'medium';
        }
        
        return {
            difficulty,
            totalScore,
            scores,
            wordCount,
            namedEntityCount,
            factors: {
                hasComplexKeywords: scores.complexityKeywords >= 2,
                hasArtStyle: scores.artStyles >= 2,
                hasAbstractConcepts: scores.abstractConcepts >= 2,
                isVerbose: scores.wordCount >= 2
            }
        };
    }
    
    /**
     * Analyze complexity keywords in the prompt
     */
    analyzeComplexityKeywords(words) {
        let easyCount = 0;
        let mediumCount = 0;
        let hardCount = 0;
        
        words.forEach(word => {
            if (this.difficultyFactors.complexityKeywords.easy.includes(word)) {
                easyCount++;
            } else if (this.difficultyFactors.complexityKeywords.medium.includes(word)) {
                mediumCount++;
            } else if (this.difficultyFactors.complexityKeywords.hard.includes(word)) {
                hardCount++;
            }
        });
        
        // Return difficulty score based on most prevalent complexity
        if (hardCount > mediumCount && hardCount > easyCount) return 3;
        if (mediumCount > easyCount) return 2;
        return 1;
    }
    
    /**
     * Count named entities (proper nouns, specific names)
     */
    countNamedEntities(prompt) {
        // Look for capitalized words that are likely names/entities
        const words = prompt.split(/\s+/);
        let entityCount = 0;
        
        const commonNames = [
            'Henry', 'VIII', 'Fox', 'Mulder', 'Shyster', 'Krusty', 'Clown',
            'Judge', 'Joe', 'Dredd', 'Eddard', 'Stark', 'Rembrandt',
            'Riesling', 'Hoopoe', 'Promoter', 'HamBurglar', 'Antonio',
            'Salieri', 'Britney', 'Spears', 'Rain', 'Man'
        ];
        
        words.forEach(word => {
            // Check for proper nouns (capitalized words)
            if (word.length > 1 && word[0] === word[0].toUpperCase()) {
                entityCount++;
            }
            // Check for known names
            if (commonNames.some(name => word.toLowerCase().includes(name.toLowerCase()))) {
                entityCount++;
            }
        });
        
        return entityCount;
    }
    
    /**
     * Analyze art style references
     */
    analyzeArtStyles(words) {
        let score = 1; // Default to easy
        
        words.forEach(word => {
            if (this.difficultyFactors.artStyles.easy.includes(word)) {
                score = Math.max(score, 1);
            } else if (this.difficultyFactors.artStyles.medium.includes(word)) {
                score = Math.max(score, 2);
            } else if (this.difficultyFactors.artStyles.hard.includes(word)) {
                score = Math.max(score, 3);
            }
        });
        
        return score;
    }
    
    /**
     * Analyze abstract concepts
     */
    analyzeAbstractConcepts(words) {
        let score = 1; // Default to easy
        
        words.forEach(word => {
            if (this.difficultyFactors.abstractConcepts.easy.includes(word)) {
                score = Math.max(score, 1);
            } else if (this.difficultyFactors.abstractConcepts.medium.includes(word)) {
                score = Math.max(score, 2);
            } else if (this.difficultyFactors.abstractConcepts.hard.includes(word)) {
                score = Math.max(score, 3);
            }
        });
        
        return score;
    }
    
    /**
     * Process entire dataset and add difficulty classifications
     */
    async processDataset() {
        console.log('Starting dataset difficulty analysis...');
        
        const csvPath = path.join(__dirname, 'dataset', 'custom_prompts_df.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf8');
        const lines = csvContent.split('\n').filter(line => line.trim());
        
        const header = lines[0];
        const dataLines = lines.slice(1);
        
        console.log(`Processing ${dataLines.length} prompts...`);
        
        const results = [];
        const difficultyStats = { easy: 0, medium: 0, hard: 0 };
        
        dataLines.forEach((line, index) => {
            const [prompt, imageFile] = line.split(',');
            if (!prompt || !imageFile) return;
            
            const analysis = this.analyzePrompt(prompt);
            difficultyStats[analysis.difficulty]++;
            
            results.push({
                prompt: prompt,
                image_file: imageFile,
                difficulty: analysis.difficulty,
                difficulty_score: Math.round(analysis.totalScore * 100) / 100,
                word_count: analysis.wordCount,
                named_entities: analysis.namedEntityCount,
                has_complex_keywords: analysis.factors.hasComplexKeywords,
                has_art_style: analysis.factors.hasArtStyle,
                has_abstract_concepts: analysis.factors.hasAbstractConcepts,
                is_verbose: analysis.factors.isVerbose
            });
            
            if ((index + 1) % 100 === 0) {
                console.log(`Processed ${index + 1}/${dataLines.length} prompts...`);
            }
        });
        
        console.log('\nDifficulty Distribution:');
        console.log(`Easy: ${difficultyStats.easy} (${Math.round(difficultyStats.easy / dataLines.length * 100)}%)`);
        console.log(`Medium: ${difficultyStats.medium} (${Math.round(difficultyStats.medium / dataLines.length * 100)}%)`);
        console.log(`Hard: ${difficultyStats.hard} (${Math.round(difficultyStats.hard / dataLines.length * 100)}%)`);
        
        // Write updated CSV with difficulty information
        const outputPath = path.join(__dirname, 'dataset', 'custom_prompts_with_difficulty.csv');
        const headers = [
            'prompt', 'image_file', 'difficulty', 'difficulty_score', 
            'word_count', 'named_entities', 'has_complex_keywords',
            'has_art_style', 'has_abstract_concepts', 'is_verbose'
        ];
        
        const csvOutput = [headers.join(',')];
        results.forEach(result => {
            const row = headers.map(header => {
                const value = result[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            });
            csvOutput.push(row.join(','));
        });
        
        fs.writeFileSync(outputPath, csvOutput.join('\n'));
        console.log(`\nUpdated dataset saved to: ${outputPath}`);
        
        return {
            results,
            stats: difficultyStats,
            outputPath
        };
    }
}

// Export for use in other modules
module.exports = DifficultyAnalyzer;

// Run analysis if called directly
if (require.main === module) {
    const analyzer = new DifficultyAnalyzer();
    analyzer.processDataset()
        .then(result => {
            console.log('\n✅ Dataset difficulty analysis completed successfully!');
            console.log(`📊 Total prompts analyzed: ${result.results.length}`);
        })
        .catch(error => {
            console.error('❌ Error processing dataset:', error);
            process.exit(1);
        });
}
