'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Plus, 
  Loader2, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Info,
  Copy,
  CreditCard as CardIcon,
  XCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { useBranding } from '@/hooks/useBranding';

interface PaymentGateway {
  _id: string;
  name: string;
  provider: string;
  settings: {
    allowedCurrencies: string[];
    minimumAmount: number;
    maximumAmount: number;
    processingFee: number;
    fixedFee: number;
  };
}

interface PaymentIntentResponse {
  clientSecret: string;
  publishableKey: string;
  amount: number;
  topupAmount: number;
  processingFee: number;
  fixedFee: number;
  currency: string;
  gatewayName: string;
}

interface PaymentSuccessData {
  paymentIntentId: string;
  amount: number;
  topupAmount: number;
  processingFee: number;
  fixedFee: number;
  currency: string;
  gatewayName: string;
  timestamp: string;
  cardBrand?: string;
  cardLast4?: string;
}

interface PaymentFailureData {
  error: string;
  errorCode?: string;
  errorType?: string;
  amount: number;
  currency: string;
  timestamp: string;
  paymentIntentId?: string;
  cardBrand?: string;
  cardLast4?: string;
}

interface BalanceTopupProps {
  onPaymentSuccess?: () => void;
  size?: 'default' | 'sm';
}

// Helper function to convert currency code to symbol
const getCurrencySymbol = (currency: string): string => {
  switch (currency) {
    case 'EUR': return '€';
    case 'USD': return '$';
    case 'GBP': return '£';
    default: return currency;
  }
};

// Helper function to get detailed error information
const getPaymentErrorDetails = (error: string, errorCode?: string) => {
  const errorLower = error.toLowerCase();
  const code = errorCode?.toLowerCase();

  // Card declined errors
  if (errorLower.includes('card was declined') || code === 'card_declined') {
    if (errorLower.includes('insufficient funds') || code === 'insufficient_funds') {
      return {
        title: 'Insufficient Funds',
        description: 'Your card does not have sufficient funds to complete this transaction.',
        icon: '💳',
        color: 'red',
        suggestions: [
          'Check your account balance',
          'Try a different payment method',
          'Contact your bank for assistance'
        ]
      };
    }
    
    if (errorLower.includes('lost card') || code === 'lost_card') {
      return {
        title: 'Card Reported Lost',
        description: 'This card has been reported as lost and cannot be used for payments.',
        icon: '🔒',
        color: 'red',
        suggestions: [
          'Use a different payment method',
          'Contact your bank to get a replacement card',
          'Verify the card details are correct'
        ]
      };
    }
    
    if (errorLower.includes('stolen card') || code === 'stolen_card') {
      return {
        title: 'Card Reported Stolen',
        description: 'This card has been reported as stolen and cannot be used for payments.',
        icon: '🚫',
        color: 'red',
        suggestions: [
          'Use a different payment method',
          'Contact your bank immediately',
          'Verify you are using the correct card'
        ]
      };
    }
    
    return {
      title: 'Card Declined',
      description: 'Your card was declined by your bank.',
      icon: '❌',
      color: 'red',
      suggestions: [
        'Check your card details are correct',
        'Try a different payment method',
        'Contact your bank for more information'
      ]
    };
  }

  // Expired card
  if (errorLower.includes('expired') || code === 'expired_card') {
    return {
      title: 'Card Expired',
      description: 'The card you are trying to use has expired.',
      icon: '📅',
      color: 'orange',
      suggestions: [
        'Check the expiry date on your card',
        'Use a different payment method',
        'Contact your bank for a replacement card'
      ]
    };
  }

  // Incorrect CVC
  if (errorLower.includes('cvc') || errorLower.includes('security code') || code === 'incorrect_cvc') {
    return {
      title: 'Incorrect Security Code',
      description: 'The CVC/CVV security code you entered is incorrect.',
      icon: '🔢',
      color: 'orange',
      suggestions: [
        'Check the 3-digit code on the back of your card',
        'For Amex cards, use the 4-digit code on the front',
        'Make sure you are entering the correct card details'
      ]
    };
  }

  // Processing error
  if (errorLower.includes('processing error') || code === 'processing_error') {
    return {
      title: 'Processing Error',
      description: 'There was an error processing your payment. This is usually temporary.',
      icon: '⚠️',
      color: 'yellow',
      suggestions: [
        'Please try again in a few minutes',
        'Check your internet connection',
        'Contact support if the problem persists'
      ]
    };
  }

  // Authentication required (3D Secure)
  if (errorLower.includes('authentication') || code === 'authentication_required') {
    return {
      title: 'Authentication Required',
      description: 'Your bank requires additional authentication for this payment.',
      icon: '🔐',
      color: 'blue',
      suggestions: [
        'Complete the authentication with your bank',
        'Try the payment again',
        'Contact your bank if authentication fails'
      ]
    };
  }

  // Network/connection errors
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return {
      title: 'Connection Error',
      description: 'There was a problem connecting to the payment processor.',
      icon: '🌐',
      color: 'gray',
      suggestions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact support if the problem continues'
      ]
    };
  }

  // Generic error
  return {
    title: 'Payment Failed',
    description: error || 'An unexpected error occurred while processing your payment.',
    icon: '❌',
    color: 'red',
    suggestions: [
      'Please try again',
      'Check your payment details',
      'Contact support if the problem persists'
    ]
  };
};

