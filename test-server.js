const express = require('express');
const app = express();
const router = express.Router();

// Test route
router.get('/', (req, res) => {
  res.send('Express is working correctly!');
});

// Use the router
app.use('/test', router);

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
}); 