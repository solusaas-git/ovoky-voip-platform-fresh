import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsContact from '@/models/SmsContact';
import SmsContactList from '@/models/SmsContactList';
import mongoose from 'mongoose';

// POST /api/sms/contact-lists/[id]/import - Import contacts from CSV
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid contact list ID' }, { status: 400 });
    }

    // Verify contact list belongs to user
    const contactList = await SmsContactList.findOne({
      _id: id,
      userId: session.user.id
    });

    if (!contactList) {
      return NextResponse.json({ error: 'Contact list not found' }, { status: 404 });
    }

    const { contacts, columnMapping, options = {}, chunkInfo } = await request.json();

    // Validate inputs
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts provided' },
        { status: 400 }
      );
    }

    if (!columnMapping || columnMapping.phoneNumber === undefined || columnMapping.phoneNumber === null) {
      return NextResponse.json(
        { error: 'Phone number column mapping is required' },
        { status: 400 }
      );
    }

    // Process contacts with column mapping
    const processedContacts = [];
    const errors = [];

    for (let i = 0; i < contacts.length; i++) {
      const row = contacts[i];
      
      try {
        // Map CSV columns to contact fields
        const phoneNumber = row[columnMapping.phoneNumber];
        
        if (!phoneNumber || phoneNumber.trim() === '') {
          errors.push({
            row: i + 1,
            error: 'Phone number is required'
          });
          continue;
        }

        const contactData = {
          userId: session.user.id,
          contactListId: id,
          phoneNumber: phoneNumber.trim(),
          firstName: (columnMapping.firstName !== undefined && columnMapping.firstName !== null) ? row[columnMapping.firstName]?.trim() : undefined,
          lastName: (columnMapping.lastName !== undefined && columnMapping.lastName !== null) ? row[columnMapping.lastName]?.trim() : undefined,
          address: (columnMapping.address !== undefined && columnMapping.address !== null) ? row[columnMapping.address]?.trim() : undefined,
          city: (columnMapping.city !== undefined && columnMapping.city !== null) ? row[columnMapping.city]?.trim() : undefined,
          zipCode: (columnMapping.zipCode !== undefined && columnMapping.zipCode !== null) ? row[columnMapping.zipCode]?.trim() : undefined,
          dateOfBirth: undefined as Date | undefined,
          customFields: {} as Record<string, any>
        };

        // Handle date of birth if mapped
        if (columnMapping.dateOfBirth !== undefined && columnMapping.dateOfBirth !== null && row[columnMapping.dateOfBirth]) {
          const dobString = row[columnMapping.dateOfBirth].trim();
          if (dobString) {
            const dob = new Date(dobString);
            if (!isNaN(dob.getTime())) {
              contactData.dateOfBirth = dob;
            }
          }
        }

        // Handle custom fields
        if (columnMapping.customFields) {
          for (const [fieldName, columnIndex] of Object.entries(columnMapping.customFields)) {
            if (typeof columnIndex === 'number' && row[columnIndex]) {
              contactData.customFields![fieldName] = row[columnIndex].trim();
            }
          }
        }

        processedContacts.push(contactData);
      } catch (error: any) {
        errors.push({
          row: i + 1,
          error: error.message
        });
      }
    }

    if (processedContacts.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No valid contacts to import',
        errors
      }, { status: 400 });
    }

    // Bulk insert contacts with optimized approach
    const results = {
      inserted: 0,
      updated: 0,
      duplicates: 0,
      errors: [...errors]
    };

    // Track contact lists that need count updates
    const listsToUpdate = new Set([id]);

    // Prepare contacts with cleaned phone numbers
    const contactsToProcess = processedContacts.map(contactData => {
      let cleanedPhone = contactData.phoneNumber.replace(/[\s\-\(\)]/g, '');
      if (!cleanedPhone.startsWith('+') && !cleanedPhone.startsWith('00')) {
        cleanedPhone = '+' + cleanedPhone;
      }
      return {
        ...contactData,
        phoneNumber: cleanedPhone
      };
    });

    // Get all phone numbers to check for existing contacts in one optimized query
    const phoneNumbers = contactsToProcess.map(c => c.phoneNumber);
    const existingContacts = await SmsContact.find({
      userId: session.user.id,
      phoneNumber: { $in: phoneNumbers }
    }).lean(); // Use lean() for better performance when we don't need mongoose documents

    // Create a map for quick lookup
    const existingContactsMap = new Map();
    existingContacts.forEach(contact => {
      existingContactsMap.set(contact.phoneNumber, contact);
    });

    // Separate contacts into different operations
    const contactsToInsert = [];
    const contactsToUpdate = [];
    const contactsToDelete = [];

    for (const contactData of contactsToProcess) {
      try {
        const existing = existingContactsMap.get(contactData.phoneNumber);

        if (existing) {
          if (existing.isActive && existing.contactListId.toString() === id) {
            // Contact exists in the same list and is active
            if (options.updateOnDuplicate) {
              contactsToUpdate.push({
                filter: { _id: existing._id },
                update: contactData
              });
              results.updated++;
            } else {
              // Skip active duplicate in same list
              results.duplicates++;
            }
          } else if (existing.isActive && existing.contactListId.toString() !== id) {
            // Contact exists in a different list and is active
            // Hard delete from original list and create new in target list
            listsToUpdate.add(existing.contactListId.toString());
            contactsToDelete.push(existing._id);
            contactsToInsert.push(contactData);
            results.inserted++;
          } else if (!existing.isActive) {
            // Contact is soft-deleted - hard delete it and create new in target list
            if (existing.contactListId.toString() !== id) {
              listsToUpdate.add(existing.contactListId.toString());
            }
            contactsToDelete.push(existing._id);
            contactsToInsert.push(contactData);
            results.inserted++;
          }
        } else {
          // No existing contact found - insert new contact
          contactsToInsert.push(contactData);
          results.inserted++;
        }
      } catch (error: any) {
        results.errors.push({
          row: 0,
          error: error.message
        });
      }
    }

    // Execute bulk operations with optimizations and parallel processing
    try {
      const operations = [];

      // Prepare all operations to run in parallel
      if (contactsToDelete.length > 0) {
        operations.push(
          SmsContact.deleteMany({ _id: { $in: contactsToDelete } })
        );
      }

      if (contactsToInsert.length > 0) {
        operations.push(
          SmsContact.insertMany(contactsToInsert, { 
            ordered: false,
            rawResult: true // Get raw MongoDB result for better performance
          })
        );
      }

      if (contactsToUpdate.length > 0) {
        const bulkOps = contactsToUpdate.map(({ filter, update }) => ({
          updateOne: {
            filter,
            update: { $set: update },
            upsert: false
          }
        }));
        operations.push(
          SmsContact.bulkWrite(bulkOps, { ordered: false })
        );
      }

      // Execute all operations in parallel for maximum speed
      if (operations.length > 0) {
        await Promise.all(operations);
      }

    } catch (error: any) {
      console.error('Bulk operation error:', error);
      
      // Handle specific MongoDB errors
      if (error.name === 'BulkWriteError' && error.result) {
        // Some operations succeeded, adjust counts
        const insertedCount = error.result.insertedCount || 0;
        const modifiedCount = error.result.modifiedCount || 0;
        results.inserted = Math.max(0, results.inserted - (contactsToInsert.length - insertedCount));
        results.updated = Math.max(0, results.updated - (contactsToUpdate.length - modifiedCount));
        results.errors.push({
          row: 0,
          error: `Partial bulk operation failure: ${error.message}`
        });
      } else {
        results.errors.push({
          row: 0,
          error: `Bulk operation failed: ${error.message}`
        });
      }
    }

    // Update contact counts for all affected lists in parallel
    if (listsToUpdate.size > 0) {
      const updatePromises = Array.from(listsToUpdate).map(async (listId) => {
        try {
          const listToUpdate = await SmsContactList.findById(listId);
          if (listToUpdate) {
            await listToUpdate.updateContactCount();
          }
        } catch (error) {
          console.error(`Error updating contact count for list ${listId}:`, error);
        }
      });
      
      // Execute all list updates in parallel
      await Promise.allSettled(updatePromises);
    }

    return NextResponse.json({
      success: true,
      imported: results.inserted + results.updated,
      results: {
        total: processedContacts.length,
        inserted: results.inserted,
        updated: results.updated,
        duplicates: results.duplicates,
        errors: results.errors.length
      },
      errors: results.errors,
      chunkInfo: chunkInfo || null,
      message: `Chunk processed: ${results.inserted} new, ${results.updated} updated, ${results.duplicates} duplicates, ${results.errors.length} errors`
    });

  } catch (error) {
    console.error('Error importing contacts:', error);
    return NextResponse.json({ error: 'Failed to import contacts' }, { status: 500 });
  }
} 