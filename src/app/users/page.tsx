'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, UserCheck, Shield, Search, Plus, Filter } from 'lucide-react';
import { UserManagementTable } from '@/components/users/UserManagementTable';
import { UserForm } from '@/components/users/UserForm';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserStats {
  total: number;
  admins: number;
  clients: number;
  recentlyCreated: number;
}

export default function UsersPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [onboardingFilter, setOnboardingFilter] = useState('all');
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    admins: 0,
    clients: 0,
    recentlyCreated: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  // Redirect non-admin users
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  // Fetch user statistics
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUserStats();
    }
  }, [user, refreshKey]);

  const fetchUserStats = async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetch('/api/users/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Handle user creation success
  const handleUserCreated = () => {
    // Increment refresh key to trigger a re-fetch in the table
    setRefreshKey(prev => prev + 1);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setOnboardingFilter('all');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Only render content for admin users
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts, roles, and permissions
            </p>
          </div>
          <UserForm onSuccess={handleUserCreated} />
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  stats.total
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                All registered users
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administrators</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  stats.admins
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Users with admin access
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  stats.clients
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Regular user accounts
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recently Added</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  stats.recentlyCreated
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Created in last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>All Users</span>
              {(searchQuery || roleFilter !== 'all' || onboardingFilter !== 'all') && (
                <Badge variant="secondary" className="ml-2">
                  Filtered
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Search and manage all user accounts in the system
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users by name, email, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admins</SelectItem>
                    <SelectItem value="client">Clients</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Onboarding status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="not_started">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                
                {(searchQuery || roleFilter !== 'all' || onboardingFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* User Management Table */}
            <UserManagementTable 
              key={refreshKey} 
              searchQuery={searchQuery}
              roleFilter={roleFilter}
              onboardingFilter={onboardingFilter}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
} 