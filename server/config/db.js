const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Atlas Connection Failed: ${error.message}`);
    console.log('⚡ Starting local in-memory MongoDB instead...');
    
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
      console.log('✅ Connected to In-Memory MongoDB (data will reset on restart)');
    } catch (memError) {
      console.error('❌ In-memory MongoDB also failed:', memError.message);
    }
  }
};

module.exports = connectDB;