// Payment Failure Dialog Component
function PaymentFailureDialog({ 
  failureData, 
  isOpen, 
  onClose,
  onRetry 
}: { 
  failureData: PaymentFailureData;
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}) {
  const { colors } = useBranding();
  const errorDetails = getPaymentErrorDetails(failureData.error, failureData.errorCode);

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'red':
        return {
          bg: 'bg-red-50 dark:bg-red-950/50',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          subtext: 'text-red-700 dark:text-red-300',
          iconBg: 'bg-red-100 dark:bg-red-900'
        };
      case 'orange':
        return {
          bg: 'bg-orange-50 dark:bg-orange-950/50',
          border: 'border-orange-200 dark:border-orange-800',
          text: 'text-orange-900 dark:text-orange-100',
          subtext: 'text-orange-700 dark:text-orange-300',
          iconBg: 'bg-orange-100 dark:bg-orange-900'
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-950/50',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-900 dark:text-yellow-100',
          subtext: 'text-yellow-700 dark:text-yellow-300',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/50',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-100',
          subtext: 'text-blue-700 dark:text-blue-300',
          iconBg: 'bg-blue-100 dark:bg-blue-900'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-950/50',
          border: 'border-gray-200 dark:border-gray-800',
          text: 'text-gray-900 dark:text-gray-100',
          subtext: 'text-gray-700 dark:text-gray-300',
          iconBg: 'bg-gray-100 dark:bg-gray-900'
        };
    }
  };

  const colorClasses = getColorClasses(errorDetails.color);

  const copyErrorDetails = () => {
    const errorInfo = {
      error: failureData.error,
      errorCode: failureData.errorCode,
      errorType: failureData.errorType,
      timestamp: failureData.timestamp,
      amount: failureData.amount,
      currency: failureData.currency
    };
    navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
    toast.success('Error details copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-red-600" />
            Payment Failed
          </DialogTitle>
          <DialogDescription>
            We were unable to process your payment. Please review the details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Status Card */}
          <div className={`p-4 rounded-lg border ${colorClasses.bg} ${colorClasses.border}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${colorClasses.iconBg} text-xl`}>
                {errorDetails.icon}
              </div>
              <div>
                <h4 className={`font-medium ${colorClasses.text}`}>
                  {errorDetails.title}
                </h4>
                <p className={`text-sm ${colorClasses.subtext}`}>
                  {errorDetails.description}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h4 className="font-medium">Payment Details</h4>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">
                  {failureData.amount.toFixed(2)} {getCurrencySymbol(failureData.currency)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span>{new Date(failureData.timestamp).toLocaleString()}</span>
              </div>
              
              {failureData.errorCode && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Error Code:</span>
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {failureData.errorCode}
                  </span>
                </div>
              )}

              {failureData.cardBrand && failureData.cardLast4 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Card:</span>
                  <div className="flex items-center gap-2">
                    <CardIcon className="h-3 w-3" />
                    <span className="capitalize">{failureData.cardBrand}</span>
                    <span>****{failureData.cardLast4}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div className="space-y-4">
            <h4 className="font-medium">What you can do:</h4>
            <ul className="space-y-2">
              {errorDetails.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Technical Details (Collapsible) */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              <span>Technical Details</span>
              <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
            </summary>
            <div className="mt-2 p-3 bg-muted/30 rounded text-xs font-mono space-y-1">
              <div><strong>Error:</strong> {failureData.error}</div>
              {failureData.errorCode && <div><strong>Code:</strong> {failureData.errorCode}</div>}
              {failureData.errorType && <div><strong>Type:</strong> {failureData.errorType}</div>}
              {failureData.paymentIntentId && <div><strong>Payment ID:</strong> {failureData.paymentIntentId}</div>}
              <div><strong>Timestamp:</strong> {failureData.timestamp}</div>
            </div>
          </details>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={onRetry}
              className="flex-1 gap-2"
              style={{ backgroundColor: colors.primary }}
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={copyErrorDetails}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Details
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Success Dialog Component
function PaymentSuccessDialog({ 
  paymentData, 
  isOpen, 
  onClose,
  onPaymentSuccess 
}: { 
  paymentData: PaymentSuccessData;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: () => void;
}) {
  const { colors } = useBranding();

  // Debug effect to track dialog rendering
  useEffect(() => {
    // Dialog state tracking removed for cleaner logs
  }, [isOpen, paymentData]);

  const copyPaymentId = () => {
    navigator.clipboard.writeText(paymentData.paymentIntentId);
    toast.success('Payment ID copied to clipboard');
  };

  const handleFinish = () => {
    onClose();
    // Call the payment success callback to refresh payments list
    if (onPaymentSuccess) {
      onPaymentSuccess();
    } else {
      // Fallback: refresh the page if no callback provided
      window.location.reload();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Payment Successful!
          </DialogTitle>
          <DialogDescription>
            Your payment has been processed successfully and your account balance will be updated shortly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Status Card */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/50 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full dark:bg-green-900">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100">Payment Completed</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Balance top-up of {paymentData.topupAmount.toFixed(2)} {getCurrencySymbol(paymentData.currency)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="space-y-4">
            <h4 className="font-medium">Payment Summary</h4>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Top-up Amount:</span>
                <span className="font-medium text-green-600">
                  +{paymentData.topupAmount.toFixed(2)} {getCurrencySymbol(paymentData.currency)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processing Fee:</span>
                <span>{paymentData.processingFee.toFixed(2)} {getCurrencySymbol(paymentData.currency)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fixed Fee:</span>
                <span>{paymentData.fixedFee.toFixed(2)} {getCurrencySymbol(paymentData.currency)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between font-medium">
                <span>Total Charged:</span>
                <span>{paymentData.amount.toFixed(2)} {getCurrencySymbol(paymentData.currency)}</span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h4 className="font-medium">Payment Details</h4>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                    {paymentData.paymentIntentId.slice(-12)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPaymentId}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gateway:</span>
                <Badge variant="secondary">{paymentData.gatewayName}</Badge>
              </div>
              
              {paymentData.cardBrand && paymentData.cardLast4 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <div className="flex items-center gap-2">
                    <CardIcon className="h-3 w-3" />
                    <span className="capitalize">{paymentData.cardBrand}</span>
                    <span>****{paymentData.cardLast4}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date & Time:</span>
                <span>{new Date(paymentData.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/50 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">What happens next?</p>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Your account balance will be updated within minutes</li>
                  <li>• The transaction will appear in your payment history</li>
                  <li>• You can start using the funds immediately</li>
                </ul>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleFinish}
            className="w-full"
            style={{ backgroundColor: colors.primary }}
          >
            Go to Payments
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Payment Form Component
function PaymentForm({ 
  paymentIntent, 
  onSuccess, 
  onError 
}: { 
  paymentIntent: PaymentIntentResponse;
  onSuccess: (paymentData: PaymentSuccessData) => void;
  onError: (error: string, errorCode?: string, errorType?: string, paymentIntentId?: string, cardBrand?: string, cardLast4?: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card element not found', 'card_element_missing', 'validation_error', undefined, undefined, undefined);
      setIsProcessing(false);
      return;
    }

    try {
      const { error, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
        paymentIntent.clientSecret,
        {
          payment_method: {
            card: cardElement,
          }
        }
      );

      if (error && (error.message || error.code || error.type)) {
        // Extract detailed error information
        const errorMessage = error.message || 'Payment failed';
        const errorCode = error.code;
        const errorType = error.type;
        const paymentIntentId = error.payment_intent?.id || paymentIntent.clientSecret.split('_secret')[0];
        
        // Get card details if available for error reporting
        let cardBrand, cardLast4;
        if (error.payment_method?.card) {
          cardBrand = error.payment_method.card.brand;
          cardLast4 = error.payment_method.card.last4;
        }
        
        // Try to get card details from the card element if not available in error
        if (!cardBrand || !cardLast4) {
          try {
            const cardElementValue = (cardElement as any)._element;
            if (cardElementValue && cardElementValue.card) {
              cardBrand = cardBrand || cardElementValue.card.brand;
              cardLast4 = cardLast4 || cardElementValue.card.last4;
            }
          } catch {
            // Ignore errors getting card details from element
          }
        }
        
        onError(errorMessage, errorCode, errorType, paymentIntentId, cardBrand, cardLast4);
      } else if (confirmedPayment?.status === 'succeeded') {
        // Extract payment method details
        const paymentMethod = confirmedPayment.payment_method;
        const cardDetails = typeof paymentMethod === 'object' ? paymentMethod?.card : undefined;
        
        const successData: PaymentSuccessData = {
          paymentIntentId: confirmedPayment.id,
          amount: paymentIntent.amount,
          topupAmount: paymentIntent.topupAmount,
          processingFee: paymentIntent.processingFee,
          fixedFee: paymentIntent.fixedFee,
          currency: paymentIntent.currency,
          gatewayName: paymentIntent.gatewayName,
          timestamp: new Date().toISOString(),
          cardBrand: cardDetails?.brand,
          cardLast4: cardDetails?.last4
        };
        
        onSuccess(successData);
      } else if (error) {
        // Handle empty or malformed error objects
        onError('Payment failed due to an unknown error', 'unknown_error', 'stripe_error');
      } else {
        // Handle unexpected payment states
        onError('Payment completed with unexpected status', 'unexpected_status', 'stripe_error');
      }
    } catch (err) {
      console.error('Payment exception:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      onError(errorMessage, 'exception', 'api_error', undefined, undefined, undefined);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">Payment Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Top-up Amount:</span>
              <span className="font-medium">
                {paymentIntent.topupAmount.toFixed(2)} {getCurrencySymbol(paymentIntent.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Processing Fee:</span>
              <span>{paymentIntent.processingFee.toFixed(2)} {getCurrencySymbol(paymentIntent.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span>Fixed Fee:</span>
              <span>{paymentIntent.fixedFee.toFixed(2)} {getCurrencySymbol(paymentIntent.currency)}</span>
            </div>
            <div className="flex justify-between font-medium border-t pt-2">
              <span>Total Charge:</span>
              <span>{paymentIntent.amount.toFixed(2)} {getCurrencySymbol(paymentIntent.currency)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Card Details</Label>
          <div className="p-3 border rounded-md">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={!stripe || isProcessing}
        className="w-full gap-2"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Pay {paymentIntent.amount.toFixed(2)} {getCurrencySymbol(paymentIntent.currency)}
          </>
        )}
      </Button>
    </form>
  );
}

export function BalanceTopup({ onPaymentSuccess, size = 'default' }: BalanceTopupProps = {}) {
  const { colors } = useBranding();
  const [showDialog, setShowDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showFailureDialog, setShowFailureDialog] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<PaymentSuccessData | null>(null);
  const [paymentFailureData, setPaymentFailureData] = useState<PaymentFailureData | null>(null);
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);

  // Fetch available payment gateways
  useEffect(() => {
    if (showDialog) {
      fetchGateways();
    }
  }, [showDialog]);

  const fetchGateways = async () => {
    try {
      const response = await fetch('/api/payment-gateways/available');
      if (!response.ok) throw new Error('Failed to fetch gateways');
      
      const data = await response.json();
      const activeGateways = data.gateways?.filter((g: PaymentGateway) => g.provider === 'stripe') || [];
      setGateways(activeGateways);
      
      if (activeGateways.length > 0) {
        setSelectedGateway(activeGateways[0]);
      }
    } catch (error) {
      console.error('Error fetching gateways:', error);
      toast.error('Failed to load payment gateways');
    }
  };

  const createPaymentIntent = async () => {
    if (!selectedGateway || !amount) return;

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amountValue < selectedGateway.settings.minimumAmount) {
      toast.error(`Minimum amount is ${selectedGateway.settings.minimumAmount} ${getCurrencySymbol(currency)}`);
      return;
    }

    if (amountValue > selectedGateway.settings.maximumAmount) {
      toast.error(`Maximum amount is ${selectedGateway.settings.maximumAmount} ${getCurrencySymbol(currency)}`);
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountValue,
          currency,
          provider: 'stripe'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create payment intent');
      }

      const data: PaymentIntentResponse = await response.json();
      setPaymentIntent(data);
      
      // Initialize Stripe with the publishable key
      setStripePromise(loadStripe(data.publishableKey));
      
    } catch (error) {
      console.error('Error creating payment intent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create payment intent');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentData: PaymentSuccessData) => {
    setPaymentSuccessData(paymentData);
    setShowDialog(false);
    setShowSuccessDialog(true);
  };

  const handlePaymentError = (error: string, errorCode?: string, errorType?: string, paymentIntentId?: string, cardBrand?: string, cardLast4?: string) => {
    setPaymentFailureData({
      error,
      errorCode,
      errorType,
      amount: paymentIntent?.amount || 0,
      currency: paymentIntent?.currency || 'EUR',
      timestamp: new Date().toISOString(),
      paymentIntentId,
      cardBrand,
      cardLast4
    });
    setShowDialog(false);
    setShowFailureDialog(true);

    // Also record this failed payment
    recordFailedPayment(error, errorCode, errorType, paymentIntentId, cardBrand, cardLast4);
  };

  const recordFailedPayment = async (error: string, errorCode?: string, errorType?: string, paymentIntentId?: string, cardBrand?: string, cardLast4?: string) => {
    try {
      // Get user agent and IP address for security analysis
      const userAgent = navigator.userAgent;
      
      // Get client IP (this will be the user's IP as seen by the server)
      let ipAddress = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (ipError) {
        console.warn('Could not get client IP:', ipError);
      }

      const failureData = {
        paymentIntentId: paymentIntentId || 'unknown',
        error,
        errorCode,
        errorType,
        amount: paymentIntent?.amount || 0,
        currency: paymentIntent?.currency || 'EUR',
        cardBrand: cardBrand,
        cardLast4: cardLast4,
        gatewayName: paymentIntent?.gatewayName || 'Stripe',
        userAgent,
        ipAddress
      };

      const response = await fetch('/api/payments/record-failure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(failureData)
      });

      if (response.ok) {
        await response.json();
      } else {
        // Failed to record payment failure to server
      }
    } catch {
      // Don't throw - we don't want to break the user experience if recording fails
    }
  };

  const handleFailureDialogClose = () => {
    setShowFailureDialog(false);
    setPaymentFailureData(null);
  };

  const handleRetryPayment = () => {
    setShowFailureDialog(false);
    setPaymentFailureData(null);
    setShowDialog(true);
  };

  const resetDialog = () => {
    setPaymentIntent(null);
    setAmount('');
    setCurrency('EUR');
    setSelectedGateway(null);
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    setPaymentSuccessData(null);
  };

  return (
    <>
      {/* Success Dialog */}
      {paymentSuccessData && (
        <PaymentSuccessDialog
          paymentData={paymentSuccessData}
          isOpen={showSuccessDialog}
          onClose={handleSuccessDialogClose}
          onPaymentSuccess={onPaymentSuccess}
        />
      )}

      {/* Failure Dialog */}
      {paymentFailureData && (
        <PaymentFailureDialog
          failureData={paymentFailureData}
          isOpen={showFailureDialog}
          onClose={handleFailureDialogClose}
          onRetry={handleRetryPayment}
        />
      )}

      {/* Main Top-up Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) resetDialog();
      }}>
        <DialogTrigger asChild>
          <Button 
            size={size}
            className={`gap-2 hover:shadow-lg hover:scale-105 transition-all duration-200 hover:brightness-110 ${
              size === 'sm' ? 'text-xs px-2 py-1 h-7' : ''
            }`}
            style={{ backgroundColor: colors.primary }}
          >
            <Plus className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
            {size === 'sm' ? 'Top Up' : 'Top Up Balance'}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" style={{ color: colors.primary }} />
              Top Up Balance
            </DialogTitle>
            <DialogDescription>
              Add funds to your account using a secure payment method
            </DialogDescription>
          </DialogHeader>

          {!paymentIntent ? (
            // Payment setup form
            <div className="space-y-4">
              {gateways.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No payment gateways are currently available.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                        {getCurrencySymbol(currency)}
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min={selectedGateway?.settings.minimumAmount || 0}
                        max={selectedGateway?.settings.maximumAmount || 10000}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="pl-8"
                      />
                    </div>
                    {selectedGateway && (
                      <p className="text-xs text-muted-foreground">
                        Min: {selectedGateway.settings.minimumAmount} {getCurrencySymbol(currency)} • 
                        Max: {selectedGateway.settings.maximumAmount} {getCurrencySymbol(currency)} • 
                        Fee: {selectedGateway.settings.processingFee}% + {selectedGateway.settings.fixedFee} {getCurrencySymbol(currency)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedGateway?.settings.allowedCurrencies.map(curr => (
                          <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedGateway && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/50 dark:border-blue-800">
                      <div className="flex items-center gap-2 text-sm">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium">Payment Gateway:</span>
                        <Badge variant="secondary">{selectedGateway.name}</Badge>
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={createPaymentIntent}
                    disabled={isLoading || !amount || !selectedGateway}
                    className="w-full gap-2"
                    style={{ backgroundColor: colors.primary }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Setting up payment...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4" />
                        Continue to Payment
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          ) : (
            // Payment form with Stripe Elements
            stripePromise && (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  paymentIntent={paymentIntent}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              </Elements>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
} 