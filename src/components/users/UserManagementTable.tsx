'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, Trash, Loader2, LogIn, Mail, Calendar, Hash, Shield, User, 
  CheckCircle, MailCheck, MailX, UserPlus, Settings, FileText, UserX, Play,
  Clock, XCircle, Chrome
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { UserEditForm } from './UserEditForm';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AccountActivationModal } from './AccountActivationModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// Mock user type - replace with your actual user type
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  sippyAccountId?: number;
  isEmailVerified: boolean;
  emailVerifiedAt?: string;
  creationMethod: 'signup' | 'admin' | 'google';
  isSuspended?: boolean;
  suspendedAt?: string;
  suspensionReason?: string;
  suspendedBy?: string;
  createdAt: string;
  onboarding?: {
    companyName?: string;
    completed?: boolean;
    completedAt?: string;
    approved?: boolean;
    reviewedBy?: string;
    reviewedAt?: string;
  };
}

interface UserManagementTableProps {
  searchQuery?: string;
  roleFilter?: string;
  onboardingFilter?: string;
}

// Simple Avatar Component
const UserAvatar = ({ name }: { name: string }) => {
  const initials = name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
      {initials}
    </div>
  );
};

export function UserManagementTable({ searchQuery = '', roleFilter = 'all', onboardingFilter = 'all' }: UserManagementTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isImpersonating, setIsImpersonating] = useState<string | null>(null);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [activatingUser, setActivatingUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [isSuspending, setIsSuspending] = useState<string | null>(null);
  const [suspensionForm, setSuspensionForm] = useState<{ userId: string; userName: string; userEmail: string; reason: string } | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  // Function to fetch users
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch users from the API with full onboarding data
      const response = await fetch('/api/users?include_onboarding=true&include_onboarding_status=true');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch users');
      }
      
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (userId: string) => {
    setEditingUserId(userId);
  };

  const handleEditSuccess = () => {
    // Refresh the users list after successful edit
    fetchUsers();
  };

  const handleDelete = async (userId: string) => {
    // Prevent deleting yourself
    if (user?.id === userId) {
      toast.error('You cannot delete your own account');
      return;
    }

    try {
      setIsDeleting(userId);
      
      // Call the API to delete the user
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }
      
      // Remove user from state
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete user');
    } finally {
      setIsDeleting(null);
    }
  };
  
  const handleLoginAs = async (userId: string) => {
    // Prevent impersonating yourself
    if (user?.id === userId) {
      toast.error('You cannot login as yourself');
      return;
    }

    try {
      setIsImpersonating(userId);
      
      // Call the API to impersonate the user
      const response = await fetch('/api/users/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to login as user');
      }
      
      toast.success('Logged in as user');
      
      // Redirect to dashboard
      router.push('/dashboard');
      setTimeout(() => window.location.href = '/dashboard', 500);
    } catch (error) {
      console.error('Error logging in as user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to login as user');
    } finally {
      setIsImpersonating(null);
    }
  };

  const handleActivateAccount = async (userId: string) => {
    const userToActivate = users.find(u => u.id === userId);
    if (!userToActivate) {
      toast.error('User not found');
      return;
    }
    
    setActivatingUser({
      id: userToActivate.id,
      name: userToActivate.name,
      email: userToActivate.email
    });
  };

  const handleVerifyEmail = async (userId: string) => {
    try {
      setIsVerifyingEmail(userId);
      
      const response = await fetch(`/api/admin/users/${userId}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to verify email');
      }
      
      // Update user in the state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, isEmailVerified: true, emailVerifiedAt: new Date().toISOString() }
            : user
        )
      );
      
      toast.success('Email verified successfully');
    } catch (error) {
      console.error('Error verifying email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify email');
    } finally {
      setIsVerifyingEmail(null);
    }
  };

  const handleViewOnboarding = (userId: string) => {
    router.push(`/admin/users/${userId}/onboarding`);
  };

  const handleSuspendUser = (userId: string) => {
    const userToSuspend = users.find(u => u.id === userId);
    if (!userToSuspend) {
      toast.error('User not found');
      return;
    }
    
    setSuspensionForm({
      userId: userToSuspend.id,
      userName: userToSuspend.name,
      userEmail: userToSuspend.email,
      reason: ''
    });
  };

  const handleUnsuspendUser = async (userId: string) => {
    try {
      setIsSuspending(userId);
      
      const response = await fetch(`/api/admin/users/${userId}/unsuspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unsuspend user');
      }
      
      // Update user in the state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, isSuspended: false, suspendedAt: undefined, suspensionReason: undefined, suspendedBy: undefined }
            : user
        )
      );
      
      toast.success('User unsuspended successfully');
    } catch (error) {
      console.error('Error unsuspending user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to unsuspend user');
    } finally {
      setIsSuspending(null);
    }
  };

  const performSuspension = async (reason: string) => {
    if (!suspensionForm) return;
    
    try {
      setIsSuspending(suspensionForm.userId);
      
      const response = await fetch(`/api/admin/users/${suspensionForm.userId}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to suspend user');
      }
      
      await response.json();
      
      // Update user in the state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === suspensionForm.userId 
            ? { 
                ...user, 
                isSuspended: true, 
                suspendedAt: new Date().toISOString(),
                suspensionReason: reason,
                suspendedBy: user?.name || 'Admin'
              }
            : user
        )
      );
      
      toast.success('User suspended successfully');
      setSuspensionForm(null);
    } catch (error) {
      console.error('Error suspending user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to suspend user');
    } finally {
      setIsSuspending(null);
    }
  };

  const performActivation = async (sippyAccountId: number) => {
    if (!activatingUser) return;
    
    try {
      // Call the API to activate the account
      const response = await fetch(`/api/users/${activatingUser.id}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sippyAccountId }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to activate account');
      }
      
      const result = await response.json();
      
      if (result.emailError) {
        toast.warning('Account activated but failed to send notification email');
      } else {
        toast.success('Account activated and notification email sent');
      }
      
      // Refresh the users list
      fetchUsers();
    } catch (error) {
      console.error('Error activating account:', error);
      throw error; // Re-throw to be handled by the modal
    }
  };

  const getOnboardingStatus = (user: User) => {
    const onboarding = user.onboarding;
    
    // If no onboarding data exists
    if (!onboarding) {
      return {
        label: 'Not Started',
        variant: 'outline' as const,
        icon: Clock,
        color: 'text-gray-600',
        description: 'User hasn\'t filled onboarding form'
      };
    }
    
    // If onboarding is completed but not yet reviewed
    if (onboarding.completed && onboarding.approved === undefined) {
      return {
        label: 'Pending Review',
        variant: 'secondary' as const,
        icon: Clock,
        color: 'text-amber-600',
        description: 'Form submitted, awaiting admin review'
      };
    }
    
    // If onboarding is approved
    if (onboarding.completed && onboarding.approved === true) {
      return {
        label: 'Approved',
        variant: 'default' as const,
        icon: CheckCircle,
        color: 'text-green-600',
        description: 'Onboarding approved by admin'
      };
    }
    
    // If onboarding is rejected
    if (onboarding.completed && onboarding.approved === false) {
      return {
        label: 'Rejected',
        variant: 'destructive' as const,
        icon: XCircle,
        color: 'text-red-600',
        description: 'Onboarding rejected, needs revision'
      };
    }
    
    // If onboarding exists but not completed (partial data)
    return {
      label: 'In Progress',
      variant: 'outline' as const,
      icon: Play,
      color: 'text-blue-600',
      description: 'Form partially filled'
    };
  };

  // Filter users based on search query, role filter, and onboarding status
  const filteredUsers = users.filter((user) => {
    const matchesSearch = !searchQuery || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.onboarding?.companyName && user.onboarding.companyName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    // Get onboarding status for filtering
    const onboardingStatus = getOnboardingStatus(user);
    let matchesOnboarding = true;
    
    if (onboardingFilter !== 'all') {
      switch (onboardingFilter) {
        case 'not_started':
          matchesOnboarding = onboardingStatus.label === 'Not Started';
          break;
        case 'in_progress':
          matchesOnboarding = onboardingStatus.label === 'In Progress';
          break;
        case 'pending_review':
          matchesOnboarding = onboardingStatus.label === 'Pending Review';
          break;
        case 'approved':
          matchesOnboarding = onboardingStatus.label === 'Approved';
          break;
        case 'rejected':
          matchesOnboarding = onboardingStatus.label === 'Rejected';
          break;
        default:
          matchesOnboarding = true;
      }
    }
    
    return matchesSearch && matchesRole && matchesOnboarding;
  });

  const getRoleBadgeVariant = (role: string) => {
    return role === 'admin' ? 'default' : 'secondary';
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? Shield : User;
  };

  const formatDateDetailed = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      relative: getRelativeTime(date)
    };
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths}mo ago`;
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>User</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Email Status</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Created Via</TableHead>
              <TableHead>Sippy Account</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-12">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="p-4 bg-muted rounded-full">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-lg font-medium">No users found</p>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery || roleFilter !== 'all' || onboardingFilter !== 'all'
                          ? 'Try adjusting your search or filter criteria'
                          : 'Get started by adding your first user'
                        }
                      </p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const dateInfo = formatDateDetailed(user.createdAt);
                const RoleIcon = getRoleIcon(user.role);
                
                return (
                  <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <UserAvatar name={user.name} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium leading-none">{user.name}</div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Mail className="mr-1 h-3 w-3" />
                          {user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.onboarding?.companyName || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} className="flex items-center w-fit">
                        <RoleIcon className="mr-1 h-3 w-3" />
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isSuspended ? (
                        <div className="space-y-1">
                          <Badge variant="destructive" className="flex items-center w-fit">
                            <UserX className="mr-1 h-3 w-3" />
                            Suspended
                          </Badge>
                          {user.suspensionReason && (
                            <div className="text-xs text-muted-foreground max-w-[150px] truncate" title={user.suspensionReason}>
                              {user.suspensionReason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="default" className="flex items-center w-fit">
                          <CheckCircle className="mr-1 h-3 w-3 text-green-600" />
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isEmailVerified ? (
                        <Badge variant="default" className="flex items-center w-fit">
                          <CheckCircle className="mr-1 h-3 w-3 text-green-600" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="flex items-center w-fit">
                          <MailX className="mr-1 h-3 w-3" />
                          Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const onboardingStatus = getOnboardingStatus(user);
                        const StatusIcon = onboardingStatus.icon;
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <Badge variant={onboardingStatus.variant} className="flex items-center w-fit">
                                  <StatusIcon className={`mr-1 h-3 w-3 ${onboardingStatus.color}`} />
                                  {onboardingStatus.label}
                                </Badge>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{onboardingStatus.description}</p>
                              {user.onboarding?.completedAt && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Completed: {new Date(user.onboarding.completedAt).toLocaleDateString()}
                                </p>
                              )}
                              {user.onboarding?.reviewedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Reviewed: {new Date(user.onboarding.reviewedAt).toLocaleDateString()}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      {user.creationMethod === 'signup' ? (
                        <Badge variant="secondary" className="flex items-center w-fit">
                          <UserPlus className="mr-1 h-3 w-3" />
                          Signup
                        </Badge>
                      ) : user.creationMethod === 'google' ? (
                        <Badge variant="outline" className="flex items-center w-fit">
                          <Chrome className="mr-1 h-3 w-3" />
                          Google
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center w-fit">
                          <Settings className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.sippyAccountId ? (
                        <div className="flex items-center text-sm">
                          <Hash className="mr-1 h-3 w-3 text-muted-foreground" />
                          {user.sippyAccountId}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
                          {dateInfo.date}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dateInfo.relative}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {/* Manual Email Verification Button - only show for unverified emails */}
                        {!user.isEmailVerified && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVerifyEmail(user.id)}
                                className="mr-1"
                                disabled={isVerifyingEmail === user.id}
                              >
                                {isVerifyingEmail === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MailCheck className="h-4 w-4 text-blue-600" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Manually verify email</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {/* Activate Account Button - only show for users without Sippy Account ID */}
                        {!user.sippyAccountId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleActivateAccount(user.id)}
                                className="mr-1"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Activate account with Sippy ID</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {/* View Onboarding Button - show for all users */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewOnboarding(user.id)}
                              className="mr-1"
                            >
                              <FileText className="h-4 w-4 text-purple-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View onboarding details</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoginAs(user.id)}
                              className="mr-1"
                              disabled={isImpersonating === user.id}
                            >
                              {isImpersonating === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <LogIn className="h-4 w-4 text-blue-600" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Login as this user</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        {/* Suspend/Unsuspend Button */}
                        {user.isSuspended ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnsuspendUser(user.id)}
                                className="mr-1"
                                disabled={isSuspending === user.id}
                              >
                                {isSuspending === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Play className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Unsuspend user</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSuspendUser(user.id)}
                                className="mr-1"
                                disabled={isSuspending === user.id}
                              >
                                <UserX className="h-4 w-4 text-orange-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Suspend user</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user.id)}
                              className="mr-1"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit user</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              disabled={isDeleting === user.id}
                            >
                              {isDeleting === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete user</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* User Edit Dialog */}
      {editingUserId && (
        <UserEditForm
          isOpen={!!editingUserId}
          onClose={() => setEditingUserId(null)}
          userId={editingUserId}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Account Activation Modal */}
      {activatingUser && (
        <AccountActivationModal
          isOpen={!!activatingUser}
          onClose={() => setActivatingUser(null)}
          onActivate={performActivation}
          userName={activatingUser.name}
          userEmail={activatingUser.email}
        />
      )}

      {/* Suspension Modal */}
      {suspensionForm && (
        <Dialog open={!!suspensionForm} onOpenChange={() => setSuspensionForm(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-orange-600" />
                Suspend User Account
              </DialogTitle>
              <DialogDescription>
                This will prevent {suspensionForm.userName} ({suspensionForm.userEmail}) from accessing their account. 
                Please provide a reason for the suspension.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="suspension-reason">Suspension Reason</Label>
                <Textarea
                  id="suspension-reason"
                  placeholder="Enter the reason for suspending this user account..."
                  value={suspensionForm.reason}
                  onChange={(e) => setSuspensionForm(prev => prev ? { ...prev, reason: e.target.value } : null)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setSuspensionForm(null)}
                disabled={isSuspending === suspensionForm.userId}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => performSuspension(suspensionForm.reason)}
                disabled={isSuspending === suspensionForm.userId || !suspensionForm.reason.trim()}
              >
                {isSuspending === suspensionForm.userId ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Suspending...
                  </>
                ) : (
                  <>
                    <UserX className="mr-2 h-4 w-4" />
                    Suspend User
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
} 