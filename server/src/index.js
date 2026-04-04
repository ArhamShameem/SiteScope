const dotenv = require('dotenv');

dotenv.config();

const app = require('./app');
const connectDb = require('./config/db');

const port = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDb();
    app.listen(port, () => {
      console.log(`Auth server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
}

startServer();
