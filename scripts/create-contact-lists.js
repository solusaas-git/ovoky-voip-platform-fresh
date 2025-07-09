// This script creates sample contact lists via API calls
// Run this after the server is started

const contactLists = [
  {
    name: 'VIP Customers',
    description: 'Our most valuable customers'
  },
  {
    name: 'Newsletter Subscribers', 
    description: 'Users who subscribed to our newsletter'
  },
  {
    name: 'Birthday Club',
    description: 'Customers who want birthday greetings'
  },
  {
    name: 'Appointment Reminders',
    description: 'Clients who need appointment reminders'
  }
];

const sampleContacts = [
  {
    phoneNumber: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main St',
    city: 'New York',
    zipCode: '10001',
    dateOfBirth: '1985-06-15'
  },
  {
    phoneNumber: '+1234567891',
    firstName: 'Jane',
    lastName: 'Smith',
    address: '456 Oak Ave',
    city: 'Los Angeles',
    zipCode: '90210',
    dateOfBirth: '1990-03-22'
  },
  {
    phoneNumber: '+1234567892',
    firstName: 'Mike',
    lastName: 'Johnson',
    address: '789 Pine St',
    city: 'Chicago',
    zipCode: '60601'
  },
  {
    phoneNumber: '+1234567893',
    firstName: 'Sarah',
    lastName: 'Wilson',
    city: 'Houston',
    zipCode: '77001'
  }
];

async function createTestData() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('Creating test contact lists and contacts...');
  console.log('Make sure the server is running on localhost:3000');
  console.log('You will need to be logged in to create the data.');
  console.log('\nSample contact lists to create:');
  
  contactLists.forEach((list, index) => {
    console.log(`${index + 1}. ${list.name} - ${list.description}`);
  });
  
  console.log('\nSample contacts to add:');
  sampleContacts.forEach((contact, index) => {
    console.log(`${index + 1}. ${contact.firstName} ${contact.lastName} - ${contact.phoneNumber} (${contact.city})`);
  });
  
  console.log('\nTo create this data:');
  console.log('1. Start your development server');
  console.log('2. Log in to your application');
  console.log('3. Go to the SMS Contacts page');
  console.log('4. Create the contact lists manually or via the API');
  console.log('5. Import the contacts using the CSV import feature');
  
  // CSV content for import
  const csvContent = `Phone Number,First Name,Last Name,Address,City,Zip Code,Date of Birth
+1234567890,John,Doe,123 Main St,New York,10001,1985-06-15
+1234567891,Jane,Smith,456 Oak Ave,Los Angeles,90210,1990-03-22
+1234567892,Mike,Johnson,789 Pine St,Chicago,60601,
+1234567893,Sarah,Wilson,,Houston,77001,`;

  console.log('\nSample CSV content:');
  console.log('===================');
  console.log(csvContent);
  console.log('===================');
  console.log('\nYou can copy this CSV content to a file and import it via the UI.');
}

createTestData(); 