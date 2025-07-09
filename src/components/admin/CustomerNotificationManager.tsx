'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Calendar, 
  Mail, 
  MessageSquare, 
  Smartphone,
  Eye,
  Play,
  Pause,
  BarChart3,
  Search,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  CustomerNotificationTemplate, 
  ScheduledCustomerNotification, 
  CustomerNotificationType,
  DeliveryChannel,
  NotificationPriority,
  ScheduleStatus
} from '@/types/notifications';

interface CustomerNotificationManagerProps {
  // Component has no props currently
}

export function CustomerNotificationManager({}: CustomerNotificationManagerProps) {
  const [templates, setTemplates] = useState<CustomerNotificationTemplate[]>([]);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledCustomerNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('templates');
  
  // Template form state
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CustomerNotificationTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    type: 'service_update' as CustomerNotificationType,
    subject: '',
    content: {
      html: '',
      text: '',
      pushTitle: '',
      pushBody: '',
      smsContent: ''
    },
    channels: ['email'] as DeliveryChannel[],
    priority: 'medium' as NotificationPriority,
    category: 'general',
    isActive: true
  });

  // Scheduled notification form state
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    description: '',
    templateId: '',
    schedule: {
      type: 'immediate' as 'immediate' | 'scheduled' | 'recurring',
      scheduledAt: '',
      timezone: 'UTC'
    },
    targetUsers: {
      type: 'all' as 'all' | 'role' | 'specific' | 'filter'
    },
    channels: ['email'] as DeliveryChannel[]
  });

  // Filters
  const [templateFilter, setTemplateFilter] = useState({
    search: '',
    type: '',
    category: '',
    isActive: ''
  });

  const [notificationFilter, setNotificationFilter] = useState({
    search: '',
    status: '',
    templateId: ''
  });

  // Instant messaging state
  const [instantMessageForm, setInstantMessageForm] = useState({
    title: '',
    message: '',
    targetUsers: {
      type: 'all' as 'all' | 'specific',
      userIds: [] as string[]
    },
    priority: 'medium' as NotificationPriority,
    channels: ['push', 'in_app'] as DeliveryChannel[]
  });
  const [isSendingInstant, setIsSendingInstant] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchTemplates(),
        fetchScheduledNotifications()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (templateFilter.isActive) params.append('isActive', templateFilter.isActive);
      if (templateFilter.type) params.append('type', templateFilter.type);
      if (templateFilter.category) params.append('category', templateFilter.category);

      const response = await fetch(`/api/customer-notifications/templates?${params}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const fetchScheduledNotifications = async () => {
    try {
      const params = new URLSearchParams();
      if (notificationFilter.status) params.append('status', notificationFilter.status);
      if (notificationFilter.templateId) params.append('templateId', notificationFilter.templateId);

      const response = await fetch(`/api/customer-notifications/scheduled?${params}`);
      if (!response.ok) throw new Error('Failed to fetch scheduled notifications');
      
      const data = await response.json();
      setScheduledNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching scheduled notifications:', error);
      toast.error('Failed to load scheduled notifications');
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      setAvailableUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch users when "specific" is selected
  useEffect(() => {
    if (instantMessageForm.targetUsers.type === 'specific' && availableUsers.length === 0) {
      fetchUsers();
    }
  }, [instantMessageForm.targetUsers.type]);

  const handleCreateTemplate = async () => {
    try {
      const response = await fetch('/api/customer-notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateForm)
      });

      if (!response.ok) throw new Error('Failed to create template');

      toast.success('Template created successfully');
      setIsTemplateDialogOpen(false);
      resetTemplateForm();
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleScheduleNotification = async () => {
    try {
      const response = await fetch('/api/customer-notifications/scheduled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      });

      if (!response.ok) throw new Error('Failed to schedule notification');

      toast.success('Notification scheduled successfully');
      setIsScheduleDialogOpen(false);
      resetScheduleForm();
      fetchScheduledNotifications();
    } catch (error) {
      console.error('Error scheduling notification:', error);
      toast.error('Failed to schedule notification');
    }
  };

  const handleSendInstantMessage = async () => {
    if (!instantMessageForm.title.trim() || !instantMessageForm.message.trim()) {
      toast.error('Please provide both title and message');
      return;
    }

    if (instantMessageForm.targetUsers.type === 'specific' && instantMessageForm.targetUsers.userIds.length === 0) {
      toast.error('Please select at least one user for specific targeting');
      return;
    }

    setIsSendingInstant(true);
    try {
      const response = await fetch('/api/customer-notifications/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instantMessageForm)
      });

      if (!response.ok) throw new Error('Failed to send instant message');

      const data = await response.json();
      toast.success(`Message sent successfully to ${data.recipientCount} users`);
      resetInstantMessageForm();
    } catch (error) {
      console.error('Error sending instant message:', error);
      toast.error('Failed to send instant message');
    } finally {
      setIsSendingInstant(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: '',
      type: 'service_update',
      subject: '',
      content: {
        html: '',
        text: '',
        pushTitle: '',
        pushBody: '',
        smsContent: ''
      },
      channels: ['email'],
      priority: 'medium',
      category: 'general',
      isActive: true
    });
    setEditingTemplate(null);
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      name: '',
      description: '',
      templateId: '',
      schedule: {
        type: 'immediate',
        scheduledAt: '',
        timezone: 'UTC'
      },
      targetUsers: {
        type: 'all'
      },
      channels: ['email']
    });
  };

  const resetInstantMessageForm = () => {
    setInstantMessageForm({
      title: '',
      message: '',
      targetUsers: {
        type: 'all',
        userIds: []
      },
      priority: 'medium',
      channels: ['push', 'in_app']
    });
  };

  const getStatusBadge = (status: ScheduleStatus) => {
    const variants = {
      draft: 'secondary',
      scheduled: 'default',
      sending: 'destructive',
      sent: 'outline',
      cancelled: 'secondary',
      failed: 'destructive'
    } as const;

    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: NotificationPriority) => {
    const variants = {
      low: 'secondary',
      medium: 'default',
      high: 'destructive',
      urgent: 'destructive'
    } as const;

    return <Badge variant={variants[priority]}>{priority}</Badge>;
  };

  const filteredTemplates = templates.filter(template => {
    if (templateFilter.search && !template.name.toLowerCase().includes(templateFilter.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredNotifications = scheduledNotifications.filter(notification => {
    if (notificationFilter.search && !notification.name.toLowerCase().includes(notificationFilter.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Notifications</h1>
          <p className="text-muted-foreground">
            Manage notification templates and schedule customer communications
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">
            <MessageSquare className="h-4 w-4 mr-2" />
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="h-4 w-4 mr-2" />
            Scheduled ({scheduledNotifications.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="instant">
            <Send className="h-4 w-4 mr-2" />
            Instant Messaging
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={templateFilter.search}
                  onChange={(e) => setTemplateFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={templateFilter.type || 'all'} onValueChange={(value) => setTemplateFilter(prev => ({ ...prev, type: value === 'all' ? '' : value }))}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="service_update">Service Update</SelectItem>
                  <SelectItem value="maintenance_scheduled">Maintenance</SelectItem>
                  <SelectItem value="feature_announcement">Feature Announcement</SelectItem>
                  <SelectItem value="billing_reminder">Billing Reminder</SelectItem>
                  <SelectItem value="promotional_offer">Promotional Offer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetTemplateForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? 'Edit Template' : 'Create New Template'}
                  </DialogTitle>
                  <DialogDescription>
                    Create a reusable notification template for customer communications.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="template-name">Template Name</Label>
                      <Input
                        id="template-name"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Monthly Service Update"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-type">Type</Label>
                      <Select value={templateForm.type} onValueChange={(value: CustomerNotificationType) => setTemplateForm(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="service_update">Service Update</SelectItem>
                          <SelectItem value="maintenance_scheduled">Maintenance Scheduled</SelectItem>
                          <SelectItem value="feature_announcement">Feature Announcement</SelectItem>
                          <SelectItem value="billing_reminder">Billing Reminder</SelectItem>
                          <SelectItem value="promotional_offer">Promotional Offer</SelectItem>
                          <SelectItem value="system_alert">System Alert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="template-subject">Email Subject</Label>
                    <Input
                      id="template-subject"
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Subject line for email notifications"
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-html">HTML Content</Label>
                    <Textarea
                      id="template-html"
                      value={templateForm.content.html}
                      onChange={(e) => setTemplateForm(prev => ({ 
                        ...prev, 
                        content: { ...prev.content, html: e.target.value }
                      }))}
                      placeholder="HTML content for email notifications. Use {{variable}} for dynamic content."
                      rows={6}
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-text">Plain Text Content</Label>
                    <Textarea
                      id="template-text"
                      value={templateForm.content.text}
                      onChange={(e) => setTemplateForm(prev => ({ 
                        ...prev, 
                        content: { ...prev.content, text: e.target.value }
                      }))}
                      placeholder="Plain text version for email notifications"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="template-priority">Priority</Label>
                      <Select value={templateForm.priority} onValueChange={(value: NotificationPriority) => setTemplateForm(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="template-category">Category</Label>
                      <Input
                        id="template-category"
                        value={templateForm.category}
                        onChange={(e) => setTemplateForm(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., marketing, support, billing"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTemplate}>
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Templates List */}
          <div className="grid gap-4">
            {filteredTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>
                        {template.type.replace('_', ' ')} • {template.category}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(template.priority)}
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      <strong>Subject:</strong> {template.subject}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Channels:</span>
                      {template.channels.map((channel) => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          {channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                          {channel === 'push' && <Smartphone className="h-3 w-3 mr-1" />}
                          {channel === 'in_app' && <MessageSquare className="h-3 w-3 mr-1" />}
                          {channel}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(template.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setScheduleForm(prev => ({ ...prev, templateId: template.id }));
                                resetScheduleForm();
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Schedule
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Schedule Notification</DialogTitle>
                              <DialogDescription>
                                Schedule this template to be sent to customers.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="schedule-name">Campaign Name</Label>
                                <Input
                                  id="schedule-name"
                                  value={scheduleForm.name}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, name: e.target.value }))}
                                  placeholder="e.g., Monthly Update - January 2024"
                                />
                              </div>
                              
                              <div>
                                <Label htmlFor="schedule-description">Description</Label>
                                <Textarea
                                  id="schedule-description"
                                  value={scheduleForm.description}
                                  onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                                  placeholder="Optional description for this campaign"
                                  rows={2}
                                />
                              </div>

                              <div>
                                <Label>Target Audience</Label>
                                <Select 
                                  value={scheduleForm.targetUsers.type} 
                                  onValueChange={(value: 'all' | 'specific' | 'filter') => 
                                    setScheduleForm(prev => ({ 
                                      ...prev, 
                                      targetUsers: { ...prev.targetUsers, type: value }
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Users</SelectItem>
                                    <SelectItem value="specific">Specific Users</SelectItem>
                                    <SelectItem value="filter">Custom Filter</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div>
                                <Label>Schedule Type</Label>
                                <Select 
                                  value={scheduleForm.schedule.type} 
                                  onValueChange={(value: 'immediate' | 'scheduled' | 'recurring') => 
                                    setScheduleForm(prev => ({ 
                                      ...prev, 
                                      schedule: { ...prev.schedule, type: value }
                                    }))
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="immediate">Send Immediately</SelectItem>
                                    <SelectItem value="scheduled">Schedule for Later</SelectItem>
                                    <SelectItem value="recurring">Recurring</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {scheduleForm.schedule.type !== 'immediate' && (
                                <div>
                                  <Label htmlFor="schedule-date">Schedule Date & Time</Label>
                                  <Input
                                    id="schedule-date"
                                    type="datetime-local"
                                    value={scheduleForm.schedule.scheduledAt}
                                    onChange={(e) => setScheduleForm(prev => ({ 
                                      ...prev, 
                                      schedule: { ...prev.schedule, scheduledAt: e.target.value }
                                    }))}
                                  />
                                </div>
                              )}
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleScheduleNotification}>
                                Schedule Notification
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Template</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this template? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Scheduled Notifications Tab */}
        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={notificationFilter.search}
                  onChange={(e) => setNotificationFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10 w-64"
                />
              </div>
              <Select value={notificationFilter.status || 'all'} onValueChange={(value) => setNotificationFilter(prev => ({ ...prev, status: value === 'all' ? '' : value }))}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="sending">Sending</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Scheduled Notifications List */}
          <div className="grid gap-4">
            {filteredNotifications.map((notification) => (
              <Card key={notification.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{notification.name}</CardTitle>
                      <CardDescription>
                        {notification.description || 'No description'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(notification.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Target:</span> {notification.targetUsers.type}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Recipients:</span> {notification.estimatedRecipients || 0}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Schedule:</span> {notification.schedule.type}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Executions:</span> {notification.executionCount || 0}
                      </div>
                    </div>
                    
                    {notification.nextExecutionAt && (
                      <p className="text-sm text-muted-foreground">
                        <strong>Next execution:</strong> {new Date(notification.nextExecutionAt).toLocaleString()}
                      </p>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Channels:</span>
                      {notification.channels.map((channel) => (
                        <Badge key={channel} variant="outline" className="text-xs">
                          {channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                          {channel === 'push' && <Smartphone className="h-3 w-3 mr-1" />}
                          {channel === 'in_app' && <MessageSquare className="h-3 w-3 mr-1" />}
                          {channel}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        {notification.status === 'scheduled' && (
                          <Button size="sm" variant="outline">
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </Button>
                        )}
                        {notification.status === 'draft' && (
                          <Button size="sm" variant="outline">
                            <Play className="h-4 w-4 mr-1" />
                            Activate
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Analytics</CardTitle>
              <CardDescription>
                Performance metrics for your customer notification campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Analytics dashboard coming soon...
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instant Messaging Tab */}
        <TabsContent value="instant" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quick Send Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Instant Message
                </CardTitle>
                <CardDescription>
                  Send immediate notifications to users without creating templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="instant-title">Message Title</Label>
                  <Input
                    id="instant-title"
                    value={instantMessageForm.title}
                    onChange={(e) => setInstantMessageForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., System Maintenance Alert"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {instantMessageForm.title.length}/100 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="instant-message">Message Content</Label>
                  <Textarea
                    id="instant-message"
                    value={instantMessageForm.message}
                    onChange={(e) => setInstantMessageForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Type your message here..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {instantMessageForm.message.length}/500 characters
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Target Audience</Label>
                    <Select 
                      value={instantMessageForm.targetUsers.type} 
                      onValueChange={(value: 'all' | 'specific') => 
                        setInstantMessageForm(prev => ({ 
                          ...prev, 
                          targetUsers: { ...prev.targetUsers, type: value, userIds: [] }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="specific">Specific Users</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Priority</Label>
                    <Select 
                      value={instantMessageForm.priority} 
                      onValueChange={(value: NotificationPriority) => 
                        setInstantMessageForm(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* User Selection for Specific Targeting */}
                {instantMessageForm.targetUsers.type === 'specific' && (
                  <div>
                    <Label>Select Users</Label>
                    {loadingUsers ? (
                      <div className="flex items-center justify-center p-4 border rounded-lg">
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                        Loading users...
                      </div>
                    ) : (
                      <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                        {availableUsers.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No users available</p>
                        ) : (
                          <div className="space-y-2">
                            {availableUsers.map((user) => (
                              <div key={user.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`user-${user.id}`}
                                  checked={instantMessageForm.targetUsers.userIds.includes(user.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setInstantMessageForm(prev => ({
                                        ...prev,
                                        targetUsers: {
                                          ...prev.targetUsers,
                                          userIds: [...prev.targetUsers.userIds, user.id]
                                        }
                                      }));
                                    } else {
                                      setInstantMessageForm(prev => ({
                                        ...prev,
                                        targetUsers: {
                                          ...prev.targetUsers,
                                          userIds: prev.targetUsers.userIds.filter(id => id !== user.id)
                                        }
                                      }));
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <Label htmlFor={`user-${user.id}`} className="text-sm">
                                  {user.name || user.email}
                                  {user.name && <span className="text-muted-foreground"> ({user.email})</span>}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {instantMessageForm.targetUsers.type === 'specific' && instantMessageForm.targetUsers.userIds.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {instantMessageForm.targetUsers.userIds.length} user(s) selected
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <Label>Delivery Channels</Label>
                  <div className="flex gap-2 mt-2">
                    {(['push', 'in_app', 'email'] as DeliveryChannel[]).map((channel) => (
                      <div key={channel} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`channel-${channel}`}
                          checked={instantMessageForm.channels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInstantMessageForm(prev => ({
                                ...prev,
                                channels: [...prev.channels, channel]
                              }));
                            } else {
                              setInstantMessageForm(prev => ({
                                ...prev,
                                channels: prev.channels.filter(c => c !== channel)
                              }));
                            }
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`channel-${channel}`} className="text-sm capitalize">
                          {channel === 'in_app' ? 'In-App' : channel}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleSendInstantMessage} 
                  disabled={
                    isSendingInstant || 
                    !instantMessageForm.title.trim() || 
                    !instantMessageForm.message.trim() ||
                    (instantMessageForm.targetUsers.type === 'specific' && instantMessageForm.targetUsers.userIds.length === 0)
                  }
                  className="w-full"
                >
                  {isSendingInstant ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Quick Templates
                </CardTitle>
                <CardDescription>
                  Pre-defined messages for common scenarios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  {
                    title: "System Maintenance",
                    message: "We will be performing scheduled maintenance on our systems. Services may be temporarily unavailable.",
                    priority: "high" as NotificationPriority
                  },
                  {
                    title: "Service Restored",
                    message: "All services have been restored and are now functioning normally. Thank you for your patience.",
                    priority: "medium" as NotificationPriority
                  },
                  {
                    title: "Security Alert",
                    message: "We've detected unusual activity on your account. Please review your recent activity and update your password if necessary.",
                    priority: "urgent" as NotificationPriority
                  },
                  {
                    title: "New Feature Available",
                    message: "We've released new features to improve your experience. Check them out in your dashboard!",
                    priority: "low" as NotificationPriority
                  }
                ].map((template, index) => (
                  <div key={index} className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                       onClick={() => setInstantMessageForm(prev => ({
                         ...prev,
                         title: template.title,
                         message: template.message,
                         priority: template.priority
                       }))}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{template.title}</span>
                      <Badge variant={template.priority === 'urgent' ? 'destructive' : template.priority === 'high' ? 'destructive' : 'default'} className="text-xs">
                        {template.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{template.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 