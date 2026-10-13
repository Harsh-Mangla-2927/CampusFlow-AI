const mongoose = require('mongoose');

const connectionOptions = {
  serverSelectionTimeoutMS: 4000,
  connectTimeoutMS: 4000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
};

const attachConnectionListeners = () => {
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB connection lost. Driver will attempt automatic reconnection.');
  });
  mongoose.connection.on('error', (err) => {
    console.error(`⚠️ MongoDB connection error: ${err.message.split('\n')[0]}`);
  });
};

const connectDB = async () => {
  const primaryUri = process.env.MONGODB_URI;
  const fallbackUri = process.env.MONGODB_LOCAL_URI || 'mongodb://127.0.0.1:27017/campusflow';

  if (primaryUri) {
    try {
      console.log('🔄 Attempting connection to primary MongoDB Atlas...');
      const conn = await mongoose.connect(primaryUri, connectionOptions);
      // Explicitly verify cluster responsiveness via ping before confirming connection
      await conn.connection.db.admin().ping();
      console.log(`✅ MongoDB connected & verified (Primary): ${conn.connection.host}`);
      attachConnectionListeners();
      return conn;
    } catch (primaryError) {
      const firstLine = primaryError.message.split('\n')[0];
      console.warn(`⚠️ Primary MongoDB Atlas connection unverified: ${firstLine}`);
      if (
        firstLine.includes('IP') ||
        firstLine.includes('SSL') ||
        firstLine.includes('tlsv1 alert') ||
        firstLine.includes('alert number 80')
      ) {
        console.warn('ℹ️ Notice: MongoDB Atlas rejected the TLS handshake (SSL Alert 80 / IP access list). Make sure your current IP address is whitelisted in Atlas Network Access: https://www.mongodb.com/docs/atlas/security-whitelist/');
      }
      try {
        await mongoose.disconnect();
      } catch (_) {
        // Disconnect cleanup error ignored
      }
    }
  }

  if (fallbackUri && fallbackUri !== primaryUri) {
    try {
      console.log(`🔄 Attempting fallback connection to local MongoDB: ${fallbackUri}`);
      const fallbackConn = await mongoose.connect(fallbackUri, connectionOptions);
      await fallbackConn.connection.db.admin().ping();
      console.log(`✅ MongoDB connected & verified (Local Fallback): ${fallbackConn.connection.host}`);
      attachConnectionListeners();
      return fallbackConn;
    } catch (fallbackError) {
      console.error(`❌ Fallback MongoDB connection error: ${fallbackError.message.split('\n')[0]}`);
      try {
        await mongoose.disconnect();
      } catch (_) {
        // Disconnect cleanup error ignored
      }
    }
  }

  console.error('❌ Could not establish any operational MongoDB connection.');
  process.exit(1);
};

module.exports = connectDB;


