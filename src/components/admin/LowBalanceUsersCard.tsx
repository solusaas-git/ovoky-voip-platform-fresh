'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
// Card components not used since this is embedded in a larger component
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  RefreshCw, 
  DollarSign, 
  User,
  Mail,
  ExternalLink,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface LowBalanceUser {
  id: string;
  name: string;
  email: string;
  sippyAccountId?: string;
  balance?: number;
  lastActivity?: string;
  phone?: string;
  avatar?: string;
  companyName?: string;
}

interface LowBalanceUsersCardProps {
  onRefresh?: () => void;
  threshold?: number; // Balance threshold to consider "low"
  onThresholdChange?: (threshold: number) => void;
  isEditMode?: boolean;
}

export function LowBalanceUsersCard({ 
  onRefresh, 
  threshold = 5.0, // Default threshold of €5.00
  onThresholdChange,
  isEditMode = false
}: LowBalanceUsersCardProps) {
  const { t } = useTranslations();
  const [users, setUsers] = useState<LowBalanceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localThreshold, setLocalThreshold] = useState(threshold);

  const fetchLowBalanceUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/admin/low-balance-users?threshold=${threshold}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch low balance users');
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching low balance users:', error);
      setError(error instanceof Error ? error.message : 'Failed to load users');
      toast.error('Failed to load low balance users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLowBalanceUsers();
  }, [threshold]);

  useEffect(() => {
    setLocalThreshold(threshold);
  }, [threshold]);

  const handleRefresh = () => {
    fetchLowBalanceUsers();
    onRefresh?.();
  };

  const handleThresholdChange = (value: string) => {
    const newThreshold = parseFloat(value);
    if (!isNaN(newThreshold) && newThreshold >= 0) {
      setLocalThreshold(newThreshold);
      onThresholdChange?.(newThreshold);
    }
  };

  const formatBalance = (balance: number | undefined) => {
    if (balance === undefined || balance === null) return '0.0000 €';
    return `${balance.toFixed(4)} €`;
  };

  const getBalanceSeverity = (balance: number | undefined) => {
    if (!balance || balance <= 0) return 'critical';
    if (balance <= threshold * 0.5) return 'warning';
    return 'low';
  };

  const getBalanceBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'outline';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="w-32 h-4 bg-muted rounded animate-pulse" />
          </div>
          <div className="w-6 h-6 bg-muted rounded animate-pulse" />
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
            <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="w-24 h-4 bg-muted rounded animate-pulse" />
              <div className="w-32 h-3 bg-muted rounded animate-pulse" />
            </div>
            <div className="w-16 h-6 bg-muted rounded animate-pulse" />
          </div>
        ))}
        <div className="text-center text-sm text-muted-foreground">
          {t('dashboard.widgets.lowBalanceUsers.loading')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          {t('dashboard.widgets.lowBalanceUsers.error.title')}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          {t('dashboard.widgets.lowBalanceUsers.error.tryAgain')}
        </Button>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="space-y-4">
        {/* Threshold Settings in Edit Mode */}
        {isEditMode && (
          <div className="p-3 bg-muted/30 rounded-lg border-2 border-dashed border-primary/20">
            <div className="flex items-center space-x-2 mb-3">
              <Settings className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">
                {t('dashboard.widgets.lowBalanceUsers.threshold.label')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">€</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1000"
                value={localThreshold}
                onChange={(e) => handleThresholdChange(e.target.value)}
                className="w-24 h-8"
                placeholder={t('dashboard.widgets.lowBalanceUsers.threshold.placeholder')}
              />
              <span className="text-sm text-muted-foreground">
                {t('dashboard.widgets.lowBalanceUsers.threshold.currency')}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('dashboard.widgets.lowBalanceUsers.threshold.description')}
            </p>
          </div>
        )}
        
        <div className="text-center py-8">
          <DollarSign className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
            {t('dashboard.widgets.lowBalanceUsers.emptyState.title')}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('dashboard.widgets.lowBalanceUsers.emptyState.description', { 
              threshold: threshold.toFixed(4) 
            })}
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('dashboard.widgets.lowBalanceUsers.emptyState.refresh')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Threshold Settings in Edit Mode */}
      {isEditMode && (
        <div className="p-3 bg-muted/30 rounded-lg border-2 border-dashed border-primary/20">
          <div className="flex items-center space-x-2 mb-3">
            <Settings className="h-4 w-4 text-primary" />
            <Label className="text-sm font-medium">
              {t('dashboard.widgets.lowBalanceUsers.threshold.label')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">€</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1000"
              value={localThreshold}
              onChange={(e) => handleThresholdChange(e.target.value)}
              className="w-24 h-8"
              placeholder={t('dashboard.widgets.lowBalanceUsers.threshold.placeholder')}
            />
            <span className="text-sm text-muted-foreground">
              {t('dashboard.widgets.lowBalanceUsers.threshold.currency')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t('dashboard.widgets.lowBalanceUsers.threshold.description')}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-medium">
            {users.length === 1 
              ? t('dashboard.widgets.lowBalanceUsers.header.userCount', { count: users.length.toString() })
              : t('dashboard.widgets.lowBalanceUsers.header.userCountPlural', { count: users.length.toString() })
            }
          </span>
          <Badge variant="outline" className="text-xs">
            {t('dashboard.widgets.lowBalanceUsers.threshold.below', { 
              amount: threshold.toFixed(4) 
            })}
          </Badge>
        </div>
        <Button
          onClick={handleRefresh}
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Users List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {users.map((user, index) => {
          const severity = getBalanceSeverity(user.balance);
          
          return (
            <div key={user.id}>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <h4 className="text-sm font-medium truncate">{user.name}</h4>
                      {user.companyName && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground truncate">{user.companyName}</span>
                        </>
                      )}
                    </div>
                    <Badge 
                      variant={getBalanceBadgeVariant(severity)} 
                      className="text-xs font-mono flex-shrink-0"
                    >
                      {formatBalance(user.balance)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Mail className="h-3 w-3" />
                      <span className="truncate max-w-32">{user.email}</span>
                    </div>
                    
                    {user.sippyAccountId && (
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>
                          {t('dashboard.widgets.lowBalanceUsers.userInfo.sippyId')} {user.sippyAccountId}
                        </span>
                      </div>
                    )}
                  </div>

                  {user.lastActivity && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('dashboard.widgets.lowBalanceUsers.userInfo.lastActive')} {new Date(user.lastActivity).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <Link href={`/admin/users/${user.id}`} passHref>
                    <Button variant="outline" size="sm" className="h-8">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {t('dashboard.widgets.lowBalanceUsers.userInfo.view')}
                    </Button>
                  </Link>
                </div>
              </div>
              
              {index < users.length - 1 && <Separator className="my-2" />}
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      {users.length > 0 && (
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {t('dashboard.widgets.lowBalanceUsers.footer.totalAffected')} {users.length} {users.length === 1 
                ? t('dashboard.widgets.lowBalanceUsers.footer.user')
                : t('dashboard.widgets.lowBalanceUsers.footer.users')
              }
            </span>
            <span>
              {t('dashboard.widgets.lowBalanceUsers.footer.threshold')} {threshold.toFixed(4)} €
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 