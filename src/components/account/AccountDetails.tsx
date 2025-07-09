'use client';

import { useSippyAccount } from '@/hooks/useSippyAccount';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface AccountDetailsProps {
  accountId?: number;
}

export function AccountDetails({ accountId }: AccountDetailsProps) {
  const { accountInfo, isLoading, error, refetch } = useSippyAccount(accountId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Account</CardTitle>
          <CardDescription>
            There was an error loading the account information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!accountInfo) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Account Data</CardTitle>
          <CardDescription>
            No account information is available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please make sure the Sippy account ID is valid and configured correctly.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Format date strings
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPP');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Account Details
        </h2>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="technical">Technical</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Basic account details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Account ID</h3>
                  <p>{accountInfo.i_account}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Username</h3>
                  <p>{accountInfo.username}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Company</h3>
                  <p>{accountInfo.company_name || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                  <p>{formatDate(accountInfo.created_on || '')}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${accountInfo.blocked ? 'bg-red-500' : 'bg-green-500'}`}></div>
                    <p>{accountInfo.blocked ? 'Blocked' : 'Active'}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                  <p>{accountInfo.description || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Contact details for the account</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                  <p>
                    {[
                      accountInfo.first_name,
                      accountInfo.mid_init,
                      accountInfo.last_name
                    ].filter(Boolean).join(' ') || 'N/A'}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p>{accountInfo.email || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Phone</h3>
                  <p>{accountInfo.phone || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Address</h3>
                  <p>
                    {[
                      accountInfo.street_addr,
                      accountInfo.city,
                      accountInfo.state,
                      accountInfo.postal_code,
                      accountInfo.country
                    ].filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Information</CardTitle>
              <CardDescription>Financial details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Balance</h3>
                  <p className={`font-semibold ${(-accountInfo.balance) < 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {(-accountInfo.balance).toFixed(4)} {accountInfo.payment_currency}
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Credit Limit</h3>
                  <p>{accountInfo.credit_limit} {accountInfo.payment_currency}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Billing Plan</h3>
                  <p>Plan ID: {accountInfo.i_billing_plan}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Account Class</h3>
                  <p>Class ID: {accountInfo.i_account_class || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">First Use</h3>
                  <p>{formatDate(accountInfo.first_use || '')}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Next Billing</h3>
                  <p>{formatDate(accountInfo.next_billing_time || '')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="technical">
          <Card>
            <CardHeader>
              <CardTitle>Technical Information</CardTitle>
              <CardDescription>SIP and routing details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Authentication Name</h3>
                  <p>{accountInfo.authname}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Max Sessions</h3>
                  <p>{accountInfo.max_sessions === -1 ? 'Unlimited' : accountInfo.max_sessions}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Max Credit Time</h3>
                  <p>{accountInfo.max_credit_time} seconds</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Registration Allowed</h3>
                  <p>{accountInfo.reg_allowed ? 'Yes' : 'No'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Routing Group</h3>
                  <p>Group ID: {accountInfo.i_routing_group}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Voicemail Enabled</h3>
                  <p>{accountInfo.vm_enabled ? 'Yes' : 'No'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">CPE Number</h3>
                  <p>{accountInfo.cpe_number || 'N/A'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Lifetime</h3>
                  <p>{accountInfo.lifetime === -1 ? 'Unlimited' : `${accountInfo.lifetime} days`}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Follow Me</h3>
                  <p>{accountInfo.followme_enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">DND Mode</h3>
                  <p>{accountInfo.dnd_enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Call Recording</h3>
                  <p>{accountInfo.call_recording ? 'Enabled' : 'Disabled'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 