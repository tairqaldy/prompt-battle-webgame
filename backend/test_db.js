const dbManager = require('./db');

async function testDatabase() {
  try {
    console.log('Testing database operations...');
    
    // Initialize database
    await dbManager.init();
    console.log('✅ Database initialized successfully');
    
    // Test room creation
    const testCode = 'TEST01';
    await dbManager.createRoom(testCode, { test: true });
    console.log('✅ Room created successfully');
    
    // Test getting room
    const room = await dbManager.getRoom(testCode);
    console.log('✅ Room retrieved:', room);
    
    // Test adding player
    await dbManager.addPlayer(testCode, 'TestPlayer');
    console.log('✅ Player added successfully');
    
    // Test getting players
    const players = await dbManager.getRoomPlayers(testCode);
    console.log('✅ Players retrieved:', players);
    
    // Clean up
    await dbManager.deleteRoom(testCode);
    console.log('✅ Room deleted successfully');
    
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    dbManager.close();
    process.exit(0);
  }
}

testDatabase();
