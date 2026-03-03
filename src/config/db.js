// backend/src/config/db.js
const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('⚠️  MONGODB_URI non configurato — uso file JSON locali');
    return;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log('✅ MongoDB Atlas connesso');
  } catch (err) {
    console.error('❌ Errore connessione MongoDB:', err.message);
    console.log('⚠️  Fallback a file JSON locali');
  }
};

const isMongoConnected = () => isConnected;

module.exports = { connectDB, isMongoConnected };
