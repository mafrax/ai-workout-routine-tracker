// Import the compiled Express app
const app = require('../dist/index.js').default || require('../dist/index.js');

// Export for Vercel serverless
module.exports = app;