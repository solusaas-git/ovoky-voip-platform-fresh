'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Shield, Globe, User, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface BlacklistedNumber {
  _id: string;
  phoneNumber: string;
  reason?: string;
  isGlobal: boolean;
  addedBy?: {
    name: string;
    email: string;
    companyName?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export function AdminSmsBlacklist() {
  const { t } = useTranslations();
  const [loading, setLoading] = useState(true);
  const [blacklistedNumbers, setBlacklistedNumbers] = useState<BlacklistedNumber[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForm, setAddForm] = useState({
    phoneNumber: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBlacklistedNumbers();
  }, []);

  const loadBlacklistedNumbers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sms/blacklisted-numbers');
      if (response.ok) {
        const data = await response.json();
        setBlacklistedNumbers(data.blacklistedNumbers || []);
      } else {
        toast.error('Failed to load blacklisted numbers');
      }
    } catch (error) {
      toast.error('Failed to load blacklisted numbers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNumber = async () => {
    if (!addForm.phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/admin/sms/blacklisted-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: addForm.phoneNumber.trim(),
          reason: addForm.reason.trim() || undefined,
          isGlobal: true
        }),
      });

      if (response.ok) {
        toast.success('Number added to blacklist');
        setShowAddDialog(false);
        setAddForm({ phoneNumber: '', reason: '' });
        loadBlacklistedNumbers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add number to blacklist');
      }
    } catch (error) {
      toast.error('Failed to add number to blacklist');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveNumber = async (id: string, phoneNumber: string) => {
    if (!confirm(`Are you sure you want to remove ${phoneNumber} from the blacklist?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sms/blacklisted-numbers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Number removed from blacklist');
        loadBlacklistedNumbers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove number from blacklist');
      }
    } catch (error) {
      toast.error('Failed to remove number from blacklist');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading blacklisted numbers...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Global SMS Blacklist
            </CardTitle>
            <CardDescription>
              Manage globally blacklisted phone numbers across all users
            </CardDescription>
          </div>
          <Button 
            className="flex items-center gap-2"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Add to Blacklist
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {blacklistedNumbers.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground mt-4">No blacklisted numbers</p>
            <p className="text-sm text-muted-foreground mt-2">
              Add phone numbers to prevent SMS delivery globally
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone Number</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blacklistedNumbers.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <div className="font-medium">{item.phoneNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.reason || (
                        <span className="text-muted-foreground">No reason provided</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isGlobal ? 'default' : 'secondary'}>
                      {item.isGlobal ? (
                        <>
                          <Globe className="h-3 w-3 mr-1" />
                          Global
                        </>
                      ) : (
                        <>
                          <User className="h-3 w-3 mr-1" />
                          User
                        </>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {item.addedBy ? (
                        <div>
                          <div className="font-medium">{item.addedBy.name}</div>
                          {item.addedBy.companyName && (
                            <div className="text-muted-foreground">{item.addedBy.companyName}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveNumber(item._id, item.phoneNumber)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Add Number Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Number to Blacklist</DialogTitle>
            <DialogDescription>
              Add a phone number to the global SMS blacklist to prevent message delivery.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+1234567890"
                value={addForm.phoneNumber}
                onChange={(e) => setAddForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Reason for blacklisting this number..."
                value={addForm.reason}
                onChange={(e) => setAddForm(prev => ({ ...prev, reason: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowAddDialog(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddNumber}
              disabled={submitting || !addForm.phoneNumber.trim()}
            >
              {submitting ? 'Adding...' : 'Add to Blacklist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 