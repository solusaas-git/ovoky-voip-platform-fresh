'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  MessageSquare,
  HelpCircle,
  Edit,
  Trash2,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lightbulb,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { SERVICE_LABELS, TicketService } from '@/types/ticket';
import WysiwygEditor from '@/components/ui/WysiwygEditor';

interface PredefinedIssue {
  _id?: string;
  service: TicketService;
  title: string;
  description: string;
  suggestedSolution?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  keywords?: string[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CannedResponse {
  _id?: string;
  title: string;
  content: string;
  category: string;
  services?: TicketService[];
  keywords?: string[];
  isActive: boolean;
  usageCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export function SupportSettings() {
  // State for predefined issues
  const [predefinedIssues, setPredefinedIssues] = useState<PredefinedIssue[]>([]);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<PredefinedIssue | null>(null);
  const [issueForm, setIssueForm] = useState<Partial<PredefinedIssue>>({
    service: 'outbound_calls',
    title: '',
    description: '',
    suggestedSolution: '',
    priority: 'medium',
    keywords: [],
    isActive: true,
  });

  // State for canned responses
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);
  const [responseForm, setResponseForm] = useState<Partial<CannedResponse>>({
    title: '',
    content: '',
    category: '',
    services: [],
    keywords: [],
    isActive: true,
  });

  // General state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('predefined-issues');

  // Search and filter states
  const [issueSearch, setIssueSearch] = useState('');
  const [issueServiceFilter, setIssueServiceFilter] = useState<TicketService | 'all'>('all');
  const [responseSearch, setResponseSearch] = useState('');
  const [responseCategoryFilter, setResponseCategoryFilter] = useState<string>('all');

  // Helper function to extract plain text from HTML content
  const getPlainTextFromHtml = (html: string): string => {
    if (typeof window !== 'undefined') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return tempDiv.textContent || tempDiv.innerText || '';
    }
    // Fallback for server-side rendering
    return html.replace(/<[^>]*>/g, '').trim();
  };

  useEffect(() => {
    fetchPredefinedIssues();
    fetchCannedResponses();
  }, []);

  const fetchPredefinedIssues = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/support/predefined-issues');
      if (response.ok) {
        const data = await response.json();
        setPredefinedIssues(data.issues || []);
      }
    } catch (err) {
      console.error('Error fetching predefined issues:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCannedResponses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/support/canned-responses');
      if (response.ok) {
        const data = await response.json();
        setCannedResponses(data.responses || []);
      }
    } catch (err) {
      console.error('Error fetching canned responses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIssue = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = editingIssue ? 
        `/api/admin/support/predefined-issues/${editingIssue._id}` : 
        '/api/admin/support/predefined-issues';
      
      const method = editingIssue ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(issueForm),
      });

