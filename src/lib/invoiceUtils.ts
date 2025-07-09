import { getSippyApiCredentials } from './sippyClientConfig';
import { SippyClient } from './sippyClient';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'number_assignment' | 'service_fee' | 'usage_charge' | 'other';
}

export interface Invoice {
  id: string;
  customerId: number;
  accountId: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
}

export interface NumberAssignmentInvoice {
  accountId: number;
  numbers: {
    number: string;
    monthlyFee: number;
    setupFee?: number;
    description?: string;
  }[];
  currency: string;
  notes?: string;
}

/**
 * Generate an invoice for number assignments
 */
export function generateNumberAssignmentInvoice(data: NumberAssignmentInvoice): Invoice {
  const invoiceId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const invoiceNumber = `${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const issueDate = new Date().toISOString();
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days from now

  const items: InvoiceItem[] = [];

  // Add number assignment items
  data.numbers.forEach(number => {
    // Monthly fee
    items.push({
      description: `Monthly fee for ${number.number}${number.description ? ` - ${number.description}` : ''}`,
      quantity: 1,
      unitPrice: number.monthlyFee,
      total: number.monthlyFee,
      type: 'number_assignment'
    });

    // Setup fee if applicable
    if (number.setupFee && number.setupFee > 0) {
      items.push({
        description: `Setup fee for ${number.number}`,
        quantity: 1,
        unitPrice: number.setupFee,
        total: number.setupFee,
        type: 'service_fee'
      });
    }
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = 0; // Tax calculation can be implemented based on business rules
  const total = subtotal + tax;

  return {
    id: invoiceId,
    customerId: 0, // Will be set when we have customer management
    accountId: data.accountId,
    invoiceNumber,
    issueDate,
    dueDate,
    items,
    subtotal,
    tax,
    total,
    currency: data.currency,
    status: 'draft',
    notes: data.notes
  };
}

/**
 * Process invoice payment by debiting the account balance
 */
export async function processInvoicePayment(invoice: Invoice): Promise<{
  success: boolean;
  transactionId?: string;
  error?: string;
}> {
  try {
    const credentials = await getSippyApiCredentials();
    
    if (!credentials) {
      return {
        success: false,
        error: 'Sippy API not configured'
      };
    }

    const sippyClient = new SippyClient(credentials);

    // Debit the account balance for the invoice total
    const result = await sippyClient.accountDebit({
      i_account: invoice.accountId,
      amount: invoice.total,
      currency: invoice.currency,
      payment_notes: `Invoice payment: ${invoice.invoiceNumber} - ${invoice.items.map(i => i.description).join(', ')}`
    });

    return {
      success: true,
      transactionId: result.result || 'success'
    };
  } catch (error) {
    console.error('Error processing invoice payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Generate invoice summary for display
 */
export function formatInvoiceSummary(invoice: Invoice): string {
  const itemSummary = invoice.items.map(item => 
    `${item.description}: ${formatCurrency(item.total, invoice.currency)}`
  ).join('\n');
  
  return `Invoice ${invoice.invoiceNumber}
Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

Items:
${itemSummary}

Subtotal: ${formatCurrency(invoice.subtotal, invoice.currency)}
Tax: ${formatCurrency(invoice.tax, invoice.currency)}
Total: ${formatCurrency(invoice.total, invoice.currency)}

Status: ${invoice.status.toUpperCase()}
${invoice.notes ? `\nNotes: ${invoice.notes}` : ''}`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Validate invoice data
 */
export function validateInvoice(invoice: Partial<Invoice>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!invoice.accountId) {
    errors.push('Account ID is required');
  }

  if (!invoice.items || invoice.items.length === 0) {
    errors.push('At least one invoice item is required');
  }

  if (invoice.items) {
    invoice.items.forEach((item, index) => {
      if (!item.description) {
        errors.push(`Item ${index + 1}: Description is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (!item.unitPrice || item.unitPrice < 0) {
        errors.push(`Item ${index + 1}: Unit price must be 0 or greater`);
      }
    });
  }

  if (!invoice.currency) {
    errors.push('Currency is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 