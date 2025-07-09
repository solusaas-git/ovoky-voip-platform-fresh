import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { connectToDatabase } from '@/lib/db';
import PhoneNumber from '@/models/PhoneNumber';
import PhoneNumberAssignment from '@/models/PhoneNumberAssignment';
import PhoneNumberBilling from '@/models/PhoneNumberBilling';
import NumberRate from '@/models/NumberRate';
import RateDeckAssignment from '@/models/RateDeckAssignment';
import BrandingSettings from '@/models/BrandingSettings';
import UserOnboarding from '@/models/UserOnboarding';
import User from '@/models/User';
import { getSippyApiCredentials } from '@/lib/sippyClientConfig';
import { SippyClient } from '@/lib/sippyClient';
import mongoose from 'mongoose';
import { z } from 'zod';
import { generateNumberPurchaseNotificationTemplate } from '@/lib/emailTemplates/phoneNumberNotifications';
import { logAndSendEmail } from '@/lib/emailLogger';
import SmtpService from '@/services/SmtpService';
import { sendAdminUserPurchaseNotification } from '@/lib/adminNotifications';

// TypeScript interfaces
interface PhoneNumberDocument {
  _id: mongoose.Types.ObjectId;
  number: string;
  country: string;
  numberType: string;
  rateDeckId?: mongoose.Types.ObjectId;
  setupFee?: number;
  currency: string;
  billingCycle: string;
  status: string;
  backorderOnly?: boolean;
  description?: string;
  capabilities?: string[];
  provider?: string;
  monthlyRate?: number;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: mongoose.Types.ObjectId;
  assignedBy?: string;
  assignedAt?: Date;
  nextBillingDate?: Date;
  lastBilledDate?: Date;
  unassignedAt?: Date;
  unassignedBy?: string;
  unassignedReason?: string;
}

interface UserDocument {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

// Validation schema for purchasing phone numbers
const purchaseSchema = z.object({
  phoneNumberId: z.string().min(1, 'Phone number ID is required'),
});

// Helper function to find matching rate for a phone number
const findMatchingRate = async (phoneNumber: PhoneNumberDocument, rateDeckId: string) => {
  if (!rateDeckId) return null;
  
  console.log(`[Rate Matching] Looking for rates for number: ${phoneNumber.number}, country: ${phoneNumber.country}, type: ${phoneNumber.numberType}, rateDeckId: ${rateDeckId}`);
  
  // Find all rates for this rate deck
  const rates = await NumberRate.find({
    rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
  }).lean();
  
  console.log(`[Rate Matching] Found ${rates.length} rates in deck ${rateDeckId}`);
  
  if (rates.length > 0) {
    console.log(`[Rate Matching] Sample rates:`, rates.slice(0, 3).map(r => ({
      prefix: r.prefix,
      country: r.country,
      type: r.type,
      rate: r.rate
    })));
  }
  
  // Normalize phone number for prefix matching (remove + and any spaces)
  const normalizedNumber = phoneNumber.number.replace(/^\+/, '').replace(/\s/g, '');
  console.log(`[Rate Matching] Normalized phone number: ${normalizedNumber} (from ${phoneNumber.number})`);
  
  // First, try to find rates matching country and type
  const countryTypeRates = rates.filter(rate => 
    rate.country.toLowerCase() === phoneNumber.country.toLowerCase() && 
    rate.type === phoneNumber.numberType
  );
  
  console.log(`[Rate Matching] Found ${countryTypeRates.length} rates matching country and type`);
  
  if (countryTypeRates.length > 0) {
    // Among matching country/type rates, find the one with longest matching prefix
    let bestMatch = null;
    let longestMatch = 0;
    
    for (const rate of countryTypeRates) {
      // Normalize rate prefix for comparison (remove + and spaces)
      const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
      const matches = normalizedNumber.startsWith(normalizedPrefix);
      
      console.log(`[Rate Matching] Checking prefix ${rate.prefix} (normalized: ${normalizedPrefix}) against ${normalizedNumber}: ${matches}`);
      
      if (matches && normalizedPrefix.length > longestMatch) {
        bestMatch = rate;
        longestMatch = normalizedPrefix.length;
      }
    }
    
    if (bestMatch) {
      console.log(`[Rate Matching] Best match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, setupFee=${bestMatch.setupFee}`);
      return bestMatch;
    }
  }
  
  // Fallback: try prefix matching only
  console.log(`[Rate Matching] No country/type match, trying prefix-only matching`);
  let bestMatch = null;
  let longestMatch = 0;
  
  for (const rate of rates) {
    // Normalize rate prefix for comparison (remove + and spaces)
    const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
    const matches = normalizedNumber.startsWith(normalizedPrefix);
    
    if (matches && normalizedPrefix.length > longestMatch) {
      bestMatch = rate;
      longestMatch = normalizedPrefix.length;
    }
  }
  
  if (bestMatch) {
    console.log(`[Rate Matching] Fallback match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, country=${bestMatch.country}, type=${bestMatch.type}`);
  } else {
    console.log(`[Rate Matching] No matching rate found for ${phoneNumber.number}`);
  }
  
  return bestMatch;
};

// POST - Purchase a phone number
export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to the database
    await connectToDatabase();

