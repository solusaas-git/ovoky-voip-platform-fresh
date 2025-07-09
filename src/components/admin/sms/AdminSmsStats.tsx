'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BarChart3, MessageSquare, Users, AlertCircle, CheckCircle, XCircle, Calendar, Trophy, Globe } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

interface SmsStats {
  totalMessages: number;
  totalUsers: number;
  totalProviders: number;
  messagesThisMonth: number;
  messagesLastMonth: number;
  successRate: number;
  failureRate: number;
  blacklistedNumbers: number;
  topUsers: TopUser[];
  topDestinations: TopDestination[];
  recentActivity: {
    date: string;
    count: number;
  }[];
}

interface TopUser {
  _id: string;
  messageCount: number;
  totalCost: number;
  successfulMessages: number;
  failedMessages: number;
  successRate: number;
  userName: string;
  userEmail: string;
  companyName?: string;
}

interface TopDestination {
  _id: string;
  prefix: string;
  countryName: string;
  countryIso: string;
  messageCount: number;
  totalCost: number;
  uniqueNumbers: number;
  successfulMessages: number;
  failedMessages: number;
  successRate: number;
}

// Component to display country flag
function CountryFlag({ countryIso, countryName }: { countryIso: string; countryName: string }) {
  if (countryIso === 'XX') {
    // Unknown country - show globe icon
    return (
      <div className="w-6 h-4 flex items-center justify-center bg-gray-100 rounded-sm">
        <Globe className="h-3 w-3 text-gray-500" />
      </div>
    );
  }

  try {
    return (
      <Image
        src={`https://flagcdn.com/w40/${countryIso.toLowerCase()}.png`}
        alt={`${countryName} flag`}
        width={24}
        height={16}
        className="rounded-sm border border-gray-200"
        onError={(e) => {
          // Fallback to globe icon if flag fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = '<div class="w-6 h-4 flex items-center justify-center bg-gray-100 rounded-sm"><svg class="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/><path d="m14.83 14.83 4.24 4.24"/><path d="m9.17 14.83-4.24 4.24"/></svg></div>';
          }
        }}
      />
    );
  } catch {
    return (
      <div className="w-6 h-4 flex items-center justify-center bg-gray-100 rounded-sm">
        <Globe className="h-3 w-3 text-gray-500" />
      </div>
    );
  }
}

