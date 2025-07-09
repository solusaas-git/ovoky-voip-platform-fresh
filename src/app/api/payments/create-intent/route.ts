import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/authService';
import { PaymentGateway } from '@/models/PaymentGateway';
import { connectToDatabase } from '@/lib/db';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, currency = 'USD', provider = 'stripe' } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    await connectToDatabase();

    // Get active payment gateway for the provider
    const gateway = await PaymentGateway.findOne({ provider, isActive: true });
    if (!gateway) {
      return NextResponse.json({ 
        error: `No active ${provider} payment gateway configured` 
      }, { status: 400 });
    }

    // Validate amount against gateway settings
    if (amount < gateway.settings.minimumAmount) {
      return NextResponse.json({ 
        error: `Minimum amount is $${gateway.settings.minimumAmount}` 
      }, { status: 400 });
    }

    if (amount > gateway.settings.maximumAmount) {
      return NextResponse.json({ 
        error: `Maximum amount is $${gateway.settings.maximumAmount}` 
      }, { status: 400 });
    }

    // Validate currency
    if (!gateway.settings.allowedCurrencies.includes(currency)) {
      return NextResponse.json({ 
        error: `Currency ${currency} is not supported` 
      }, { status: 400 });
    }

    // Calculate total amount including fees
    const processingFee = (amount * gateway.settings.processingFee) / 100;
    const totalAmount = amount + processingFee + gateway.settings.fixedFee;

    if (provider === 'stripe') {
      const stripe = new Stripe(gateway.configuration.secretKey!, {
        apiVersion: '2025-05-28.basil'
      });

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Stripe expects cents
        currency: currency.toLowerCase(),
        metadata: {
          userId: user.id,
          sippyAccountId: user.sippyAccountId?.toString() || '',
          topupAmount: amount.toString(),
          processingFee: processingFee.toString(),
          fixedFee: gateway.settings.fixedFee.toString(),
          gatewayId: gateway._id.toString()
        },
        description: `Balance top-up for ${user.email} - $${amount} ${currency}`
      });

      return NextResponse.json({
        clientSecret: paymentIntent.client_secret,
        publishableKey: gateway.configuration.publishableKey,
        amount: totalAmount,
        topupAmount: amount,
        processingFee,
        fixedFee: gateway.settings.fixedFee,
        currency,
        gatewayName: gateway.name
      });
    }

    // Add support for other providers here (PayPal, Square, etc.)
    return NextResponse.json({ 
      error: `Provider ${provider} not yet implemented` 
    }, { status: 400 });

  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json({ 
      error: 'Failed to create payment intent' 
    }, { status: 500 });
  }
} 