    const body = await request.json();
    
    // Validate the request body
    const validatedData = purchaseSchema.parse(body);

    // Find the phone number and verify it's available
    const phoneNumber = await PhoneNumber.findOne({
      _id: new mongoose.Types.ObjectId(validatedData.phoneNumberId),
      status: 'available',
      backorderOnly: { $ne: true }, // Cannot purchase backorder-only numbers directly
    });

    if (!phoneNumber) {
      // Check if it's a backorder-only number to provide specific error message
      const backorderNumber = await PhoneNumber.findOne({
        _id: new mongoose.Types.ObjectId(validatedData.phoneNumberId),
        status: 'available',
        backorderOnly: true,
      });
      
      if (backorderNumber) {
        return NextResponse.json(
          { error: 'This phone number requires a backorder request and cannot be purchased directly' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Phone number not found or not available for purchase' },
        { status: 404 }
      );
    }

    // Get user's assigned rate deck and find matching rate
    const userRateDeck = await getUserAssignedRateDeck(user.id);
    if (!userRateDeck) {
      return NextResponse.json(
        { error: 'No rate deck assigned to your account. Please contact support.' },
        { status: 400 }
      );
    }
    
    const rate = await findMatchingRateInDeck(phoneNumber, userRateDeck._id.toString());
    
    if (!rate) {
      return NextResponse.json(
        { error: 'No rate found for this phone number in your assigned rate deck' },
        { status: 400 }
      );
    }

    const monthlyRate = rate.rate;
    const setupFee = rate.setupFee || phoneNumber.setupFee || 0;

    const now = new Date();
    
    // Calculate next billing date (today + billing cycle)
    const nextBillingDate = new Date(now);
    if (phoneNumber.billingCycle === 'yearly') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    } else {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    }

    // Perform operations without transactions for standalone MongoDB (like admin assignment)
    try {
      console.log(`🔄 User ${user.email} purchasing phone number ${phoneNumber.number}`);
      console.log(`💰 Using rates: ${monthlyRate} ${phoneNumber.currency}/month, setup: ${setupFee} ${phoneNumber.currency}`);
      
      const paymentResults = await updatePhoneNumberAndCreateRecords(phoneNumber, user, now, nextBillingDate, monthlyRate, setupFee);
      
      // Log payment results
      if (paymentResults.monthlyPayment) {
        if (paymentResults.monthlyPayment.success) {
          console.log(`✅ Monthly payment processed: ${monthlyRate} ${phoneNumber.currency} (Transaction: ${paymentResults.monthlyPayment.transactionId})`);
        } else {
          console.log(`❌ Monthly payment failed: ${paymentResults.monthlyPayment.error}`);
        }
      }
      
      if (paymentResults.setupPayment) {
        if (paymentResults.setupPayment.success) {
          console.log(`✅ Setup fee processed: ${setupFee} ${phoneNumber.currency} (Transaction: ${paymentResults.setupPayment.transactionId})`);
        } else {
          console.log(`❌ Setup fee payment failed: ${paymentResults.setupPayment.error}`);
        }
      }
      
    } catch (purchaseError) {
      console.error('Error during purchase operations:', purchaseError);
      
      // Try to rollback phone number status if possible (best effort)
      try {
        await PhoneNumber.findByIdAndUpdate(phoneNumber._id, {
          $set: {
            status: 'available',
            assignedTo: null,
            assignedBy: null,
            assignedAt: null,
          }
        });
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
      
      throw purchaseError;
    }

    console.log(`✅ User ${user.email} successfully purchased phone number ${phoneNumber.number}`);

    // Return success response with updated number info
    const updatedNumber = await PhoneNumber.findById(phoneNumber._id).lean();

    const response = {
      ...updatedNumber,
      _id: updatedNumber!._id.toString(),
      // rateDeckId and rateDeckName removed - rate decks are now assigned to users, not phone numbers
      assignedTo: updatedNumber!.assignedTo?.toString(),
      createdAt: updatedNumber!.createdAt.toISOString(),
      updatedAt: updatedNumber!.updatedAt.toISOString(),
      assignedAt: updatedNumber!.assignedAt?.toISOString(),
      nextBillingDate: updatedNumber!.nextBillingDate?.toISOString(),
      lastBilledDate: updatedNumber!.lastBilledDate?.toISOString(),
    };

    // Send purchase notification email
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
      const purchaseData = {
        phoneNumber: {
          number: phoneNumber.number,
          country: phoneNumber.country,
          numberType: phoneNumber.numberType,
          monthlyRate: monthlyRate,
          setupFee: setupFee,
          currency: phoneNumber.currency,
          capabilities: phoneNumber.capabilities || []
        },
        user: {
          name: user.name || user.email,
          email: user.email
        },
        purchase: {
          purchaseId: `PU${Date.now()}`,
          purchaseDate: now.toISOString(),
          totalAmount: monthlyRate + setupFee,
          billingStartDate: now.toISOString(),
          nextBillingDate: nextBillingDate.toISOString()
        },
        purchaseType: 'direct' as const,
        branding
      };

      const emailTemplate = generateNumberPurchaseNotificationTemplate(purchaseData);

      // Send the email using logAndSendEmail
      await logAndSendEmail(
        {
          userId: user.id,
          userEmail: user.email,
          userName: user.name || user.email,
          sippyAccountId: user.sippyAccountId,
          notificationType: 'number_purchase_single',
          emailSubject: emailTemplate.subject,
          emailBody: emailTemplate.html,
          alertData: {
            alertType: 'purchase_notification',
            value: purchaseData.purchase.totalAmount,
            threshold: 0,
            severity: 'info',
            phoneNumber: phoneNumber.number,
            purchaseId: purchaseData.purchase.purchaseId,
            totalAmount: purchaseData.purchase.totalAmount,
            currency: phoneNumber.currency
          }
        },
        async () => {
          const smtpService = SmtpService.getInstance();
          return await smtpService.sendSupportEmail({
            to: user.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          }) as { success: boolean; error?: string; messageId?: string };
        }
      );

      console.log(`📧 Purchase notification email sent to ${user.email}`);

      // Get user's company information from onboarding data
      let userCompany;
      try {
        const userOnboarding = await UserOnboarding.findOne({ userId: user.id }).lean();
        userCompany = userOnboarding?.companyName;
      } catch (error) {
        console.error('Error fetching user onboarding data:', error);
      }

      // Send admin notification
      await sendAdminUserPurchaseNotification({
        phoneNumber: {
          number: phoneNumber.number,
          country: phoneNumber.country,
          numberType: phoneNumber.numberType,
          monthlyRate: monthlyRate,
          setupFee: setupFee,
          currency: phoneNumber.currency,
          capabilities: phoneNumber.capabilities || []
        },
        user: {
          name: user.name || user.email,
          email: user.email,
          company: userCompany
        },
        purchase: {
          purchaseId: purchaseData.purchase.purchaseId,
          purchaseDate: now.toISOString(),
          totalAmount: monthlyRate + setupFee,
          billingStartDate: now.toISOString(),
          nextBillingDate: nextBillingDate.toISOString()
        },
        purchaseType: 'direct'
      });
    } catch (emailError) {
      console.error('Failed to send purchase notification email:', emailError);
      // Don't fail the purchase if email fails
    }

    return NextResponse.json({
      message: 'Phone number purchased successfully',
      phoneNumber: response,
    }, { status: 201 });

  } catch (error) {
    console.error('Error purchasing phone number:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to purchase phone number' },
      { status: 500 }
    );
  }
}

