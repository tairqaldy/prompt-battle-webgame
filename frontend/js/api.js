/**
 * API utility functions for Prompt Battle WebGame
 * Provides simple helpers for making HTTP requests
 */

/**
 * Make a GET request and return parsed JSON
 * @param {string} url - The URL to fetch
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function getJson(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('GET request failed:', error);
        throw error;
    }
}

/**
 * Make a POST request and return parsed JSON
 * @param {string} url - The URL to post to
 * @param {Object} body - The request body to send
 * @returns {Promise<Object>} Parsed JSON response
 */
export async function postJson(url, body) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('POST request failed:', error);
        throw error;
    }
}
