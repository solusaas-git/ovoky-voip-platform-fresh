'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { CountrySelector } from '@/components/ui/country-selector';
import { CountryData, COUNTRIES } from '@/data/countries';
import { cn } from '@/lib/utils';

interface PhoneInputProps {
  value?: string;
  onValueChange: (fullPhoneNumber: string, countryCode: string, phoneNumber: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultCountry?: string; // ISO code
}

export function PhoneInput({
  value = '',
  onValueChange,
  placeholder = "Enter phone number",
  disabled = false,
  className,
  defaultCountry = 'US'
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize with default country
  useEffect(() => {
    const country = COUNTRIES.find(c => c.code === defaultCountry);
    if (country && !selectedCountry) {
      setSelectedCountry(country);
    }
  }, [defaultCountry, selectedCountry]);

  // Parse initial value if provided (only run once during initialization)
  useEffect(() => {
    if (value && !isInitialized) {
      // Try to find matching country code
      const matchingCountry = COUNTRIES.find(country => 
        value.startsWith(country.phoneCode)
      );
      
      if (matchingCountry) {
        setSelectedCountry(matchingCountry);
        const extractedNumber = value.substring(matchingCountry.phoneCode.length).trim();
        setPhoneNumber(extractedNumber);
      } else {
        // If no country code found, use the value as-is
        setPhoneNumber(value);
      }
      setIsInitialized(true);
    } else if (!value && !isInitialized) {
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  const handleCountryChange = (country: CountryData) => {
    setSelectedCountry(country);
    if (phoneNumber && country.phoneCode) {
      const fullNumber = `${country.phoneCode} ${phoneNumber}`.trim();
      onValueChange(fullNumber, country.phoneCode, phoneNumber);
    } else if (country.phoneCode) {
      onValueChange(country.phoneCode, country.phoneCode, '');
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPhoneNumber = e.target.value;
    
    // Basic phone number formatting (remove non-digits except spaces, hyphens, parentheses)
    const cleanedNumber = newPhoneNumber.replace(/[^\d\s\-\(\)]/g, '');
    
    setPhoneNumber(cleanedNumber);
    
    if (selectedCountry?.phoneCode) {
      const fullNumber = cleanedNumber ? `${selectedCountry.phoneCode} ${cleanedNumber}`.trim() : selectedCountry.phoneCode;
      onValueChange(fullNumber, selectedCountry.phoneCode, cleanedNumber);
    } else {
      onValueChange(cleanedNumber, '', cleanedNumber);
    }
  };

  const formatPhoneNumber = (number: string) => {
    // Basic formatting for display
    const cleaned = number.replace(/\D/g, '');
    
    if (selectedCountry?.code === 'US' || selectedCountry?.code === 'CA') {
      // North American format: (123) 456-7890
      if (cleaned.length >= 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
      } else if (cleaned.length >= 6) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      } else if (cleaned.length >= 3) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
      }
    }
    
    // Default: add spaces every 3-4 digits
    if (cleaned.length > 6) {
      return cleaned.replace(/(\d{3})(\d{3})(\d+)/, '$1 $2 $3');
    } else if (cleaned.length > 3) {
      return cleaned.replace(/(\d{3})(\d+)/, '$1 $2');
    }
    
    return cleaned;
  };

  const displayValue = phoneNumber ? formatPhoneNumber(phoneNumber) : '';

  return (
    <div className={cn("flex space-x-2", className)}>
      {/* Country Selector */}
      <div className="w-48 flex-shrink-0">
        <CountrySelector
          value={selectedCountry?.code}
          onValueChange={handleCountryChange}
          placeholder="Country"
          disabled={disabled}
        />
      </div>
      
      {/* Phone Number Input */}
      <div className="flex-1 relative">
        <div className="flex">
          {/* Country Code Display */}
          {selectedCountry?.phoneCode && (
            <div className="flex items-center bg-muted border border-r-0 border-input rounded-l-lg px-3 py-2 text-sm font-medium text-muted-foreground min-w-0">
              <span className="whitespace-nowrap">{selectedCountry.phoneCode}</span>
            </div>
          )}
          
          {/* Phone Number Field */}
          <Input
            type="tel"
            value={displayValue}
            onChange={handlePhoneNumberChange}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "flex-1 h-11",
              selectedCountry?.phoneCode ? "rounded-l-none border-l-0" : "rounded-lg"
            )}
          />
        </div>
      </div>
    </div>
  );
} 