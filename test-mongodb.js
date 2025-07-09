const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.log('Please make sure you have a .env file with MONGODB_URI configured');
  process.exit(1);
}

console.log('🔍 Testing MongoDB connection...');
console.log('📍 URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    console.log('🖥️  Host:', mongoose.connection.host);
    console.log('🔌 Port:', mongoose.connection.port);
    
    // Test creating a simple document
    const TestSchema = new mongoose.Schema({ test: String });
    const TestModel = mongoose.model('Test', TestSchema);
    
    return TestModel.create({ test: 'connection-test' });
  })
  .then(() => {
    console.log('✅ Database write test successful!');
    return mongoose.connection.close();
  })
  .then(() => {
    console.log('✅ Connection closed successfully');
    console.log('🎉 Your MongoDB is ready for the OVO application!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Suggestions:');
      console.log('  - Check if MongoDB server is running');
      console.log('  - Verify the hostname/IP address in MONGODB_URI');
      console.log('  - Check network connectivity');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Suggestions:');
      console.log('  - Check if MongoDB is running on the specified port');
      console.log('  - Verify the port number in MONGODB_URI');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n💡 Suggestions:');
      console.log('  - Check username and password in MONGODB_URI');
      console.log('  - Verify user has access to the specified database');
    }
    
    process.exit(1);
  }); 