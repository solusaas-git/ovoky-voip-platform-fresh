'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/AuthContext';
import { useTranslations } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Users, 
  UserPlus, 
  UserMinus, 
  Loader2,
  // CheckCircle, // Unused
  // XCircle, // Unused
  // AlertCircle, // Unused
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  sippyAccountId?: number;
  createdAt: string;
}

interface AssignedUser extends User {
  userId: string;
  assignedBy: string;
  assignedAt: string;
}

interface RateDeck {
  id: string;
  name: string;
  description: string;
}

interface UserAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rateDeck: RateDeck | null;
  rateDeckType: 'number' | 'sms';
  onAssignmentComplete: () => void;
}

export function UserAssignmentDialog({
  open,
  onOpenChange,
  rateDeck,
  rateDeckType,
  onAssignmentComplete,
}: UserAssignmentDialogProps) {
  const { t } = useTranslations();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('assign');
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Available users state
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  // Assigned users state
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [assignedUsersLoading, setAssignedUsersLoading] = useState(false);

  // Fetch available users
  const fetchAvailableUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search: userSearch,
        role: userRoleFilter,
        limit: '100',
      });

      console.log('Fetching available users with params:', params.toString());
      const response = await fetch(`/api/users?${params}`);
      console.log('Users API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Users API Error Response:', errorText);
        throw new Error(`Failed to fetch users: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Available users data:', data);
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to fetch users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch assigned users
  const fetchAssignedUsers = async () => {
    if (!rateDeck) return;
    
    try {
      setAssignedUsersLoading(true);
      console.log('Fetching assigned users for:', rateDeck.id, rateDeckType);
      
      const apiPath = rateDeckType === 'number' ? 'numbers' : 'sms';
      const response = await fetch(`/api/rates/${apiPath}/decks/${rateDeck.id}/assignments`);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch assigned users: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('Assigned users data:', data);
      setAssignedUsers(data.assignedUsers || []);
    } catch (error) {
      console.error('Error fetching assigned users:', error);
      toast.error(`Failed to fetch assigned users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAssignedUsersLoading(false);
    }
  };

  // Filter users based on search and role
  useEffect(() => {
    let filtered = availableUsers;

    if (userSearch) {
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearch.toLowerCase())
      );
    }

    if (userRoleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === userRoleFilter);
    }

    // Exclude already assigned users to this rate deck
    const assignedUserIds = assignedUsers.map(u => u.userId);
    filtered = filtered.filter(user => !assignedUserIds.includes(user.id));

    setFilteredUsers(filtered);
  }, [availableUsers, userSearch, userRoleFilter, assignedUsers]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open && rateDeck) {
      console.log('Dialog opened with rate deck:', rateDeck);
      console.log('Current user:', user);
      
      if (!user) {
        toast.error('You must be logged in to assign users');
        return;
      }
      
      if (user.role !== 'admin') {
        toast.error('You must be an admin to assign users');
        return;
      }
      
      fetchAvailableUsers();
      fetchAssignedUsers();
      setSelectedUserIds([]);
      setUserSearch('');
      setUserRoleFilter('all');
      setActiveTab('assign');
    }
  }, [open, rateDeck, user]);

  // Handle user selection
  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds(prev => [...prev, userId]);
    } else {
      setSelectedUserIds(prev => prev.filter(id => id !== userId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(filteredUsers.map(user => user.id));
    } else {
      setSelectedUserIds([]);
    }
  };

  // Assign users
  const handleAssignUsers = async () => {
    if (!rateDeck || selectedUserIds.length === 0) return;

    try {
      setIsAssigning(true);
      const apiPath = rateDeckType === 'number' ? 'numbers' : 'sms';
      const response = await fetch(`/api/rates/${apiPath}/decks/${rateDeck.id}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to assign users');
      }

      const result = await response.json();
      
      // Show detailed feedback based on results
      if (result.results) {
        const { assigned, alreadyAssigned, errors } = result.results;
        
        if (assigned.length > 0) {
          toast.success(`Successfully assigned ${assigned.length} user${assigned.length !== 1 ? 's' : ''}`);
        }
        
        if (alreadyAssigned.length > 0) {
          toast.info(`${alreadyAssigned.length} user${alreadyAssigned.length !== 1 ? 's were' : ' was'} already assigned`);
        }
        
        if (errors.length > 0) {
          errors.forEach((error: { name?: string; email?: string; error: string }) => {
            toast.error(`${error.name || error.email}: ${error.error}`, {
              duration: 6000, // Longer duration for error messages
            });
          });
        }
      } else {
        toast.success(result.message);
      }

      // Refresh data
      setSelectedUserIds([]);
      await Promise.all([fetchAvailableUsers(), fetchAssignedUsers()]);
      setActiveTab('assigned');
      onAssignmentComplete();
    } catch (error) {
      console.error('Error assigning users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign users';
      toast.error(errorMessage);
    } finally {
      setIsAssigning(false);
    }
  };

  // Remove user assignment
  const handleRemoveUser = async (userId: string) => {
    if (!rateDeck) return;

    try {
      const apiPath = rateDeckType === 'number' ? 'numbers' : 'sms';
      const response = await fetch(`/api/rates/${apiPath}/decks/${rateDeck.id}/assignments/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to remove user assignment');
      }

      toast.success('User assignment removed successfully');
      
      // Refresh data
      await Promise.all([fetchAvailableUsers(), fetchAssignedUsers()]);
      onAssignmentComplete();
    } catch (error) {
      console.error('Error removing user assignment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove user assignment';
      toast.error(errorMessage);
    }
  };

  if (!rateDeck) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assign Users to Rate Deck
          </DialogTitle>
          <DialogDescription>
            Manage user assignments for the rate deck "{rateDeck.name}". Users assigned to this deck will use these rates for {rateDeckType} services.
            <br />
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              Note: Each user can only be assigned to one {rateDeckType} rate deck at a time.
            </span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assign" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Assign Users
            </TabsTrigger>
            <TabsTrigger value="assigned" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Assigned Users ({assignedUsers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="flex-1 flex flex-col overflow-hidden space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="user-search">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="user-search"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-40">
                <Label htmlFor="role-filter">Role</Label>
                <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Users Table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length}
                        onCheckedChange={handleSelectAll}
                        disabled={filteredUsers.length === 0}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sippy Account</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('rates.common.states.loading')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {userSearch || userRoleFilter !== 'all' 
                          ? 'No users found matching your criteria'
                          : 'No available users to assign'
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={(checked) => handleUserSelect(user.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.sippyAccountId ? `#${user.sippyAccountId}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Assignment Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
              </div>
              <Button
                onClick={handleAssignUsers}
                disabled={selectedUserIds.length === 0 || isAssigning}
                className="gap-2"
              >
                {isAssigning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                Assign Selected Users
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="assigned" className="flex-1 flex flex-col overflow-hidden space-y-4">
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned By</TableHead>
                    <TableHead>Assigned At</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedUsersLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t('rates.common.states.loading')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : assignedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No users assigned to this rate deck
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.assignedBy}</TableCell>
                        <TableCell>
                          {new Date(user.assignedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveUser(user.userId)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            title="Remove Assignment"
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 