'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/lib/i18n';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// Using inline implementations to match existing patterns
import { Plus, Search, Eye, Edit, Trash2, Users, Server, Settings, Shield } from 'lucide-react';
import { Trunk, TrunkFilters, TrunksResponse } from '@/types/trunk';
import { RegistrationStatusBadge } from '@/components/sippy/RegistrationStatusBadge';
import { AccountStatusBadge } from '@/components/sippy/AccountStatusBadge';
import { AuthRulesModal } from '@/components/sippy/AuthRulesModal';

export default function AdminTrunksPage() {
  const router = useRouter();
  const { t } = useTranslations();
  const [trunks, setTrunks] = useState<Trunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [authRulesModal, setAuthRulesModal] = useState<{ isOpen: boolean; accountId: number | null }>({
    isOpen: false,
    accountId: null,
  });

  const [filters, setFilters] = useState<TrunkFilters>({
    search: '',
    assignedTo: undefined,
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const fetchTrunks = async () => {
    try {
      setLoading(true);
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

      const response = await fetch(`/api/admin/trunks?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch trunks');
      }

      const data: TrunksResponse = await response.json();
      setTrunks(data.trunks);
      setTotalPages(data.totalPages);
      setCurrentPage(data.page);
      setTotalCount(data.total);
    } catch (error) {
      console.error('Error fetching trunks:', error);
      console.error(t('adminTrunks.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrunks();
  }, [filters]);

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleDeleteTrunk = async (trunkId: string) => {
    if (!confirm(t('adminTrunks.confirmations.deleteTrunk'))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/trunks/${trunkId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete trunk');
      }

      console.log(t('adminTrunks.success.trunkDeleted'));
      fetchTrunks();
    } catch (error) {
      console.error('Error deleting trunk:', error);
      alert(t('adminTrunks.errors.deleteFailed'));
    }
  };

  return (
    <MainLayout>
      <PageLayout
        title={t('adminTrunks.page.title')}
        description={t('adminTrunks.page.description')}
        breadcrumbs={[
          { label: t('adminTrunks.page.breadcrumbs.dashboard'), href: '/dashboard' },
          { label: t('adminTrunks.page.breadcrumbs.admin'), href: '/admin' },
          { label: t('adminTrunks.page.breadcrumbs.trunks') }
        ]}
        headerActions={
          <Button onClick={() => router.push('/admin/trunks/create')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('adminTrunks.actions.createTrunk')}
          </Button>
        }
      >

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('adminTrunks.stats.totalTrunks')}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('adminTrunks.stats.assignedTrunks')}</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trunks.filter(t => t.assignedTo).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('adminTrunks.stats.unassigned')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trunks.filter(t => !t.assignedTo).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('adminTrunks.stats.withSippyAccount')}</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trunks.filter(t => t.assignedToUser?.sippyAccountId).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminTrunks.filters.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('adminTrunks.filters.searchPlaceholder')}
                  value={filters.search || ''}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Trunks Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('adminTrunks.table.title')} ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : trunks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{t('adminTrunks.states.noTrunks')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('adminTrunks.table.headers.name')}</TableHead>
                    <TableHead>{t('adminTrunks.table.headers.username')}</TableHead>
                    <TableHead>{t('adminTrunks.table.headers.domain')}</TableHead>
                    <TableHead>{t('adminTrunks.table.headers.accountStatus')}</TableHead>
                    <TableHead>{t('adminTrunks.table.headers.sipRegistration')}</TableHead>
                    <TableHead>{t('adminTrunks.table.headers.assignedTo')}</TableHead>
                    <TableHead>{t('adminTrunks.table.headers.created')}</TableHead>
                    <TableHead className="text-right">{t('adminTrunks.table.headers.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trunks.map((trunk) => (
                    <TableRow key={trunk._id}>
                      <TableCell className="font-medium">{trunk.name}</TableCell>
                      <TableCell>{trunk.username}</TableCell>
                      <TableCell>{trunk.domain}</TableCell>
                      <TableCell>
                        <AccountStatusBadge 
                          accountId={trunk.assignedToUser?.sippyAccountId}
                          refreshInterval={60}
                        />
                      </TableCell>
                      <TableCell>
                        <RegistrationStatusBadge 
                          accountId={trunk.assignedToUser?.sippyAccountId}
                          size="sm"
                          showRefresh={false}
                        />
                      </TableCell>
                      <TableCell>
                        {trunk.assignedToUser ? (
                          <div>
                            <div className="font-medium">
                              {trunk.assignedToUser.name || trunk.assignedToUser.email}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {trunk.assignedToUser.company || trunk.assignedToUser.onboarding?.companyName}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">{t('adminTrunks.states.unassigned')}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(trunk.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/trunks/${trunk._id}`)}
                            title={t('adminTrunks.actions.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {trunk.assignedToUser?.sippyAccountId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setAuthRulesModal({ 
                                isOpen: true, 
                                accountId: trunk.assignedToUser!.sippyAccountId! 
                              })}
                              title={t('adminTrunks.actions.manageAuthRules')}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/trunks/${trunk._id}/edit`)}
                            title={t('adminTrunks.actions.editTrunk')}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteTrunk(trunk._id)}
                            className="text-red-600 hover:text-red-700"
                            title={t('adminTrunks.actions.deleteTrunk')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    {t('adminTrunks.states.showingResults', {
                      start: (((currentPage - 1) * filters.limit!) + 1).toString(),
                      end: Math.min(currentPage * filters.limit!, totalCount).toString(),
                      total: totalCount.toString()
                    })}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                                          >
                        {t('adminTrunks.actions.previous')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        {t('adminTrunks.actions.next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Authentication Rules Modal */}
      {authRulesModal.accountId && (
        <AuthRulesModal
          isOpen={authRulesModal.isOpen}
          onClose={() => setAuthRulesModal({ isOpen: false, accountId: null })}
          accountId={authRulesModal.accountId}
        />
      )}
      </PageLayout>
    </MainLayout>
  );
} 