// Helper function to handle phone number updates and record creation
async function updatePhoneNumberAndCreateRecords(
  phoneNumber: PhoneNumberDocument,
  user: UserDocument,
  now: Date,
  nextBillingDate: Date,
  monthlyRate: number,
  setupFee: number
) {
  // Update phone number status and assignment
  await PhoneNumber.findByIdAndUpdate(
    phoneNumber._id,
    {
      $set: {
        status: 'assigned',
        assignedTo: new mongoose.Types.ObjectId(user.id),
        assignedBy: user.email,
        assignedAt: now,
        nextBillingDate,
        lastBilledDate: now, // First billing starts today
        monthlyRate: monthlyRate, // Store the calculated rate
        setupFee: setupFee, // Store the calculated setup fee
        // Clear any previous unassignment data
        unassignedAt: null,
        unassignedBy: null,
        unassignedReason: null,
      }
    }
  );

  // Create assignment record
  const assignment = new PhoneNumberAssignment({
    phoneNumberId: phoneNumber._id,
    userId: new mongoose.Types.ObjectId(user.id),
    assignedBy: user.email,
    assignedAt: now,
    status: 'active',
    billingStartDate: now,
    monthlyRate: monthlyRate,
    setupFee: setupFee,
    currency: phoneNumber.currency,
    billingCycle: phoneNumber.billingCycle,
  });
  await assignment.save();

  // Process monthly fee payment immediately if there's a monthly rate
  let monthlyPaymentResult = null;
  if (monthlyRate && monthlyRate > 0) {
    const monthlyBilling = new PhoneNumberBilling({
      phoneNumberId: phoneNumber._id,
      userId: new mongoose.Types.ObjectId(user.id),
      assignmentId: assignment._id,
      amount: monthlyRate,
      currency: phoneNumber.currency,
      billingDate: now,
      billingPeriodStart: now,
      billingPeriodEnd: new Date(nextBillingDate.getTime() - 24 * 60 * 60 * 1000), // Day before next billing
      description: `Monthly charge for ${phoneNumber.number}`,
      transactionType: 'monthly_fee',
      paymentType: 'debit', // Debit for Sippy charge
      status: 'pending', // Will be updated by processImmediatePayment
    });
    await monthlyBilling.save();

    // Process payment immediately
    monthlyPaymentResult = await processImmediatePayment(monthlyBilling, user, phoneNumber);
    if (!monthlyPaymentResult.success) {
      console.error(`❌ Monthly payment failed for ${phoneNumber.number}:`, monthlyPaymentResult.error);
      // Continue with setup fee processing even if monthly fee fails
    }
  }

  // Process setup fee payment immediately if applicable
  let setupPaymentResult = null;
  if (setupFee && setupFee > 0) {
    const setupBilling = new PhoneNumberBilling({
      phoneNumberId: phoneNumber._id,
      userId: new mongoose.Types.ObjectId(user.id),
      assignmentId: assignment._id,
      amount: setupFee,
      currency: phoneNumber.currency,
      billingDate: now,
      billingPeriodStart: now,
      billingPeriodEnd: now,
      description: `Setup fee for ${phoneNumber.number}`,
      transactionType: 'setup_fee',
      paymentType: 'debit', // Debit for Sippy charge
      status: 'pending', // Will be updated by processImmediatePayment
    });
    await setupBilling.save();

    // Process payment immediately
    setupPaymentResult = await processImmediatePayment(setupBilling, user, phoneNumber);
    if (!setupPaymentResult.success) {
      console.error(`❌ Setup fee payment failed for ${phoneNumber.number}:`, setupPaymentResult.error);
    }
  }

  // Return payment results for logging/reporting
  return {
    monthlyPayment: monthlyPaymentResult,
    setupPayment: setupPaymentResult
  };
}

