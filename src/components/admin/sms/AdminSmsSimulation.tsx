'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  RefreshCw,
  Settings,
  TestTube,
  Zap,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Database
} from 'lucide-react';
import { toast } from 'sonner';

interface SimulationConfig {
  successRate: number;
  deliveryRate: number;
  minDelay: number;
  maxDelay: number;
  deliveryDelay: number;
  temporaryFailureRate: number;
  permanentFailureRate: number;
  blacklistSimulation: boolean;
  rateLimitSimulation: boolean;
  providerId: string;
  providerName: string;
  maxConcurrent: number;
}

interface SimulationStats {
  configs: Array<{ type: string; config: SimulationConfig }>;
  activeConnections: Array<{ providerId: string; connections: number }>;
  rateLimits: Array<{ providerId: string; count: number; resetTime: number }>;
}

export function AdminSmsSimulation() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [seedLoading, setSeedLoading] = useState(false);
  const [providerStatus, setProviderStatus] = useState<any>(null);

  // Test form state
  const [testForm, setTestForm] = useState({
    phoneNumber: '+1234567890',
    message: 'Test message from SMS simulation',
    configType: 'standard'
  });

  useEffect(() => {
    loadStats();
    loadProviderStatus();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sms/simulation');
      if (response.ok) {
        const data = await response.json();
        setStats(data.simulation);
      } else {
        toast.error('Failed to load simulation stats');
      }
    } catch (error) {
      console.error('Failed to load simulation stats:', error);
      toast.error('Failed to load simulation stats');
    } finally {
      setLoading(false);
    }
  };

  const loadProviderStatus = async () => {
    try {
      const response = await fetch('/api/admin/sms/simulation/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });
      if (response.ok) {
        const data = await response.json();
        setProviderStatus(data);
      }
    } catch (error) {
      console.error('Failed to load provider status:', error);
    }
  };

  const seedProviders = async () => {
    try {
      setSeedLoading(true);
      const response = await fetch('/api/admin/sms/simulation/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        await loadProviderStatus();
      } else {
        toast.error('Failed to seed simulation providers');
      }
    } catch (error) {
      console.error('Failed to seed providers:', error);
      toast.error('Failed to seed simulation providers');
    } finally {
      setSeedLoading(false);
    }
  };

  const removeProviders = async () => {
    try {
      setSeedLoading(true);
      const response = await fetch('/api/admin/sms/simulation/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        await loadProviderStatus();
      } else {
        toast.error('Failed to remove simulation providers');
      }
    } catch (error) {
      console.error('Failed to remove providers:', error);
      toast.error('Failed to remove simulation providers');
    } finally {
      setSeedLoading(false);
    }
  };

  const resetSimulation = async () => {
    try {
      const response = await fetch('/api/admin/sms/simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      });

      if (response.ok) {
        toast.success('Simulation provider reset successfully');
        await loadStats();
      } else {
        toast.error('Failed to reset simulation provider');
      }
    } catch (error) {
      console.error('Failed to reset simulation:', error);
      toast.error('Failed to reset simulation provider');
    }
  };

  const runTest = async () => {
    try {
      setTestLoading(true);
      
      // Import simulation provider client-side (this won't work, but shows the concept)
      // In a real implementation, you'd call an API endpoint
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testForm.phoneNumber,
          content: testForm.message,
          country: 'US' // Default for testing
        })
      });

      const result = await response.json();
      
      const testResult = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        phoneNumber: testForm.phoneNumber,
        message: testForm.message,
        configType: testForm.configType,
        success: result.success,
        messageId: result.messageId || result.providerMessageId,
        error: result.error,
        cost: result.cost,
        status: result.status
      };

      setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
      
      if (result.success) {
        toast.success('Test SMS sent successfully');
      } else {
        toast.error(`Test SMS failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Test SMS failed');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">SMS Simulation Testing</h2>
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SMS Simulation Testing</h2>
          <p className="text-muted-foreground">
            Test and configure SMS simulation provider behavior
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadStats} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={resetSimulation} size="sm" variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="test">Test SMS</TabsTrigger>
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="monitor">Live Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          {/* Provider Management Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Simulation Provider Management
              </CardTitle>
              <CardDescription>
                Manage simulation providers that users can select for campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Database Providers</p>
                  <p className="text-sm text-muted-foreground">
                    {providerStatus ? `${providerStatus.count} simulation providers in database` : 'Loading...'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={seedProviders}
                    disabled={seedLoading}
                    size="sm"
                  >
                    {seedLoading ? (
                      <>
                        <Activity className="h-4 w-4 mr-2 animate-spin" />
                        Seeding...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Seed Providers
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={removeProviders}
                    disabled={seedLoading}
                    variant="outline"
                    size="sm"
                  >
                    Remove All
                  </Button>
                </div>
              </div>

              {providerStatus?.providers && providerStatus.providers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Current Simulation Providers</h4>
                  {providerStatus.providers.map((provider: any) => (
                    <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${provider.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <div>
                          <p className="font-medium">{provider.displayName}</p>
                          <p className="text-sm text-muted-foreground">
                            {provider.simulationType} • {(provider.successRate * 100).toFixed(0)}% success rate
                          </p>
                        </div>
                      </div>
                      <Badge variant={provider.isActive ? "default" : "secondary"}>
                        {provider.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">How to Use</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Click "Seed Providers" to add 4 simulation providers to the database</li>
                  <li>• Users can then select these providers when creating SMS campaigns</li>
                  <li>• Each provider has different success rates and behavior patterns</li>
                  <li>• Providers appear in the regular SMS provider selection interface</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          {/* Test SMS Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test SMS Sending
              </CardTitle>
              <CardDescription>
                Send test SMS messages to verify simulation behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={testForm.phoneNumber}
                    onChange={(e) => setTestForm({ ...testForm, phoneNumber: e.target.value })}
                    placeholder="+1234567890"
                  />
                  <p className="text-xs text-muted-foreground">
                    Try: *0000 (fail), *1111 (success), *9999 (blacklist), *8888 (rate limit)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="configType">Provider Type</Label>
                  <Select
                    value={testForm.configType}
                    onValueChange={(value) => setTestForm({ ...testForm, configType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="premium">Premium (98% success)</SelectItem>
                      <SelectItem value="standard">Standard (94% success)</SelectItem>
                      <SelectItem value="budget">Budget (88% success)</SelectItem>
                      <SelectItem value="testing">Testing (90% success)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="message">Message Content</Label>
                <Textarea
                  id="message"
                  value={testForm.message}
                  onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
                  placeholder="Enter your test message..."
                  rows={3}
                />
              </div>

              <Button onClick={runTest} disabled={testLoading} className="w-full">
                {testLoading ? (
                  <>
                    <Activity className="h-4 w-4 mr-2 animate-spin" />
                    Sending Test...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Send Test SMS
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Test Results</CardTitle>
                <CardDescription>Recent test SMS results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testResults.map((result) => (
                    <div key={result.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{result.phoneNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? 'Sent' : 'Failed'}
                        </Badge>
                        {result.success && result.cost && (
                          <p className="text-sm text-muted-foreground mt-1">
                            ${result.cost}
                          </p>
                        )}
                        {!result.success && result.error && (
                          <p className="text-sm text-red-600 mt-1 max-w-48 truncate">
                            {result.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="configs" className="space-y-6">
          {/* Configuration Overview */}
          {stats?.configs.map(({ type, config }) => (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="capitalize">{type} Provider</span>
                  <Badge variant="outline">{config.providerName}</Badge>
                </CardTitle>
                <CardDescription>
                  Success Rate: {(config.successRate * 100).toFixed(1)}% | 
                  Delivery Rate: {(config.deliveryRate * 100).toFixed(1)}% | 
                  Max Concurrent: {config.maxConcurrent}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Response Time</p>
                    <p className="text-muted-foreground">{config.minDelay}-{config.maxDelay}ms</p>
                  </div>
                  <div>
                    <p className="font-medium">Delivery Delay</p>
                    <p className="text-muted-foreground">{config.deliveryDelay}ms</p>
                  </div>
                  <div>
                    <p className="font-medium">Temp Failures</p>
                    <p className="text-muted-foreground">{(config.temporaryFailureRate * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="font-medium">Perm Failures</p>
                    <p className="text-muted-foreground">{(config.permanentFailureRate * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          {/* Live Monitoring */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Active Connections
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.activeConnections.length === 0 ? (
                  <p className="text-muted-foreground">No active connections</p>
                ) : (
                  <div className="space-y-3">
                    {stats?.activeConnections.map((conn) => (
                      <div key={conn.providerId} className="flex items-center justify-between">
                        <span className="text-sm">{conn.providerId}</span>
                        <Badge variant="outline">{conn.connections} active</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Rate Limits
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.rateLimits.length === 0 ? (
                  <p className="text-muted-foreground">No rate limit data</p>
                ) : (
                  <div className="space-y-3">
                    {stats?.rateLimits.map((limit) => {
                      const resetIn = Math.max(0, limit.resetTime - Date.now());
                      const progress = (limit.count / 100) * 100; // Assuming 100 msg/min limit
                      
                      return (
                        <div key={limit.providerId} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>{limit.providerId}</span>
                            <span>{limit.count}/100</span>
                          </div>
                          <Progress value={progress} className="h-1" />
                          {resetIn > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Resets in {Math.ceil(resetIn / 1000)}s
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 