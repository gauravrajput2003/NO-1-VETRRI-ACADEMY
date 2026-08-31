const mongoose = require('mongoose');

const connectDB = async () => {
  try { 
    // Explicit connection pool settings optimized for Render free tier concurrency
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 20, // Limit concurrent sockets to prevent Mongo Atlas / server exhaustion
      minPoolSize: 2,  // Maintain minimum warm connections for low initial latency
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
