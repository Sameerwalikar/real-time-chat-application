import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod = null;

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    // If no MONGO_URI is set, we attempt connection to local MongoDB.
    // If local connection fails, we spin up the MongoMemoryServer.
    if (!mongoUri) {
      try {
        console.log('Attempting connection to local MongoDB on mongodb://127.0.0.1:27017/chat-app...');
        const conn = await mongoose.connect('mongodb://127.0.0.1:27017/chat-app', {
          serverSelectionTimeoutMS: 2000, // Quick fail if local server is down
        });
        console.log(`MongoDB Connected (Local): ${conn.connection.host}`);
        return;
      } catch (err) {
        console.log('Local MongoDB not running. Spawning in-memory MongoDB server instead...');
        
        // Disable mongodb-memory-server network download warnings & configuration errors
        mongod = await MongoMemoryServer.create({
          instance: {
            dbName: 'chat-app',
          }
        });
        mongoUri = mongod.getUri();
      }
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    
    if (mongod) {
      console.log('==================================================================');
      console.log(`In-Memory MongoDB Server started successfully at: ${mongoUri}`);
      console.log('The app is fully functional with a real database for testing!');
      console.log('==================================================================');
    } else {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error('==================================================================');
    console.error('DATABASE CONNECTION ERROR: Could not establish a database connection.');
    console.error(`Error details: ${error.message}`);
    console.error('Please make sure you have internet access for downloading the memory binary,');
    console.error('or start a local MongoDB instance.');
    console.error('==================================================================');
    process.exit(1);
  }
};

// Handle graceful cleanup of in-memory instance
process.on('SIGTERM', async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
  process.exit(0);
});

export default connectDB;
