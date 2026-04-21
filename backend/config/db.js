const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

function getMongoState() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set.');
  }

  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const conn = await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 30000,
  });

  console.log(`MongoDB connected: ${conn.connection.host}`);
  return conn.connection;
};

mongoose.connection.on('connected', () => {
  console.log('MongoDB connection state: connected');
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection state: disconnected');
});

mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err.message);
});

module.exports = { connectDB, getMongoState };