// Helper function to get user's assigned rate deck
const getUserAssignedRateDeck = async (userId: string) => {
  try {
    const assignment = await RateDeckAssignment.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      rateDeckType: 'number', // Only number rate decks (corrected field name)
      isActive: true
    }).populate('rateDeckId').lean();

    if (assignment && assignment.rateDeckId) {
      return assignment.rateDeckId as any; // Populated rate deck
    }
    return null;
  } catch (error) {
    console.error('Error getting user assigned rate deck:', error);
    return null;
  }
};

// Helper function to find matching rate in a specific rate deck
const findMatchingRateInDeck = async (phoneNumber: PhoneNumberDocument, rateDeckId: string) => {
  if (!rateDeckId) return null;
  
  console.log(`[Rate Matching] Looking for rates for number: ${phoneNumber.number}, country: ${phoneNumber.country}, type: ${phoneNumber.numberType}, rateDeckId: ${rateDeckId}`);
  
  // Find all rates for this rate deck
  const rates = await NumberRate.find({
    rateDeckId: new mongoose.Types.ObjectId(rateDeckId),
  }).lean();
  
  console.log(`[Rate Matching] Found ${rates.length} rates in deck ${rateDeckId}`);
  
  if (rates.length > 0) {
    console.log(`[Rate Matching] Sample rates:`, rates.slice(0, 3).map(r => ({
      prefix: r.prefix,
      country: r.country,
      type: r.type,
      rate: r.rate
    })));
  }
  
  // Normalize phone number for prefix matching (remove + and any spaces)
  const normalizedNumber = phoneNumber.number.replace(/^\+/, '').replace(/\s/g, '');
  console.log(`[Rate Matching] Normalized phone number: ${normalizedNumber} (from ${phoneNumber.number})`);
  
  // First, try to find rates matching country and type
  const countryTypeRates = rates.filter(rate => 
    rate.country.toLowerCase() === phoneNumber.country.toLowerCase() && 
    rate.type === phoneNumber.numberType
  );
  
  console.log(`[Rate Matching] Found ${countryTypeRates.length} rates matching country and type`);
  
  if (countryTypeRates.length > 0) {
    // Among matching country/type rates, find the one with longest matching prefix
    let bestMatch = null;
    let longestMatch = 0;
    
    for (const rate of countryTypeRates) {
      // Normalize rate prefix for comparison (remove + and spaces)
      const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
      const matches = normalizedNumber.startsWith(normalizedPrefix);
      
      console.log(`[Rate Matching] Checking prefix ${rate.prefix} (normalized: ${normalizedPrefix}) against ${normalizedNumber}: ${matches}`);
      
      if (matches && normalizedPrefix.length > longestMatch) {
        bestMatch = rate;
        longestMatch = normalizedPrefix.length;
      }
    }
    
    if (bestMatch) {
      console.log(`[Rate Matching] Best match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, setupFee=${bestMatch.setupFee}`);
      return bestMatch;
    }
  }
  
  // Fallback: try prefix matching only
  console.log(`[Rate Matching] No country/type match, trying prefix-only matching`);
  let bestMatch = null;
  let longestMatch = 0;
  
  for (const rate of rates) {
    // Normalize rate prefix for comparison (remove + and spaces)
    const normalizedPrefix = rate.prefix.replace(/^\+/, '').replace(/\s/g, '');
    const matches = normalizedNumber.startsWith(normalizedPrefix);
    
    if (matches && normalizedPrefix.length > longestMatch) {
      bestMatch = rate;
      longestMatch = normalizedPrefix.length;
    }
  }
  
  if (bestMatch) {
    console.log(`[Rate Matching] Fallback match: prefix=${bestMatch.prefix}, rate=${bestMatch.rate}, country=${bestMatch.country}, type=${bestMatch.type}`);
  } else {
    console.log(`[Rate Matching] No matching rate found for ${phoneNumber.number}`);
  }
  
  return bestMatch;
};