export function AdminSmsStats() {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SmsStats>({
    totalMessages: 0,
    totalUsers: 0,
    totalProviders: 0,
    messagesThisMonth: 0,
    messagesLastMonth: 0,
    successRate: 0,
    failureRate: 0,
    blacklistedNumbers: 0,
    topUsers: [],
    topDestinations: [],
    recentActivity: []
  });
  
  const [topUsersData, setTopUsersData] = useState<TopUser[]>([]);
  const [topUsersPeriod, setTopUsersPeriod] = useState('current-month');
  const [topDestinationsData, setTopDestinationsData] = useState<TopDestination[]>([]);
  const [topDestinationsPeriod, setTopDestinationsPeriod] = useState('current-month');
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' });
  const [customDestinationsDateRange, setCustomDestinationsDateRange] = useState({ startDate: '', endDate: '' });
  const [loadingTopUsers, setLoadingTopUsers] = useState(false);
  const [loadingTopDestinations, setLoadingTopDestinations] = useState(false);

  useEffect(() => {
    loadStats();
    loadTopUsers();
    loadTopDestinations();
  }, []);

  useEffect(() => {
    loadTopUsers();
  }, [topUsersPeriod]);

  useEffect(() => {
    loadTopDestinations();
  }, [topDestinationsPeriod]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sms/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
      } else {
        toast.error('Failed to load SMS stats');
      }
    } catch (error) {
      toast.error('Failed to load SMS stats');
    } finally {
      setLoading(false);
    }
  };

  const loadTopUsers = async () => {
    try {
      setLoadingTopUsers(true);
      let url = `/api/admin/sms/stats/top-users?period=${topUsersPeriod}`;
      
      if (topUsersPeriod === 'custom' && customDateRange.startDate && customDateRange.endDate) {
        url += `&startDate=${customDateRange.startDate}&endDate=${customDateRange.endDate}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTopUsersData(data.topUsers || []);
      } else {
        toast.error('Failed to load top users');
      }
    } catch (error) {
      toast.error('Failed to load top users');
    } finally {
      setLoadingTopUsers(false);
    }
  };

  const handleCustomDateChange = () => {
    if (customDateRange.startDate && customDateRange.endDate) {
      loadTopUsers();
    }
  };

  const loadTopDestinations = async () => {
    try {
      setLoadingTopDestinations(true);
      let url = `/api/admin/sms/stats/top-destinations?period=${topDestinationsPeriod}`;
      
      if (topDestinationsPeriod === 'custom' && customDestinationsDateRange.startDate && customDestinationsDateRange.endDate) {
        url += `&startDate=${customDestinationsDateRange.startDate}&endDate=${customDestinationsDateRange.endDate}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setTopDestinationsData(data.topDestinations || []);
      } else {
        toast.error('Failed to load top destinations');
      }
    } catch (error) {
      toast.error('Failed to load top destinations');
    } finally {
      setLoadingTopDestinations(false);
    }
  };

  const handleCustomDestinationsDateChange = () => {
    if (customDestinationsDateRange.startDate && customDestinationsDateRange.endDate) {
      loadTopDestinations();
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-20 mb-2"></div>
                <div className="h-8 bg-muted rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              All time SMS messages sent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Users with SMS access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Messages delivered successfully
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blacklisted</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.blacklistedNumbers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Total blacklisted numbers
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Comparison
            </CardTitle>
            <CardDescription>Message volume comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">This Month</span>
                <span className="font-medium">{stats.messagesThisMonth.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Month</span>
                <span className="font-medium">{stats.messagesLastMonth.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Change</span>
                <span className={`font-medium ${
                  stats.messagesThisMonth > stats.messagesLastMonth 
                    ? 'text-green-600' 
                    : stats.messagesThisMonth < stats.messagesLastMonth
                    ? 'text-red-600'
                    : 'text-muted-foreground'
                }`}>
                  {stats.messagesLastMonth > 0 
                    ? `${(((stats.messagesThisMonth - stats.messagesLastMonth) / stats.messagesLastMonth) * 100).toFixed(1)}%`
                    : stats.messagesThisMonth > 0
                    ? 'New Activity'
                    : 'No Change'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>SMS system performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Active Providers</span>
                <span className="font-medium">{stats.totalProviders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className="font-medium text-green-600">{stats.successRate.toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Failure Rate</span>
                <span className="font-medium text-red-600">{stats.failureRate.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top 10 Users by Message Volume
              </CardTitle>
              <CardDescription>Users who sent the most SMS messages</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={topUsersPeriod} onValueChange={setTopUsersPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {topUsersPeriod === 'custom' && (
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="startDate">From:</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="endDate">To:</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-40"
                />
              </div>
              <Button onClick={handleCustomDateChange} size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Apply
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loadingTopUsers ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="animate-pulse flex items-center gap-3">
                    <div className="h-8 w-8 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : topUsersData.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">No users found for the selected period</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try selecting a different time period
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topUsersData.map((user, index) => (
                <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{user.userName || 'Unknown User'}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.companyName || 'No company'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{user.messageCount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">messages</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${user.totalCost.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">cost</div>
                    </div>
                    <Badge variant={user.successRate >= 95 ? 'default' : user.successRate >= 80 ? 'secondary' : 'destructive'}>
                      {user.successRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Destinations Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Top 10 Destinations
              </CardTitle>
              <CardDescription>Countries/regions receiving the most SMS messages</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={topDestinationsPeriod} onValueChange={setTopDestinationsPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current-month">Current Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {topDestinationsPeriod === 'custom' && (
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="destStartDate">From:</Label>
                <Input
                  id="destStartDate"
                  type="date"
                  value={customDestinationsDateRange.startDate}
                  onChange={(e) => setCustomDestinationsDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="destEndDate">To:</Label>
                <Input
                  id="destEndDate"
                  type="date"
                  value={customDestinationsDateRange.endDate}
                  onChange={(e) => setCustomDestinationsDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-40"
                />
              </div>
              <Button onClick={handleCustomDestinationsDateChange} size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Apply
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loadingTopDestinations ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="animate-pulse flex items-center gap-3">
                    <div className="h-8 w-8 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-32"></div>
                      <div className="h-3 bg-muted rounded w-24"></div>
                    </div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : topDestinationsData.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">No destinations found for the selected period</p>
              <p className="text-sm text-muted-foreground mt-2">
                Try selecting a different time period
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topDestinationsData.map((destination, index) => (
                <div key={destination._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <CountryFlag countryIso={destination.countryIso} countryName={destination.countryName} />
                        <span>{destination.countryName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">{destination.messageCount.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">messages</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{destination.uniqueNumbers.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">numbers</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${destination.totalCost.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">cost</div>
                    </div>
                    <Badge variant={destination.successRate >= 95 ? 'default' : destination.successRate >= 80 ? 'secondary' : 'destructive'}>
                      {destination.successRate.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 