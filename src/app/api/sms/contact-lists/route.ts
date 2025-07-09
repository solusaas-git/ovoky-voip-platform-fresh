import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import SmsContactList from '@/models/SmsContactList';
import SmsContact from '@/models/SmsContact';
import SmsCampaign from '@/models/SmsCampaign';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const contactLists = await SmsContactList.find({ 
      userId: session.user.id,
      isActive: true 
    }).sort({ createdAt: -1 });

    // Add usage information for each contact list
    const contactListsWithUsage = await Promise.all(
      contactLists.map(async (list) => {
        const isUsed = await list.isUsedInCampaigns();
        
        // Use stored count for performance (updated during contact operations)
        // Only verify real count if stored count seems suspicious (e.g., very old list)
        const daysSinceUpdate = (Date.now() - list.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceUpdate > 7) { // Only verify weekly for old lists
          const realContactCount = await SmsContact.countDocuments({
            contactListId: list._id,
            isActive: true
          });
          
          if (list.contactCount !== realContactCount) {
            list.contactCount = realContactCount;
            await list.save();
          }
        }
        
        return {
          ...list.toObject(),
          contactCount: list.contactCount, // Use stored count
          canDelete: !isUsed
        };
      })
    );

    return NextResponse.json({
      success: true,
      contactLists: contactListsWithUsage
    });
  } catch (error) {
    console.error('Failed to fetch contact lists:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { name, description } = await request.json();

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'List name is required' },
        { status: 400 }
      );
    }

    const contactList = await SmsContactList.create({
      userId: session.user.id,
      name,
      description,
      contactCount: 0
    });

    return NextResponse.json({
      success: true,
      contactList
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create contact list:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 