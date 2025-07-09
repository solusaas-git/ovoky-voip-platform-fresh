'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Eye, Server, Settings, Network, Shield } from 'lucide-react';
import { Trunk, TrunkFilters, TrunksResponse } from '@/types/trunk';
import { RegistrationStatusBadge } from '@/components/sippy/RegistrationStatusBadge';
import { AccountStatusBadge } from '@/components/sippy/AccountStatusBadge';
import { AuthRulesViewModal } from '@/components/sippy/AuthRulesViewModal';
import { useAuth } from '@/lib/AuthContext';
import { useAccountParameters } from '@/hooks/useAccountParameters';

export default function UserTrunksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslations();
  const [trunks, setTrunks] = useState<Trunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accountParams, setAccountParams] = useState<{ max_sessions?: number | string; max_calls_per_second?: number | string } | null>(null);
  const { fetchParameters } = useAccountParameters();
  const [authRulesOpen, setAuthRulesOpen] = useState(false);

  const [filters, setFilters] = useState<TrunkFilters>({
    search: '',
    page: 1,
    limit: 50, // Show more items for users since they typically have fewer trunks
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const fetchTrunks = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`/api/trunks?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch trunks');
      }

      const data: TrunksResponse = await response.json();
      setTrunks(data.trunks);
    } catch (error) {
      console.error('Error fetching trunks:', error);
      setError(t('trunks.states.error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCapacityData = async () => {
    if (user?.sippyAccountId) {
      try {
        const params = await fetchParameters(user.sippyAccountId);
        setAccountParams(params);
      } catch (err) {
        // Silently fail for capacity data
      }
    }
  };

  useEffect(() => {
    fetchTrunks();
    fetchCapacityData();
  }, [filters, user?.sippyAccountId]);

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const formatCapacityValue = (value?: number | string) => {
    if (value === 'Unlimited' || value === 'unlimited' || value === 0 || value === -1 || value === undefined) {
      return t('trunks.states.unlimited');
    }
    return value?.toString() || t('trunks.states.notAvailable');
  };



  return (
    <MainLayout>
      <PageLayout
        title={t('trunks.page.title')}
        description={t('trunks.page.description')}
        breadcrumbs={[
          { label: t('trunks.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('trunks.page.breadcrumbs.services'), href: '/services' },
          { label: t('trunks.page.breadcrumbs.trunks') }
        ]}
      >

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('trunks.stats.totalTrunks')}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trunks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('trunks.stats.sipRegistration')}</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{t('trunks.stats.checkTable')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('trunks.stats.accountStatus')}</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{t('trunks.stats.checkTable')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>{t('trunks.search.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={t('trunks.search.placeholder')}
              value={filters.search || ''}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trunks Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('trunks.table.title')} ({trunks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button onClick={fetchTrunks} className="mt-4">
                {t('trunks.actions.tryAgain')}
              </Button>
            </div>
          ) : trunks.length === 0 ? (
            <div className="text-center py-8">
              <Server className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('trunks.states.noTrunks.title')}</h3>
              <p className="text-muted-foreground">
                {t('trunks.states.noTrunks.description')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('trunks.table.headers.name')}</TableHead>
                  <TableHead>{t('trunks.table.headers.username')}</TableHead>
                  <TableHead>{t('trunks.table.headers.domain')}</TableHead>
                  <TableHead>{t('trunks.table.headers.sessions')}</TableHead>
                  <TableHead>{t('trunks.table.headers.cps')}</TableHead>
                  <TableHead>{t('trunks.table.headers.accountStatus')}</TableHead>
                  <TableHead>{t('trunks.table.headers.sipRegistration')}</TableHead>
                  <TableHead className="text-right">{t('trunks.table.headers.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trunks.map((trunk) => (
                  <TableRow key={trunk._id}>
                    <TableCell className="font-medium">{trunk.name}</TableCell>
                    <TableCell className="font-mono text-sm">{trunk.username}</TableCell>
                    <TableCell className="font-mono text-sm">{trunk.domain}</TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">
                        {formatCapacityValue(accountParams?.max_sessions)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <Badge variant="outline">
                        {formatCapacityValue(accountParams?.max_calls_per_second)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AccountStatusBadge 
                        accountId={user?.sippyAccountId}
                        refreshInterval={60}
                      />
                    </TableCell>
                    <TableCell>
                      <RegistrationStatusBadge 
                        accountId={user?.sippyAccountId}
                        size="sm"
                        showRefresh={false}
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/trunks/${trunk._id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {t('trunks.actions.details')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAuthRulesOpen(true)}
                          disabled={!user?.sippyAccountId}
                          title={t('trunks.tooltips.viewRules')}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          {t('trunks.actions.viewRules')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      </PageLayout>

      {/* Authentication Rules Modal */}
      {user?.sippyAccountId && (
        <AuthRulesViewModal
          isOpen={authRulesOpen}
          onClose={() => setAuthRulesOpen(false)}
          accountId={user.sippyAccountId}
        />
      )}
    </MainLayout>
  );
} 