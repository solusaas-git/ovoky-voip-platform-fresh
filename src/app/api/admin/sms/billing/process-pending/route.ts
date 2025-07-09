import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import SmsBilling from '@/models/SmsBilling';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectToDatabase();

    // Find all pending and failed billings
    const pendingBillings = await SmsBilling.find({ status: { $in: ['pending', 'failed'] } })
      .populate('userId', 'email name company sippyAccountId')
      .lean();

    if (pendingBillings.length === 0) {
      return NextResponse.json({ 
        message: 'No pending or failed billings found',
        processedCount: 0 
      });
    }

    let processedCount = 0;
    const results = [];

    for (const billing of pendingBillings) {
      try {
        const billingUser = billing.userId as any;
        
        if (!billingUser?.sippyAccountId) {
          await SmsBilling.findByIdAndUpdate(billing._id, {
            status: 'failed',
            failureReason: 'No Sippy account found',
            processedBy: user.email,
          });
          results.push({ billingId: billing._id, status: 'failed', reason: 'No Sippy account' });
          continue;
        }

        // Get Sippy API credentials
        const { getSippyApiCredentials } = await import('@/lib/sippyClientConfig');
        const { SippyClient } = await import('@/lib/sippyClient');
        
        const credentials = await getSippyApiCredentials();
        
        if (!credentials) {
          await SmsBilling.findByIdAndUpdate(billing._id, {
            status: 'failed',
            failureReason: 'Sippy API not configured',
            processedBy: user.email,
          });
          results.push({ billingId: billing._id, status: 'failed', reason: 'Sippy API not configured' });
          continue;
        }

        const sippyClient = new SippyClient(credentials);

        // Skip if total cost is zero
        if (billing.totalCost <= 0) {
          await SmsBilling.findByIdAndUpdate(billing._id, {
            status: 'paid',
            paidDate: new Date(),
            processedBy: user.email,
            notes: (billing.notes || '') + ' (Zero cost - automatically marked as paid)',
          });
          processedCount++;
          results.push({ billingId: billing._id, status: 'paid', reason: 'Zero cost' });
          continue;
        }

        // Get the account's default currency to ensure compatibility
        let accountCurrency = billing.currency;
        try {
          const accountInfo = await sippyClient.getAccountInfo({ 
            i_account: billingUser.sippyAccountId 
          });
          
          if (accountInfo?.payment_currency) {
            accountCurrency = accountInfo.payment_currency;
          }
        } catch (error) {
          console.log(`Failed to get account info for ${billingUser.email}, using billing currency: ${billing.currency}`);
        }

        // Prepare billing note
        const paymentNotes = `Bulk SMS billing charge: ${billing.totalMessages} messages (${billing.billingPeriodStart.toISOString().split('T')[0]} to ${billing.billingPeriodEnd.toISOString().split('T')[0]}) - Processed by ${user.email}`;

        console.log(`💸 Processing bulk SMS billing for ${billingUser.email}: ${billing.totalCost} ${accountCurrency}`);

        // Process the charge using Sippy accountDebit
        const debitResult = await sippyClient.accountDebit({
          i_account: billingUser.sippyAccountId,
          amount: billing.totalCost,
          currency: accountCurrency,
          payment_notes: paymentNotes,
        });

        // Update billing record based on result
        const sippyResult = debitResult as any;
        const hasError = (debitResult.error && debitResult.error.trim() !== '') || 
                        (debitResult.tx_error && debitResult.tx_error.trim() !== '');
        const hasTxId = debitResult.tx_id || debitResult.payment_id || debitResult.i_payment;
        
        // Determine success based on multiple criteria
        const isSuccess = (
          !hasError && 
          hasTxId && 
          sippyResult.result !== null && 
          sippyResult.result !== undefined &&
          sippyResult.result >= 0
        );

        if (isSuccess) {
          await SmsBilling.findByIdAndUpdate(billing._id, {
            status: 'paid',
            paidDate: new Date(),
            sippyTransactionId: String(hasTxId),
            processedBy: user.email,
            notes: (billing.notes || '') + ` (Sippy TX: ${hasTxId})`,
          });
          processedCount++;
          results.push({ billingId: billing._id, status: 'paid', transactionId: String(hasTxId) });
        } else {
          const errorMessage = debitResult.error || debitResult.tx_error || 'Payment failed';
          await SmsBilling.findByIdAndUpdate(billing._id, {
            status: 'failed',
            failureReason: errorMessage,
            processedBy: user.email,
          });
          results.push({ billingId: billing._id, status: 'failed', reason: errorMessage });
        }

      } catch (error) {
        console.error('Error processing billing:', billing._id, error);
        await SmsBilling.findByIdAndUpdate(billing._id, {
          status: 'failed',
          failureReason: error instanceof Error ? error.message : 'Processing error',
          processedBy: user.email,
        });
        results.push({ billingId: billing._id, status: 'failed', reason: error instanceof Error ? error.message : 'Processing error' });
      }
    }

    return NextResponse.json({
      message: `Processed ${processedCount} of ${pendingBillings.length} pending billings`,
      processedCount,
      totalPending: pendingBillings.length,
      results
    });

  } catch (error) {
    console.error('Error processing pending billings:', error);
    return NextResponse.json(
      { error: 'Failed to process pending billings' },
      { status: 500 }
    );
  }
} 