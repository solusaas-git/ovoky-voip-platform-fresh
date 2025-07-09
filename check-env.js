require('dotenv').config();

console.log('🔍 Environment Variables Check:');
console.log('================================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('MONGODB_URI value:', process.env.MONGODB_URI ? 
  process.env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') : 
  'NOT SET');
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
console.log('================================');

// Test if the same logic as the app can connect
const mongoose = require('mongoose');

if (process.env.MONGODB_URI) {
  console.log('🧪 Quick connection test...');
  mongoose.connect(process.env.MONGODB_URI, { 
    serverSelectionTimeoutMS: 5000 
  })
    .then(() => {
      console.log('✅ Environment variables are working correctly!');
      return mongoose.connection.close();
    })
    .catch((error) => {
      console.error('❌ Connection failed with env vars:', error.message);
    })
    .finally(() => {
      process.exit(0);
    });
} else {
  console.error('❌ MONGODB_URI not found in environment!');
  process.exit(1);
} 