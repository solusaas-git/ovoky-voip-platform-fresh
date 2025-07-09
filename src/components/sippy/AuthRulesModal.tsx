'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  Shield,
  Save,
  X
} from 'lucide-react';
import { AuthRule } from '@/lib/sippyClient';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface AuthRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
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

const PROTOCOL_OPTIONS = [
  { value: 1, label: 'SIP' },
  { value: 3, label: 'IAX2' },
  { value: 4, label: 'Calling Card PIN' },
];

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

export function AuthRulesModal({ isOpen, onClose, accountId }: AuthRulesModalProps) {
  const { t } = useTranslations();
  const [authRules, setAuthRules] = useState<AuthRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<AuthRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AuthRuleForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && accountId) {
      fetchAuthRules();
    }
  }, [isOpen, accountId]);

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
      setError(err instanceof Error ? err.message : t('authRules.errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Validate that at least one auth field is provided
      const hasAuthField = form.remote_ip || form.incoming_cli || form.incoming_cld || 
                          form.to_domain || form.from_domain;
      
      if (!hasAuthField) {
        throw new Error('At least one authentication field (IP, CLI, CLD, To Domain, or From Domain) is required');
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

  const handleCancelEdit = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setShowForm(false);
    setError(null);
  };

  const formatValue = (value: any) => {
    if (!value) return '-';
    if (value === -1) return t('authRules.states.unlimited');
    return value.toString();
  };

  const getProtocolName = (protocol: number) => {
    const protocolMap: { [key: number]: string } = {
      1: t('authRules.protocols.sip'),
      3: t('authRules.protocols.iax2'),
      4: t('authRules.protocols.callingCard'),
    };
    return protocolMap[protocol] || `Protocol ${protocol}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[60vw] sm:max-w-[60vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <span>Authentication Rules - Account #{accountId}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingRule ? 'Edit Authentication Rule' : 'Add Authentication Rule'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="protocol">Protocol *</Label>
                      <Select
                        value={form.i_protocol.toString()}
                        onValueChange={(value) => setForm(prev => ({ ...prev, i_protocol: parseInt(value) }))}
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

                    <div className="space-y-2">
                      <Label htmlFor="remote_ip">Remote IP</Label>
                      <Input
                        id="remote_ip"
                        value={form.remote_ip}
                        onChange={(e) => setForm(prev => ({ ...prev, remote_ip: e.target.value }))}
                        placeholder="e.g., 192.168.1.100"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="incoming_cli">Incoming CLI</Label>
                      <Input
                        id="incoming_cli"
                        value={form.incoming_cli}
                        onChange={(e) => setForm(prev => ({ ...prev, incoming_cli: e.target.value }))}
                        placeholder="e.g., +1234567890"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="incoming_cld">Incoming CLD</Label>
                      <Input
                        id="incoming_cld"
                        value={form.incoming_cld}
                        onChange={(e) => setForm(prev => ({ ...prev, incoming_cld: e.target.value }))}
                        placeholder="e.g., +0987654321"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="to_domain">To Domain</Label>
                      <Input
                        id="to_domain"
                        value={form.to_domain}
                        onChange={(e) => setForm(prev => ({ ...prev, to_domain: e.target.value }))}
                        placeholder="e.g., sip.example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="from_domain">From Domain</Label>
                      <Input
                        id="from_domain"
                        value={form.from_domain}
                        onChange={(e) => setForm(prev => ({ ...prev, from_domain: e.target.value }))}
                        placeholder="e.g., sip.example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_sessions">Max Sessions</Label>
                      <Input
                        id="max_sessions"
                        value={form.max_sessions}
                        onChange={(e) => setForm(prev => ({ ...prev, max_sessions: e.target.value }))}
                        placeholder="e.g., 100 or unlimited"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_cps">Max CPS</Label>
                      <Input
                        id="max_cps"
                        value={form.max_cps}
                        onChange={(e) => setForm(prev => ({ ...prev, max_cps: e.target.value }))}
                        placeholder="e.g., 10.0 or unlimited"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleCancelEdit}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {editingRule ? 'Update' : 'Create'} Rule
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Rules Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Authentication Rules ({authRules.length})</CardTitle>
                {!showForm && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Rule
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading authentication rules...</span>
                </div>
              ) : authRules.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No authentication rules</h3>
                  <p className="text-muted-foreground mb-4">
                    No authentication rules have been configured for this account.
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Rule
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Protocol</TableHead>
                        <TableHead>Remote IP</TableHead>
                        <TableHead>CLI</TableHead>
                        <TableHead>CLD</TableHead>
                        <TableHead>Max Sessions</TableHead>
                        <TableHead>Max CPS</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(rule)}
                                disabled={showForm}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(rule.i_authentication!)}
                                disabled={showForm}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
      
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
    </Dialog>
  );
} 