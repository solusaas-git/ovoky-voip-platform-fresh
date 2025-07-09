'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, Bell, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { UserNotificationSettingsComponent } from './UserNotificationSettings';
import { UserRateDecks } from './UserRateDecks';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
  sippyAccountId?: number;
}

interface UserEditFormProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export function UserEditForm({ isOpen, onClose, userId, onSuccess }: UserEditFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    sippyAccountId: '',
  });

  // Fetch user data when the dialog opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchUserData();
    }
  }, [isOpen, userId]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user');
      }
      
      const data = await response.json();
      
      setFormData({
        name: data.user.name,
        email: data.user.email,
        password: '', // Don't populate password field for security
        role: data.user.role,
        sippyAccountId: data.user.sippyAccountId?.toString() || '',
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load user details');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      // Basic validation
      if (!formData.name || !formData.email || !formData.role) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      // Prepare the update data
      const updateData: {
        name: string;
        email: string;
        role: string;
        password?: string;
        sippyAccountId?: number | null;
      } = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
      };
      
      // Only include password if it was changed
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      // Handle sippyAccountId - always include it so it can be cleared
      if (formData.sippyAccountId.trim() === '') {
        // If the field is empty, explicitly set to null to clear it
        updateData.sippyAccountId = null;
      } else {
        // If the field has a value, parse it as an integer
        const parsedId = parseInt(formData.sippyAccountId);
        if (!isNaN(parsedId)) {
          updateData.sippyAccountId = parsedId;
        } else {
          toast.error('Sippy Account ID must be a valid number');
          return;
        }
      }
      
      // Call API to update user
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }
      
      // Show success message
      toast.success('User updated successfully');
      
      // Close dialog and refresh data
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details and notification preferences
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>User Details</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center space-x-2">
                  <Bell className="h-4 w-4" />
                  <span>Notifications</span>
                </TabsTrigger>
                <TabsTrigger value="ratedecks" className="flex items-center space-x-2">
                  <Hash className="h-4 w-4" />
                  <span>Rate Decks</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-6 overflow-y-auto max-h-[400px]">
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="col-span-3"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="password" className="text-right">
                        Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="col-span-3"
                        placeholder="Leave blank to keep unchanged"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role" className="text-right">
                        Role
                      </Label>
                      <Select
                        value={formData.role}
                        onValueChange={handleRoleChange}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="sippyAccountId" className="text-right">
                        Sippy ID
                      </Label>
                      <Input
                        id="sippyAccountId"
                        name="sippyAccountId"
                        type="number"
                        value={formData.sippyAccountId}
                        onChange={handleChange}
                        className="col-span-3"
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="notifications" className="mt-6 overflow-y-auto max-h-[400px]">
                <UserNotificationSettingsComponent
                  userId={userId}
                  userName={formData.name}
                  userEmail={formData.email}
                />
              </TabsContent>
              
              <TabsContent value="ratedecks" className="mt-6 overflow-y-auto max-h-[400px]">
                <UserRateDecks userId={userId} />
              </TabsContent>
            </Tabs>
          </div>
        )}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {activeTab === 'details' && (
            <Button 
              type="button" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Updating...' : 'Update User'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 