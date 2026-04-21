require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const morgan   = require('morgan');
const { connectDB, getMongoState } = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','PATCH'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Routes
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/users',       require('./routes/userRoutes'));
app.use('/api/posts',       require('./routes/postRoutes'));
app.use('/api/queuemates',  require('./routes/queuemateRoutes'));
app.use('/api/tournaments', require('./routes/tournamentRoutes'));
app.use('/api/social',      require('./routes/socialRoutes'));
app.use('/api/admin',       require('./routes/adminRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  const db = getMongoState();
  const status = db === 'connected' ? 'ok' : 'degraded';
  res.status(db === 'connected' ? 200 : 503).json({ status, env: process.env.NODE_ENV, db });
});

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Error handler
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`QueueMate server running on port ${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
