require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const migratePasswords = require('./utils/migratePasswords');
const seedDatabase = require('./utils/seedDatabase');
const { createSocketServer } = require('./socket');

const app = express();
const PORT = process.env.PORT ||5000;
const httpServer = http.createServer(app);
const io = createSocketServer(httpServer);

app.set('io', io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/policies', require('./routes/policyRoutes'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    database: 'connected',
    timestamp: new Date(),
  });
});

const buildPath = path.join(__dirname, '../build');
if (fs.existsSync(buildPath)) {
  app.use(express.static(buildPath));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  app.get(/.*/, (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'API route not found. Tip: React frontend not built yet. Run "npm run build" to build it.',
    });
  });
}

app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  await seedDatabase();
  await migratePasswords();

  httpServer.listen(PORT, () => {
    console.log(`
Server is running
Port: ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
Database: MongoDB
Realtime: Socket.io
    `);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
