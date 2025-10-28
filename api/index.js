// Import the compiled Express app
try {
  const appModule = require('../dist/index.js');
  const app = appModule.default || appModule;
  
  // Export for Vercel serverless
  module.exports = app;
} catch (error) {
  console.error('Failed to import Express app:', error);
  
  // Fallback error handler
  module.exports = (req, res) => {
    res.status(500).json({
      error: 'Failed to load Express app',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  };
}