'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Server, 
  Network, 
  Settings, 
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { Trunk } from '@/types/trunk';
import { RegistrationStatus } from '@/components/sippy/RegistrationStatus';
import { AccountStatusBadge } from '@/components/sippy/AccountStatusBadge';
import { AccountCapacityDisplay } from '@/components/sippy/AccountCapacityDisplay';
import { AuthRulesDisplay } from '@/components/sippy/AuthRulesDisplay';
import { useAuth } from '@/lib/AuthContext';

export default function UserTrunkViewPage() {
  const router = useRouter();
  const params = useParams();
  const trunkId = params.id as string;
  const { user } = useAuth();
  const { t } = useTranslations();

  const [trunk, setTrunk] = useState<Trunk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);


  useEffect(() => {
    if (trunkId) {
      fetchTrunk();
    }
  }, [trunkId]);

  const fetchTrunk = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/trunks/${trunkId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(t('trunks.states.trunkNotFound'));
        } else if (response.status === 401) {
          router.push('/login');
          return;
        } else {
          throw new Error('Failed to fetch trunk details');
        }
        return;
      }

      const data = await response.json();
      setTrunk(data);
    } catch (error) {
      console.error('Error fetching trunk:', error);
      setError(t('trunks.states.errorDetails'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };



  if (loading) {
    return (
      <MainLayout>
        <PageLayout
          title={t('trunks.states.loading')}
          description={t('trunks.states.loadingDetails')}
          breadcrumbs={[
            { label: t('trunks.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('trunks.page.breadcrumbs.services'), href: '/services' },
            { label: t('trunks.page.breadcrumbs.trunks'), href: '/trunks' },
            { label: t('trunks.actions.details') }
          ]}
        >
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </PageLayout>
      </MainLayout>
    );
  }

  if (error || !trunk) {
    return (
      <MainLayout>
        <PageLayout
          title={t('common.error')}
          description={t('trunks.states.errorDetails')}
          breadcrumbs={[
            { label: t('trunks.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('trunks.page.breadcrumbs.services'), href: '/services' },
            { label: t('trunks.page.breadcrumbs.trunks'), href: '/trunks' },
            { label: t('trunks.actions.details') }
          ]}
          headerActions={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('trunks.actions.back')}
            </Button>
          }
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || t('trunks.states.trunkNotFound')}</AlertDescription>
          </Alert>
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title={trunk.name}
        description={t('trunks.page.description')}
        breadcrumbs={[
          { label: t('trunks.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('trunks.page.breadcrumbs.services'), href: '/services' },
          { label: t('trunks.page.breadcrumbs.trunks'), href: '/trunks' },
          { label: trunk.name }
        ]}
        headerActions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('trunks.actions.backToTrunks')}
          </Button>
        }
      >
        <div className="space-y-6">
          {/* Status and Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5" />
                  <span>{t('trunks.details.title')}</span>
                </CardTitle>
                {user?.sippyAccountId && (
                  <AccountStatusBadge 
                    accountId={user.sippyAccountId}
                    refreshInterval={60}
                  />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.trunkName')}</h3>
                  <p className="text-lg font-semibold">{trunk.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.assignedDate')}</h3>
                  <p className="text-lg flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{new Date(trunk.assignedAt).toLocaleDateString()}</span>
                  </p>
                </div>
              </div>
              
              {trunk.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.description')}</h3>
                  <p className="text-sm mt-1">{trunk.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connection Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>{t('trunks.details.connectionConfig.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">{t('trunks.details.connectionConfig.pbxConfig')}</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('trunks.details.connectionConfig.pbxDescription')}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.connectionConfig.username')}</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{trunk.username}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(trunk.username, 'username')}
                      title={t('trunks.actions.copy')}
                    >
                      {copiedField === 'username' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.connectionConfig.password')}</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                      {showPassword ? trunk.password : '••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? t('trunks.actions.hidePassword') : t('trunks.actions.showPassword')}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    {showPassword && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(trunk.password, 'password')}
                        title={t('trunks.actions.copy')}
                      >
                        {copiedField === 'password' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.connectionConfig.domain')}</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{trunk.domain}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(trunk.domain, 'domain')}
                      title={t('trunks.actions.copy')}
                    >
                      {copiedField === 'domain' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.connectionConfig.ipAddresses')}</h3>
                  <div className="space-y-2 mt-1">
                    {/* Unified IP Address Display */}
                    {trunk.ipAddresses && trunk.ipAddresses.length > 0 ? (
                      // Modern format: use ipAddresses array
                      trunk.ipAddresses.map((ip: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{ip}</code>
                          {index === 0 && <Badge variant="outline" className="text-xs">{t('trunks.details.connectionConfig.primary')}</Badge>}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(ip, `ipAddress-${index}`)}
                            title={t('trunks.actions.copy')}
                          >
                            {copiedField === `ipAddress-${index}` ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))
                    ) : trunk.ipAddress ? (
                      // Backward compatibility: fallback to ipAddress field
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{trunk.ipAddress}</code>
                        <Badge variant="outline" className="text-xs">{t('trunks.details.connectionConfig.primary')}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(trunk.ipAddress!, 'ipAddress')}
                          title={t('trunks.actions.copy')}
                        >
                          {copiedField === 'ipAddress' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('trunks.states.noIpAddresses')}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.connectionConfig.port')}</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">{trunk.port || 5060}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard((trunk.port || 5060).toString(), 'port')}
                      title={t('trunks.actions.copy')}
                    >
                      {copiedField === 'port' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.connectionConfig.authType')}</h3>
                  <p className="text-sm capitalize">{trunk.authType || 'password'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('trunks.details.connectionConfig.registrationRequired')}</h3>
                  <p className="text-sm">{trunk.registrationRequired ? t('common.yes') : t('common.no')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Capacity */}
          {user?.sippyAccountId && (
            <AccountCapacityDisplay accountId={user.sippyAccountId} />
          )}

          {/* Authentication Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>{t('trunks.details.authRules.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {user?.sippyAccountId ? (
                <AuthRulesDisplay accountId={user.sippyAccountId} />
              ) : (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('trunks.states.sipAccountNotConfigured.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('trunks.states.sipAccountNotConfigured.description')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Codec Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>{t('trunks.details.codecs.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('trunks.details.codecs.description')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {trunk.codecs.map((codec) => (
                    <Badge key={codec} variant="secondary" className="text-sm">
                      {codec}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SIP Registration Status */}
          {user?.sippyAccountId && (
            <RegistrationStatus 
              accountId={user.sippyAccountId} 
              autoRefresh={true}
            />
          )}

          {/* Quick Setup Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>{t('trunks.details.quickSetup.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-3">{t('trunks.details.quickSetup.subtitle')}</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-green-800 dark:text-green-200">
                  <li>{t('trunks.details.quickSetup.steps.1')}</li>
                  <li>{t('trunks.details.quickSetup.steps.2')}</li>
                  <li>{t('trunks.details.quickSetup.steps.3', { authType: trunk.authType || 'password' })}</li>
                  <li>{t('trunks.details.quickSetup.steps.4', { 
                    registrationStatus: trunk.registrationRequired 
                      ? t('trunks.details.quickSetup.registration') 
                      : t('trunks.details.quickSetup.noRegistration') 
                  })}</li>
                  <li>{t('trunks.details.quickSetup.steps.5', { codecs: trunk.codecs.join(', ') })}</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          {/* Support Information */}
          <Card>
            <CardHeader>
              <CardTitle>{t('trunks.details.support.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t('trunks.details.support.description', { trunkName: trunk.name })}
              </p>
            </CardContent>
          </Card>
        </div>


      </PageLayout>
    </MainLayout>
  );
} 