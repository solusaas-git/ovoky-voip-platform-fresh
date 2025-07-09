// Common interfaces shared across all Sippy modules

// Account info interface based on Sippy API documentation
export interface AccountInfo {
  i_account: number;
  username: string;
  authname: string;
  balance: number;
  credit_limit: number;
  max_sessions: number;
  max_credit_time: number;
  translation_rule: string;
  cli_translation_rule: string;
  i_routing_group: number;
  i_billing_plan: number;
  i_account_class?: number;
  i_time_zone: number;
  cpe_number: string;
  vm_enabled: number;
  vm_password?: string;
  vm_timeout?: number;
  vm_check_number?: string;
  blocked: number;
  i_lang: string;
  payment_currency: string;
  payment_method: number;
  i_export_type: number;
  lifetime: number;
  i_commission_agent?: number;
  commission_size?: number;
  preferred_codec?: number;
  use_preferred_codec_only: boolean;
  reg_allowed: number;
  welcome_call_ivr?: number;
  on_payment_action?: number;
  min_payment_amount: number;
  trust_cli: boolean;
  disallow_loops: boolean;
  vm_notify_emails?: string;
  vm_forward_emails?: string;
  vm_del_after_fwd: boolean;
  company_name?: string;
  salutation?: string;
  first_name?: string;
  last_name?: string;
  mid_init?: string;
  street_addr?: string;
  state?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  contact?: string;
  phone?: string;
  fax?: string;
  alt_phone?: string;
  alt_contact?: string;
  email?: string;
  cc?: string;
  bcc?: string;
  i_password_policy: number;
  i_media_relay_type: number;
  lan_access?: boolean;
  batch_tag?: string;
  i_provisioning?: number;
  invoicing_enabled?: boolean;
  i_invoice_template?: number;
  i_caller_name_type?: number;
  caller_name?: string;
  followme_enabled?: boolean;
  vm_dialin_access?: boolean;
  hide_own_cli?: boolean;
  block_incoming_anonymous?: boolean;
  i_incoming_anonymous_action?: number;
  dnd_enabled?: boolean;
  description?: string;
  pass_p_asserted_id?: boolean;
  p_assrt_id_translation_rule?: string;
  dncl_lookup?: boolean;
  generate_ringbacktone?: boolean;
  max_calls_per_second?: number;
  allow_free_onnet_calls?: boolean;
  start_page?: number;
  trust_privacy_hdrs?: boolean;
  privacy_schemas?: string[];
  created_on?: string;
  created_by?: string;
  updated_on?: string;
  updated_by?: string;
  deleted_by?: string;
  record_version?: number;
  first_use?: string;
  next_billing_time?: string;
  call_recording?: boolean;
}

// Call interfaces
export interface Call {
  i_call: number;
  cli: string;
  cld: string;
  connect_time: string;
  call_duration: number;
  disconnect_cause: string;
  account_id: number;
  account_name: string;
  node_id: string;
  status: string;
}

export interface Stats {
  total_calls: number;
  connected_calls: number;
  average_duration: number;
  total_minutes: number;
}

// CDR interfaces
export interface CdrRow {
  i_cdr: number;
  connect_time: string;
  disconnect_time: string;
  cli: string;
  cld: string;
  account_id: number;
  account_name: string;
  duration: number;
  charged_amount: number;
  disconnect_cause: string;
}

// Lightweight CDR interface for dashboard widgets (only essential fields)
export interface CdrWidget {
  cost: string;
  duration: number;
  result: number;
  payment_currency?: string;
  connect_time: string;
}

// Payment interfaces based on Sippy API documentation
export interface PaymentInfo {
  result: string;
  payment_time: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
  amount: number;
  currency: string;
  tx_id: string;
  tx_error: string;
  tx_result: number; // 1 = successful, 2 = failed
  by_credit_debit_card: boolean;
  by_voucher: boolean;
  notes: string;
}

export interface Payment {
  payment_time: string; // '%H:%M:%S.000 GMT %a %b %d %Y' format
  amount: number;
  currency: string;
  i_payment: number;
  tx_id: string;
  tx_error: string;
  tx_result: number; // 1 = successful, 2 = failed
  i_account: number;
  i_customer: number;
  by_credit_debit_card: boolean;
  by_voucher: boolean;
  notes: string;
}

export interface PaymentsList {
  result: string;
  payments: Payment[];
}

export interface BalanceOperation {
  result: string;
}

// Common request options
export interface BaseRequestOptions {
  i_account?: number;
  offset?: number;
  limit?: number;
  [key: string]: unknown;
}

// Date range options
export interface DateRangeOptions {
  start_date?: string;
  end_date?: string;
  [key: string]: unknown;
}

// Common error types
export class SippyApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly method?: string
  ) {
    super(message);
    this.name = 'SippyApiError';
  }
}

export class SippyAuthError extends SippyApiError {
  constructor(message: string) {
    super(message);
    this.name = 'SippyAuthError';
  }
}

export class SippyTimeoutError extends SippyApiError {
  constructor(message: string, method?: string) {
    super(message, undefined, method);
    this.name = 'SippyTimeoutError';
  }
}

export class SippyParseError extends SippyApiError {
  constructor(message: string, public readonly xmlContent?: string) {
    super(message);
    this.name = 'SippyParseError';
  }
} 