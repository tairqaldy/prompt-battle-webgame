/**
 * Main Lobby page functionality
 */

import { getJson } from './api.js';

// Initialize lobby page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Main Lobby page loaded');
    
    // Test API connection
    try {
        const health = await getJson('/api/health');
        console.log('API health check:', health);
    } catch (error) {
        console.error('Failed to connect to API:', error);
    }
});