      if (response.ok) {
        setSuccess(editingIssue ? 'Issue updated successfully!' : 'Issue created successfully!');
        setIssueDialogOpen(false);
        setEditingIssue(null);
        setIssueForm({
          service: 'outbound_calls',
          title: '',
          description: '',
          suggestedSolution: '',
          priority: 'medium',
          keywords: [],
          isActive: true,
        });
        fetchPredefinedIssues();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save issue');
      }
    } catch (err) {
      setError('An error occurred while saving the issue');
      console.error('Error saving issue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResponse = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const url = editingResponse ? 
        `/api/admin/support/canned-responses/${editingResponse._id}` : 
        '/api/admin/support/canned-responses';
      
      const method = editingResponse ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responseForm),
      });

      if (response.ok) {
        setSuccess(editingResponse ? 'Response updated successfully!' : 'Response created successfully!');
        setResponseDialogOpen(false);
        setEditingResponse(null);
        setResponseForm({
          title: '',
          content: '',
          category: '',
          services: [],
          keywords: [],
          isActive: true,
        });
        fetchCannedResponses();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save response');
      }
    } catch (err) {
      setError('An error occurred while saving the response');
      console.error('Error saving response:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditIssue = (issue: PredefinedIssue) => {
    setEditingIssue(issue);
    setIssueForm({ ...issue });
    setIssueDialogOpen(true);
  };

  const handleEditResponse = (response: CannedResponse) => {
    setEditingResponse(response);
    setResponseForm({ ...response });
    setResponseDialogOpen(true);
  };

  const handleDeleteIssue = async (issueId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/support/predefined-issues/${issueId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Issue deleted successfully!');
        fetchPredefinedIssues();
      } else {
        setError('Failed to delete issue');
      }
    } catch (err) {
      setError('An error occurred while deleting the issue');
      console.error('Error deleting issue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/support/canned-responses/${responseId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Response deleted successfully!');
        fetchCannedResponses();
      } else {
        setError('Failed to delete response');
      }
    } catch (err) {
      setError('An error occurred while deleting the response');
      console.error('Error deleting response:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const filteredIssues = predefinedIssues.filter(issue => {
    const matchesSearch = issue.title.toLowerCase().includes(issueSearch.toLowerCase()) ||
                         getPlainTextFromHtml(issue.description).toLowerCase().includes(issueSearch.toLowerCase());
    const matchesService = issueServiceFilter === 'all' || issue.service === issueServiceFilter;
    return matchesSearch && matchesService;
  });

  const filteredResponses = cannedResponses.filter(response => {
    const matchesSearch = response.title.toLowerCase().includes(responseSearch.toLowerCase()) ||
                         getPlainTextFromHtml(response.content).toLowerCase().includes(responseSearch.toLowerCase());
    const matchesCategory = responseCategoryFilter === 'all' || response.category === responseCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(cannedResponses.map(r => r.category).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="border-0 bg-destructive/5 dark:bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-0 bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-200">{success}</AlertDescription>
        </Alert>
      )}

      {/* Support Settings Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="predefined-issues" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Predefined Issues
          </TabsTrigger>
          <TabsTrigger value="canned-responses" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Canned Responses
          </TabsTrigger>
        </TabsList>

        {/* Predefined Issues Tab */}
        <TabsContent value="predefined-issues" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <HelpCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    Predefined Issues
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create and manage common issues for each service to help with faster ticket resolution
                  </p>
                </div>
                <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setEditingIssue(null);
                        setIssueForm({
                          service: 'outbound_calls',
                          title: '',
                          description: '',
                          suggestedSolution: '',
                          priority: 'medium',
                          keywords: [],
                          isActive: true,
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Issue
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                        {editingIssue ? 'Edit Predefined Issue' : 'Add Predefined Issue'}
                      </DialogTitle>
                      <DialogDescription>
                        Define common issues and their solutions to help support agents respond faster
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 flex-1 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label>Service</Label>
                          <Select 
                            value={issueForm.service} 
                            onValueChange={(value) => setIssueForm(prev => ({ ...prev, service: value as TicketService }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-3">
                          <Label>Priority</Label>
                          <Select 
                            value={issueForm.priority} 
                            onValueChange={(value) => setIssueForm(prev => ({ ...prev, priority: value as 'low' | 'medium' | 'high' | 'urgent' }))}
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
                      <div className="space-y-3">
                        <Label>Issue Title</Label>
                        <Input 
                          value={issueForm.title} 
                          onChange={(e) => setIssueForm(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Brief description of the issue..."
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Description</Label>
                        <WysiwygEditor
                          value={issueForm.description || ''}
                          onChange={(value) => setIssueForm(prev => ({ ...prev, description: value }))}
                          placeholder="Detailed description of the issue..."
                          minHeight="120px"
                          toolbar="standard"
                          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl transition-all duration-200"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Suggested Solution</Label>
                        <WysiwygEditor
                          value={issueForm.suggestedSolution || ''}
                          onChange={(value) => setIssueForm(prev => ({ ...prev, suggestedSolution: value }))}
                          placeholder="Steps to resolve this issue..."
                          minHeight="160px"
                          toolbar="standard"
                          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl transition-all duration-200"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Keywords (comma-separated)</Label>
                        <Input 
                          value={issueForm.keywords?.join(', ') || ''} 
                          onChange={(e) => setIssueForm(prev => ({ 
                            ...prev, 
                            keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                          }))}
                          placeholder="error, timeout, calling, international..."
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-3">
                      <Button variant="outline" onClick={() => setIssueDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveIssue} disabled={loading || !issueForm.title || !getPlainTextFromHtml(issueForm.description || '').trim()}>
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            {editingIssue ? 'Update' : 'Create'} Issue
                          </div>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    placeholder="Search issues..."
                    value={issueSearch}
                    onChange={(e) => setIssueSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={issueServiceFilter} onValueChange={(value) => setIssueServiceFilter(value as TicketService | 'all')}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Issues List */}
              <div className="space-y-2">
                {filteredIssues.length === 0 ? (
                  <div className="text-center py-12">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No predefined issues found</p>
                    <p className="text-sm text-muted-foreground">Create your first predefined issue to get started</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 border-b grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                      <div className="col-span-4">Issue Title</div>
                      <div className="col-span-2">Service</div>
                      <div className="col-span-1">Priority</div>
                      <div className="col-span-3">Keywords</div>
                      <div className="col-span-1">Status</div>
                      <div className="col-span-1">Actions</div>
                    </div>
                    {filteredIssues.map((issue, index) => (
                      <div key={issue._id} className={`px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-muted/30 transition-colors ${index !== filteredIssues.length - 1 ? 'border-b' : ''}`}>
                        <div className="col-span-4">
                          <div className="font-medium text-sm truncate" title={issue.title}>
                            {issue.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate" title={getPlainTextFromHtml(issue.description)}>
                            {getPlainTextFromHtml(issue.description)}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Badge variant="outline" className="text-xs">
                            {SERVICE_LABELS[issue.service]}
                          </Badge>
                        </div>
                        <div className="col-span-1">
                          <Badge variant={
                            issue.priority === 'urgent' ? 'destructive' :
                            issue.priority === 'high' ? 'default' :
                            issue.priority === 'medium' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {issue.priority}
                          </Badge>
                        </div>
                        <div className="col-span-3">
                          <div className="flex gap-1 flex-wrap">
                            {issue.keywords && issue.keywords.length > 0 ? (
                              issue.keywords.slice(0, 3).map((keyword, keywordIndex) => (
                                <span key={keywordIndex} className="px-1.5 py-0.5 bg-muted text-xs rounded">
                                  {keyword}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No keywords</span>
                            )}
                            {issue.keywords && issue.keywords.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{issue.keywords.length - 3}</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1">
                          {issue.isActive ? (
                            <Badge variant="secondary" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <div className="col-span-1">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditIssue(issue)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Issue</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this predefined issue? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteIssue(issue._id!)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Canned Responses Tab */}
        <TabsContent value="canned-responses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Canned Responses
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create reusable response templates to speed up customer communications
                  </p>
                </div>
                <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={() => {
                        setEditingResponse(null);
                        setResponseForm({
                          title: '',
                          content: '',
                          category: '',
                          services: [],
                          keywords: [],
                          isActive: true,
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Response
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Plus className="h-4 w-4 text-primary" />
                        </div>
                        {editingResponse ? 'Edit Canned Response' : 'Add Canned Response'}
                      </DialogTitle>
                      <DialogDescription>
                        Create templates for common responses to speed up support workflows
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 flex-1 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <Label>Title</Label>
                          <Input 
                            value={responseForm.title} 
                            onChange={(e) => setResponseForm(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="Response template name..."
                          />
                        </div>
                        <div className="space-y-3">
                          <Label>Category</Label>
                          <Input 
                            value={responseForm.category} 
                            onChange={(e) => setResponseForm(prev => ({ ...prev, category: e.target.value }))}
                            placeholder="e.g., Greetings, Troubleshooting, Closing..."
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label>Response Content</Label>
                        <WysiwygEditor
                          value={responseForm.content || ''}
                          onChange={(value) => setResponseForm(prev => ({ ...prev, content: value }))}
                          placeholder="Template content with placeholders like {{customer_name}}, {{ticket_number}}..."
                          minHeight="200px"
                          toolbar="full"
                          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl transition-all duration-200"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label>Applicable Services</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(SERVICE_LABELS).map(([value, label]) => (
                            <label key={value} className="flex items-center space-x-2">
                              <input 
                                type="checkbox" 
                                checked={responseForm.services?.includes(value as TicketService) || false}
                                onChange={(e) => {
                                  const services = responseForm.services || [];
                                  if (e.target.checked) {
                                    setResponseForm(prev => ({ ...prev, services: [...services, value as TicketService] }));
                                  } else {
                                    setResponseForm(prev => ({ ...prev, services: services.filter(s => s !== value) }));
                                  }
                                }}
                                className="rounded border-border"
                              />
                              <span className="text-sm">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label>Keywords (comma-separated)</Label>
                        <Input 
                          value={responseForm.keywords?.join(', ') || ''} 
                          onChange={(e) => setResponseForm(prev => ({ 
                            ...prev, 
                            keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                          }))}
                          placeholder="greeting, welcome, thank you, resolved..."
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-3">
                      <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveResponse} disabled={loading || !responseForm.title || !getPlainTextFromHtml(responseForm.content || '').trim()}>
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Save className="h-4 w-4" />
                            {editingResponse ? 'Update' : 'Create'} Response
                          </div>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input 
                    placeholder="Search responses..."
                    value={responseSearch}
                    onChange={(e) => setResponseSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={responseCategoryFilter} onValueChange={setResponseCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responses List */}
              <div className="space-y-2">
                {filteredResponses.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-muted-foreground">No canned responses found</p>
                    <p className="text-sm text-muted-foreground">Create your first response template to get started</p>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 border-b grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                      <div className="col-span-3">Response Title</div>
                      <div className="col-span-2">Category</div>
                      <div className="col-span-3">Services</div>
                      <div className="col-span-2">Keywords</div>
                      <div className="col-span-1">Usage</div>
                      <div className="col-span-1">Actions</div>
                    </div>
                    {filteredResponses.map((response, index) => (
                      <div key={response._id} className={`px-4 py-3 grid grid-cols-12 gap-4 items-center hover:bg-muted/30 transition-colors ${index !== filteredResponses.length - 1 ? 'border-b' : ''}`}>
                        <div className="col-span-3">
                          <div className="font-medium text-sm truncate" title={response.title}>
                            {response.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate" title={getPlainTextFromHtml(response.content)}>
                            {getPlainTextFromHtml(response.content)}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Badge variant="outline" className="text-xs">
                            {response.category}
                          </Badge>
                        </div>
                        <div className="col-span-3">
                          <div className="flex gap-1 flex-wrap">
                            {response.services && response.services.length > 0 ? (
                              response.services.slice(0, 2).map((service, serviceIndex) => (
                                <span key={serviceIndex} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded">
                                  {SERVICE_LABELS[service]}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">All services</span>
                            )}
                            {response.services && response.services.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{response.services.length - 2}</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <div className="flex gap-1 flex-wrap">
                            {response.keywords && response.keywords.length > 0 ? (
                              response.keywords.slice(0, 2).map((keyword, keywordIndex) => (
                                <span key={keywordIndex} className="px-1.5 py-0.5 bg-muted text-xs rounded">
                                  {keyword}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No keywords</span>
                            )}
                            {response.keywords && response.keywords.length > 2 && (
                              <span className="text-xs text-muted-foreground">+{response.keywords.length - 2}</span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <div className="text-center">
                            {response.usageCount ? (
                              <Badge variant="secondary" className="text-xs">
                                {response.usageCount}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">0</span>
                            )}
                            {!response.isActive && (
                              <div className="text-xs text-muted-foreground mt-1">Inactive</div>
                            )}
                          </div>
                        </div>
                        <div className="col-span-1">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditResponse(response)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Response</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this canned response? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteResponse(response._id!)}>
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 