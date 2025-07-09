import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';

// POST - Migrate existing phone numbers to have proper nextBillingDate
export async function POST() {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Connect to the database
    await connectToDatabase();

    // Find all assigned phone numbers without nextBillingDate
    const phoneNumbersToUpdate = await PhoneNumber.find({
      status: 'assigned',
      assignedAt: { $exists: true, $ne: null },
      $or: [
        { nextBillingDate: { $exists: false } },
        { nextBillingDate: null }
      ]
    }).lean();

    console.log(`Found ${phoneNumbersToUpdate.length} phone numbers to migrate`);

    let updated = 0;
    let errors = 0;

    // Update each phone number
    for (const phoneNumber of phoneNumbersToUpdate) {
      try {
        if (!phoneNumber.assignedAt) continue;

        // Calculate next billing date
        const nextBillingDate = new Date(phoneNumber.assignedAt);
        if (phoneNumber.billingCycle === 'yearly') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        } else {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        }

        // Update the phone number
        await PhoneNumber.findByIdAndUpdate(
          phoneNumber._id,
          {
            $set: {
              nextBillingDate: nextBillingDate
            }
          }
        );

        updated++;
        console.log(`✅ Updated ${phoneNumber.number} - next billing: ${nextBillingDate.toISOString()}`);
      } catch (error) {
        console.error(`❌ Error updating ${phoneNumber.number}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      message: 'Migration completed',
      total: phoneNumbersToUpdate.length,
      updated,
      errors,
    });

  } catch (error) {
    console.error('Error migrating billing dates:', error);
    return NextResponse.json(
      { error: 'Failed to migrate billing dates' },
      { status: 500 }
    );
  }
} 