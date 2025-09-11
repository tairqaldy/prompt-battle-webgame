const express = require('express');

const app = express();
const PORT = 3000;

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
