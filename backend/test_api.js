// Using built-in fetch (Node 18+)

async function testAPI() {
  const baseUrl = 'http://localhost:3000';
  
  try {
    console.log('Testing API endpoints...');
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test room creation
    console.log('\n2. Testing room creation...');
    const createResponse = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { test: true } })
    });
    const createData = await createResponse.json();
    console.log('✅ Room created:', createData);
    
    if (createData.success) {
      const roomCode = createData.room.code;
      
      // Test joining room
      console.log('\n3. Testing player join...');
      const joinResponse = await fetch(`${baseUrl}/api/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: 'TestPlayer' })
      });
      const joinData = await joinResponse.json();
      console.log('✅ Player joined:', joinData);
      
      // Test getting players
      console.log('\n4. Testing get players...');
      const playersResponse = await fetch(`${baseUrl}/api/rooms/${roomCode}/players`);
      const playersData = await playersResponse.json();
      console.log('✅ Players retrieved:', playersData);
      
      // Test starting game
      console.log('\n5. Testing start game...');
      const startResponse = await fetch(`${baseUrl}/api/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const startData = await startResponse.json();
      console.log('✅ Game started:', startData);
      
      if (startData.success) {
        const roundId = startData.game.roundId;
        
        // Test submitting prompt
        console.log('\n6. Testing prompt submission...');
        const submitResponse = await fetch(`${baseUrl}/api/rounds/${roundId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            playerName: 'TestPlayer', 
            promptText: 'A person climbing mountains with a vehicle nearby' 
          })
        });
        const submitData = await submitResponse.json();
        console.log('✅ Prompt submitted:', submitData);
        
        // Test getting results
        console.log('\n7. Testing get results...');
        const resultsResponse = await fetch(`${baseUrl}/api/rounds/${roundId}/results`);
        const resultsData = await resultsResponse.json();
        console.log('✅ Results retrieved:', resultsData);
      }
    }
    
    console.log('\n🎉 All API tests completed!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('Make sure the server is running on http://localhost:3000');
  }
}

testAPI();