// Helper function to process payments immediately
async function processImmediatePayment(billing: any, user: UserDocument, phoneNumber: PhoneNumberDocument) {
  try {
    // Get Sippy API credentials
    const credentials = await getSippyApiCredentials();
    if (!credentials) {
      console.error('❌ Sippy API not configured, cannot process payment for billing:', billing._id);
      return { success: false, error: 'Sippy API not configured' };
    }

    // Get full user document with Sippy account ID
    const fullUser = await User.findById(user.id);
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

    // Prepare billing note
    const paymentNotes = `Immediate charge for Number: ${phoneNumber.number} (${billing.transactionType})`;

    // Process the charge using Sippy accountDebit
    console.log(`💸 Processing immediate payment: ${billing.amount} ${accountCurrency} for ${phoneNumber.number}`);
    
    const debitResult = await sippyClient.accountDebit({
      i_account: fullUser.sippyAccountId,
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
      billing.processedBy = 'automatic_purchase';
      await billing.save();
      
      console.log(`✅ Payment processed successfully for billing ${billing._id}`);
      return { success: true, transactionId: billing.sippyTransactionId };

    } else {
      // Failed - mark as failed
      const failureReason = debitResult.error || debitResult.tx_error || `Unexpected result: ${JSON.stringify(resultValue)}`;
      console.log(`❌ Payment failed for billing ${billing._id}:`, failureReason);
      
      billing.status = 'failed';
      billing.failureReason = failureReason;
      billing.processedBy = 'automatic_purchase';
      await billing.save();
      
      return { success: false, error: failureReason };
    }

  } catch (error) {
    console.error('❌ Error processing immediate payment:', error);
    
    // Update billing record to reflect the failure
    billing.status = 'failed';
    billing.failureReason = error instanceof Error ? error.message : 'Payment processing error';
    billing.processedBy = 'automatic_purchase';
    await billing.save();
    
    return { success: false, error: billing.failureReason };
  }
}