const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/campusflow';

  if (primaryUri) {
    try {
      const conn = await mongoose.connect(primaryUri, {
        serverSelectionTimeoutMS: 3500,
      });
      console.log(`✅ MongoDB connected (Primary): ${conn.connection.host}`);
      return conn;
    } catch (primaryError) {
      console.warn(`⚠️ Primary MongoDB connection failed (${primaryError.message.slice(0, 80)}...).`);
    }
  }

  if (fallbackUri && fallbackUri !== primaryUri) {
    try {
      console.log(`🔄 Attempting fallback connection to local MongoDB: ${fallbackUri}`);
      const fallbackConn = await mongoose.connect(fallbackUri, {
        serverSelectionTimeoutMS: 3500,
      });
      console.log(`✅ MongoDB connected (Local Fallback): ${fallbackConn.connection.host}`);
      return fallbackConn;
    } catch (fallbackError) {
      console.error(`❌ Fallback MongoDB connection error: ${fallbackError.message}`);
    }
  }

  console.error('❌ Could not establish any MongoDB connection.');
  process.exit(1);
};

module.exports = connectDB;

