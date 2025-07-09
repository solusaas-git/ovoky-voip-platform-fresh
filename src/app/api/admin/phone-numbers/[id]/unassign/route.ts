import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';

import User from '@/models/User';
import BrandingSettings from '@/models/BrandingSettings';
import mongoose from 'mongoose';
import { z } from 'zod';
import { generateNumberUnassignmentNotificationTemplate } from '@/lib/emailTemplates/phoneNumberNotifications';
import { logAndSendEmail } from '@/lib/emailLogger';
import SmtpService from '@/services/SmtpService';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';

// Validation schema for unassigning phone numbers
const unassignPhoneNumberSchema = z.object({
  reason: z.string().max(500).optional(),
  cancelPendingBilling: z.boolean().optional().default(true),
  createRefund: z.boolean().optional().default(false),
  refundAmount: z.number().min(0).optional(),
});

// Helper function to process refunds immediately
async function processImmediateRefund(billing: any, user: any, phoneNumber: any) {
  try {
    // Get Sippy API credentials
    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      console.error('❌ Sippy API not configured, cannot process refund for billing:', billing._id);
      return { success: false, error: 'Sippy API not configured' };
    }

    // Get full user document with Sippy account ID
    const fullUser = await User.findById(user._id || user.id);
    if (!fullUser || !fullUser.sippyAccountId) {
      console.error('❌ User does not have Sippy account ID:', user.email);
      return { success: false, error: 'User does not have Sippy account ID' };
    }

    const sippyClient = new SippyClient(credentials);

    // Get the account's default currency to ensure compatibility
    let accountCurrency = billing.currency;
    try {
      const accountInfo = await sippyClient.getAccountInfo({ 
        i_account: fullUser.sippyAccountId 
      });
      
      if (accountInfo?.payment_currency) {
        accountCurrency = accountInfo.payment_currency;
      }
    } catch (error) {
      console.log(`Failed to get account info for ${user.email}, using billing currency`);
    }

    // Prepare refund note
    const paymentNotes = `Refund for unassigned Number: ${phoneNumber.number} (${billing.transactionType})`;

    // Process the refund using Sippy accountCredit
    console.log(`💰 Processing immediate refund: ${billing.amount} ${accountCurrency} for ${phoneNumber.number}`);
    
    const creditResult = await sippyClient.accountCredit({
      i_account: fullUser.sippyAccountId,
      amount: billing.amount,
      currency: accountCurrency,
      payment_notes: paymentNotes,
    });

    // Update billing record based on result
    const sippyResult = creditResult as any;
    const resultValue = sippyResult.result;
    const txResult = sippyResult.tx_result;
    const hasError = (creditResult.error && creditResult.error.trim() !== '') || 
                    (creditResult.tx_error && creditResult.tx_error.trim() !== '');
    const hasTxId = creditResult.tx_id || creditResult.payment_id || creditResult.i_payment;
    
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
      // Success - mark as paid (processed)
      billing.status = 'paid';
      billing.paidDate = new Date();
      billing.sippyTransactionId = creditResult.tx_id || creditResult.payment_id || creditResult.i_payment?.toString() || `credit_${Date.now()}`;
      billing.processedBy = 'admin_unassignment';
      await billing.save();
      
      console.log(`✅ Refund processed successfully for billing ${billing._id}`);
      return { success: true, transactionId: billing.sippyTransactionId };

    } else {
      // Failed - mark as failed
      const failureReason = creditResult.error || creditResult.tx_error || `Unexpected result: ${JSON.stringify(resultValue)}`;
      console.log(`❌ Refund failed for billing ${billing._id}:`, failureReason);
      
      billing.status = 'failed';
      billing.failureReason = failureReason;
      billing.processedBy = 'admin_unassignment';
      await billing.save();
      
      return { success: false, error: failureReason };
    }

  } catch (error) {
    console.error('❌ Error processing immediate refund:', error);
    
    // Update billing record to reflect the failure
    billing.status = 'failed';
    billing.failureReason = error instanceof Error ? error.message : 'Refund processing error';
    billing.processedBy = 'admin_unassignment';
    await billing.save();
    
    return { success: false, error: billing.failureReason };
  }
}

