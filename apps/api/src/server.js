import { createApp } from './app.js';

const PORT = process.env.PORT || 5000;

// Initialize Express app (with 'trust proxy', 1 configured before middleware/routes)
const app = createApp();

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
