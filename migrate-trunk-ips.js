const { MongoClient } = require('mongodb');

// MongoDB connection URI - update this with your actual connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';

async function migrateTrunkIPs() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db();
    const trunksCollection = db.collection('trunks');
    
    console.log('Finding trunks to migrate...');
    
    // Find all trunks
    const trunks = await trunksCollection.find({}).toArray();
    console.log(`Found ${trunks.length} trunks to check`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const trunk of trunks) {
      const updates = {};
      let needsUpdate = false;
      
      // Handle the IP addresses migration
      if (trunk.ipAddresses && trunk.ipAddresses.length > 0) {
        // Already has ipAddresses array, check for duplication with ipAddress
        if (trunk.ipAddress && trunk.ipAddresses.includes(trunk.ipAddress)) {
          // Remove the duplicate ipAddress field
          updates.$unset = { ipAddress: "" };
          needsUpdate = true;
          console.log(`Trunk ${trunk.name}: Removing duplicate ipAddress field`);
        } else if (trunk.ipAddress && !trunk.ipAddresses.includes(trunk.ipAddress)) {
          // ipAddress exists but not in array, add it and then remove the field
          updates.$set = { ipAddresses: [trunk.ipAddress, ...trunk.ipAddresses] };
          updates.$unset = { ipAddress: "" };
          needsUpdate = true;
          console.log(`Trunk ${trunk.name}: Adding ipAddress to array and removing field`);
        } else if (!trunk.ipAddress) {
          // No ipAddress field, array is already correct
          console.log(`Trunk ${trunk.name}: Already migrated (no ipAddress field)`);
          skipped++;
        }
      } else if (trunk.ipAddress) {
        // Only has ipAddress, migrate to ipAddresses array
        updates.$set = { ipAddresses: [trunk.ipAddress] };
        updates.$unset = { ipAddress: "" };
        needsUpdate = true;
        console.log(`Trunk ${trunk.name}: Migrating ipAddress to ipAddresses array`);
      } else {
        // No IP addresses at all - this shouldn't happen but let's handle it
        console.warn(`Trunk ${trunk.name}: No IP addresses found!`);
        skipped++;
      }
      
      if (needsUpdate) {
        try {
          await trunksCollection.updateOne(
            { _id: trunk._id },
            updates
          );
          migrated++;
          console.log(`✓ Migrated trunk: ${trunk.name}`);
        } catch (error) {
          console.error(`✗ Failed to migrate trunk ${trunk.name}:`, error.message);
        }
      } else {
        skipped++;
      }
    }
    
    console.log('\n=== Migration Summary ===');
    console.log(`Total trunks checked: ${trunks.length}`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Skipped: ${skipped}`);
    console.log('Migration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  migrateTrunkIPs()
    .then(() => {
      console.log('Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateTrunkIPs }; 