const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

async function connectDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('MONGODB_URI not set; running without MongoDB persistence.');
    return null;
  }
  await mongoose.connect(uri);
  console.log('MongoDB connected');
  return mongoose.connection;
}

module.exports = { connectDb };
