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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  AlertCircle, 
  Shield,
  Plus,
  X,
  Save
} from 'lucide-react';
import { AuthRule } from '@/lib/sippyClient';

interface AuthRulesViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
}

const PROTOCOL_OPTIONS = [
  { value: 1, label: 'SIP' },
  { value: 3, label: 'IAX2' },
  { value: 4, label: 'Calling Card PIN' },
];

export function AuthRulesViewModal({ isOpen, onClose, accountId }: AuthRulesViewModalProps) {
  const { t } = useTranslations();
  const [authRules, setAuthRules] = useState<AuthRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remoteIp, setRemoteIp] = useState('');

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
    
    if (!remoteIp.trim()) {
      setError(t('authRules.errors.remoteIpRequired'));
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create auth rule with user defaults
      const authRuleData = {
        i_protocol: 1, // SIP
        remote_ip: remoteIp.trim(),
        incoming_cli: '',
        incoming_cld: '',
        to_domain: '',
        from_domain: '',
        max_sessions: -1 // Unlimited
        // max_cps omitted for unlimited (Sippy API doesn't accept -1 for max_cps)
      };

      const response = await fetch(`/api/sippy/account/${accountId}/auth-rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authRuleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('authRules.errors.createFailed'));
      }

      // Refresh the rules list
      await fetchAuthRules();
      
      // Reset form
      setRemoteIp('');
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authRules.errors.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAdd = () => {
    setRemoteIp('');
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
            <span>{t('authRules.modal.title', { accountId: accountId.toString() })}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Add Rule Form */}
          {showForm && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">{t('authRules.form.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="remote_ip">{t('authRules.form.remoteIp.label')}</Label>
                    <Input
                      id="remote_ip"
                      value={remoteIp}
                      onChange={(e) => setRemoteIp(e.target.value)}
                      placeholder={t('authRules.form.remoteIp.placeholder')}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      {t('authRules.form.remoteIp.description')}
                    </p>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={handleCancelAdd}>
                      <X className="w-4 h-4 mr-2" />
                      {t('authRules.form.actions.cancel')}
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {t('authRules.form.actions.adding')}
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {t('authRules.form.actions.addRule')}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('authRules.table.title')} ({authRules.length})</CardTitle>
                {!showForm && (
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('authRules.actions.addRule')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">{t('authRules.states.loading')}</span>
                </div>
              ) : authRules.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t('authRules.states.noRules.title')}</h3>
                  <p className="text-muted-foreground mb-4">
                    {t('authRules.states.noRules.description')}
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('authRules.states.noRules.addFirst')}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('authRules.table.headers.protocol')}</TableHead>
                        <TableHead>{t('authRules.table.headers.remoteIp')}</TableHead>
                        <TableHead>{t('authRules.table.headers.cli')}</TableHead>
                        <TableHead>{t('authRules.table.headers.cld')}</TableHead>
                        <TableHead>{t('authRules.table.headers.toDomain')}</TableHead>
                        <TableHead>{t('authRules.table.headers.fromDomain')}</TableHead>
                        <TableHead>{t('authRules.table.headers.maxSessions')}</TableHead>
                        <TableHead>{t('authRules.table.headers.maxCps')}</TableHead>
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
            {t('authRules.modal.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 