const mongoose = require('mongoose');

module.exports = async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ca_v4', { serverSelectionTimeoutMS: 4000 });
    console.log('MongoDB connected');
    return true;
  } catch (err) {
    console.warn('MongoDB not connected (forms, login and dashboard need it):', err.message);
    return false;
  }
};
