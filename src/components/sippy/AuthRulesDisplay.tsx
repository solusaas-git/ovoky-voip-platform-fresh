'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  AlertCircle, 
  Shield,
  RefreshCw,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { AuthRule } from '@/lib/sippyClient';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface AuthRulesDisplayProps {
  accountId: number;
  isAdmin?: boolean;
}

interface AuthRuleForm {
  i_protocol: number;
  remote_ip: string;
  incoming_cli: string;
  incoming_cld: string;
  to_domain: string;
  from_domain: string;
  cli_translation_rule: string;
  cld_translation_rule: string;
  max_sessions: string;
  max_cps: string;
}

const emptyForm: AuthRuleForm = {
  i_protocol: 1,
  remote_ip: '',
  incoming_cli: '',
  incoming_cld: '',
  to_domain: '',
  from_domain: '',
  cli_translation_rule: '',
  cld_translation_rule: '',
  max_sessions: '',
  max_cps: '',
};

const PROTOCOL_OPTIONS = [
  { value: 1, label: 'SIP' },
  { value: 3, label: 'IAX2' },
  { value: 4, label: 'Calling Card PIN' },
];

export function AuthRulesDisplay({ accountId, isAdmin = false }: AuthRulesDisplayProps) {
  const [authRules, setAuthRules] = useState<AuthRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<AuthRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AuthRuleForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);

  const fetchAuthRules = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sippy/account/${accountId}/auth-rules`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch authentication rules');
      }

      const data = await response.json();
      setAuthRules(data.authrules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load authentication rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accountId) {
      fetchAuthRules();
    }
  }, [accountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // For non-admin users, only require remote_ip
      if (!isAdmin) {
        if (!form.remote_ip) {
          throw new Error('Remote IP address is required');
        }
      } else {
        // For admin users, validate that at least one auth field is provided
        const hasAuthField = form.remote_ip || form.incoming_cli || form.incoming_cld || 
                            form.to_domain || form.from_domain;
        
        if (!hasAuthField) {
          throw new Error('At least one authentication field (IP, CLI, CLD, To Domain, or From Domain) is required');
        }
      }

      const payload: any = {
        i_account: accountId,
        i_protocol: form.i_protocol,
        ...Object.fromEntries(
          Object.entries(form).filter(([key, value]) => 
            key !== 'i_protocol' && value !== ''
          )
        ),
      };

      // Convert capacity values
      if (form.max_sessions) {
        if (form.max_sessions.toLowerCase() === 'unlimited') {
          payload.max_sessions = -1;
        } else {
          const num = parseInt(form.max_sessions);
          if (!isNaN(num) && num > 0) {
            payload.max_sessions = num;
          }
        }
      }

      if (form.max_cps) {
        if (form.max_cps.toLowerCase() !== 'unlimited') {
          const num = parseFloat(form.max_cps);
          if (!isNaN(num) && num > 0) {
            payload.max_cps = num;
          }
        }
      }

      const url = editingRule 
        ? `/api/sippy/account/${accountId}/auth-rules/${editingRule.i_authentication}`
        : `/api/sippy/account/${accountId}/auth-rules`;
      
      const method = editingRule ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule ? { ...payload, i_authentication: editingRule.i_authentication } : payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save authentication rule');
      }

      await fetchAuthRules();
      handleCancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save authentication rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (rule: AuthRule) => {
    // Only allow admins to edit rules
    if (!isAdmin) return;
    
    setEditingRule(rule);
    setForm({
      i_protocol: rule.i_protocol,
      remote_ip: rule.remote_ip || '',
      incoming_cli: rule.incoming_cli || '',
      incoming_cld: rule.incoming_cld || '',
      to_domain: rule.to_domain || '',
      from_domain: rule.from_domain || '',
      cli_translation_rule: rule.cli_translation_rule || '',
      cld_translation_rule: rule.cld_translation_rule || '',
      max_sessions: rule.max_sessions === -1 ? 'unlimited' : (rule.max_sessions?.toString() || ''),
      max_cps: rule.max_cps ? rule.max_cps.toString() : '',
    });
    setShowForm(true);
  };

  const handleDeleteClick = (ruleId: number) => {
    // Only allow admins to delete rules
    if (!isAdmin) return;
    
    setRuleToDelete(ruleId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;

    try {
      setError(null);
      const response = await fetch(`/api/sippy/account/${accountId}/auth-rules/${ruleToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete authentication rule');
      }

      await fetchAuthRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete authentication rule');
    } finally {
      setRuleToDelete(null);
    }
  };

  const handleAddNew = () => {
    setEditingRule(null);
    // For regular users, set default values and only allow remote_ip modification
    if (!isAdmin) {
      setForm({
        ...emptyForm,
        i_protocol: 1, // Default to SIP
        max_sessions: '', // Will default to unlimited
        max_cps: '' // Will default to unlimited
      });
    } else {
      setForm(emptyForm);
    }
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setShowForm(false);
    setError(null);
  };

  const formatValue = (value: any) => {
    if (!value) return '-';
    if (value === -1) return 'Unlimited';
    return value.toString();
  };

  const getProtocolName = (protocol: number) => {
    const option = PROTOCOL_OPTIONS.find(p => p.value === protocol);
    return option ? option.label : `Protocol ${protocol}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading authentication rules...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (authRules.length === 0) {
    return (
      <div className="text-center py-8">
        <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No authentication rules</h3>
        <p className="text-muted-foreground mb-4">
          No authentication rules have been configured for your SIP account.
        </p>
        <div className="flex gap-2 justify-center">
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
          <Button variant="outline" onClick={fetchAuthRules}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Authentication rules control which connections are allowed and capacity limits.
        </p>
        <div className="flex gap-2">
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAuthRules} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Protocol</TableHead>
              <TableHead>Remote IP</TableHead>
              <TableHead>CLI</TableHead>
              <TableHead>CLD</TableHead>
              <TableHead>To Domain</TableHead>
              <TableHead>From Domain</TableHead>
              <TableHead>Max Sessions</TableHead>
              <TableHead>Max CPS</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {authRules.map((rule) => (
              <TableRow key={rule.i_authentication}>
                <TableCell>
                  <Badge variant="outline">
                    {getProtocolName(rule.i_protocol)}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatValue(rule.remote_ip)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatValue(rule.incoming_cli)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatValue(rule.incoming_cld)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatValue(rule.to_domain)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {formatValue(rule.from_domain)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {formatValue(rule.max_sessions)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {formatValue(rule.max_cps)}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => rule.i_authentication && handleDeleteClick(rule.i_authentication)}
                        className="text-red-600 hover:text-red-700"
                        disabled={!rule.i_authentication}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Form for Add/Edit */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingRule 
                ? (isAdmin ? 'Edit Authentication Rule' : 'View Authentication Rule') 
                : (isAdmin ? 'Add Authentication Rule' : 'Add IP Address Rule')
              }
            </CardTitle>
            {!isAdmin && !editingRule && (
              <p className="text-sm text-muted-foreground">
                Add an IP address that should be allowed to connect to your SIP account.
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isAdmin ? (
                /* Admin Form - All Fields */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="protocol">Protocol</Label>
                    <Select
                      value={form.i_protocol.toString()}
                      onValueChange={(value) => setForm({ ...form, i_protocol: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROTOCOL_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="remote_ip">Remote IP</Label>
                    <Input
                      id="remote_ip"
                      value={form.remote_ip}
                      onChange={(e) => setForm({ ...form, remote_ip: e.target.value })}
                      placeholder="e.g. 192.168.1.100"
                    />
                  </div>

                  <div>
                    <Label htmlFor="incoming_cli">Incoming CLI</Label>
                    <Input
                      id="incoming_cli"
                      value={form.incoming_cli}
                      onChange={(e) => setForm({ ...form, incoming_cli: e.target.value })}
                      placeholder="e.g. +1234567890"
                    />
                  </div>

                  <div>
                    <Label htmlFor="incoming_cld">Incoming CLD</Label>
                    <Input
                      id="incoming_cld"
                      value={form.incoming_cld}
                      onChange={(e) => setForm({ ...form, incoming_cld: e.target.value })}
                      placeholder="e.g. +0987654321"
                    />
                  </div>

                  <div>
                    <Label htmlFor="to_domain">To Domain</Label>
                    <Input
                      id="to_domain"
                      value={form.to_domain}
                      onChange={(e) => setForm({ ...form, to_domain: e.target.value })}
                      placeholder="e.g. sip.example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="from_domain">From Domain</Label>
                    <Input
                      id="from_domain"
                      value={form.from_domain}
                      onChange={(e) => setForm({ ...form, from_domain: e.target.value })}
                      placeholder="e.g. voip.example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_sessions">Max Sessions</Label>
                    <Input
                      id="max_sessions"
                      value={form.max_sessions}
                      onChange={(e) => setForm({ ...form, max_sessions: e.target.value })}
                      placeholder="e.g. 10 or unlimited"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max_cps">Max CPS</Label>
                    <Input
                      id="max_cps"
                      value={form.max_cps}
                      onChange={(e) => setForm({ ...form, max_cps: e.target.value })}
                      placeholder="e.g. 5.0"
                    />
                  </div>
                </div>
              ) : (
                /* User Form - Simplified, Remote IP Only */
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="remote_ip">Remote IP Address *</Label>
                    <Input
                      id="remote_ip"
                      value={form.remote_ip}
                      onChange={(e) => setForm({ ...form, remote_ip: e.target.value })}
                      placeholder="e.g. 192.168.1.100"
                      required
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter the IP address that should be allowed to connect to your SIP account.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelEdit}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingRule ? 'Update Rule' : 'Add Rule'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Authentication Rule"
        description="Are you sure you want to delete this authentication rule? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
} 