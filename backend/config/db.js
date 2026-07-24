const mongoose = require('mongoose');
const mockDb = require('./mockDb');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodbridge', {
      serverSelectionTimeoutMS: 3000 // Timeout after 3s to trigger fallback quickly
    });
    console.log(`🔌 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    mockDb.enableMockDb();
  }
};

module.exports = connectDB;
