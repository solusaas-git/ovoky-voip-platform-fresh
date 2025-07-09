'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, DollarSign, MessageSquare, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface BillingStats {
  pending: { count: number; totalCost: number; totalMessages: number };
  paid: { count: number; totalCost: number; totalMessages: number };
  failed: { count: number; totalCost: number; totalMessages: number };
  cancelled: { count: number; totalCost: number; totalMessages: number };
}

interface RecentBilling {
  _id: string;
  user: {
    email: string;
    name?: string;
  };
  totalCost: number;
  totalMessages: number;
  status: string;
  createdAt: string;
  currency: string;
}

export default function SmsBillingWidget() {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [recentBillings, setRecentBillings] = useState<RecentBilling[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsResponse, billingsResponse] = await Promise.all([
        fetch('/api/admin/sms/billing-stats'),
        fetch('/api/admin/sms/billing?limit=5')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (billingsResponse.ok) {
        const billingsData = await billingsResponse.json();
        setRecentBillings(billingsData.billings || []);
      }
    } catch (error) {
      console.error('Error fetching SMS billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SMS Billing Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRevenue = stats ? stats.paid.totalCost : 0;
  const totalPending = stats ? stats.pending.totalCost : 0;
  const totalMessages = stats ? (stats.paid.totalMessages + stats.pending.totalMessages) : 0;

  return (
    <div className="space-y-4">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPending)}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Messages</p>
                <p className="text-2xl font-bold">{totalMessages.toLocaleString()}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats ? stats.failed.count : 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>SMS Billing Overview</CardTitle>
              <CardDescription>
                Recent billing activity and status summary
              </CardDescription>
            </div>
            <Link href="/admin/sms/billing">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {/* Pending Billings */}
              <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-yellow-800">{stats.pending.count}</div>
                <div className="text-sm text-yellow-600">Pending</div>
                <div className="text-xs text-yellow-500 mt-1">
                  {formatCurrency(stats.pending.totalCost)}
                </div>
              </div>

              {/* Paid Billings */}
              <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-800">{stats.paid.count}</div>
                <div className="text-sm text-green-600">Paid</div>
                <div className="text-xs text-green-500 mt-1">
                  {formatCurrency(stats.paid.totalCost)}
                </div>
              </div>

              {/* Failed Billings */}
              <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-red-800">{stats.failed.count}</div>
                <div className="text-sm text-red-600">Failed</div>
                <div className="text-xs text-red-500 mt-1">
                  {formatCurrency(stats.failed.totalCost)}
                </div>
              </div>

              {/* Success Rate */}
              <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                <TrendingUp className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-blue-800">
                  {stats.paid.count + stats.failed.count > 0 
                    ? Math.round((stats.paid.count / (stats.paid.count + stats.failed.count)) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-blue-600">Success Rate</div>
              </div>
            </div>
          )}

          {/* Recent Billings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Recent Billings</h3>
            {recentBillings.length > 0 ? (
              <div className="space-y-3">
                {recentBillings.map((billing) => (
                  <div key={billing._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="font-medium">{billing.user.email}</div>
                        <div className="text-sm text-gray-500">
                          {billing.totalMessages} messages • {formatDate(billing.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="font-medium">
                          {formatCurrency(billing.totalCost, billing.currency)}
                        </div>
                        <div className="text-sm">
                          {getStatusBadge(billing.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No recent billing records found
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-6">
            <Link href="/admin/sms/billing" className="flex-1">
              <Button className="w-full">
                Manage Billings
              </Button>
            </Link>
            <Link href="/admin/sms/billing/settings" className="flex-1">
              <Button variant="outline" className="w-full">
                Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 