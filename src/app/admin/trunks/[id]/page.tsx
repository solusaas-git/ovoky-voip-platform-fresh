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
  Edit, 
  Trash2, 
  Server, 
  Network, 
  Settings, 
  User, 
  Shield, 
  Clock,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';
import { Trunk } from '@/types/trunk';
import { RegistrationStatus } from '@/components/sippy/RegistrationStatus';
import { StatusWithAccountManagement } from '@/components/sippy/StatusWithAccountManagement';
import { AccountParametersManager } from '@/components/sippy/AccountParametersManager';
import { AuthRulesDisplay } from '@/components/sippy/AuthRulesDisplay';

export default function TrunkViewPage() {
  const router = useRouter();
  const params = useParams();
  const trunkId = params.id as string;
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

      const response = await fetch(`/api/admin/trunks/${trunkId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError(t('adminTrunks.states.trunkNotFound'));
        } else {
          throw new Error('Failed to fetch trunk details');
        }
        return;
      }

      const data = await response.json();
      setTrunk(data);
    } catch (error) {
      console.error('Error fetching trunk:', error);
      setError(t('adminTrunks.states.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!trunk || !confirm(t('adminTrunks.confirmations.deleteTrunkNamed', { name: trunk.name }))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/trunks/${trunkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trunk');
      }

      router.push('/admin/trunks');
    } catch (error) {
      console.error('Error deleting trunk:', error);
      alert(t('adminTrunks.errors.deleteFailed'));
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
          title={t('adminTrunks.states.loading')}
          description={t('adminTrunks.states.loadingTrunk')}
          breadcrumbs={[
            { label: t('adminTrunks.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('adminTrunks.page.breadcrumbs.admin'), href: '/admin' },
            { label: t('adminTrunks.page.breadcrumbs.trunks'), href: '/admin/trunks' },
            { label: t('adminTrunks.details.overview.description') }
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
          title={t('adminTrunks.states.error')}
          description={t('adminTrunks.states.failedToLoad')}
          breadcrumbs={[
            { label: t('adminTrunks.page.breadcrumbs.dashboard'), href: '/dashboard' },
            { label: t('adminTrunks.page.breadcrumbs.admin'), href: '/admin' },
            { label: t('adminTrunks.page.breadcrumbs.trunks'), href: '/admin/trunks' },
            { label: t('adminTrunks.details.overview.description') }
          ]}
          headerActions={
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('adminTrunks.actions.back')}
            </Button>
          }
        >
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || t('adminTrunks.states.trunkNotFound')}</AlertDescription>
          </Alert>
        </PageLayout>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageLayout
        title={trunk.name}
        description={t('adminTrunks.details.overview.description')}
        breadcrumbs={[
          { label: t('adminTrunks.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('adminTrunks.page.breadcrumbs.admin'), href: '/admin' },
          { label: t('adminTrunks.page.breadcrumbs.trunks'), href: '/admin/trunks' },
          { label: trunk.name }
        ]}
        headerActions={
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('adminTrunks.actions.back')}
            </Button>
            <Button variant="outline" onClick={() => router.push(`/admin/trunks/${trunk._id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              {t('adminTrunks.actions.edit')}
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('adminTrunks.actions.delete')}
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Status and Basic Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5" />
                  <span>{t('adminTrunks.details.overview.title')}</span>
                </CardTitle>
                <StatusWithAccountManagement 
                  accountId={trunk.assignedToUser?.sippyAccountId}
                  onRefresh={fetchTrunk}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.overview.trunkName')}</h3>
                  <p className="text-lg font-semibold">{trunk.name}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.overview.created')}</h3>
                  <p className="text-lg">{new Date(trunk.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              {trunk.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.overview.description')}</h3>
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
                <span>{t('adminTrunks.details.connection.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.connection.username')}</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{trunk.username}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(trunk.username, 'username')}
                      title={t('adminTrunks.actions.copy')}
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
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.connection.password')}</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded font-mono">
                      {showPassword ? trunk.password : '••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? t('adminTrunks.actions.hidePassword') : t('adminTrunks.actions.showPassword')}
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
                        title={t('adminTrunks.actions.copy')}
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
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.connection.domain')}</h3>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{trunk.domain}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(trunk.domain, 'domain')}
                      title={t('adminTrunks.actions.copy')}
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
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.connection.ipAddresses')}</h3>
                  <div className="space-y-2 mt-1">
                    {/* Unified IP Address Display */}
                    {trunk.ipAddresses && trunk.ipAddresses.length > 0 ? (
                      // Modern format: use ipAddresses array
                      trunk.ipAddresses.map((ip: string, index: number) => (
                        <div key={index} className="flex items-center space-x-2">
                          <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{ip}</code>
                          {index === 0 && <Badge variant="outline" className="text-xs">{t('adminTrunks.details.connection.primary')}</Badge>}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(ip, `ipAddress-${index}`)}
                            title={t('adminTrunks.actions.copy')}
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
                        <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{trunk.ipAddress}</code>
                        <Badge variant="outline" className="text-xs">{t('adminTrunks.details.connection.primary')}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(trunk.ipAddress!, 'ipAddress')}
                          title={t('adminTrunks.actions.copy')}
                        >
                          {copiedField === 'ipAddress' ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('adminTrunks.details.connection.noIpAddresses')}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.connection.port')}</h3>
                  <p className="text-sm font-mono">{trunk.port || 5060}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.connection.authType')}</h3>
                  <p className="text-sm capitalize">{trunk.authType || 'password'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.connection.registrationRequired')}</h3>
                  <p className="text-sm">{trunk.registrationRequired ? t('adminTrunks.details.connection.yes') : t('adminTrunks.details.connection.no')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Capacity Management */}
          {trunk.assignedToUser?.sippyAccountId && (
            <AccountParametersManager
              accountId={trunk.assignedToUser.sippyAccountId}
              onUpdate={fetchTrunk}
            />
          )}

          {/* Authentication Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>{t('adminTrunks.details.authRules.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trunk.assignedToUser?.sippyAccountId ? (
                <AuthRulesDisplay accountId={trunk.assignedToUser.sippyAccountId} isAdmin={true} />
              ) : (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('adminTrunks.details.authRules.noSipAccount')}</h3>
                  <p className="text-muted-foreground">
                    {t('adminTrunks.details.authRules.noSipAccountDescription')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Codecs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="h-5 w-5" />
                <span>{t('adminTrunks.details.codecs.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {trunk.codecs.map((codec) => (
                  <Badge key={codec} variant="secondary" className="text-sm">
                    {codec}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assignment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>{t('adminTrunks.details.assignment.title')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {trunk.assignedToUser ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.assignment.assignedUser')}</h3>
                      <p className="text-lg font-semibold">
                        {trunk.assignedToUser.name || trunk.assignedToUser.email}
                      </p>
                      <p className="text-sm text-muted-foreground">{trunk.assignedToUser.email}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.assignment.company')}</h3>
                      <p className="text-sm">
                        {trunk.assignedToUser.company || 
                         trunk.assignedToUser.onboarding?.companyName || 
                         t('adminTrunks.details.assignment.notSpecified')}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.assignment.assignedDate')}</h3>
                    <p className="text-sm flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(trunk.assignedAt).toLocaleString()}</span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <User className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-muted-foreground">{t('adminTrunks.details.assignment.notAssigned')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SIP Registration Status */}
          {trunk.assignedToUser?.sippyAccountId && (
            <RegistrationStatus 
              accountId={trunk.assignedToUser.sippyAccountId} 
              autoRefresh={true}
            />
          )}

          {/* Admin Notes */}
          {trunk.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>{t('adminTrunks.details.adminNotes.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{trunk.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Sippy Integration (if configured) */}
          {(trunk.sippyAccountId || trunk.sippyTrunkId) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>{t('adminTrunks.details.sippyIntegration.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trunk.sippyAccountId && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.sippyIntegration.accountId')}</h3>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{trunk.sippyAccountId}</code>
                  </div>
                )}
                {trunk.sippyTrunkId && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">{t('adminTrunks.details.sippyIntegration.trunkId')}</h3>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{trunk.sippyTrunkId}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

      </PageLayout>
    </MainLayout>
  );
} 