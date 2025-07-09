'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SippyApiConfig {
  username: string;
  password: string;
  host: string;
}

export function SippyApiSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<SippyApiConfig>({
    username: '',
    password: '',
    host: '',
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load settings when component mounts
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings/sippy-api');
      
      if (response.ok) {
        const data = await response.json();
        setSettings({
          username: data.username || '',
          password: data.password || '',
          host: data.host || '',
        });
      }
    } catch (error) {
      console.error('Error fetching Sippy API settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      
      // Basic validation
      if (!settings.username || !settings.password || !settings.host) {
        toast.error('All fields are required');
        return;
      }
      
      // Save settings
      const response = await fetch('/api/settings/sippy-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save settings');
      }
      
      toast.success('Sippy API settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);
      
      // Test with current form values
      const response = await fetch('/api/sippy/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setTestResult({ success: true, message: 'Connection successful!' });
      } else {
        setTestResult({ 
          success: false, 
          message: data.error || 'Failed to connect to Sippy API'
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Sippy API Configuration</CardTitle>
        <CardDescription>
          Configure the Sippy API credentials used for fetching client data.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <form id="sippy-api-form" onSubmit={handleSubmit}>
          <div className="grid gap-5">
            <div className="grid gap-2.5">
              <Label htmlFor="host">API Host</Label>
              <Input
                id="host"
                name="host"
                value={settings.host}
                onChange={handleChange}
                placeholder="https://api.sippysoft.com"
                required
              />
            </div>
            <div className="grid gap-2.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                value={settings.username}
                onChange={handleChange}
                placeholder="Your Sippy API username"
                required
              />
            </div>
            <div className="grid gap-2.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={settings.password}
                onChange={handleChange}
                placeholder="Your Sippy API password"
                required
              />
              <p className="text-sm text-muted-foreground">
                Your password is encrypted before being stored.
              </p>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="px-0 pt-4 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <Button type="submit" form="sippy-api-form" disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
        
        <Button 
          type="button" 
          variant="outline" 
          onClick={testConnection} 
          disabled={isTesting || isSaving || !settings.username || !settings.password || !settings.host}
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              Test Connection
            </>
          )}
        </Button>
        
        {testResult && (
          <div className={`flex items-center ${testResult.success ? 'text-green-600' : 'text-red-600'} ml-2`}>
            {testResult.success ? (
              <CheckCircle2 className="h-4 w-4 mr-1" />
            ) : (
              <AlertCircle className="h-4 w-4 mr-1" />
            )}
            <span className="text-sm">{testResult.message}</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
} 