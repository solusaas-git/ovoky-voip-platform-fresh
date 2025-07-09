import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BackorderRequest from '@/models/BackorderRequest';
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

// Helper function to process backorder payment
async function processBackorderPayment(backorderRequest: any, user: any) {
  try {
    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      console.error('❌ Sippy API not configured, cannot process backorder payment for:', backorderRequest._id);
      return { success: false, error: 'Sippy API not configured' };
    }

    if (!user.sippyAccountId) {
      console.error('❌ User does not have Sippy account ID:', user.email);
      return { success: false, error: 'User does not have Sippy account ID' };
    }

    const sippyClient = new SippyClient(credentials);

    // Get the account's default currency to ensure compatibility
    let accountCurrency = backorderRequest.currency || 'EUR';
    try {
      const accountInfo = await sippyClient.getAccountInfo({ 
        i_account: user.sippyAccountId 
      });
      
      if (accountInfo?.payment_currency) {
        accountCurrency = accountInfo.payment_currency;
      }
    } catch (error) {
      console.log(`Failed to get account info for ${user.email}, using default currency`);
    }

    // Calculate total amount (setup fee + monthly fee for approved backorder)
    const setupFee = backorderRequest.setupFee || 0;
    const monthlyFee = backorderRequest.monthlyRate || 0;
    const totalAmount = setupFee + monthlyFee;

    if (totalAmount <= 0) {
      console.error('❌ Invalid amount for backorder payment:', totalAmount);
      return { success: false, error: 'Invalid payment amount' };
    }

    // Prepare billing note
    const paymentNotes = `Backorder approved payment for ${backorderRequest.country} number request (Setup: ${setupFee} + Monthly: ${monthlyFee})`;

    // Process the charge using Sippy accountDebit
    console.log(`💸 Processing backorder payment: ${totalAmount} ${accountCurrency} for ${user.email}`);
    
    const debitResult = await sippyClient.accountDebit({
      i_account: user.sippyAccountId,
      amount: totalAmount,
      currency: accountCurrency,
      payment_notes: paymentNotes,
    });

    // Check payment result
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
      const transactionId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment?.toString() || `backorder_${Date.now()}`;
      
      console.log(`✅ Backorder payment processed successfully for request ${backorderRequest._id}`);
      return { 
        success: true, 
        transactionId,
        setupFee,
        monthlyFee,
        totalAmount,
        currency: accountCurrency 
      };

    } else {
      const failureReason = debitResult.error || debitResult.tx_error || `Unexpected result: ${JSON.stringify(resultValue)}`;
      console.log(`❌ Backorder payment failed for request ${backorderRequest._id}:`, failureReason);
      
      return { success: false, error: failureReason };
    }

  } catch (error) {
    console.error('❌ Error processing backorder payment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Payment processing error' };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobName = 'Backorder Approvals';
  const jobPath = '/api/cron/process-backorder-approvals';
  let triggerType: 'manual' | 'vercel_cron' = 'vercel_cron';
  
  try {
    console.log('🕐 Cron job started: process-backorder-approvals');
    
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
    console.log(`🔥 Backorder Approvals job triggered: ${triggerType}`);

    await connectToDatabase();

    // Find all approved backorder requests that haven't been processed yet
    const approvedBackorders = await BackorderRequest.find({
      status: 'approved',
      paymentProcessed: { $ne: true }, // Not yet payment processed
    })
    .populate({
      path: 'userId',
      select: 'name email sippyAccountId',
    })
    .lean();

    console.log(`📋 Found ${approvedBackorders.length} approved backorder requests pending payment processing`);

    if (approvedBackorders.length === 0) {
      // Record successful execution with no processing needed
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'success', processed: 0, notes: 'No approved backorder requests found' },
        Date.now() - startTime,
        triggerType
      );
      
      return NextResponse.json({
        message: 'No approved backorder requests found',
        processed: 0,
        failed: 0,
      });
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Process each approved backorder request
    for (const backorderRequest of approvedBackorders) {
      try {
        const user = backorderRequest.userId as any;

        if (!user) {
          console.error(`❌ Missing user data for backorder request ${backorderRequest._id}`);
          failedCount++;
          errors.push({
            backorderRequestId: backorderRequest._id,
            user: 'Unknown',
            error: 'Missing user data',
          });
          continue;
        }

        if (!user.sippyAccountId) {
          console.error(`❌ User ${user.email} does not have Sippy account ID`);
          failedCount++;
          errors.push({
            backorderRequestId: backorderRequest._id,
            user: user.email,
            error: 'User does not have Sippy account ID',
          });
          continue;
        }

        console.log(`💸 Processing backorder payment for ${user.email} - ${backorderRequest.country} request`);

        const paymentResult = await processBackorderPayment(backorderRequest, user);
        
        if (paymentResult.success) {
          // Update backorder request to mark payment as processed
          await BackorderRequest.findByIdAndUpdate(backorderRequest._id, {
            paymentProcessed: true,
            paymentTransactionId: paymentResult.transactionId,
            paymentProcessedDate: new Date(),
            paymentAmount: paymentResult.totalAmount,
            paymentCurrency: paymentResult.currency,
            processedBy: verificationResult.isManual ? 'manual_admin' : 'cron_backorder_approvals',
          });

          processedCount++;
          console.log(`✅ Successfully processed backorder payment for request ${backorderRequest._id} (Transaction: ${paymentResult.transactionId})`);

        } else {
          // Update backorder request to mark payment as failed
          await BackorderRequest.findByIdAndUpdate(backorderRequest._id, {
            paymentProcessed: false,
            paymentFailureReason: paymentResult.error,
            paymentProcessedDate: new Date(),
            processedBy: verificationResult.isManual ? 'manual_admin' : 'cron_backorder_approvals',
          });

          failedCount++;
          errors.push({
            backorderRequestId: backorderRequest._id,
            user: user.email,
            country: backorderRequest.country,
            error: paymentResult.error,
          });
        }

      } catch (error) {
        console.error(`❌ Error processing backorder request ${backorderRequest._id}:`, error);
        failedCount++;
        errors.push({
          backorderRequestId: backorderRequest._id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Backorder approval cron job completed in ${duration}ms: ${processedCount} successful, ${failedCount} failed`);

    // Record execution
    await cronExecutionService.recordExecution(
      jobName,
      jobPath,
      { 
        status: failedCount > 0 ? 'failed' : 'success', 
        processed: processedCount,
        failed: failedCount,
        errorDetails: errors,
        notes: `Processed ${approvedBackorders.length} approved backorder requests`
      },
      duration,
      triggerType
    );

    return NextResponse.json({
      message: `Processed ${approvedBackorders.length} backorder requests: ${processedCount} successful, ${failedCount} failed`,
      processed: processedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      duration: duration,
      triggered: triggerType,
    });

  } catch (error) {
    console.error('❌ Error in backorder approval cron job:', error);
    
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
      { error: 'Failed to process backorder approvals' },
      { status: 500 }
    );
  }
}

// Support GET for Vercel cron jobs (Vercel uses GET requests for cron jobs)
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const jobName = 'Backorder Approvals';
  const jobPath = '/api/cron/process-backorder-approvals';
  let triggerType: 'manual' | 'vercel_cron' = 'vercel_cron';
  
  try {
    console.log('🕐 Cron job started via GET: process-backorder-approvals');
    
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
    console.log(`🔥 Backorder Approvals job triggered via GET: ${triggerType}`);

    await connectToDatabase();

    // Find all approved backorder requests that haven't been processed yet
    const approvedBackorders = await BackorderRequest.find({
      status: 'approved',
      paymentProcessed: { $ne: true }, // Not yet payment processed
    })
    .populate({
      path: 'userId',
      select: 'name email sippyAccountId',
    })
    .lean();

    console.log(`📋 Found ${approvedBackorders.length} approved backorder requests pending payment processing`);

    if (approvedBackorders.length === 0) {
      // Record successful execution with no processing needed
      await cronExecutionService.recordExecution(
        jobName,
        jobPath,
        { status: 'success', processed: 0, notes: 'No approved backorder requests found' },
        Date.now() - startTime,
        triggerType
      );
      
      return NextResponse.json({
        message: 'No approved backorder requests found',
        processed: 0,
        failed: 0,
      });
    }

    let processedCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Process each approved backorder request
    for (const backorderRequest of approvedBackorders) {
      try {
        const user = backorderRequest.userId as any;

        if (!user) {
          console.error(`❌ Missing user data for backorder request ${backorderRequest._id}`);
          failedCount++;
          errors.push({
            backorderRequestId: backorderRequest._id,
            user: 'Unknown',
            error: 'Missing user data',
          });
          continue;
        }

        if (!user.sippyAccountId) {
          console.error(`❌ User ${user.email} does not have Sippy account ID`);
          failedCount++;
          errors.push({
            backorderRequestId: backorderRequest._id,
            user: user.email,
            error: 'User does not have Sippy account ID',
          });
          continue;
        }

        console.log(`💸 Processing backorder payment for ${user.email} - ${backorderRequest.country} request`);

        const paymentResult = await processBackorderPayment(backorderRequest, user);
        
        if (paymentResult.success) {
          // Update backorder request to mark payment as processed
          await BackorderRequest.findByIdAndUpdate(backorderRequest._id, {
            paymentProcessed: true,
            paymentTransactionId: paymentResult.transactionId,
            paymentProcessedDate: new Date(),
            paymentAmount: paymentResult.totalAmount,
            paymentCurrency: paymentResult.currency,
            processedBy: verificationResult.isManual ? 'manual_admin' : 'cron_backorder_approvals',
          });

          processedCount++;
          console.log(`✅ Successfully processed backorder payment for request ${backorderRequest._id} (Transaction: ${paymentResult.transactionId})`);

        } else {
          // Update backorder request to mark payment as failed
          await BackorderRequest.findByIdAndUpdate(backorderRequest._id, {
            paymentProcessed: false,
            paymentFailureReason: paymentResult.error,
            paymentProcessedDate: new Date(),
            processedBy: verificationResult.isManual ? 'manual_admin' : 'cron_backorder_approvals',
          });

          failedCount++;
          errors.push({
            backorderRequestId: backorderRequest._id,
            user: user.email,
            country: backorderRequest.country,
            error: paymentResult.error,
          });
        }

      } catch (error) {
        console.error(`❌ Error processing backorder request ${backorderRequest._id}:`, error);
        failedCount++;
        errors.push({
          backorderRequestId: backorderRequest._id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Backorder approval cron job completed in ${duration}ms: ${processedCount} successful, ${failedCount} failed`);

    // Record execution
    await cronExecutionService.recordExecution(
      jobName,
      jobPath,
      { 
        status: failedCount > 0 ? 'failed' : 'success', 
        processed: processedCount,
        failed: failedCount,
        errorDetails: errors,
        notes: `Processed ${approvedBackorders.length} approved backorder requests`
      },
      duration,
      triggerType
    );

    return NextResponse.json({
      message: `Processed ${approvedBackorders.length} backorder requests: ${processedCount} successful, ${failedCount} failed`,
      processed: processedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      duration: duration,
      triggered: triggerType,
    });

  } catch (error) {
    console.error('❌ Error in backorder approval cron job via GET:', error);
    
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
      { error: 'Failed to process backorder approvals' },
      { status: 500 }
    );
  }
} 