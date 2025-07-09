import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import User from '@/models/User';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';
import { cronExecutionService } from '@/lib/services/cronExecutionService';
import { getCurrentUser } from '@/lib/authService';

// Security: Verify this is a legitimate cron request or admin manual trigger
async function verifyCronRequest(request: NextRequest) {
  // Get request information for debugging
  const userAgent = request.headers.get('user-agent') || '';
  const authorization = request.headers.get('authorization');
  const cronSecret = request.headers.get('x-vercel-cron-signature');
  const expectedSecret = process.env.CRON_SECRET;
  
  // Check for Vercel cron job authentication (multiple methods)
  const isVercelRequest = userAgent.includes('vercel') || userAgent.includes('Vercel');
  
  if (isVercelRequest) {
    // Vercel cron jobs might use different authentication methods
    // 1. Check for Authorization header with Bearer token
    if (expectedSecret && authorization === `Bearer ${expectedSecret}`) {
      return { authorized: true, isManual: false };
    }
    
    // 2. Check for x-vercel-cron-signature header
    if (expectedSecret && cronSecret === expectedSecret) {
      return { authorized: true, isManual: false };
    }
    
    // 3. Allow Vercel requests without secret (if no secret is configured)
    if (!expectedSecret) {
      return { authorized: true, isManual: false };
    }
    
    // 4. For now, allow all Vercel requests (temporary for debugging)
    return { authorized: true, isManual: false };
  }
  
  // Check for authenticated admin user (manual trigger)
  try {
    const currentUser = await getCurrentUser();
    if (currentUser && currentUser.role === 'admin') {
      return { authorized: true, isManual: true };
    }
  } catch (error) {
    // Authentication failed, continue to reject
  }
  
  return { authorized: false, isManual: false };
}

