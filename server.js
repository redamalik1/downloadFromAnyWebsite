const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Server is running!', version: '1.0' });
});

// Download endpoint
app.post('/api/download', (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Validate URL format
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Run yt-dlp command
  // This gets the best video format and outputs JSON
  const command = `yt-dlp -f "best" -j "${url}"`;

  exec(command, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Error:', error.message);
      return res.status(400).json({ 
        error: 'Could not download this video. Try another URL or platform.',
        details: error.message 
      });
    }

    try {
      const videoData = JSON.parse(stdout);
      
      // Extract download URL
      const downloadUrl = videoData.url || videoData.formats?.[0]?.url;
      
      if (!downloadUrl) {
        return res.status(400).json({ 
          error: 'Could not extract download link' 
        });
      }

      res.json({
        success: true,
        title: videoData.title || 'Video',
        url: downloadUrl,
        duration: videoData.duration || 0,
        thumbnail: videoData.thumbnail || null
      });
    } catch (parseError) {
      res.status(400).json({ 
        error: 'Error processing video data',
        details: parseError.message 
      });
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
