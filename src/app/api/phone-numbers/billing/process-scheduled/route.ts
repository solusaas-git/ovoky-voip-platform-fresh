import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import User from '@/models/User';
import { SippyClient } from '@/lib/sippyClient';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import mongoose from 'mongoose';

// TypeScript interfaces for billing processing
interface ProcessedBilling {
  billingId: string | mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'success';
  sippyTransactionId: string;
}

interface BillingError {
  billingId: string | mongoose.Types.ObjectId;
  amount?: number;
  currency?: string;
  error: string;
  phoneNumber: string;
  user?: string;
}

/**
 * POST /api/phone-numbers/billing/process-scheduled
 * Process scheduled monthly billing for phone numbers
 * This endpoint is designed to be called by a cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is an admin request or internal cron
    const user = await getCurrentUser();
    
    // Allow internal cron requests (check for API key) or admin users
    const authHeader = request.headers.get('authorization');
    const internalApiKey = process.env.INTERNAL_API_KEY;
    
    const isInternalRequest = authHeader === `Bearer ${internalApiKey}` && internalApiKey;
    const isAdminRequest = user && user.role === 'admin';
    
    if (!isInternalRequest && !isAdminRequest) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const startTime = Date.now();
    const processedBillings: ProcessedBilling[] = [];
    const errors: BillingError[] = [];

    // Find all pending billings that are due for processing
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    const dueBillings = await PhoneNumberBilling.find({
      status: 'pending',
      billingDate: { $lte: today }, // Due today or overdue
      transactionType: { $in: ['monthly_fee', 'setup_fee'] }, // Only process fees, not refunds
    })
    .populate('phoneNumberId')
    .populate('userId')
    .populate('assignmentId')
    .lean();

    console.log(`🔍 Found ${dueBillings.length} due billing records to process`);

    if (dueBillings.length === 0) {
      return NextResponse.json({
        message: 'No billing records due for processing',
        processed: 0,
        errors: 0,
        requestDuration: Date.now() - startTime,
      });
    }

    // Get Sippy API credentials
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return NextResponse.json({ 
        error: 'Sippy API not configured' 
      }, { status: 500 });
    }

    const sippyClient = new SippyClient(credentials);

    // Process each billing record
    for (const billing of dueBillings) {
      try {
        const phoneNumber = billing.phoneNumberId as unknown as { _id: string; number: string; status: string };
        const billingUser = billing.userId as unknown as { _id: string; email: string; sippyAccountId?: number };

        // Verify user has Sippy account ID
        if (!billingUser.sippyAccountId) {
          errors.push({
            billingId: billing._id,
            phoneNumber: phoneNumber.number,
            user: billingUser.email,
            error: 'User does not have Sippy account ID',
          });
          continue;
        }

        // Prepare billing note
        const paymentNotes = `Monthly charge for Number: ${phoneNumber.number} (${billing.transactionType})`;

        console.log(`💸 Processing billing for ${phoneNumber.number} - ${billingUser.email} - ${billing.amount} ${billing.currency}`);

        // Process the charge using Sippy accountDebit
        // NOTE: Based on billing reflexions - we always charge full amount, no proration
        const debitResult = await sippyClient.accountDebit({
          i_account: billingUser.sippyAccountId,
          amount: billing.amount,
          currency: billing.currency,
          payment_notes: paymentNotes,
        });

        // Update billing record based on result
        try {
          if (debitResult.result === 'success' || debitResult.result === '1') {
            // Success - mark as paid
            billing.status = 'paid';
            billing.paidDate = new Date();
            billing.sippyTransactionId = debitResult.tx_id || `debit_${Date.now()}`;
            billing.processedBy = 'automated_billing';
            
            await billing.save();
            
            // Update phone number's last billed date
            await PhoneNumber.findByIdAndUpdate(billing.phoneNumberId, {
              lastBilledDate: new Date(),
            });

            console.log(`✅ Successfully processed billing ${billing._id} for ${billing.amount} ${billing.currency}`);
            
            processedBillings.push({
              billingId: billing._id,
              amount: billing.amount,
              currency: billing.currency,
              status: 'success',
              sippyTransactionId: billing.sippyTransactionId,
            });

          } else {
            // Failed - mark as failed and handle negative balance
            billing.status = 'failed';
            billing.failureReason = debitResult.error || 'Insufficient funds';
            billing.processedBy = 'automated_billing';
            
            await billing.save();
            
            // If failure is due to insufficient funds, suspend the number
            if (debitResult.error?.toLowerCase().includes('insufficient') || 
                debitResult.error?.toLowerCase().includes('balance')) {
              
              await PhoneNumber.findByIdAndUpdate(billing.phoneNumberId, {
                status: 'suspended',
                notes: `Suspended due to insufficient funds: ${debitResult.error}`,
              });
              
              console.log(`🚫 Suspended phone number ${phoneNumber.number} due to insufficient funds`);
            }
            
            console.log(`❌ Failed to process billing ${billing._id}: ${debitResult.error}`);
            
            errors.push({
              billingId: billing._id,
              amount: billing.amount,
              currency: billing.currency,
              error: debitResult.error || 'Unknown error',
              phoneNumber: phoneNumber.number,
            });
          }
        } catch (dbError) {
          console.error('Database update error after Sippy operation:', dbError);
          errors.push({
            billingId: billing._id,
            amount: billing.amount,
            currency: billing.currency,
            error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
            phoneNumber: phoneNumber.number,
          });
        }

      } catch (error) {
        console.error(`❌ Error processing billing ${billing._id}:`, error);
        
        // Mark billing as failed
        try {
          await PhoneNumberBilling.findByIdAndUpdate(billing._id, {
            status: 'failed',
            failureReason: error instanceof Error ? error.message : 'Processing error',
            processedBy: 'automated_billing',
          });
        } catch (updateError) {
          console.error('Failed to update billing record:', updateError);
        }

        errors.push({
          billingId: billing._id,
          phoneNumber: (billing.phoneNumberId as unknown as { number?: string })?.number || 'Unknown',
          user: (billing.userId as unknown as { email?: string })?.email || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const requestDuration = Date.now() - startTime;

    console.log(`✅ Billing processing completed:`);
    console.log(`   - Processed: ${processedBillings.length}`);
    console.log(`   - Errors: ${errors.length}`);
    console.log(`   - Duration: ${requestDuration}ms`);

    return NextResponse.json({
      message: 'Scheduled billing processing completed',
      processed: processedBillings.length,
      errors: errors.length,
      requestDuration,
      processedBillings: processedBillings.slice(0, 10), // Limit response size
      errorSummary: errors.slice(0, 10), // Limit response size
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error in scheduled billing processing:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process scheduled billing',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/phone-numbers/billing/process-scheduled
 * Get status of scheduled billing (for monitoring)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get counts of different billing statuses
    const [pendingDue, pendingFuture, processedToday, failedToday] = await Promise.all([
      PhoneNumberBilling.countDocuments({
        status: 'pending',
        billingDate: { $lte: today },
        transactionType: { $in: ['monthly_fee', 'setup_fee'] },
      }),
      PhoneNumberBilling.countDocuments({
        status: 'pending',
        billingDate: { $gt: today },
        transactionType: { $in: ['monthly_fee', 'setup_fee'] },
      }),
      PhoneNumberBilling.countDocuments({
        status: 'paid',
        paidDate: { $gte: today },
        processedBy: 'automated_billing',
      }),
      PhoneNumberBilling.countDocuments({
        status: 'failed',
        updatedAt: { $gte: today },
        processedBy: 'automated_billing',
      }),
    ]);

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      pendingDue,
      pendingFuture,
      processedToday,
      failedToday,
      nextRun: 'Manual or cron-scheduled',
    });

  } catch (error) {
    console.error('Error getting scheduled billing status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get billing status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}