'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Edit, Trash2, MessageSquare, Calendar, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { TemplateMessageEditor } from './TemplateMessageEditor';

interface SmsTemplate {
  _id: string;
  name: string;
  description?: string;
  message: string;
  variables: string[];
  category?: string;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  name: string;
  description: string;
  message: string;
  category: string;
}

const TEMPLATE_CATEGORIES = [
  'marketing',
  'notification',
  'reminder',
  'welcome',
  'promotional',
  'support',
  'other'
];

export function SmsTemplates() {
  const { t } = useTranslations();
  const [templates, setTemplates] = useState<SmsTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    message: '',
    category: ''
  });

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sms/templates');
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates);
      } else {
        toast.error(t('sms.common.messages.error'), {
          description: 'Failed to load templates'
        });
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to load templates'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name.trim() || !formData.message.trim()) {
      toast.error(t('sms.common.validation.required'), {
        description: 'Template name and message are required'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sms/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          message: formData.message.trim(),
          category: formData.category || undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('sms.common.messages.success'), {
          description: 'Template created successfully'
        });
        setIsCreateDialogOpen(false);
        resetForm();
        loadTemplates();
      } else {
        toast.error(t('sms.common.messages.error'), {
          description: data.error || 'Failed to create template'
        });
      }
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to create template'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTemplate = async () => {
    if (!editingTemplate || !formData.name.trim() || !formData.message.trim()) {
      toast.error(t('sms.common.validation.required'), {
        description: 'Template name and message are required'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/sms/templates/${editingTemplate._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          message: formData.message.trim(),
          category: formData.category || undefined
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('sms.common.messages.success'), {
          description: 'Template updated successfully'
        });
        setIsEditDialogOpen(false);
        setEditingTemplate(null);
        resetForm();
        loadTemplates();
      } else {
        toast.error(t('sms.common.messages.error'), {
          description: data.error || 'Failed to update template'
        });
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to update template'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTemplate = async (template: SmsTemplate) => {
    if (!confirm(t('sms.common.messages.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/sms/templates/${template._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('sms.common.messages.success'), {
          description: 'Template deleted successfully'
        });
        loadTemplates();
      } else {
        toast.error(t('sms.common.messages.error'), {
          description: data.error || 'Failed to delete template'
        });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error(t('sms.common.messages.error'), {
        description: 'Failed to delete template'
      });
    }
  };

  const openEditDialog = (template: SmsTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      message: template.message,
      category: template.category || ''
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      message: '',
      category: ''
    });
  };

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      marketing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      notification: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      reminder: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      welcome: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      promotional: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      support: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    };
    return colors[category || 'other'] || colors.other;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('sms.templates.title')}</h2>
          <p className="text-muted-foreground">{t('sms.templates.description')}</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-4">{t('sms.common.messages.loading')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('sms.templates.title')}</h2>
        <p className="text-muted-foreground">{t('sms.templates.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('sms.templates.list.title')}
              </CardTitle>
              <CardDescription>
                {templates.length > 0 
                  ? `${templates.length} ${templates.length === 1 ? t('sms.templates.list.available.single') : t('sms.templates.list.available.multiple')}`
                  : t('sms.templates.description')
                }
              </CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t('sms.templates.list.create')}
                </Button>
              </DialogTrigger>
              <DialogContent style={{ width: '50vw', maxWidth: '50vw' }}>
                <DialogHeader>
                  <DialogTitle>{t('sms.templates.dialogs.create.title')}</DialogTitle>
                  <DialogDescription>
                    {t('sms.templates.dialogs.create.description')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('sms.templates.form.name.label')}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={t('sms.templates.form.name.placeholder')}
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">{t('sms.templates.form.category.label')}</Label>
                      <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('sms.templates.form.category.placeholder')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t('sms.templates.categories.none')}</SelectItem>
                          {TEMPLATE_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {t(`sms.templates.categories.${category}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('sms.templates.form.description.label')} (optional)</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={t('sms.templates.form.description.placeholder')}
                      maxLength={500}
                    />
                  </div>
                  <TemplateMessageEditor
                    value={formData.message}
                    onChange={(value) => setFormData({ ...formData, message: value })}
                    placeholder={t('sms.templates.form.message.placeholder')}
                    maxLength={1600}
                  />
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        resetForm();
                      }}
                    >
                      {t('sms.common.buttons.cancel')}
                    </Button>
                    <Button 
                      onClick={handleCreateTemplate}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t('sms.common.messages.saving') : t('sms.common.buttons.create')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">{t('sms.templates.list.empty')}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {t('sms.templates.list.emptySubtext')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('sms.templates.list.columns.name')}</TableHead>
                  <TableHead>{t('sms.templates.list.columns.category')}</TableHead>
                  <TableHead>{t('sms.templates.list.columns.variables')}</TableHead>
                  <TableHead>{t('sms.templates.list.columns.used')}</TableHead>
                  <TableHead>{t('sms.templates.list.columns.created')}</TableHead>
                  <TableHead>{t('sms.common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">{template.description}</div>
                        )}
                      </div>
                    </TableCell>
                                         <TableCell>
                       {template.category ? (
                         <Badge variant="secondary" className={getCategoryColor(template.category)}>
                           {t(`sms.templates.categories.${template.category}`)}
                         </Badge>
                       ) : (
                         <span className="text-muted-foreground">-</span>
                       )}
                     </TableCell>
                    <TableCell>
                      {template.variables.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {template.variables.slice(0, 3).map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                          {template.variables.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.variables.length - 3}
                            </Badge>
                          )}
                        </div>
                                             ) : (
                         <span className="text-muted-foreground">{t('sms.templates.editor.none')}</span>
                       )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {template.usageCount}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(template.createdAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTemplate(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent style={{ width: '50vw', maxWidth: '50vw' }}>
          <DialogHeader>
            <DialogTitle>{t('sms.templates.dialogs.edit.title')}</DialogTitle>
            <DialogDescription>
              {t('sms.templates.dialogs.edit.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">{t('sms.templates.form.name.label')}</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('sms.templates.form.name.placeholder')}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">{t('sms.templates.form.category.label')}</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value === 'none' ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('sms.templates.form.category.placeholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('sms.templates.categories.none')}</SelectItem>
                    {TEMPLATE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {t(`sms.templates.categories.${category}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
                         <div className="space-y-2">
               <Label htmlFor="edit-description">{t('sms.templates.form.description.label')} (optional)</Label>
               <Input
                 id="edit-description"
                 value={formData.description}
                 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                 placeholder={t('sms.templates.form.description.placeholder')}
                 maxLength={500}
               />
             </div>
                         <TemplateMessageEditor
               value={formData.message}
               onChange={(value) => setFormData({ ...formData, message: value })}
               placeholder={t('sms.templates.form.message.placeholder')}
               maxLength={1600}
             />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingTemplate(null);
                  resetForm();
                }}
              >
                {t('sms.common.buttons.cancel')}
              </Button>
              <Button 
                onClick={handleEditTemplate}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('sms.common.messages.saving') : t('sms.common.buttons.update')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 