// GSM 7-bit character set
const GSM_7BIT_CHARS = 
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1BÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

// Extended GSM characters (these count as 2 characters)
const GSM_EXTENDED_CHARS = "^{}\\[~]|€";

// SMS limits
const GSM_SINGLE_SMS_LIMIT = 160;
const GSM_MULTI_SMS_LIMIT = 153; // 7 characters reserved for concatenation
const UNICODE_SINGLE_SMS_LIMIT = 70;
const UNICODE_MULTI_SMS_LIMIT = 67; // 3 characters reserved for concatenation

export interface SmsCalculation {
  characterCount: number;
  encoding: 'GSM_7BIT' | 'UNICODE';
  smsCount: number;
  charactersPerSms: number;
  remainingChars: number;
  isOverLimit: boolean;
  hasSpecialChars: boolean;
  specialCharsCount: number;
}

/**
 * Calculate SMS count and encoding for a given message
 */
export function calculateSms(message: string): SmsCalculation {
  if (!message) {
    return {
      characterCount: 0,
      encoding: 'GSM_7BIT',
      smsCount: 0,
      charactersPerSms: GSM_SINGLE_SMS_LIMIT,
      remainingChars: GSM_SINGLE_SMS_LIMIT,
      isOverLimit: false,
      hasSpecialChars: false,
      specialCharsCount: 0
    };
  }

  let characterCount = 0;
  let specialCharsCount = 0;
  let requiresUnicode = false;

  // Analyze each character
  for (const char of message) {
    if (GSM_7BIT_CHARS.includes(char)) {
      characterCount += 1;
    } else if (GSM_EXTENDED_CHARS.includes(char)) {
      characterCount += 2; // Extended GSM chars count as 2
      specialCharsCount += 1;
    } else {
      // Character not in GSM charset, requires Unicode
      requiresUnicode = true;
      characterCount += 1;
      specialCharsCount += 1;
    }
  }

  // Determine encoding and limits
  const encoding: 'GSM_7BIT' | 'UNICODE' = requiresUnicode ? 'UNICODE' : 'GSM_7BIT';
  
  let smsCount: number;
  let charactersPerSms: number;

  if (encoding === 'UNICODE') {
    // For Unicode, we count actual characters, not the GSM character count
    const actualLength = message.length;
    
    if (actualLength <= UNICODE_SINGLE_SMS_LIMIT) {
      smsCount = actualLength === 0 ? 0 : 1;
      charactersPerSms = UNICODE_SINGLE_SMS_LIMIT;
    } else {
      smsCount = Math.ceil(actualLength / UNICODE_MULTI_SMS_LIMIT);
      charactersPerSms = UNICODE_MULTI_SMS_LIMIT;
    }
  } else {
    // For GSM 7-bit, use the calculated character count (including extended chars as 2)
    if (characterCount <= GSM_SINGLE_SMS_LIMIT) {
      smsCount = characterCount === 0 ? 0 : 1;
      charactersPerSms = GSM_SINGLE_SMS_LIMIT;
    } else {
      smsCount = Math.ceil(characterCount / GSM_MULTI_SMS_LIMIT);
      charactersPerSms = GSM_MULTI_SMS_LIMIT;
    }
  }

  // Calculate remaining characters
  const effectiveLength = encoding === 'UNICODE' ? message.length : characterCount;
  const currentSmsLimit = smsCount <= 1 ? 
    (encoding === 'UNICODE' ? UNICODE_SINGLE_SMS_LIMIT : GSM_SINGLE_SMS_LIMIT) :
    (encoding === 'UNICODE' ? UNICODE_MULTI_SMS_LIMIT : GSM_MULTI_SMS_LIMIT);
  
  const remainingChars = currentSmsLimit - (effectiveLength % currentSmsLimit || currentSmsLimit);

  return {
    characterCount: effectiveLength,
    encoding,
    smsCount,
    charactersPerSms,
    remainingChars: remainingChars === currentSmsLimit ? 0 : remainingChars,
    isOverLimit: false, // We don't set a hard limit, just calculate SMS count
    hasSpecialChars: specialCharsCount > 0,
    specialCharsCount
  };
}

/**
 * Get a human-readable description of the SMS calculation
 */
export function getSmsDescription(calculation: SmsCalculation, t: (key: string, params?: any) => string): string {
  if (calculation.smsCount === 0) {
    return t('sms.send.calculation.empty');
  }

  const parts = [];
  
  // Character count
  parts.push(t('sms.send.calculation.characters', { count: calculation.characterCount }));
  
  // Encoding info
  if (calculation.encoding === 'UNICODE') {
    parts.push(t('sms.send.calculation.unicode'));
  } else {
    parts.push(t('sms.send.calculation.gsm'));
  }
  
  // SMS count
  if (calculation.smsCount === 1) {
    parts.push(t('sms.send.calculation.singleSms'));
  } else {
    parts.push(t('sms.send.calculation.multiSms', { count: calculation.smsCount }));
  }
  
  // Special characters warning
  if (calculation.hasSpecialChars && calculation.encoding === 'GSM_7BIT') {
    parts.push(t('sms.send.calculation.extendedChars', { count: calculation.specialCharsCount }));
  } else if (calculation.hasSpecialChars && calculation.encoding === 'UNICODE') {
    parts.push(t('sms.send.calculation.unicodeChars', { count: calculation.specialCharsCount }));
  }

  return parts.join(' • ');
} 