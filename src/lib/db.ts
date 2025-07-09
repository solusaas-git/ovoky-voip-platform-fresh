import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sippy-dashboard';

// Define the mongoose connection cache interface
interface MongooseConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare the global variable for mongoose connection
declare global {
  var mongooseConnection: MongooseConnection;
}

// Initialize the global connection cache
if (!global.mongooseConnection) {
  global.mongooseConnection = {
    conn: null,
    promise: null,
  };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (global.mongooseConnection.conn) {
    return global.mongooseConnection.conn;
  }

  if (!global.mongooseConnection.promise) {
    const opts = {
      bufferCommands: false,
    };

    global.mongooseConnection.promise = mongoose.connect(MONGODB_URI, opts).then(() => {
      console.log('Connected to MongoDB');
      return mongoose;
    });
  }

  try {
    const connectedMongoose = await global.mongooseConnection.promise;
    global.mongooseConnection.conn = connectedMongoose;
  } catch (e) {
    global.mongooseConnection.promise = null;
    throw e;
  }

  return global.mongooseConnection.conn as typeof mongoose;
}

export default connectToDatabase; 