// Helper function to process payments immediately (similar to purchase flow)
async function processScheduledPayment(billing: any, user: any, phoneNumber: any) {
  try {
    // Get Sippy API credentials
    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      console.error('❌ Sippy API not configured, cannot process payment for billing:', billing._id);
      return { success: false, error: 'Sippy API not configured' };
    }

    if (!user.sippyAccountId) {
      console.error('❌ User does not have Sippy account ID:', user.email);
      return { success: false, error: 'User does not have Sippy account ID' };
    }

    const sippyClient = new SippyClient(credentials);

    // Get the account's default currency to ensure compatibility
    let accountCurrency = billing.currency;
    try {
      const accountInfo = await sippyClient.getAccountInfo({ 
        i_account: user.sippyAccountId 
      });
      
      if (accountInfo?.payment_currency) {
        accountCurrency = accountInfo.payment_currency;
      }
    } catch (error) {
      console.log(`Failed to get account info for ${user.email}, using billing currency`);
    }

    // Prepare billing note
    const paymentNotes = `Scheduled charge for Number: ${phoneNumber.number} (${billing.transactionType})`;

    // Process the charge using Sippy accountDebit
    console.log(`💸 Processing scheduled payment: ${billing.amount} ${accountCurrency} for ${phoneNumber.number}`);
    
    const debitResult = await sippyClient.accountDebit({
      i_account: user.sippyAccountId,
      amount: billing.amount,
      currency: accountCurrency,
      payment_notes: paymentNotes,
    });

    // Update billing record based on result
    const sippyResult = debitResult as any;
    const resultValue = sippyResult.result;
    const txResult = sippyResult.tx_result;
    const hasError = (debitResult.error && debitResult.error.trim() !== '') || 
                    (debitResult.tx_error && debitResult.tx_error.trim() !== '');
    const hasTxId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment;
    
    // Determine success based on multiple criteria
    const isSuccess = (
      resultValue === 'success' || 
      resultValue === '1' ||
      resultValue === 1 ||
      resultValue === 'OK' ||
      resultValue === 'ok' ||
      txResult === 1 ||
      txResult === '1' ||
      (hasTxId && !hasError) ||
      (resultValue && !hasError && resultValue !== 'failed' && resultValue !== 'error')
    );

    if (isSuccess) {
      // Success - mark as paid
      billing.status = 'paid';
      billing.paidDate = new Date();
      billing.sippyTransactionId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment?.toString() || `debit_${Date.now()}`;
      billing.processedBy = 'cron_scheduled_billing';
      await billing.save();
      
      // Update phone number's last billed date
      await PhoneNumber.findByIdAndUpdate(billing.phoneNumberId, {
        lastBilledDate: new Date(),
      });
      
      console.log(`✅ Scheduled payment processed successfully for billing ${billing._id}`);
      return { success: true, transactionId: billing.sippyTransactionId };

    } else {
      // Failed - mark as failed
      const failureReason = debitResult.error || debitResult.tx_error || `Unexpected result: ${JSON.stringify(resultValue)}`;
      console.log(`❌ Scheduled payment failed for billing ${billing._id}:`, failureReason);
      
      billing.status = 'failed';
      billing.failureReason = failureReason;
      billing.processedBy = 'cron_scheduled_billing';
      await billing.save();
      
      // If failure is due to insufficient funds, suspend the number
      if (failureReason.toLowerCase().includes('insufficient') || 
          failureReason.toLowerCase().includes('balance')) {
        
        await PhoneNumber.findByIdAndUpdate(billing.phoneNumberId, {
          status: 'suspended',
          notes: `Suspended due to insufficient funds: ${failureReason}`,
        });
        
        console.log(`📱 Phone number ${phoneNumber.number} suspended due to insufficient funds`);
      }
      
      return { success: false, error: failureReason };
    }

  } catch (error) {
    console.error('❌ Error processing scheduled payment:', error);
    
    // Update billing record to reflect the failure
    billing.status = 'failed';
    billing.failureReason = error instanceof Error ? error.message : 'Payment processing error';
    billing.processedBy = 'cron_scheduled_billing';
    await billing.save();
    
    return { success: false, error: billing.failureReason };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobName = 'Scheduled Billing';
  const jobPath = '/api/cron/process-scheduled-billing';
  let triggerType: 'manual' | 'vercel_cron' = 'vercel_cron';
  
  try {
    console.log('🕐 Cron job started: process-scheduled-billing');
    
    // Verify this is a legitimate cron request or admin manual trigger
    const verificationResult = await verifyCronRequest(request);
    if (!verificationResult.authorized) {
      console.log('❌ Unauthorized cron request');
      
      // Record failed execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'failed', errorDetails: [{ error: 'Unauthorized request' }] },
        Date.now() - startTime
      );
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    triggerType = verificationResult.isManual ? 'manual' : 'vercel_cron';
    console.log(`🔥 Scheduled Billing job triggered: ${triggerType}`);

    await connectToDatabase();

    // Find all pending billing records that are due for processing
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const dueBillings = await PhoneNumberBilling.find({
      status: 'pending',
      billingDate: { $lte: today }, // Due today or overdue
    })
    .populate({
      path: 'phoneNumberId',
      select: 'number status country numberType provider monthlyRate setupFee currency',
    })
    .populate({
      path: 'userId',
      select: 'name email sippyAccountId',
    })
    .lean();

    console.log(`📋 Found ${dueBillings.length} pending billing records due for processing`);

    if (dueBillings.length === 0) {
      // Record successful execution with no processing needed
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'success', processed: 0, notes: 'No pending billing records found' },
        Date.now() - startTime,
        triggerType
      );
      
      return NextResponse.json({
        message: 'No pending billing records found',
        processed: 0,
        failed: 0,
      });
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Process each billing record
    for (const billing of dueBillings) {
      try {
        const phoneNumber = billing.phoneNumberId as any;
        const user = billing.userId as any;

        // Skip if phone number or user data is missing
        if (!phoneNumber || !user) {
          console.error(`❌ Missing phone number or user data for billing ${billing._id}`);
          failedCount++;
          errors.push({
            billingId: billing._id,
            error: 'Missing phone number or user data',
          });
          continue;
        }

        console.log(`🔄 Processing billing for ${phoneNumber.number} (${user.email})`);

        // Convert to Mongoose document for saving
        const billingDoc = await PhoneNumberBilling.findById(billing._id);
        if (!billingDoc) {
          console.error(`❌ Could not find billing document ${billing._id}`);
          failedCount++;
          errors.push({
            billingId: billing._id,
            error: 'Billing document not found',
          });
          continue;
        }

        // Process the payment
        const paymentResult = await processScheduledPayment(billingDoc, user, phoneNumber);

        if (paymentResult.success) {
          processedCount++;
          console.log(`✅ Successfully processed billing ${billing._id} for ${phoneNumber.number}`);
        } else {
          failedCount++;
          errors.push({
            billingId: billing._id,
            phoneNumber: phoneNumber.number,
            user: user.email,
            error: paymentResult.error,
          });
        }

      } catch (error) {
        console.error(`❌ Error processing billing ${billing._id}:`, error);
        failedCount++;
        errors.push({
          billingId: billing._id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Scheduled billing cron job completed in ${duration}ms: ${processedCount} successful, ${failedCount} failed`);

    // Record execution
    await cronExecutionService.recordExecution(
      jobName,
      jobPath,
      { 
        status: failedCount > 0 ? 'failed' : 'success', 
        processed: processedCount,
        failed: failedCount,
        errorDetails: errors,
        notes: `Processed ${dueBillings.length} billing records`
      },
      duration,
      triggerType
    );

    return NextResponse.json({
      message: `Processed ${dueBillings.length} billing records: ${processedCount} successful, ${failedCount} failed`,
      processed: processedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      duration: duration,
      triggered: triggerType,
    });

  } catch (error) {
    console.error('❌ Error in scheduled billing cron job:', error);
    
    // Record failed execution
    await cronExecutionService.recordExecution(
      jobName,
      jobPath,
      { 
        status: 'failed', 
        errorDetails: [{ error: error instanceof Error ? error.message : 'Unknown error' }] 
      },
      Date.now() - startTime,
      triggerType
    );
    
    return NextResponse.json(
      { error: 'Failed to process scheduled billing' },
      { status: 500 }
    );
  }
}

// Support GET for Vercel cron jobs (Vercel uses GET requests for cron jobs)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const jobName = 'Scheduled Billing';
  const jobPath = '/api/cron/process-scheduled-billing';
  let triggerType: 'manual' | 'vercel_cron' = 'vercel_cron';
  
  try {
    console.log('🕐 Cron job started via GET: process-scheduled-billing');
    
    // Verify this is a legitimate cron request or admin manual trigger
    const verificationResult = await verifyCronRequest(request);
    if (!verificationResult.authorized) {
      console.log('❌ Unauthorized cron request via GET');
      
      // Record failed execution
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'failed', errorDetails: [{ error: 'Unauthorized request' }] },
        Date.now() - startTime
      );
      
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    triggerType = verificationResult.isManual ? 'manual' : 'vercel_cron';
    console.log(`🔥 Scheduled Billing job triggered via GET: ${triggerType}`);

    await connectToDatabase();

    // Find all pending billing records that are due for processing
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const dueBillings = await PhoneNumberBilling.find({
      status: 'pending',
      billingDate: { $lte: today }, // Due today or overdue
    })
    .populate({
      path: 'phoneNumberId',
      select: 'number status country numberType provider monthlyRate setupFee currency',
    })
    .populate({
      path: 'userId',
      select: 'name email sippyAccountId',
    })
    .lean();

    console.log(`📋 Found ${dueBillings.length} pending billing records due for processing`);

    if (dueBillings.length === 0) {
      // Record successful execution with no processing needed
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'success', processed: 0, notes: 'No pending billing records found' },
        Date.now() - startTime,
        triggerType
      );
      
      return NextResponse.json({
        message: 'No pending billing records found',
        processed: 0,
        failed: 0,
      });
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Process each billing record
    for (const billing of dueBillings) {
      try {
        const phoneNumber = billing.phoneNumberId as any;
        const user = billing.userId as any;

        // Skip if phone number or user data is missing
        if (!phoneNumber || !user) {
          console.error(`❌ Missing phone number or user data for billing ${billing._id}`);
          failedCount++;
          errors.push({
            billingId: billing._id,
            error: 'Missing phone number or user data',
          });
          continue;
        }

        console.log(`🔄 Processing billing for ${phoneNumber.number} (${user.email})`);

        // Convert to Mongoose document for saving
        const billingDoc = await PhoneNumberBilling.findById(billing._id);
        if (!billingDoc) {
          console.error(`❌ Could not find billing document ${billing._id}`);
          failedCount++;
          errors.push({
            billingId: billing._id,
            error: 'Billing document not found',
          });
          continue;
        }

        // Process the payment
        const paymentResult = await processScheduledPayment(billingDoc, user, phoneNumber);

        if (paymentResult.success) {
          processedCount++;
          console.log(`✅ Successfully processed billing ${billing._id} for ${phoneNumber.number}`);
        } else {
          failedCount++;
          errors.push({
            billingId: billing._id,
            phoneNumber: phoneNumber.number,
            user: user.email,
            error: paymentResult.error,
          });
        }

      } catch (error) {
        console.error(`❌ Error processing billing ${billing._id}:`, error);
        failedCount++;
        errors.push({
          billingId: billing._id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Scheduled billing cron job completed in ${duration}ms: ${processedCount} successful, ${failedCount} failed`);

    // Record execution
    await cronExecutionService.recordExecution(
      jobName,
      jobPath,
      { 
        status: failedCount > 0 ? 'failed' : 'success', 
        processed: processedCount,
        failed: failedCount,
        errorDetails: errors,
        notes: `Processed ${dueBillings.length} billing records`
      },
      duration,
      triggerType
    );

    return NextResponse.json({
      message: `Processed ${dueBillings.length} billing records: ${processedCount} successful, ${failedCount} failed`,
      processed: processedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      duration: duration,
      triggered: triggerType,
    });

  } catch (error) {
    console.error('❌ Error in scheduled billing cron job via GET:', error);
    
    // Record failed execution
    await cronExecutionService.recordExecution(
      jobName,
      jobPath,
      { 
        status: 'failed', 
        errorDetails: [{ error: error instanceof Error ? error.message : 'Unknown error' }] 
      },
      Date.now() - startTime,
      triggerType
    );
    
    return NextResponse.json(
      { error: 'Failed to process scheduled billing' },
      { status: 500 }
    );
  }
} 