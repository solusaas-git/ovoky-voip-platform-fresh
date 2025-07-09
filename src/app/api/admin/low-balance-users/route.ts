import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import UserOnboardingModel from '@/models/UserOnboarding';
import { XMLParser } from 'fast-xml-parser';

interface LowBalanceUser {
  id: string;
  name: string;
  email: string;
  sippyAccountId: string;
  balance: number;
  lastActivity: Date;
  companyName?: string;
}

/**
 * Parse XML string into a JavaScript object (Node.js compatible version)
 */
interface ParsedData {
  balance?: number;
  credit_limit?: number;
  blocked?: boolean | number;
  currency?: string;
  [key: string]: string | number | boolean | undefined;
}

function parseXmlResponse(xmlString: string): ParsedData | null {
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      parseAttributeValue: true,
      trimValues: true
    });
    
    const result = parser.parse(xmlString);
    
    // Navigate to the struct data in the methodResponse
    const struct = result?.methodResponse?.params?.param?.value?.struct;
    if (!struct) return null;

    const parsedData: ParsedData = {};
    
    // Handle the struct members
    if (struct.member) {
      const members = Array.isArray(struct.member) ? struct.member : [struct.member];
      
      for (const member of members) {
        if (member.name && member.value) {
          const name = member.name;
          let value;
          
          // Extract value based on type
          if (member.value.int !== undefined) {
            value = parseInt(member.value.int, 10);
          } else if (member.value.double !== undefined) {
            value = parseFloat(member.value.double);
          } else if (member.value.string !== undefined) {
            value = member.value.string;
          } else if (member.value.boolean !== undefined) {
            value = member.value.boolean === '1' || member.value.boolean === true;
          } else {
            value = member.value;
          }
          
          parsedData[name] = value;
        }
      }
    }
    
    return parsedData;
  } catch (error) {
    console.error('Error parsing XML:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Only admin users can access this endpoint
    if (currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' }, 
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(searchParams.get('threshold') || '5.0');

    if (isNaN(threshold) || threshold < 0) {
      return NextResponse.json(
        { error: 'Invalid threshold value' }, 
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get all users with sippy account IDs
    const users = await User.find({ 
      sippyAccountId: { $exists: true, $nin: [null, ''] },
      role: { $ne: 'admin' } // Exclude admin users from low balance monitoring
    }).select('name email sippyAccountId createdAt updatedAt').lean();

    const lowBalanceUsers: LowBalanceUser[] = [];

    // Check balance for each user using the same method as existing balance card
    for (const user of users) {
      try {
        // Skip users without sippyAccountId (type safety)
        if (!user.sippyAccountId) {
          continue;
        }

        // Use the same API endpoint as the existing balance card
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/sippy/account/${user.sippyAccountId}`, {
          headers: {
            'Cookie': request.headers.get('cookie') || '',
          }
        });

        if (!response.ok) {
          continue;
        }

        const data = await response.json();

        if (!data.accountInfo) {
          continue;
        }

        // Parse the XML response using the same method as existing balance card
        const parsedAccountInfo = parseXmlResponse(data.accountInfo);

        if (parsedAccountInfo?.balance !== undefined) {
          // Use the same balance calculation as the existing balance card
          const actualBalance = -parsedAccountInfo.balance;
          
          // Only include users with balance below threshold
          if (actualBalance < threshold) {
            const lowBalanceUser: LowBalanceUser = {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              sippyAccountId: user.sippyAccountId.toString(),
              balance: actualBalance,
              lastActivity: user.updatedAt || user.createdAt,
            };
            lowBalanceUsers.push(lowBalanceUser);
          }
        }
      } catch (error) {
        console.error(`Error fetching balance for user ${user._id}:`, error);
        // Continue with other users if one fails
      }
    }

    // Sort by balance (lowest first) and then by last activity (most recent first)
    lowBalanceUsers.sort((a, b) => {
      const balanceDiff = a.balance - b.balance;
      if (balanceDiff !== 0) return balanceDiff;
      
      const aDate = new Date(a.lastActivity);
      const bDate = new Date(b.lastActivity);
      return bDate.getTime() - aDate.getTime();
    });

    // Fetch company names from onboarding data
    if (lowBalanceUsers.length > 0) {
      const userIds = lowBalanceUsers.map(user => user.id);
      const onboardingData = await UserOnboardingModel.find({
        userId: { $in: userIds }
      }).lean();

      // Create a map of userId to company name
      const onboardingMap = onboardingData.reduce((acc, onboarding) => {
        acc[onboarding.userId] = onboarding.companyName;
        return acc;
      }, {} as Record<string, string>);

      // Add company names to user data
      lowBalanceUsers.forEach(user => {
        user.companyName = onboardingMap[user.id] || undefined;
      });
    }

    const responseData = {
      users: lowBalanceUsers,
      threshold: threshold,
      total: lowBalanceUsers.length,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching low balance users:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 