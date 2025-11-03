const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.ANALYTICS_PORT || 3002;
const ANALYTICS_FILE = path.join(__dirname, 'analytics.json');

// Serve static files
app.use(express.static(__dirname));

// API endpoint to get analytics data
app.get('/api/analytics', (req, res) => {
  try {
    if (!fs.existsSync(ANALYTICS_FILE)) {
      return res.json([]);
    }
    const data = fs.readFileSync(ANALYTICS_FILE, 'utf-8');
    const analytics = data.trim() ? JSON.parse(data) : [];
    res.json(analytics);
  } catch (error) {
    console.error('Error reading analytics:', error);
    res.status(500).json({ error: 'Failed to read analytics data' });
  }
});

// Serve the dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(PORT, () => {
  console.log(`📊 Analytics dashboard running at http://localhost:${PORT}`);
  console.log(`💡 Open this URL in your browser to view monitoring patterns`);
});
