'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CreditCard, Clock, MessageSquare, DollarSign } from 'lucide-react';
import { useTranslations } from '@/lib/i18n';

interface BillingSummary {
  currentUsage: {
    totalCost: number;
    totalMessages: number;
  };
  pendingBillings: number;
  lastBillingDate?: string;
  nextBillingDate?: string;
  settings: {
    billingFrequency: 'daily' | 'weekly' | 'monthly' | 'threshold';
    maxAmount: number;
    maxMessages: number;
    notificationThreshold: number;
    autoProcessing: boolean;
  };
}

export function UserBillingWidget() {
  const { t } = useTranslations();
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBillingSummary();
  }, []);

  const fetchBillingSummary = async () => {
    try {
      const response = await fetch('/api/user/billing-summary');
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching billing summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            SMS Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            SMS Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">No billing information available</p>
        </CardContent>
      </Card>
    );
  }

  const costPercentage = getUsagePercentage(summary.currentUsage.totalCost, summary.settings.maxAmount);
  const messagePercentage = getUsagePercentage(summary.currentUsage.totalMessages, summary.settings.maxMessages);
  const isNearThreshold = costPercentage >= 75 || messagePercentage >= 75;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          SMS Billing
          {summary.pendingBillings > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {summary.pendingBillings} Pending
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Current Cost
            </span>
            <span className={getUsageColor(costPercentage)}>
              {formatCurrency(summary.currentUsage.totalCost)} / {formatCurrency(summary.settings.maxAmount)}
            </span>
          </div>
          <Progress 
            value={costPercentage} 
            className="h-2"
            // Note: You may need to add custom CSS for colored progress bars
          />
          
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages Sent
            </span>
            <span className={getUsageColor(messagePercentage)}>
              {summary.currentUsage.totalMessages} / {summary.settings.maxMessages}
            </span>
          </div>
          <Progress 
            value={messagePercentage} 
            className="h-2"
          />
        </div>

        {/* Warning for near threshold */}
        {isNearThreshold && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              You're approaching your billing threshold
            </span>
          </div>
        )}

        {/* Billing Info */}
        <div className="pt-3 border-t space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Billing Frequency</span>
            <Badge variant="outline">
              {summary.settings.billingFrequency.charAt(0).toUpperCase() + summary.settings.billingFrequency.slice(1)}
            </Badge>
          </div>
          
          {summary.lastBillingDate && (
            <div className="flex items-center justify-between text-sm">
              <span>Last Billing</span>
              <span className="text-gray-600">
                {formatDate(summary.lastBillingDate)}
              </span>
            </div>
          )}
          
          {summary.nextBillingDate && summary.settings.billingFrequency !== 'threshold' && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Next Billing
              </span>
              <span className="text-gray-600">
                {formatDate(summary.nextBillingDate)}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-sm">
            <span>Auto Processing</span>
            <Badge variant={summary.settings.autoProcessing ? "default" : "secondary"}>
              {summary.settings.autoProcessing ? "Enabled" : "Manual"}
            </Badge>
          </div>
        </div>

        {/* Notification Threshold */}
        {summary.currentUsage.totalCost >= summary.settings.notificationThreshold && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <CreditCard className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-800">
              You've reached the notification threshold of {formatCurrency(summary.settings.notificationThreshold)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 