'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Send, Eye, Info } from 'lucide-react';
import { toast } from 'sonner';
import { calculateSms, getSmsDescription, type SmsCalculation } from '@/lib/sms-utils';

interface SenderId {
  _id: string;
  senderId: string;
  status: 'pending' | 'approved' | 'rejected';
  type: 'alphanumeric' | 'numeric';
}

interface SmsGateway {
  _id: string;
  name: string;
  displayName: string;
  isActive: boolean;
}

export function SendSms() {
  const { t } = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [senderIds, setSenderIds] = useState<SenderId[]>([]);
  const [gateways, setGateways] = useState<SmsGateway[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [smsCalculation, setSmsCalculation] = useState<SmsCalculation | null>(null);
  
  const [formData, setFormData] = useState({
    recipient: '',
    message: '',
    senderId: '',
    gatewayId: ''
  });

  const [errors, setErrors] = useState({
    recipient: '',
    message: '',
    senderId: '',
    gatewayId: ''
  });

  // Load sender IDs and gateways on component mount
  useEffect(() => {
    loadSenderIds();
    loadGateways();
  }, []);

  const loadSenderIds = async () => {
    try {
      const response = await fetch('/api/sms/sender-ids');
      if (response.ok) {
        const data = await response.json();
        setSenderIds(data.senderIds.filter((s: SenderId) => s.status === 'approved'));
      }
    } catch (error) {
      console.error('Failed to load sender IDs:', error);
    }
  };

  const loadGateways = async () => {
    try {
      const response = await fetch('/api/sms/providers');
      if (response.ok) {
        const data = await response.json();
        setGateways(data.providers || []);
      }
    } catch (error) {
      console.error('Failed to load gateways:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {
      recipient: '',
      message: '',
      senderId: '',
      gatewayId: ''
    };

    // Validate phone number
    if (!formData.recipient.trim()) {
      newErrors.recipient = t('sms.send.messages.invalidPhone');
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.recipient.replace(/[\s-()]/g, ''))) {
      newErrors.recipient = t('sms.send.messages.invalidPhone');
    }

    // Validate message
    if (!formData.message.trim()) {
      newErrors.message = t('sms.send.messages.emptyMessage');
    } else if (formData.message.length > 1000) { // More reasonable limit
      newErrors.message = t('sms.common.validation.maxLength', { max: '1000' });
    }

    // Validate sender ID
    if (!formData.senderId) {
      newErrors.senderId = t('sms.send.messages.selectSender');
    }

    // Validate gateway
    if (!formData.gatewayId) {
      newErrors.gatewayId = t('sms.send.messages.selectGateway');
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Update SMS calculation when message changes
    if (field === 'message') {
      const calculation = calculateSms(value);
      setSmsCalculation(calculation);
    }
    
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Function to detect country from phone number
  const detectCountryFromPhoneNumber = (phoneNumber: string): string => {
    // Remove any non-digit characters and leading +
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Common country codes mapping
    const countryMapping: Record<string, string> = {
      '1': 'United States',
      '7': 'Russia',
      '20': 'Egypt',
      '27': 'South Africa',
      '30': 'Greece',
      '31': 'Netherlands',
      '32': 'Belgium',
      '33': 'France',
      '34': 'Spain',
      '36': 'Hungary',
      '39': 'Italy',
      '40': 'Romania',
      '41': 'Switzerland',
      '43': 'Austria',
      '44': 'United Kingdom',
      '45': 'Denmark',
      '46': 'Sweden',
      '47': 'Norway',
      '48': 'Poland',
      '49': 'Germany',
      '51': 'Peru',
      '52': 'Mexico',
      '53': 'Cuba',
      '54': 'Argentina',
      '55': 'Brazil',
      '56': 'Chile',
      '57': 'Colombia',
      '58': 'Venezuela',
      '60': 'Malaysia',
      '61': 'Australia',
      '62': 'Indonesia',
      '63': 'Philippines',
      '64': 'New Zealand',
      '65': 'Singapore',
      '66': 'Thailand',
      '81': 'Japan',
      '82': 'South Korea',
      '84': 'Vietnam',
      '86': 'China',
      '90': 'Turkey',
      '91': 'India',
      '92': 'Pakistan',
      '93': 'Afghanistan',
      '94': 'Sri Lanka',
      '95': 'Myanmar',
      '98': 'Iran',
      '212': 'Morocco',
      '213': 'Algeria',
      '216': 'Tunisia',
      '218': 'Libya',
      '220': 'Gambia',
      '221': 'Senegal',
      '222': 'Mauritania',
      '223': 'Mali',
      '224': 'Guinea',
      '225': 'Ivory Coast',
      '226': 'Burkina Faso',
      '227': 'Niger',
      '228': 'Togo',
      '229': 'Benin',
      '230': 'Mauritius',
      '231': 'Liberia',
      '232': 'Sierra Leone',
      '233': 'Ghana',
      '234': 'Nigeria',
      '235': 'Chad',
      '236': 'Central African Republic',
      '237': 'Cameroon',
      '238': 'Cape Verde',
      '239': 'São Tomé and Príncipe',
      '240': 'Equatorial Guinea',
      '241': 'Gabon',
      '242': 'Republic of the Congo',
      '243': 'Democratic Republic of the Congo',
      '244': 'Angola',
      '245': 'Guinea-Bissau',
      '246': 'British Indian Ocean Territory',
      '248': 'Seychelles',
      '249': 'Sudan',
      '250': 'Rwanda',
      '251': 'Ethiopia',
      '252': 'Somalia',
      '253': 'Djibouti',
      '254': 'Kenya',
      '255': 'Tanzania',
      '256': 'Uganda',
      '257': 'Burundi',
      '258': 'Mozambique',
      '260': 'Zambia',
      '261': 'Madagascar',
      '262': 'Réunion',
      '263': 'Zimbabwe',
      '264': 'Namibia',
      '265': 'Malawi',
      '266': 'Lesotho',
      '267': 'Botswana',
      '268': 'Eswatini',
      '269': 'Comoros',
      '290': 'Saint Helena',
      '291': 'Eritrea',
      '297': 'Aruba',
      '298': 'Faroe Islands',
      '299': 'Greenland',
      '350': 'Gibraltar',
      '351': 'Portugal',
      '352': 'Luxembourg',
      '353': 'Ireland',
      '354': 'Iceland',
      '355': 'Albania',
      '356': 'Malta',
      '357': 'Cyprus',
      '358': 'Finland',
      '359': 'Bulgaria',
      '370': 'Lithuania',
      '371': 'Latvia',
      '372': 'Estonia',
      '373': 'Moldova',
      '374': 'Armenia',
      '375': 'Belarus',
      '376': 'Andorra',
      '377': 'Monaco',
      '378': 'San Marino',
      '380': 'Ukraine',
      '381': 'Serbia',
      '382': 'Montenegro',
      '383': 'Kosovo',
      '385': 'Croatia',
      '386': 'Slovenia',
      '387': 'Bosnia and Herzegovina',
      '389': 'North Macedonia',
      '420': 'Czech Republic',
      '421': 'Slovakia',
      '423': 'Liechtenstein',
      '500': 'Falkland Islands',
      '501': 'Belize',
      '502': 'Guatemala',
      '503': 'El Salvador',
      '504': 'Honduras',
      '505': 'Nicaragua',
      '506': 'Costa Rica',
      '507': 'Panama',
      '508': 'Saint Pierre and Miquelon',
      '509': 'Haiti',
      '590': 'Guadeloupe',
      '591': 'Bolivia',
      '592': 'Guyana',
      '593': 'Ecuador',
      '594': 'French Guiana',
      '595': 'Paraguay',
      '596': 'Martinique',
      '597': 'Suriname',
      '598': 'Uruguay',
      '599': 'Curaçao',
      '670': 'East Timor',
      '672': 'Antarctica',
      '673': 'Brunei',
      '674': 'Nauru',
      '675': 'Papua New Guinea',
      '676': 'Tonga',
      '677': 'Solomon Islands',
      '678': 'Vanuatu',
      '679': 'Fiji',
      '680': 'Palau',
      '681': 'Wallis and Futuna',
      '682': 'Cook Islands',
      '683': 'Niue',
      '684': 'American Samoa',
      '685': 'Samoa',
      '686': 'Kiribati',
      '687': 'New Caledonia',
      '688': 'Tuvalu',
      '689': 'French Polynesia',
      '690': 'Tokelau',
      '691': 'Federated States of Micronesia',
      '692': 'Marshall Islands',
      '850': 'North Korea',
      '852': 'Hong Kong',
      '853': 'Macau',
      '855': 'Cambodia',
      '856': 'Laos',
      '880': 'Bangladesh',
      '886': 'Taiwan',
      '960': 'Maldives',
      '961': 'Lebanon',
      '962': 'Jordan',
      '963': 'Syria',
      '964': 'Iraq',
      '965': 'Kuwait',
      '966': 'Saudi Arabia',
      '967': 'Yemen',
      '968': 'Oman',
      '970': 'Palestine',
      '971': 'United Arab Emirates',
      '972': 'Israel',
      '973': 'Bahrain',
      '974': 'Qatar',
      '975': 'Bhutan',
      '976': 'Mongolia',
      '977': 'Nepal',
      '992': 'Tajikistan',
      '993': 'Turkmenistan',
      '994': 'Azerbaijan',
      '995': 'Georgia',
      '996': 'Kyrgyzstan',
      '998': 'Uzbekistan'
    };

    // Try to match country codes of different lengths (1-3 digits)
    for (let i = 3; i >= 1; i--) {
      const prefix = cleanNumber.substring(0, i);
      if (countryMapping[prefix]) {
        return countryMapping[prefix];
      }
    }

    // Default fallback
    return 'Unknown';
  };

  const handleSendSms = async () => {
    if (!validateForm()) return;

    // Auto-detect country from phone number
    const detectedCountry = detectCountryFromPhoneNumber(formData.recipient);

    setIsLoading(true);
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formData.recipient,
          content: formData.message,
          senderId: formData.senderId,
          gatewayId: formData.gatewayId,
          country: detectedCountry
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t('sms.send.messages.success'), {
          description: `Message sent to ${formData.recipient}`,
        });
        // Reset form
        setFormData({ recipient: '', message: '', senderId: '', gatewayId: '' });
        setShowPreview(false);
      } else {
        toast.error(t('sms.send.messages.error'), {
          description: data.error || 'Failed to send SMS',
        });
      }
    } catch (error) {
      toast.error(t('sms.send.messages.error'), {
        description: 'Network error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize SMS calculation on mount
  useEffect(() => {
    const calculation = calculateSms(formData.message);
    setSmsCalculation(calculation);
  }, [formData.message]);

  // Get character counts from SMS calculation
  const characterCount = smsCalculation?.characterCount || 0;
  const smsCount = smsCalculation?.smsCount || 0;
  const encoding = smsCalculation?.encoding || 'GSM_7BIT';
  const maxLength = encoding === 'UNICODE' ? 70 : 160;
  const charactersLeft = smsCalculation?.remainingChars || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('sms.send.title')}</h2>
        <p className="text-muted-foreground">{t('sms.send.description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              {t('sms.send.title')}
            </CardTitle>
            <CardDescription>
              Fill in the details to send an SMS message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Recipient */}
            <div className="space-y-2">
              <Label htmlFor="recipient">{t('sms.send.form.recipient.label')}</Label>
              <Input
                id="recipient"
                placeholder={t('sms.send.form.recipient.placeholder')}
                value={formData.recipient}
                onChange={(e) => handleInputChange('recipient', e.target.value)}
                className={errors.recipient ? 'border-destructive' : ''}
              />
              {errors.recipient && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.recipient}
                </p>
              )}
            </div>

            {/* Sender ID */}
            <div className="space-y-2">
              <Label htmlFor="senderId">{t('sms.send.form.senderId.label')}</Label>
              <Select value={formData.senderId} onValueChange={(value) => handleInputChange('senderId', value)}>
                <SelectTrigger className={errors.senderId ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('sms.send.form.senderId.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {senderIds.map((sender) => (
                    <SelectItem key={sender._id} value={sender._id}>
                      {sender.senderId} ({sender.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.senderId && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.senderId}
                </p>
              )}
              {senderIds.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No approved sender IDs found. Please request one in Settings.
                </p>
              )}
            </div>

            {/* SMS Gateway */}
            <div className="space-y-2">
              <Label htmlFor="gatewayId">{t('sms.send.form.gateway.label')} *</Label>
              <Select value={formData.gatewayId} onValueChange={(value) => handleInputChange('gatewayId', value)}>
                <SelectTrigger className={errors.gatewayId ? 'border-destructive' : ''}>
                  <SelectValue placeholder={t('sms.send.form.gateway.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {gateways.map((gateway) => (
                    <SelectItem key={gateway._id} value={gateway._id}>
                      {gateway.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.gatewayId && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.gatewayId}
                </p>
              )}
              {gateways.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No gateways assigned. Contact your administrator.
                </p>
              )}
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">{t('sms.send.form.message.label')}</Label>
              <Textarea
                id="message"
                placeholder={t('sms.send.form.message.placeholder')}
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                className={`min-h-[120px] ${errors.message ? 'border-destructive' : ''}`}
              />
                            <div className="space-y-2">
                {errors.message ? (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.message}
                  </p>
                ) : smsCalculation ? (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-muted-foreground">
                        {characterCount} caractères • {smsCount} SMS
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {charactersLeft} restants
                      </p>
                    </div>
                    {smsCalculation.hasSpecialChars && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Info className="h-3 w-3" />
                        <span>
                          {encoding === 'UNICODE' 
                            ? `Caractères spéciaux détectés - Limite: ${maxLength} caractères par SMS`
                            : `${smsCalculation.specialCharsCount} caractères étendus (comptent pour 2)`
                          }
                        </span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Encodage: {encoding === 'UNICODE' ? 'Unicode (16-bit)' : 'GSM 7-bit'}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPreview(!showPreview)}
                variant="outline"
                className="flex items-center gap-2"
                disabled={!formData.recipient || !formData.message || !formData.senderId || !formData.gatewayId}
              >
                <Eye className="h-4 w-4" />
                {t('sms.send.buttons.preview')}
              </Button>
              <Button
                onClick={handleSendSms}
                disabled={isLoading || !formData.recipient || !formData.message || !formData.senderId || !formData.gatewayId}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isLoading ? t('sms.send.buttons.sending') : t('sms.send.buttons.send')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {t('sms.send.form.preview.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('sms.send.form.preview.from', { senderId: formData.senderId })}</p>
                <p className="text-sm font-medium">{t('sms.send.form.preview.to', { recipient: formData.recipient })}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Message:</p>
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm whitespace-pre-wrap">{formData.message}</p>
                </div>
              </div>

              {smsCalculation && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p><strong>Caractères:</strong> {characterCount}</p>
                        <p><strong>SMS requis:</strong> {smsCount}</p>
                      </div>
                      <div>
                        <p><strong>Encodage:</strong> {encoding === 'UNICODE' ? 'Unicode' : 'GSM 7-bit'}</p>
                        <p><strong>Limite par SMS:</strong> {maxLength}</p>
                      </div>
                    </div>
                  </div>
                  {smsCalculation.hasSpecialChars && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      <Info className="h-3 w-3 inline mr-1" />
                      {encoding === 'UNICODE' 
                        ? `Ce message contient des caractères spéciaux et utilise l'encodage Unicode (limite: ${maxLength} caractères par SMS)`
                        : `Ce message contient ${smsCalculation.specialCharsCount} caractères étendus qui comptent chacun pour 2 caractères`
                      }
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 