// POST - Unassign phone number from user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify the user is authenticated and is an admin
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: phoneNumberId } = await params;
    const body = await request.json();
    
    // Validate the request body
    const validatedData = unassignPhoneNumberSchema.parse(body);

    // Connect to the database
    await connectToDatabase();

    // Find the phone number
    const phoneNumber = await PhoneNumber.findById(phoneNumberId);
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 });
    }

    // Check if phone number is currently assigned
    if (phoneNumber.status !== 'assigned') {
      return NextResponse.json(
        { error: `Phone number is ${phoneNumber.status} and cannot be unassigned` },
        { status: 400 }
      );
    }

    if (!phoneNumber.assignedTo) {
      return NextResponse.json(
        { error: 'Phone number is not assigned to any user' },
        { status: 400 }
      );
    }

    // Find the current active assignment
    const currentAssignment = await PhoneNumberAssignment.findOne({
      phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
      status: 'active',
    });

    if (!currentAssignment) {
      return NextResponse.json(
        { error: 'No active assignment found for this phone number' },
        { status: 404 }
      );
    }

    // Get the assigned user info for logging
    const assignedUser = await User.findById(phoneNumber.assignedTo);

    // Perform operations without transactions for standalone MongoDB
    try {
      console.log(`🔄 Unassigning phone number ${phoneNumber.number} from user ${assignedUser?.email || 'Unknown'}`);
      console.log(`📝 Reason: ${validatedData.reason || 'No reason provided'}`);
      
      // Update phone number status and remove assignment
      await PhoneNumber.findByIdAndUpdate(
        phoneNumberId,
        {
          $set: {
            status: 'available',
            assignedTo: null,
            assignedBy: null,
            assignedAt: null,
            unassignedAt: new Date(),
            unassignedBy: user.name || user.email,
            unassignedReason: validatedData.reason || 'Unassigned by admin',
          }
        }
      );

      // Update assignment record to mark as ended
      const assignmentUpdateResult = await PhoneNumberAssignment.findByIdAndUpdate(
        currentAssignment._id,
        {
          $set: {
            status: 'ended',
            unassignedAt: new Date(),
            unassignedBy: user.name || user.email,
            unassignedReason: validatedData.reason || 'Unassigned by admin',
            billingEndDate: new Date(),
          }
        },
        { new: true } // Return the updated document
      );

      if (!assignmentUpdateResult) {
        console.error(`❌ Failed to update assignment record ${currentAssignment._id} to ended status`);
        throw new Error('Failed to update assignment record');
      }

      console.log(`✅ Assignment record ${currentAssignment._id} updated to ended status`);
      console.log(`📊 Assignment status: ${assignmentUpdateResult.status}, unassignedAt: ${assignmentUpdateResult.unassignedAt}`);

      // Verify there are no remaining active assignments for this phone number
      const remainingActiveAssignments = await PhoneNumberAssignment.find({
        phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
        status: 'active',
      });

      if (remainingActiveAssignments.length > 0) {
        console.warn(`⚠️ Warning: Found ${remainingActiveAssignments.length} remaining active assignments for phone number ${phoneNumber.number}:`);
        remainingActiveAssignments.forEach((assignment, index) => {
          console.warn(`   ${index + 1}. Assignment ID: ${assignment._id}, User: ${assignment.userId}, Status: ${assignment.status}`);
        });
      } else {
        console.log(`✅ Confirmed: No remaining active assignments for phone number ${phoneNumber.number}`);
      }

      // Handle pending billing records
      if (validatedData.cancelPendingBilling) {
        // Find pending billings by assignmentId first (preferred method)
        const pendingBillingsByAssignment = await PhoneNumberBilling.find({
          phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
          assignmentId: currentAssignment._id,
          status: 'pending'
        });

        // Also find any pending billings for this phone number and user that might not have the assignmentId
        const pendingBillingsByPhoneAndUser = await PhoneNumberBilling.find({
          phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
          userId: currentAssignment.userId,
          status: 'pending'
        });

        // Combine and deduplicate billing records
        const allPendingBillings = [
          ...pendingBillingsByAssignment,
          ...pendingBillingsByPhoneAndUser.filter(billing => 
            !pendingBillingsByAssignment.some(existing => 
              existing._id.toString() === billing._id.toString()
            )
          )
        ];

        console.log(`💳 Found ${allPendingBillings.length} pending billing records to cancel (${pendingBillingsByAssignment.length} by assignment, ${pendingBillingsByPhoneAndUser.length} by phone+user)`);

        if (allPendingBillings.length > 0) {
          // Cancel all pending billings for this phone number and user
          const billingIds = allPendingBillings.map(billing => billing._id);
          
          const updateResult = await PhoneNumberBilling.updateMany(
            {
              _id: { $in: billingIds },
              status: 'pending'  // Double-check status to avoid race conditions
            },
            {
              $set: {
                status: 'cancelled',
                failureReason: 'Assignment terminated',
                processedBy: user.email,
                updatedAt: new Date(),
              }
            }
          );

          console.log(`💳 Successfully cancelled ${updateResult.modifiedCount} pending billing records`);
        }
      }

      // Create refund billing if requested
      if (validatedData.createRefund && validatedData.refundAmount && validatedData.refundAmount > 0) {
        console.log(`💰 Creating refund of ${validatedData.refundAmount} ${currentAssignment.currency}`);
        
        const refundBilling = new PhoneNumberBilling({
          phoneNumberId: new mongoose.Types.ObjectId(phoneNumberId),
          userId: currentAssignment.userId,
          assignmentId: currentAssignment._id,
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(),
          amount: Math.abs(validatedData.refundAmount), // Positive amount for refund
          currency: currentAssignment.currency,
          status: 'pending',
          billingDate: new Date(),
          transactionType: 'refund',
          paymentType: 'credit', // Credit type for Sippy refund integration
          notes: `Refund for unassigned number: ${validatedData.reason || 'Assignment terminated'}`,
        });

        await refundBilling.save();

        // Process the refund immediately
        console.log(`💰 Processing immediate refund for ${phoneNumber.number}`);
        const refundResult = await processImmediateRefund(refundBilling, assignedUser, phoneNumber);
        if (!refundResult.success) {
          console.error(`❌ Refund processing failed for ${phoneNumber.number}:`, refundResult.error);
        } else {
          console.log(`✅ Refund processed successfully for ${phoneNumber.number}`);
        }
      }

      // Fetch the updated phone number with populated data
      const updatedPhoneNumber = await PhoneNumber.findById(phoneNumberId).lean();

      // Rate deck fetching removed - rate decks are now assigned to users, not phone numbers

      // Transform the response
      const response = {
        ...updatedPhoneNumber,
        _id: updatedPhoneNumber!._id.toString(),
        // rateDeckId and rateDeckName removed - rate decks are now assigned to users, not phone numbers
        assignedTo: null,
        assignedToUser: null,
        createdAt: updatedPhoneNumber!.createdAt.toISOString(),
        updatedAt: updatedPhoneNumber!.updatedAt.toISOString(),
        assignedAt: null,
        unassignedAt: updatedPhoneNumber!.unassignedAt?.toISOString(),
        nextBillingDate: updatedPhoneNumber!.nextBillingDate?.toISOString(),
        lastBilledDate: updatedPhoneNumber!.lastBilledDate?.toISOString(),
      };

      console.log(`✅ Successfully unassigned phone number ${phoneNumber.number}`);

      // Send unassignment notification email to the user
      try {
        // Get branding settings
        let brandingSettings;
        try {
          brandingSettings = await BrandingSettings.findOne();
        } catch (error) {
          console.error('Error fetching branding settings:', error);
          brandingSettings = null;
        }

        // Default branding if none found
        const defaultBranding = {
          companyName: 'Your VoIP Company',
          companySlogan: 'Connecting the world',
          primaryColor: '#3b82f6',
          fontFamily: 'Inter'
        };

        const branding = {
          companyName: brandingSettings?.companyName || defaultBranding.companyName,
          companySlogan: brandingSettings?.companySlogan || defaultBranding.companySlogan,
          primaryColor: brandingSettings?.primaryColor || defaultBranding.primaryColor,
          fontFamily: brandingSettings?.fontFamily || defaultBranding.fontFamily
        };

        // Prepare notification data
        const unassignmentData = {
          phoneNumber: {
            number: phoneNumber.number,
            country: phoneNumber.country,
            numberType: phoneNumber.numberType,
            monthlyRate: currentAssignment.monthlyRate || 0,
            setupFee: currentAssignment.setupFee || 0,
            currency: currentAssignment.currency || 'USD',
            capabilities: phoneNumber.capabilities || []
          },
          user: {
            name: assignedUser?.name || assignedUser?.email || 'Unknown User',
            email: assignedUser?.email || 'unknown@example.com'
          },
          unassignment: {
            unassignedBy: user.name || user.email,
            unassignedAt: new Date().toISOString(),
            reason: validatedData.reason || ''
          },
          branding
        };

        const emailTemplate = generateNumberUnassignmentNotificationTemplate(unassignmentData);

        // Send the email using logAndSendEmail
        await logAndSendEmail(
          {
            userId: assignedUser?._id?.toString() || 'unknown',
            userEmail: assignedUser?.email || 'unknown@example.com',
            userName: assignedUser?.name || assignedUser?.email || 'Unknown User',
            sippyAccountId: assignedUser?.sippyAccountId,
            notificationType: 'number_unassignment',
            emailSubject: emailTemplate.subject,
            emailBody: emailTemplate.html
          },
          async () => {
            const smtpService = SmtpService.getInstance();
            const result = await smtpService.sendSupportEmail({
              to: assignedUser?.email || 'unknown@example.com',
              subject: emailTemplate.subject,
              html: emailTemplate.html,
              text: emailTemplate.text
            });
            return result as any; // Cast to match expected EmailResult type
          }
        );

        console.log(`📧 Unassignment notification email sent to ${assignedUser?.email || 'Unknown'}`);
      } catch (emailError) {
        console.error('Failed to send unassignment notification email:', emailError);
        // Don't fail the unassignment if email fails
      }

      return NextResponse.json({
        message: 'Phone number unassigned successfully',
        phoneNumber: response,
        cancelledBillings: validatedData.cancelPendingBilling,
        refundCreated: validatedData.createRefund && validatedData.refundAmount ? validatedData.refundAmount : null,
      });

    } catch (unassignmentError) {
      console.error('Error during unassignment operations:', unassignmentError);
      
      return NextResponse.json(
        { error: 'Failed to unassign phone number due to database operation failure' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error unassigning phone number:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to unassign phone number' },
      { status: 500 }
    );
  }
} 