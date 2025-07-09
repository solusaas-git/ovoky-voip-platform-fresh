import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';
import { sendAdminCreditSuccessEmail, sendAdminDebitNotificationEmail } from '@/lib/paymentEmailService';
import User from '@/models/User';
import connectToDatabase from '@/lib/db';

interface BalanceOperationOptions {
  i_account: number;
  amount: number;
  currency: string;
  payment_notes?: string;
  payment_time?: string;
}

// Convert ISO date format to Sippy's required format
function convertToSippyDateFormat(isoDate: string): string {
  const date = new Date(isoDate);
  
  // Format: '%H:%M:%S.000 GMT %a %b %d %Y' 
  // Example: '09:57:29.000 GMT Wed Nov 18 2009'
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayName = dayNames[date.getUTCDay()];
  const monthName = monthNames[date.getUTCMonth()];
  const day = date.getUTCDate().toString().padStart(2, '0');
  const year = date.getUTCFullYear();
  
  return `${hours}:${minutes}:${seconds}.000 GMT ${dayName} ${monthName} ${day} ${year}`;
}

// POST handler to manage account balance (credit/debit)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated and is an admin (only admins can manage balances)
    const currentUser = await getCurrentUser();
    
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }
    
    // Await params before accessing its properties
    const { id } = await params;
    
    // Get the Sippy account ID from the params
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing ID parameter' }, { status: 400 });
    }
    
    const accountId = parseInt(id, 10);
    
    if (isNaN(accountId)) {
      return NextResponse.json({ error: 'Invalid account ID' }, { status: 400 });
    }

    // Get request body
    const body = await request.json();
    const {
      operation, // 'credit', 'debit', or 'add_funds'
      amount,
      currency,
      payment_notes,
      payment_time
    } = body;
    
    // Validate required fields
    if (!operation || !amount || !currency) {
      return NextResponse.json({ 
        error: 'Missing required fields: operation, amount, currency' 
      }, { status: 400 });
    }
    
    if (!['credit', 'debit', 'add_funds'].includes(operation)) {
      return NextResponse.json({ 
        error: 'Invalid operation. Must be: credit, debit, or add_funds' 
      }, { status: 400 });
    }
    
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ 
        error: 'Amount must be a positive number' 
      }, { status: 400 });
    }
    
    console.log('Balance API received parameters:', {
      accountId,
      operation,
      amount,
      currency,
      payment_notes,
      payment_time
    });
    
    // Get Sippy API credentials from settings
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ error: 'Sippy API not configured' }, { status: 500 });
    }
    
    // Create Sippy client
    const sippyClient = new SippyClient(credentials);

    // Build options object for balance operation
    const options: BalanceOperationOptions = {
      i_account: accountId,
      amount,
      currency,
      ...(payment_notes && { payment_notes })
    };

    // Convert payment_time to Sippy format if provided
    if (payment_time) {
      try {
        const convertedPaymentTime = convertToSippyDateFormat(payment_time);
        options.payment_time = convertedPaymentTime;
        console.log('📅 Date conversion - payment_time:');
        console.log('   Input (ISO):', payment_time);
        console.log('   Output (Sippy):', convertedPaymentTime);
      } catch (error) {
        console.error('❌ Invalid payment_time format:', payment_time, error);
        return NextResponse.json({ error: 'Invalid payment_time format' }, { status: 400 });
      }
    }

    console.log(`🔍 Performing ${operation} operation for account:`, accountId, 'with options:', options);
    
    // Perform the balance operation
    const startTime = Date.now();
    let result;
    
    switch (operation) {
      case 'credit':
        result = await sippyClient.accountCredit(options);
        break;
      case 'debit':
        result = await sippyClient.accountDebit(options);
        break;
      case 'add_funds':
        result = await sippyClient.accountAddFunds(options);
        break;
      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }
    
    const requestDuration = Date.now() - startTime;
    
    console.log(`✅ Balance API - ${operation} operation completed in ${requestDuration}ms`);
    console.log('Operation result:', result);
    
    // Send email notification for all balance operations
    if (operation === 'credit' || operation === 'add_funds' || operation === 'debit') {
      try {
        // Connect to database and find the user by Sippy account ID
        await connectToDatabase();
        const user = await User.findOne({ sippyAccountId: accountId });
        
        if (user) {
          if (operation === 'debit') {
            // For debit operations, send a different type of notification
            await sendAdminDebitNotificationEmail({
              userId: user._id.toString(),
              amount: amount,
              currency: currency,
              processedBy: currentUser.name || currentUser.email,
              notes: payment_notes,
            });
            console.log(`📧 Admin debit notification email queued for ${user.email}`);
          } else {
            // For credit/add_funds operations
            await sendAdminCreditSuccessEmail({
              userId: user._id.toString(),
              amount: amount,
              currency: currency,
              processedBy: currentUser.name || currentUser.email,
              notes: payment_notes,
            });
            console.log(`📧 Admin credit success email queued for ${user.email}`);
          }
        } else {
          console.log(`⚠️ No user found for Sippy account ${accountId}, skipping email notification`);
        }
      } catch (emailError) {
        console.error('Failed to send admin balance operation email:', emailError);
        // Don't fail the balance operation if email fails
      }
    }
    
    // Return operation result
    return NextResponse.json({ 
      success: true,
      operation,
      accountId,
      amount,
      currency,
      result,
      requestDuration,
      message: `Successfully ${operation === 'add_funds' ? 'added funds to' : operation + 'ed'} account ${accountId}`
    });
  } catch (error) {
    console.error('Error performing balance operation:', error);
    
    // Enhanced error reporting
    let errorMessage = 'Failed to perform balance operation';
    let errorType = 'unknown';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('timeout')) {
        errorType = 'timeout';
        errorMessage = 'Balance operation timed out.';
      } else if (error.message.includes('Sippy API Fault')) {
        errorType = 'sippy_fault';
      } else if (error.message.includes('No response received')) {
        errorType = 'network';
        errorMessage = 'Network connectivity issue. Check Sippy API endpoint and credentials.';
      } else if (error.message.includes('Insufficient')) {
        errorType = 'insufficient_funds';
      }
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        errorType,
        debugInfo: {
          originalError: error instanceof Error ? error.message : 'Unknown error',
          suggestion: errorType === 'insufficient_funds' 
            ? 'Account has insufficient funds for this operation'
            : 'Check network connectivity and API credentials'
        }
      },
      { status: 500 }
    );
  }
} 