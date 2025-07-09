'use client';

import { useRef, useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateSms } from '@/lib/sms-utils';
import { MessageSquare, Hash, Zap, AlertTriangle } from 'lucide-react';

interface TemplateMessageEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

// Available template variables - based on SmsContact model fields
const TEMPLATE_VARIABLES = [
  { key: 'firstName', example: 'John' },
  { key: 'lastName', example: 'Doe' },
  { key: 'fullName', example: 'John Doe' },
  { key: 'phoneNumber', example: '+1234567890' },
  { key: 'address', example: '123 Main St' },
  { key: 'city', example: 'New York' },
  { key: 'zipCode', example: '10001' },
  { key: 'dateOfBirth', example: '1990-01-01' },
  { key: 'company', example: 'Tech Solutions Inc' },
  { key: 'department', example: 'Sales' },
  { key: 'notes', example: 'VIP customer' }
];

export function TemplateMessageEditor({ value, onChange, placeholder, maxLength = 1600 }: TemplateMessageEditorProps) {
  const { t } = useTranslations();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  // Calculate SMS info
  const smsCalculation = calculateSms(value);
  
  // Update cursor position when user clicks or types
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setCursorPosition(e.target.selectionStart || 0);
    onChange(newValue);
  };

  const handleTextareaClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPosition(target.selectionStart || 0);
  };

  const handleTextareaKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPosition(target.selectionStart || 0);
  };

  // Insert variable at cursor position
  const insertVariable = (variableKey: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const variableText = `{{${variableKey}}}`;
    
    // Get current value and cursor position
    const currentValue = value;
    const start = cursorPosition;
    
    // Insert variable at cursor position
    const newValue = currentValue.slice(0, start) + variableText + currentValue.slice(start);
    
    // Update value
    onChange(newValue);
    
    // Set cursor position after the inserted variable
    const newCursorPosition = start + variableText.length;
    
    // Focus textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
      setCursorPosition(newCursorPosition);
    }, 0);
  };

  // Get SMS calculation colors
  const getSmsCountColor = () => {
    if (smsCalculation.smsCount <= 1) return 'text-green-600';
    if (smsCalculation.smsCount <= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEncodingColor = () => {
    return smsCalculation.encoding === 'UNICODE' ? 'text-orange-600' : 'text-blue-600';
  };

  return (
    <div className="space-y-4">
      {/* Message Editor */}
      <div className="space-y-2">
        <Label htmlFor="message">{t('sms.templates.form.message.label')}</Label>
        <Textarea
          ref={textareaRef}
          id="message"
          value={value}
          onChange={handleTextareaChange}
          onClick={handleTextareaClick}
          onKeyUp={handleTextareaKeyUp}
          placeholder={placeholder || t('sms.templates.form.message.placeholder')}
          className="min-h-[120px] font-mono text-sm"
          maxLength={maxLength}
        />
        
        {/* SMS Calculation Info */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              <span>{smsCalculation.characterCount}/{maxLength}</span>
            </div>
            
                         <div className="flex items-center gap-1">
               <MessageSquare className="h-3 w-3" />
               <span className={getSmsCountColor()}>
                 {smsCalculation.smsCount} {t('sms.templates.editor.sms')}
               </span>
             </div>
            
                         <div className="flex items-center gap-1">
               <Zap className="h-3 w-3" />
               <span className={getEncodingColor()}>
                 {smsCalculation.encoding === 'UNICODE' ? t('sms.templates.editor.unicode') : t('sms.templates.editor.gsm')}
               </span>
             </div>
            
                         {smsCalculation.hasSpecialChars && (
               <div className="flex items-center gap-1 text-orange-600">
                 <AlertTriangle className="h-3 w-3" />
                 <span>{t('sms.templates.editor.specialChars')}</span>
               </div>
             )}
          </div>
          
                     <div className="text-muted-foreground">
             {smsCalculation.remainingChars > 0 && (
               <span>{smsCalculation.remainingChars} {t('sms.templates.editor.charsRemaining')}</span>
             )}
           </div>
        </div>
        
        
      </div>

      {/* Variables Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('sms.templates.variables.title')}</CardTitle>
          <CardDescription className="text-xs">
            {t('sms.templates.variables.usage')}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {TEMPLATE_VARIABLES.map((variable) => (
              <Button
                key={variable.key}
                variant="outline"
                size="sm"
                className="h-auto p-2 text-left justify-start hover:bg-primary/10"
                onClick={() => insertVariable(variable.key)}
              >
                <div className="flex flex-col items-start gap-1 w-full">
                  <div className="font-medium text-xs">
                    {`{{${variable.key}}}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(`sms.templates.variables.${variable.key}`)}
                  </div>
                </div>
              </Button>
            ))}
          </div>
          
          {/* Custom Variable Input */}
          <div className="mt-4 pt-3 border-t">
            <div className="text-xs text-muted-foreground mb-2">
              <strong>{t('sms.templates.variables.custom')}:</strong> {t('sms.templates.editor.customFieldsNote')} <code className="bg-muted px-1 rounded">{'{{customFieldName}}'}</code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 