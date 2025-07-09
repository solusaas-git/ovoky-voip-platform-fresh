'use client';

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Database, AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  test: string;
  success: boolean;
  cdrCount?: number;
  error?: string;
  details?: any;
  duration?: number;
  rawResponse?: string;
}

interface CdrTestParams {
  i_account: string;
  offset?: string;
  limit?: string;
  start_date?: string;
  end_date?: string;
  cli?: string;
  cld?: string;
  i_cdr?: string;
  type?: string;
}

export default function CdrTestPage() {
  const [params, setParams] = useState<CdrTestParams>({
    i_account: '3',
    limit: '10',
    offset: '0',
    type: 'non_zero_and_errors'
  });
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [rawLogs, setRawLogs] = useState('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setRawLogs(prev => prev + logEntry + '\n');
    console.log(logEntry);
  };

  const formatSippyDate = (dateString: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    
    // Format: '%H:%M:%S.000 GMT %a %b %d %Y' 
    // Example: '09:57:29.000 GMT Wed Nov 18 2009'
    const hours = date.getUTCHours().toString().padStart(2, '0');
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const dayName = dayNames[date.getUTCDay()];
    const monthName = monthNames[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    
    return `${hours}:${minutes}:${seconds}.000 GMT ${dayName} ${monthName} ${day} ${year}`;
  };

  const runTest = async () => {
    if (!params.i_account) {
      toast.error('Account ID is required');
      return;
    }

    setIsRunning(true);
    setTestResult(null);
    setRawLogs('');
    
    addLog('🚀 Starting CDR API test...');
    addLog(`📋 Test Parameters:`);
    addLog(`   Account ID: ${params.i_account}`);
    addLog(`   Type: ${params.type || 'default'}`);
    addLog(`   Limit: ${params.limit || 'default'}`);
    addLog(`   Offset: ${params.offset || 'default'}`);
    
    if (params.start_date) {
      const sippyStartDate = formatSippyDate(params.start_date);
      addLog(`   Start Date: ${params.start_date} → ${sippyStartDate}`);
    }
    if (params.end_date) {
      const sippyEndDate = formatSippyDate(params.end_date);
      addLog(`   End Date: ${params.end_date} → ${sippyEndDate}`);
    }
    if (params.cli) addLog(`   CLI: ${params.cli}`);
    if (params.cld) addLog(`   CLD: ${params.cld}`);
    if (params.i_cdr) addLog(`   CDR ID: ${params.i_cdr}`);
    
    const startTime = Date.now();
    
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      // Required parameters
      queryParams.set('limit', params.limit || '10');
      queryParams.set('offset', params.offset || '0');
      
      // Optional parameters
      if (params.type) queryParams.set('type', params.type);
      if (params.start_date) queryParams.set('start_date', params.start_date);
      if (params.end_date) queryParams.set('end_date', params.end_date);
      if (params.cli) queryParams.set('cli', params.cli);
      if (params.cld) queryParams.set('cld', params.cld);
      if (params.i_cdr) queryParams.set('i_cdr', params.i_cdr);
      
      const url = `/api/debug/cdr-test`;
      addLog(`📡 API URL: ${url}`);
      
      // Prepare request body with all parameters
          const requestBody = {
      i_account: params.i_account,
      limit: params.limit || '10',
      offset: params.offset || '0',
      mode: 'full', // Use full parsing for debug test page to see all fields
      ...(params.type && { type: params.type }),
      ...(params.start_date && { start_date: params.start_date }),
      ...(params.end_date && { end_date: params.end_date }),
      ...(params.cli && { cli: params.cli }),
      ...(params.cld && { cld: params.cld }),
      ...(params.i_cdr && { i_cdr: params.i_cdr })
    };
      
      addLog(`📋 Request body: ${JSON.stringify(requestBody, null, 2)}`);
      
      // Make the API call with timeout (matching backend)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 second timeout (5s buffer over backend 30s)
      
      addLog('⏳ Making API request...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      addLog(`📊 Response received in ${duration}ms`);
      addLog(`📊 Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        addLog(`❌ Error response: ${errorText}`);
        
        setTestResult({
          test: 'CDR API Test',
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
          duration
        });
        
        toast.error(`API Error: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        addLog(`❌ API Error: ${data.error || 'API request failed'}`);
        if (data.errorType) {
          addLog(`🔍 Error Type: ${data.errorType}`);
        }
        if (data.debugInfo?.suggestion) {
          addLog(`💡 Suggestion: ${data.debugInfo.suggestion}`);
        }
        throw new Error(data.error || 'API request failed');
      }
      
      const cdrCount = data.count || 0;
      
      addLog(`✅ Success: ${cdrCount} CDRs returned`);
      addLog(`📊 Request duration: ${data.requestDuration || 0}ms`);
      addLog(`📊 Raw response length: ${data.rawResponseLength || 0} characters`);
      
      if (data.debugInfo) {
        addLog(`🔧 Debug Info: Timeout=${data.debugInfo.timeoutUsed}, HasDateRange=${data.debugInfo.hasDateRange}`);
      }
      
      if (cdrCount > 0 && data.cdrs && data.cdrs.length > 0) {
        addLog(`📋 Sample CDR fields: ${Object.keys(data.cdrs[0]).slice(0, 10).join(', ')}`);
        if (data.cdrs[0].connect_time) {
          addLog(`📅 Sample connect_time: ${data.cdrs[0].connect_time}`);
        }
        if (data.cdrs[0].cost) {
          addLog(`💰 Sample cost: ${data.cdrs[0].cost}`);
        }
        if (data.cdrs[0].cli) {
          addLog(`📞 Sample CLI: ${data.cdrs[0].cli}`);
        }
        if (data.cdrs[0].cld) {
          addLog(`📞 Sample CLD: ${data.cdrs[0].cld}`);
        }
      } else {
        addLog('ℹ️ No CDRs found for the specified criteria');
        if (!params.start_date && !params.end_date) {
          addLog('💡 Note: Without date range, Sippy API only returns CDRs from the last hour');
        }
      }
      
      setTestResult({
        test: 'CDR API Test',
        success: true,
        cdrCount,
        details: data,
        duration,
        rawResponse: JSON.stringify(data, null, 2)
      });
      
      if (cdrCount > 0) {
        toast.success(`Found ${cdrCount} CDRs!`);
      } else {
        toast.warning('No CDRs found');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out after 60 seconds';
        } else {
          errorMessage = error.message;
        }
      }
      
      addLog(`❌ Exception: ${errorMessage}`);
      
      setTestResult({
        test: 'CDR API Test',
        success: false,
        error: errorMessage,
        duration
      });
      
      toast.error(`Test failed: ${errorMessage}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runQuickTests = async () => {
    setIsRunning(true);
    setRawLogs('');
    
    addLog('🧪 Running quick test suite...');
    
    const quickTests = [
      {
        name: 'Last hour (no dates)',
        params: { ...params, start_date: '', end_date: '', limit: '5' }
      },
      {
        name: 'Today with type=all',
        params: { 
          ...params, 
          start_date: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
          end_date: new Date().toISOString().split('T')[0] + 'T23:59:59.000Z',
          type: 'all',
          limit: '10'
        }
      },
      {
        name: 'Last 7 days',
        params: { 
          ...params, 
          start_date: new Date(Date.now() - 7*24*60*60*1000).toISOString(),
          end_date: new Date().toISOString(),
          type: 'all',
          limit: '20'
        }
      }
    ];
    
    for (const test of quickTests) {
      addLog(`\n🧪 Running: ${test.name}`);
      
      // Temporarily set params for this test
      const originalParams = { ...params };
      setParams(test.params);
      
             try {
         await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
         // Run the test logic here (simplified version of runTest)
         
         const requestBody = {
           i_account: test.params.i_account,
           limit: test.params.limit || '10',
           offset: test.params.offset || '0',
           mode: 'full', // Use full parsing for debug test page to see all fields
           ...(test.params.type && { type: test.params.type }),
           ...(test.params.start_date && { start_date: test.params.start_date }),
           ...(test.params.end_date && { end_date: test.params.end_date })
         };
         
         const url = `/api/debug/cdr-test`;
         
         const response = await fetch(url, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(requestBody),
         });
         
         if (response.ok) {
           const data = await response.json();
           if (data.success) {
             const count = data.count || 0;
             addLog(`   ✅ ${test.name}: ${count} CDRs`);
           } else {
             addLog(`   ❌ ${test.name}: ${data.error || 'Unknown error'}`);
           }
         } else {
           addLog(`   ❌ ${test.name}: HTTP ${response.status}`);
         }
        
      } catch (error) {
        addLog(`   ❌ ${test.name}: ${error instanceof Error ? error.message : 'Error'}`);
      }
      
      // Restore original params
      setParams(originalParams);
    }
    
    addLog('\n🏁 Quick tests completed');
    setIsRunning(false);
  };

  const runDiagnosticTests = async () => {
    setIsRunning(true);
    setRawLogs('');
    
    addLog('🧪 Running diagnostic test suite for account-specific issues...');
    addLog(`🎯 Testing account ${params.i_account} to identify timeout causes`);
    
    const diagnosticTests = [
      {
        name: 'No date range (last hour only)',
        params: { ...params, start_date: '', end_date: '', limit: '5', type: 'all' },
        description: 'Tests if date range is causing the issue'
      },
      {
        name: 'All CDR types',
        params: { ...params, type: 'all', limit: '5' },
        description: 'Tests if CDR type filtering is causing the issue'
      },
      {
        name: 'Non-zero errors only',
        params: { ...params, type: 'non_zero_and_errors', limit: '5' },
        description: 'Tests default CDR type with small limit'
      },
      {
        name: 'Progressive limit test (10)',
        params: { ...params, limit: '10' },
        description: 'Tests slightly larger limit'
      },
      {
        name: 'Progressive limit test (25)',
        params: { ...params, limit: '25' },
        description: 'Tests medium limit to find breaking point'
      }
    ];
    
    for (let i = 0; i < diagnosticTests.length; i++) {
      const test = diagnosticTests[i];
      addLog(`\n🧪 Test ${i + 1}/${diagnosticTests.length}: ${test.name}`);
      addLog(`   📝 ${test.description}`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Brief delay
        
        const requestBody = {
          i_account: test.params.i_account,
          limit: test.params.limit || '10',
          offset: test.params.offset || '0',
          mode: 'full', // Use full parsing for debug test page to see all fields
          ...(test.params.type && { type: test.params.type }),
          ...(test.params.start_date && { start_date: test.params.start_date }),
          ...(test.params.end_date && { end_date: test.params.end_date })
        };
        
        addLog(`   📋 Request: ${JSON.stringify(requestBody)}`);
        
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 65000); // 65 second timeout
        
        const response = await fetch('/api/debug/cdr-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const count = data.count || 0;
            addLog(`   ✅ SUCCESS: ${count} CDRs in ${duration}ms`);
            if (data.debugInfo) {
              addLog(`   🔧 Debug: ${JSON.stringify(data.debugInfo)}`);
            }
          } else {
            addLog(`   ❌ API ERROR: ${data.error || 'Unknown error'}`);
            if (data.errorType) {
              addLog(`   🔍 Error type: ${data.errorType}`);
            }
          }
        } else {
          addLog(`   ❌ HTTP ERROR: ${response.status} ${response.statusText}`);
        }
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          addLog(`   ⏰ TIMEOUT: Test timed out after 65 seconds`);
        } else {
          addLog(`   ❌ EXCEPTION: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    addLog('\n🏁 Diagnostic tests completed');
    addLog('\n💡 Analysis suggestions:');
    addLog('   - If "No date range" works but date ranges fail → Date range issue');
    addLog('   - If small limits work but larger limits fail → Data volume issue');
    addLog('   - If all tests fail → Account-specific configuration issue');
    addLog('   - Compare results with working account 27');
    
    setIsRunning(false);
  };

  const runComparisonTest = async () => {
    setIsRunning(true);
    setRawLogs('');
    
    addLog('🔍 Running Account Comparison Test');
    addLog('🎯 Comparing Account 3 (problematic) vs Account 27 (working)');
    addLog('📋 Using identical parameters to isolate the issue\n');
    
    const testParams = {
      limit: '25',
      offset: '0',
      type: 'non_zero_and_errors',
      start_date: params.start_date || '2025-05-27T05:41',
      end_date: params.end_date || '2025-05-27T20:41'
    };
    
    const accounts = [
      { id: '27', name: 'Account 27 (Working)' },
      { id: '3', name: 'Account 3 (Problematic)' }
    ];
    
    for (const account of accounts) {
      addLog(`\n🧪 Testing ${account.name}`);
      
      const requestBody = {
        i_account: account.id,
        mode: 'full', // Use full parsing for debug test page to see all fields
        ...testParams
      };
      
      addLog(`   📋 Request: ${JSON.stringify(requestBody)}`);
      
      try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 65000); // 65 second timeout
        
        const response = await fetch('/api/debug/cdr-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            const count = data.count || 0;
            addLog(`   ✅ SUCCESS: ${count} CDRs in ${duration}ms`);
            addLog(`   📊 Response size: ${data.rawResponseLength || 0} characters`);
            if (data.debugInfo) {
              addLog(`   🔧 Debug: ${JSON.stringify(data.debugInfo)}`);
            }
          } else {
            addLog(`   ❌ API ERROR: ${data.error || 'Unknown error'}`);
            if (data.errorType) {
              addLog(`   🔍 Error type: ${data.errorType}`);
            }
          }
        } else {
          addLog(`   ❌ HTTP ERROR: ${response.status} ${response.statusText}`);
        }
        
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          addLog(`   ⏰ TIMEOUT: Request timed out after 65 seconds`);
        } else {
          addLog(`   ❌ EXCEPTION: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    addLog('\n🏁 Comparison test completed');
    addLog('\n💡 Analysis:');
    addLog('   - If Account 27 works but Account 3 fails with identical params:');
    addLog('     → Account-specific data or configuration issue');
    addLog('     → Possible causes: CDR data complexity, account permissions, or Sippy server load');
    addLog('   - If both accounts have similar performance:');
    addLog('     → Issue might be environmental or timing-related');
    
    setIsRunning(false);
  };

  const clearLogs = () => {
    setRawLogs('');
  };

  return (
    <MainLayout>
      <PageLayout
        title="CDR API Test"
        description="Test CDR fetching with Sippy API parameters according to official documentation"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Debug', href: '/debug' },
          { label: 'CDR Test' }
        ]}
      >
        <div className="space-y-6">
          {/* Test Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                CDR API Parameters
              </CardTitle>
              <CardDescription>
                Configure parameters according to Sippy API documentation for getAccountCDRs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Required Parameters */}
                <div>
                  <Label htmlFor="i_account">Account ID (required)</Label>
                  <Input
                    id="i_account"
                    value={params.i_account}
                    onChange={(e) => setParams(prev => ({ ...prev, i_account: e.target.value }))}
                    placeholder="e.g., 3"
                    type="number"
                  />
                </div>

                <div>
                  <Label htmlFor="limit">Limit</Label>
                  <Input
                    id="limit"
                    value={params.limit || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, limit: e.target.value }))}
                    placeholder="e.g., 10"
                    type="number"
                  />
                </div>

                <div>
                  <Label htmlFor="offset">Offset</Label>
                  <Input
                    id="offset"
                    value={params.offset || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, offset: e.target.value }))}
                    placeholder="e.g., 0"
                    type="number"
                  />
                </div>

                {/* Date Parameters */}
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    value={params.start_date || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, start_date: e.target.value }))}
                    placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                    type="datetime-local"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: '%H:%M:%S.000 GMT %a %b %d %Y'
                  </p>
                </div>

                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    value={params.end_date || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, end_date: e.target.value }))}
                    placeholder="YYYY-MM-DDTHH:mm:ss.sssZ"
                    type="datetime-local"
                  />
                </div>

                {/* Type Parameter */}
                <div>
                  <Label htmlFor="type">CDR Type</Label>
                  <Select value={params.type || ''} onValueChange={(value) => setParams(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="non_zero_and_errors">non_zero_and_errors (default)</SelectItem>
                      <SelectItem value="non_zero">non_zero</SelectItem>
                      <SelectItem value="all">all</SelectItem>
                      <SelectItem value="complete">complete</SelectItem>
                      <SelectItem value="incomplete">incomplete</SelectItem>
                      <SelectItem value="errors">errors</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Optional Filter Parameters */}
                <div>
                  <Label htmlFor="cli">CLI Filter</Label>
                  <Input
                    id="cli"
                    value={params.cli || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, cli: e.target.value }))}
                    placeholder="e.g., 1234567890"
                  />
                </div>

                <div>
                  <Label htmlFor="cld">CLD Filter</Label>
                  <Input
                    id="cld"
                    value={params.cld || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, cld: e.target.value }))}
                    placeholder="e.g., 0987654321"
                  />
                </div>

                <div>
                  <Label htmlFor="i_cdr">Specific CDR ID</Label>
                  <Input
                    id="i_cdr"
                    value={params.i_cdr || ''}
                    onChange={(e) => setParams(prev => ({ ...prev, i_cdr: e.target.value }))}
                    placeholder="e.g., 12345"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={runTest}
                  disabled={isRunning || !params.i_account}
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Run Test
                </Button>
                
                <Button 
                  onClick={runQuickTests}
                  disabled={isRunning || !params.i_account}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  Quick Tests
                </Button>

                <Button 
                  onClick={runDiagnosticTests}
                  disabled={isRunning || !params.i_account}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Database className="h-4 w-4" />
                  )}
                  Diagnostic Tests
                </Button>

                <Button 
                  onClick={runComparisonTest}
                  disabled={isRunning}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  Compare Accounts
                </Button>

                <Button 
                  onClick={() => {
                    // Test account 3 without date ranges
                    setParams(prev => ({ ...prev, start_date: '', end_date: '', limit: '50' }));
                    setTimeout(runTest, 100);
                  }}
                  disabled={isRunning || !params.i_account}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  Test Last Hour
                </Button>
                
                <Button 
                  onClick={clearLogs}
                  variant="ghost"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Clear Logs
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Result */}
          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {testResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Test Result
                </CardTitle>
                <CardDescription>
                  {testResult.success ? 'Test completed successfully' : 'Test failed'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant={testResult.success ? "default" : "destructive"}>
                      {testResult.success ? 'Success' : 'Failed'}
                    </Badge>
                    {testResult.duration && (
                      <Badge variant="outline">
                        {testResult.duration}ms
                      </Badge>
                    )}
                    {testResult.cdrCount !== undefined && (
                      <Badge variant={testResult.cdrCount > 0 ? "default" : "secondary"}>
                        {testResult.cdrCount} CDRs
                      </Badge>
                    )}
                  </div>
                  
                  {testResult.error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
                      <strong>Error:</strong> {testResult.error}
                    </div>
                  )}
                  
                  {testResult.success && testResult.cdrCount === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
                      <strong>No CDRs found.</strong> This could be normal if:
                      <ul className="list-disc list-inside mt-2">
                        <li>No calls were made in the specified time period</li>
                        <li>No date range specified (only last hour is returned)</li>
                        <li>Filters are too restrictive</li>
                      </ul>
                    </div>
                  )}
                  
                  {testResult.rawResponse && (
                    <details className="mt-4">
                      <summary className="cursor-pointer font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Raw Response Data
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-50 border rounded text-xs overflow-auto max-h-64">
                        {testResult.rawResponse}
                      </pre>
                    </details>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Raw Logs */}
          {rawLogs && (
            <Card>
              <CardHeader>
                <CardTitle>Test Logs</CardTitle>
                <CardDescription>
                  Detailed logging output from the test
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={rawLogs}
                  readOnly
                  className="font-mono text-sm h-64"
                  placeholder="Test logs will appear here..."
                />
              </CardContent>
            </Card>
          )}

          {/* Testing Strategy */}
          <Card>
            <CardHeader>
              <CardTitle>Testing Strategy</CardTitle>
              <CardDescription>
                Recommended approach for testing CDR API functionality
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Step-by-Step Testing:</h4>
                <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Start with "Test Last Hour":</strong> This tests basic connectivity without date ranges</li>
                  <li><strong>Try small date ranges:</strong> Start with 1-hour ranges, then expand gradually</li>
                  <li><strong>Monitor timeout patterns:</strong> 30-second timeout matches Active Calls behavior</li>
                  <li><strong>Check account data:</strong> Ensure the account has CDRs in the specified time range</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-medium">Common Issues:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Timeouts with date ranges:</strong> Large date ranges may contain too much data</li>
                  <li><strong>No CDRs found:</strong> Account may not have calls in the specified period</li>
                  <li><strong>Network issues:</strong> Check Sippy API endpoint and credentials</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* API Documentation Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Sippy API Documentation</CardTitle>
              <CardDescription>
                Reference information from the official Sippy API documentation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium">Important Notes:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>Since version 2.2:</strong> Returns only CDRs for the last hour if dates not specified exactly</li>
                  <li><strong>Date format:</strong> '%H:%M:%S.000 GMT %a %b %d %Y' (e.g., '09:57:29.000 GMT Wed Nov 18 2009')</li>
                  <li><strong>Default type:</strong> 'non_zero_and_errors' (since version 2.2)</li>
                  <li><strong>Authentication:</strong> Uses digest authentication like active calls</li>
                  <li><strong>Timeout:</strong> 30 seconds (matching Active Calls and CDR Reports)</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium">CDR Types:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li><strong>non_zero_and_errors:</strong> Non-zero duration and error CDRs (default)</li>
                  <li><strong>non_zero:</strong> Only non-zero duration CDRs</li>
                  <li><strong>all:</strong> All CDRs</li>
                  <li><strong>complete:</strong> Only completed calls</li>
                  <li><strong>incomplete:</strong> Only incomplete calls</li>
                  <li><strong>errors:</strong> Only error CDRs</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    </MainLayout>
  );
} 