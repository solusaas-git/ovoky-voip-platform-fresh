'use client';

import React, { useState, useEffect } from 'react';

import { useAdminTickets } from '@/hooks/useAdminTickets';
import { useBranding } from '@/hooks/useBranding';
import { 
  SERVICE_LABELS, 
  PRIORITY_LABELS, 
  STATUS_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  TicketStatus,
  TicketPriority,
  TicketAttachment
} from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  MessageCircle, 
  Paperclip, 
  Download, 
  Clock,
  User,
  FileText,
  Image as ImageIcon,
  Upload,
  X,
  Star,
  UserCheck,
  Settings,
  Trash2,
  Archive,
  AlertTriangle,
  Eye,
  EyeOff,
  Shield,
  Users,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Timer,
  CircleDot,
  Crown,
  MessageSquare,
  Sparkles,
  Zap
} from 'lucide-react';
import { CannedResponsePicker } from './CannedResponsePicker';
import type { CannedResponse } from '@/hooks/useCannedResponses';
import WysiwygEditor from '@/components/ui/WysiwygEditor';
import AttachmentPreview from '@/components/ui/AttachmentPreview';

interface AdminTicketDetailProps {
  ticketId: string;
}

export function AdminTicketDetail({ ticketId }: AdminTicketDetailProps) {
  const { 
    ticket, 
    loading, 
    error, 
    fetchTicket, 
    uploadFiles,
    clearError,
    admins,
    assignTicket,
    updateTicketStatus,
    updateTicketPriority,
    addReply,
    deleteTicket
  } = useAdminTickets();

  const { colors } = useBranding();

  const [replyContent, setReplyContent] = useState('');
  const [internalNoteContent, setInternalNoteContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<TicketAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<TicketAttachment | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (ticketId) {
      fetchTicket(ticketId);
    }
  }, [ticketId, fetchTicket]);

  // Admin controls
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [adminActions, setAdminActions] = useState({
    assignTo: '',
    newStatus: '' as TicketStatus | '',
    newPriority: '' as TicketPriority | '',
    actionNote: '',
  });

  const [showInternalNotes, setShowInternalNotes] = useState(true);
  const [processingAction, setProcessingAction] = useState(false);

  // Canned Response Picker state
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedPickerPosition, setCannedPickerPosition] = useState({ top: 0, left: 0 });
  const [cannedSearchQuery, setCannedSearchQuery] = useState('');

  useEffect(() => {
    if (ticketId) {
      fetchTicket(ticketId);
    }
  }, [ticketId, fetchTicket]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    clearError();

    try {
      const uploadedFiles = await uploadFiles(files);
      setReplyAttachments(prev => [...prev, ...uploadedFiles]);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setUploadingFiles(false);
      event.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreviewAttachment = (attachment: any) => {
    setPreviewAttachment(attachment);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewAttachment(null);
  };

  const handleSubmitReply = async (isInternal: boolean = false) => {
    const content = isInternal ? internalNoteContent : replyContent;
    if (!content.trim()) return;

    const setSubmitting = isInternal ? setIsSubmittingNote : setIsSubmittingReply;
    setSubmitting(true);
    clearError();

    const success = await addReply(ticketId, {
      content,
      attachments: isInternal ? [] : replyAttachments,
      isInternal,
    });

    if (success) {
      if (isInternal) {
        setInternalNoteContent('');
      } else {
        setReplyContent('');
        setReplyAttachments([]);
      }
    }

    setSubmitting(false);
  };

  const handleAssignTicket = async () => {
    if (!adminActions.assignTo) return;
    
    setProcessingAction(true);
    
    const success = await assignTicket(ticketId, {
      assignTo: adminActions.assignTo,
      internalNote: adminActions.actionNote,
    });

    if (success) {
      setAssignDialogOpen(false);
      setAdminActions(prev => ({ ...prev, assignTo: '', actionNote: '' }));
    }
    
    setProcessingAction(false);
  };

  const handleStatusUpdate = async () => {
    if (!adminActions.newStatus) return;
    
    setProcessingAction(true);
    
    const success = await updateTicketStatus(ticketId, {
      status: adminActions.newStatus,
      internalNote: adminActions.actionNote,
    });

    if (success) {
      setStatusDialogOpen(false);
      setAdminActions(prev => ({ ...prev, newStatus: '', actionNote: '' }));
    }
    
    setProcessingAction(false);
  };

  const handlePriorityUpdate = async () => {
    if (!adminActions.newPriority) return;
    
    setProcessingAction(true);
    
    const success = await updateTicketPriority(ticketId, {
      priority: adminActions.newPriority,
      internalNote: adminActions.actionNote,
    });

    if (success) {
      setPriorityDialogOpen(false);
      setAdminActions(prev => ({ ...prev, newPriority: '', actionNote: '' }));
    }
    
    setProcessingAction(false);
  };

  const handleDeleteTicket = async () => {
    setProcessingAction(true);
    
    try {
      const success = await deleteTicket(ticketId);
      
      if (success) {
        // Show success message briefly before redirect
        console.log('Ticket deleted successfully');
        
        // Redirect to support tickets list after successful deletion
        window.location.href = '/admin/tickets';
      } else {
        // Error should be handled by the hook and displayed via the error state
        console.error('Failed to delete ticket');
      }
    } catch (err) {
      console.error('Error during ticket deletion:', err);
    } finally {
      setProcessingAction(false);
    }
  };

  // Canned Response Handlers - Updated for WysiwygEditor
  const handleEditorKeyDown = (event: KeyboardEvent, isInternal: boolean = false) => {
    if (showCannedPicker && event.key === 'Escape') {
      event.preventDefault();
      setShowCannedPicker(false);
      return;
    }

    // Check for "/" trigger
    if (event.key === '/') {
      // Get the current editor content
      const currentValue = isInternal ? internalNoteContent : replyContent;
      
      // Simple check - if the content is empty or ends with whitespace, show picker
      const plainText = getPlainTextFromHtml(currentValue);
      if (plainText === '' || plainText.endsWith(' ') || plainText.endsWith('\n')) {
        // Position picker below the editor
        const editorElement = (event.target as Element).closest('.ProseMirror');
        if (editorElement) {
          const rect = editorElement.getBoundingClientRect();
          const position = {
            top: rect.bottom + window.scrollY + 5,
            left: rect.left + window.scrollX
          };
          
          setCannedPickerPosition(position);
          setCannedSearchQuery('');
          setShowCannedPicker(true);
        }
      }
    }
  };

  const handleEditorChange = (value: string, isInternal: boolean = false) => {
    if (isInternal) {
      setInternalNoteContent(value);
    } else {
      setReplyContent(value);
    }

    // Check for canned response trigger in the new content
    const plainText = getPlainTextFromHtml(value);
    const lastSlashIndex = plainText.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
      const afterSlash = plainText.substring(lastSlashIndex + 1);
      
      // Only show picker if "/" is at start or after whitespace and no spaces after
      const charBeforeSlash = lastSlashIndex > 0 ? plainText[lastSlashIndex - 1] : ' ';
      const isValidTrigger = charBeforeSlash === ' ' || charBeforeSlash === '\n' || lastSlashIndex === 0;
      
      if (isValidTrigger && !afterSlash.includes(' ') && afterSlash.length <= 20) {
        setCannedSearchQuery(afterSlash);
        if (!showCannedPicker) {
          // Position picker if not already shown
          const editorElements = document.querySelectorAll('.ProseMirror');
          const editorElement = isInternal ? editorElements[1] : editorElements[0]; // Assume first is reply, second is internal
          
          if (editorElement) {
            const rect = editorElement.getBoundingClientRect();
            const position = {
              top: rect.bottom + window.scrollY + 5,
              left: rect.left + window.scrollX
            };
            setCannedPickerPosition(position);
            setShowCannedPicker(true);
          }
        }
      } else {
        setShowCannedPicker(false);
      }
    } else {
      setShowCannedPicker(false);
    }
  };

  const handleCannedResponseSelect = (response: CannedResponse) => {
    // Determine which editor is currently active
    const isInternal = showCannedPicker && document.activeElement?.closest('#internal-note-content');
    
    const currentValue = isInternal ? internalNoteContent : replyContent;
    const plainText = getPlainTextFromHtml(currentValue);
    const lastSlashIndex = plainText.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
      // Replace from the slash to the end with the canned response
      const beforeSlash = plainText.substring(0, lastSlashIndex);
      const newPlainText = beforeSlash + response.content;
      
      // Convert back to HTML (simple approach - just wrap in <p> tags for paragraphs)
      const newHtmlContent = newPlainText
        .split('\n\n')
        .map(paragraph => paragraph.trim() ? `<p>${paragraph.replace(/\n/g, '<br>')}</p>` : '')
        .join('');
      
      if (isInternal) {
        setInternalNoteContent(newHtmlContent);
      } else {
        setReplyContent(newHtmlContent);
      }
    }
    
    setShowCannedPicker(false);
  };

  const getStatusIcon = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <CircleDot className="h-4 w-4" />;
      case 'waiting_admin':
        return <Timer className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'closed':
        return <Archive className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityIcon = (priority: TicketPriority) => {
    switch (priority) {
      case 'urgent':
        return <Zap className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
      case 'low':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUserInitials = (email: string, name?: string, firstName?: string, lastName?: string) => {
    if (name) {
      const nameParts = name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const formatAssignedUser = (assignedTo: string | { _id: string; email: string; name?: string; firstName?: string; lastName?: string; role?: string; }) => {
    if (typeof assignedTo === 'string') {
      return assignedTo; // Just the ID string
    }
    
    // If it's an object with user details
    const { name, firstName, lastName, email, role } = assignedTo;
    
    // Prefer the name field first, then firstName/lastName combo, then friendly fallback
    if (name && name.trim()) {
      return name.trim();
    }
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    if (firstName && firstName.trim()) {
      return firstName.trim();
    }
    if (lastName && lastName.trim()) {
      return lastName.trim();
    }
    
    // Instead of showing email, show a role-based name
    if (role === 'admin') {
      return 'Support Agent';
    }
    
    // Extract first part of email as friendly name
    const emailPart = email.split('@')[0];
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
  };

  const getFullCountryName = (countryCode: string) => {
    const countryNames: { [key: string]: string } = {
      'US': 'United States',
      'CA': 'Canada',
      'GB': 'United Kingdom',
      'FR': 'France',
      'DE': 'Germany',
      'IT': 'Italy',
      'ES': 'Spain',
      'NL': 'Netherlands',
      'BE': 'Belgium',
      'CH': 'Switzerland',
      'AT': 'Austria',
      'SE': 'Sweden',
      'NO': 'Norway',
      'DK': 'Denmark',
      'FI': 'Finland',
      'PL': 'Poland',
      'CZ': 'Czech Republic',
      'HU': 'Hungary',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'HR': 'Croatia',
      'SI': 'Slovenia',
      'SK': 'Slovakia',
      'LT': 'Lithuania',
      'LV': 'Latvia',
      'EE': 'Estonia',
      'IE': 'Ireland',
      'PT': 'Portugal',
      'GR': 'Greece',
      'CY': 'Cyprus',
      'MT': 'Malta',
      'LU': 'Luxembourg',
      'AU': 'Australia',
      'NZ': 'New Zealand',
      'JP': 'Japan',
      'KR': 'South Korea',
      'CN': 'China',
      'IN': 'India',
      'BR': 'Brazil',
      'MX': 'Mexico',
      'AR': 'Argentina',
      'CL': 'Chile',
      'CO': 'Colombia',
      'PE': 'Peru',
      'VE': 'Venezuela',
      'ZA': 'South Africa',
      'NG': 'Nigeria',
      'EG': 'Egypt',
      'KE': 'Kenya',
      'MA': 'Morocco',
      'TN': 'Tunisia',
      'DZ': 'Algeria',
      'LY': 'Libya',
      'SD': 'Sudan',
      'ET': 'Ethiopia',
      'UG': 'Uganda',
      'TZ': 'Tanzania',
      'RW': 'Rwanda',
      'GH': 'Ghana',
      'CI': 'Ivory Coast',
      'SN': 'Senegal',
      'ML': 'Mali',
      'BF': 'Burkina Faso',
      'NE': 'Niger',
      'TD': 'Chad',
      'CM': 'Cameroon',
      'GA': 'Gabon',
      'CG': 'Congo',
      'CD': 'Democratic Republic of Congo',
      'CF': 'Central African Republic',
      'AO': 'Angola',
      'ZM': 'Zambia',
      'ZW': 'Zimbabwe',
      'BW': 'Botswana',
      'NA': 'Namibia',
      'SZ': 'Eswatini',
      'LS': 'Lesotho',
      'MG': 'Madagascar',
      'MU': 'Mauritius',
      'SC': 'Seychelles',
      'MZ': 'Mozambique',
      'MW': 'Malawi',
      'TR': 'Turkey',
      'RU': 'Russia',
      'UA': 'Ukraine',
      'BY': 'Belarus',
      'MD': 'Moldova',
      'GE': 'Georgia',
      'AM': 'Armenia',
      'AZ': 'Azerbaijan',
      'KZ': 'Kazakhstan',
      'UZ': 'Uzbekistan',
      'TM': 'Turkmenistan',
      'KG': 'Kyrgyzstan',
      'TJ': 'Tajikistan',
      'AF': 'Afghanistan',
      'PK': 'Pakistan',
      'BD': 'Bangladesh',
      'LK': 'Sri Lanka',
      'MV': 'Maldives',
      'NP': 'Nepal',
      'BT': 'Bhutan',
      'MM': 'Myanmar',
      'TH': 'Thailand',
      'LA': 'Laos',
      'KH': 'Cambodia',
      'VN': 'Vietnam',
      'MY': 'Malaysia',
      'SG': 'Singapore',
      'BN': 'Brunei',
      'ID': 'Indonesia',
      'PH': 'Philippines',
      'TL': 'East Timor',
      'PG': 'Papua New Guinea',
      'FJ': 'Fiji',
      'SB': 'Solomon Islands',
      'VU': 'Vanuatu',
      'NC': 'New Caledonia',
      'PF': 'French Polynesia',
      'WS': 'Samoa',
      'TO': 'Tonga',
      'TV': 'Tuvalu',
      'NR': 'Nauru',
      'KI': 'Kiribati',
      'MH': 'Marshall Islands',
      'FM': 'Micronesia',
      'PW': 'Palau',
      'IL': 'Israel',
      'JO': 'Jordan',
      'LB': 'Lebanon',
      'SY': 'Syria',
      'IQ': 'Iraq',
      'IR': 'Iran',
      'SA': 'Saudi Arabia',
      'AE': 'United Arab Emirates',
      'QA': 'Qatar',
      'BH': 'Bahrain',
      'KW': 'Kuwait',
      'OM': 'Oman',
      'YE': 'Yemen'
    };
    
    return countryNames[countryCode.toUpperCase()] || countryCode;
  };

  if (loading && !ticket) {
    return (
      <div className="space-y-8">
        <Card className="border-0 bg-card/50 backdrop-blur-sm rounded-2xl">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center space-y-6">
              <div className="relative mx-auto w-20 h-20">
                {/* Outer ring */}
                <div className="absolute inset-0 w-20 h-20 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
                {/* Inner spinning ring with gradient - using primary brand color for admin */}
                <div 
                  className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-spin"
                  style={{ 
                    borderTopColor: colors.primary,
                    borderRightColor: `${colors.primary}CC`,
                    borderBottomColor: `${colors.primary}99`
                  }}
                ></div>
                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div 
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{ backgroundColor: colors.primary }}
                  ></div>
                </div>
              </div>
              <div className="space-y-3 max-w-sm mx-auto">
                <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Loading ticket details...</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Processing admin data and permissions</p>
                {/* Progress indicator */}
                <div className="w-32 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
                  <div 
                    className="h-full rounded-full animate-pulse"
                    style={{ background: `linear-gradient(to right, ${colors.primary}, ${colors.primary}CC)` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <Alert variant="destructive" className="border-0 bg-destructive/5 dark:bg-destructive/10">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Ticket not found or you don&apos;t have permission to view it.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 dark:rounded-2xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: `${colors.primary}20`, 
                color: colors.primary 
              }}
            >
              <Crown className="h-4 w-4" />
              Admin View
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {ticket.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Ticket #{ticket.ticketNumber} • Created {formatDate(ticket.createdAt)}
          </p>
        </div>

        {/* Enhanced Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="font-medium text-red-900 dark:text-red-100">Error</h4>
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Admin Controls Bar */}
        <Card className="mb-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-xl">
                  <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Admin Controls</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Manage ticket status, assignment, and priority</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Enhanced Assign Dialog */}
                <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800">
                      <UserCheck className="h-4 w-4 mr-2" />
                      {ticket.assignedTo ? 'Reassign' : 'Assign'}
                    </Button>
                  </DialogTrigger>
                  <DialogContent 
                    className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60"
                    onOpenAutoFocus={() => {
                      console.log('Assign dialog opened');
                      console.log('Admin data:', admins);
                      console.log('Current adminActions:', adminActions);
                    }}
                  >
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                          <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        {ticket.assignedTo ? 'Reassign Ticket' : 'Assign Ticket'}
                      </DialogTitle>
                      <DialogDescription>
                        {ticket.assignedTo 
                          ? `Currently assigned to ${formatAssignedUser(ticket.assignedTo)}`
                          : 'Assign this ticket to an admin user for handling.'
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Assign To</Label>
                        <Select
                          value={adminActions.assignTo}
                          onValueChange={(value) => {
                            console.log('Selected admin value:', value);
                            setAdminActions(prev => ({ ...prev, assignTo: value }));
                          }}
                        >
                          <SelectTrigger className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <SelectValue placeholder="Select admin..." />
                          </SelectTrigger>
                          <SelectContent>
                            {admins?.map((admin, adminIndex) => {
                              const adminValue = admin.id || admin.email;
                              if (!adminValue) return null; // Skip if no valid identifier
                              
                              return (
                                <SelectItem 
                                  key={admin.id || `admin-${adminIndex}`} 
                                  value={adminValue}
                                >
                                  <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-purple-600" />
                                    {admin.firstName || admin.email} {admin.lastName || ''}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Internal Note <span className="text-slate-500">(Optional)</span></Label>
                        <Textarea
                          value={adminActions.actionNote}
                          onChange={(e) => setAdminActions(prev => ({ ...prev, actionNote: e.target.value }))}
                          placeholder="Add internal note about the assignment..."
                          rows={3}
                          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-3">
                      <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAssignTicket} 
                        disabled={!adminActions.assignTo || processingAction}
                        className="min-w-[120px] bg-purple-600 hover:bg-purple-700"
                      >
                        {processingAction ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Assigning...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            Assign Ticket
                          </div>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Enhanced Status Update Dialog */}
                <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800">
                      <Settings className="h-4 w-4 mr-2" />
                      Update Status
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                          <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        Update Ticket Status
                      </DialogTitle>
                      <DialogDescription>
                        Current status: {STATUS_LABELS[ticket.status]}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Current Status:</span>
                          <Badge className={`${STATUS_COLORS[ticket.status]}`}>
                            {STATUS_LABELS[ticket.status]}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">New Status</Label>
                        <Select
                          value={adminActions.newStatus}
                          onValueChange={(value) => setAdminActions(prev => ({ ...prev, newStatus: value as TicketStatus }))}
                        >
                          <SelectTrigger className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <SelectValue placeholder="Select status..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  {getStatusIcon(value as TicketStatus)}
                                  {label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Internal Note <span className="text-slate-500">(Optional)</span></Label>
                        <Textarea
                          value={adminActions.actionNote}
                          onChange={(e) => setAdminActions(prev => ({ ...prev, actionNote: e.target.value }))}
                          placeholder="Add internal note about the status change..."
                          rows={3}
                          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-3">
                      <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleStatusUpdate} 
                        disabled={!adminActions.newStatus || processingAction}
                        className="min-w-[120px] bg-blue-600 hover:bg-blue-700"
                      >
                        {processingAction ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            Update Status
                          </div>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Enhanced Priority Update Dialog */}
                <Dialog open={priorityDialogOpen} onOpenChange={setPriorityDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Set Priority
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        Update Ticket Priority
                      </DialogTitle>
                      <DialogDescription>
                        Current priority: {PRIORITY_LABELS[ticket.priority]}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Current Priority:</span>
                          <Badge className={`${PRIORITY_COLORS[ticket.priority]}`}>
                            {PRIORITY_LABELS[ticket.priority]}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">New Priority</Label>
                        <Select
                          value={adminActions.newPriority}
                          onValueChange={(value) => setAdminActions(prev => ({ ...prev, newPriority: value as TicketPriority }))}
                        >
                          <SelectTrigger className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <SelectValue placeholder="Select priority..." />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                <div className="flex items-center gap-2">
                                  {getPriorityIcon(value as TicketPriority)}
                                  {label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-base font-medium">Internal Note <span className="text-slate-500">(Optional)</span></Label>
                        <Textarea
                          value={adminActions.actionNote}
                          onChange={(e) => setAdminActions(prev => ({ ...prev, actionNote: e.target.value }))}
                          placeholder="Add internal note about the priority change..."
                          rows={3}
                          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                      </div>
                    </div>
                    <DialogFooter className="gap-3">
                      <Button variant="outline" onClick={() => setPriorityDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handlePriorityUpdate} 
                        disabled={!adminActions.newPriority || processingAction}
                        className="min-w-[120px] bg-orange-600 hover:bg-orange-700"
                      >
                        {processingAction ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Update Priority
                          </div>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Enhanced Delete Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                          <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
                        </div>
                        Delete Ticket
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this ticket? This action cannot be undone and will permanently remove all ticket data, replies, and attachments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3">
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteTicket}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {processingAction ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Deleting...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            Delete Ticket
                          </div>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Quick Info Cards for Admin */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Status Card */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  STATUS_COLORS[ticket.status]?.includes('green') ? 'bg-green-100 dark:bg-green-900/50' :
                  STATUS_COLORS[ticket.status]?.includes('blue') ? 'bg-blue-100 dark:bg-blue-900/50' :
                  STATUS_COLORS[ticket.status]?.includes('yellow') ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                  STATUS_COLORS[ticket.status]?.includes('red') ? 'bg-red-100 dark:bg-red-900/50' :
                  STATUS_COLORS[ticket.status]?.includes('purple') ? 'bg-purple-100 dark:bg-purple-900/50' :
                  STATUS_COLORS[ticket.status]?.includes('orange') ? 'bg-orange-100 dark:bg-orange-900/50' :
                  'bg-slate-100 dark:bg-slate-800'
                }`}>
                  {getStatusIcon(ticket.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Status</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{STATUS_LABELS[ticket.status]}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Response Time & Activity Card */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  ticket.replies.length > 0 ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Activity</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {getTimeAgo(ticket.updatedAt)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ticket.replies.length} replies
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Priority & Escalation Card */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  ticket.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/50' :
                  ticket.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/50' :
                  ticket.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                  'bg-green-100 dark:bg-green-900/50'
                }`}>
                  {ticket.priority === 'urgent' ? (
                    <Zap className="h-5 w-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Priority</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{PRIORITY_LABELS[ticket.priority]}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ticket.priority === 'urgent' ? 'Requires immediate attention' :
                     ticket.priority === 'high' ? 'Escalated priority' :
                     ticket.priority === 'medium' ? 'Standard priority' : 'Low priority'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Satisfaction Card */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/50">
                  {ticket.customerSatisfactionRating ? (
                    <Star className="h-5 w-5 text-purple-600 dark:text-purple-400 fill-current" />
                  ) : (
                    <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Customer</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {ticket.user?.name || 
                     (ticket.user?.firstName && ticket.user?.lastName ? `${ticket.user.firstName} ${ticket.user.lastName}` : null) ||
                     ticket.user?.firstName || ticket.user?.lastName || 
                     ticket.user?.email || ticket.userEmail || 'Unknown Customer'
                    }
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ticket.user?.company || 'Individual customer'}
                    {ticket.customerSatisfactionRating && ` • ${ticket.customerSatisfactionRating}/5 rating`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Service Information Card - Enhanced to always show */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/50">
                    <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  Service Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Service & Country Info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <h4 className="font-medium text-slate-900 dark:text-slate-100">Service Details</h4>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Service Type:</span>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{SERVICE_LABELS[ticket.service]}</p>
                      </div>
                      {ticket.country && (
                        <div>
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Target Country:</span>
                          <p className="font-medium text-slate-900 dark:text-slate-100">{getFullCountryName(ticket.country)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Call Examples */}
                {ticket.outboundCallData?.examples && ticket.outboundCallData.examples.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">Call Examples</h4>
                    </div>
                    <div className="space-y-2">
                      {ticket.outboundCallData.examples.map((example, index) => (
                        <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Number:</span>
                              <p className="font-mono text-slate-900 dark:text-slate-100">{example.number}</p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Call Date:</span>
                              <p className="text-slate-900 dark:text-slate-100">{formatDate(example.callDate)}</p>
                            </div>
                            {example.description && (
                              <div>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Description:</span>
                                <p className="text-slate-900 dark:text-slate-100">{example.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Phone Numbers */}
                {ticket.selectedPhoneNumbers && ticket.selectedPhoneNumbers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">Customer Selected Numbers</h4>
                      <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200">
                        {ticket.selectedPhoneNumbers.length} selected
                      </Badge>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-2 font-medium">
                        Phone numbers the customer selected as related to this issue:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ticket.selectedPhoneNumbers.map((phoneNumber, index) => (
                          <div key={index} className="flex items-center p-2 bg-white dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center mr-3">
                              <MessageCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                                {phoneNumber}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Assigned Numbers */}
                {ticket.assignedNumbers && ticket.assignedNumbers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">Assigned Numbers</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {ticket.assignedNumbers.map((assignedNumber, index) => (
                        <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                          <div className="space-y-1">
                            <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">{assignedNumber.number}</p>
                            {assignedNumber.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">{assignedNumber.description}</p>
                            )}
                            {assignedNumber.type && (
                              <Badge variant="outline" className="text-xs">{assignedNumber.type}</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Description Card */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/50">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Original Attachments */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/50">
                      <Paperclip className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    Attachments ({ticket.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {ticket.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                            {getFileIcon(attachment.mimeType)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{attachment.originalName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(attachment.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handlePreviewAttachment(attachment)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={attachment.url || `/uploads/tickets/${attachment.filename}`}
                              download={attachment.originalName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 dark:rounded-2xl">
            
            {/* Ticket Details Card */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                    <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  </div>
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Information */}
                <div>
                  <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">Customer Information</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Name</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {ticket.user?.name || 
                         (ticket.user?.firstName && ticket.user?.lastName ? `${ticket.user.firstName} ${ticket.user.lastName}` : null) ||
                         ticket.user?.firstName || ticket.user?.lastName || 
                         ticket.user?.email || ticket.userEmail || 'Unknown Customer'
                        }
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Email</span>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{ticket.user?.email || ticket.userEmail}</p>
                    </div>
                    {ticket.user?.phone && (
                      <div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Phone</span>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{ticket.user.phone}</p>
                      </div>
                    )}
                    {ticket.user?.company && (
                      <div>
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Company</span>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{ticket.user.company}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Metadata */}
                <div className="space-y-3">
                  {ticket.estimatedResolutionTime && (
                    <div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Estimated Resolution</span>
                      <p className="font-medium text-amber-600 dark:text-amber-400">{formatDate(ticket.estimatedResolutionTime)}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Resolved Date</span>
                    {ticket.resolvedAt ? (
                      <p className="font-medium text-green-600 dark:text-green-400">{formatDate(ticket.resolvedAt)}</p>
                    ) : (
                      <p className="font-medium text-slate-500 dark:text-slate-400">Not yet resolved</p>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Customer Rating</span>
                    {ticket.customerSatisfactionRating ? (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-current" />
                          <p className="font-medium text-amber-600 dark:text-amber-400">{ticket.customerSatisfactionRating}/5</p>
                        </div>
                      </div>
                    ) : (
                      <p className="font-medium text-slate-500 dark:text-slate-400">Not yet rated</p>
                    )}
                  </div>

                  <div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Assigned To</span>
                    {ticket.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {formatAssignedUser(ticket.assignedTo)}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <p className="font-medium text-orange-600 dark:text-orange-400">Unassigned</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tags Card */}
            {ticket.tags && ticket.tags.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/50">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    Tags
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {ticket.tags.map((tag, index) => (
                      <Badge key={index} className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-1 text-xs font-medium border-0 rounded-md">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Internal Notes (Admin Only) */}
            {ticket.internalNotes && (
              <Card className="bg-purple-50/80 dark:bg-purple-950/20 backdrop-blur-sm shadow-lg rounded-2xl border border-purple-200 dark:border-purple-800/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/50">
                      <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    Internal Notes
                    <Badge variant="secondary" className="text-xs">Admin Only</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-purple-100/50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-700/50">
                    <p className="text-purple-900 dark:text-purple-100 whitespace-pre-wrap text-sm leading-relaxed">{ticket.internalNotes}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Conversation Section - Full Width */}
        <div className="mt-8 space-y-6 dark:rounded-2xl">
          
          {/* Conversation */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/50">
                    <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <span>Conversation & Internal Notes</span>
                    <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                      ({ticket.replies.length} total)
                    </span>
                  </div>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInternalNotes(!showInternalNotes)}
                  className="border-0 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  {showInternalNotes ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showInternalNotes ? 'Hide' : 'Show'} Internal Notes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticket.replies.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">No messages yet</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">Customer replies and internal notes will appear here</p>
                  </div>
                ) : (
                  ticket.replies
                    .filter(reply => showInternalNotes || !reply.isInternal)
                    .map((reply, index) => (
                      <div key={index} className="flex gap-3">
                        <Avatar className="h-8 w-8 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                          <AvatarFallback className={`text-xs font-medium ${
                            reply.isInternal
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                              : reply.authorType === 'admin' 
                                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {reply.author 
                              ? getUserInitials(reply.author.email, reply.author.name, reply.author.firstName, reply.author.lastName)
                              : reply.authorType === 'admin' ? 'S' : 'C'
                            }
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {reply.author 
                                ? reply.author.name || (reply.author.firstName && reply.author.lastName ? `${reply.author.firstName} ${reply.author.lastName}` : reply.author.firstName || reply.author.lastName) || reply.author.email
                                : reply.authorType === 'admin' ? 'Support Team' : 'Customer'
                              }
                            </span>
                            <Badge variant="outline" className={`text-xs ${
                              reply.isInternal
                                ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800'
                                : reply.authorType === 'admin' 
                                  ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {reply.isInternal ? 'Internal Note' : reply.authorType === 'admin' ? 'Support' : 'Customer'}
                            </Badge>
                            <span className="text-slate-500 dark:text-slate-500">
                              {formatDate(reply.createdAt)}
                            </span>
                          </div>
                          <div className={`rounded-lg p-3 shadow-sm transition-colors hover:shadow-md ${
                            reply.isInternal
                              ? 'bg-orange-50/80 dark:bg-orange-950/20 border border-orange-200/50 dark:border-orange-800/50'
                              : reply.authorType === 'admin' 
                                ? 'bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50' 
                                : 'bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
                          }`}>
                            <div 
                              className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed prose prose-sm max-w-none prose-slate dark:prose-invert"
                              dangerouslySetInnerHTML={{ __html: reply.content }}
                            />
                            
                            {/* Reply Attachments */}
                            {reply.attachments && reply.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Paperclip className="h-3 w-3 text-slate-500" />
                                  <span className="text-xs text-slate-500">Attachments</span>
                                </div>
                                {reply.attachments.map((attachment, attachIndex) => (
                                  <div
                                    key={attachIndex}
                                    className="flex items-center justify-between p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <div className="p-1 bg-slate-100 dark:bg-slate-700 rounded">
                                        {getFileIcon(attachment.mimeType)}
                                      </div>
                                      <div>
                                        <p className="text-xs font-medium text-slate-900 dark:text-slate-100">
                                          {attachment.originalName}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {formatFileSize(attachment.size)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handlePreviewAttachment(attachment)}
                                        title="Preview"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" asChild>
                                        <a
                                          href={attachment.url || `/uploads/tickets/${attachment.filename}`}
                                          download={attachment.originalName}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                                        >
                                          <Download className="h-4 w-4" />
                                        </a>
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Admin Reply Forms */}
          <Tabs defaultValue="reply" className="space-y-6 dark:rounded-2xl">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800">
              <TabsTrigger value="reply" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                Customer Reply
              </TabsTrigger>
              <TabsTrigger value="internal" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Internal Note
              </TabsTrigger>
            </TabsList>

            {/* Enhanced Customer Reply Tab */}
            <TabsContent value="reply">
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/50">
                      <Send className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Reply to Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="reply-content" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Your Response
                      </Label>
                      <WysiwygEditor
                        id="reply-content"
                        value={replyContent}
                        onChange={(value) => handleEditorChange(value, false)}
                        onKeyDown={(event) => handleEditorKeyDown(event, false)}
                        placeholder="Type your response to the customer here... (Type '/' for canned responses)"
                        minHeight="120px"
                        toolbar="standard"
                        className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl transition-all duration-200"
                      />
                    </div>

                    {/* Enhanced File Upload for Customer Reply */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Attachments</Label>
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center bg-slate-50 dark:bg-slate-800/50 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all duration-300 cursor-pointer">
                        <div className="space-y-4">
                          <div className="mx-auto w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                            <Upload className="h-6 w-6 text-slate-500" />
                          </div>
                          <div className="space-y-1">
                            <label htmlFor="reply-file-upload" className="cursor-pointer">
                              <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                                Click to upload files
                              </p>
                              <input
                                id="reply-file-upload"
                                type="file"
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                                className="sr-only"
                                onChange={handleFileUpload}
                                disabled={uploadingFiles}
                              />
                            </label>
                            <p className="text-sm text-slate-500">
                              Screenshots, documents, logs • PNG, JPG, PDF, DOC, TXT • Up to 10MB each
                            </p>
                          </div>
                        </div>
                      </div>

                      {uploadingFiles && (
                        <div className="flex items-center justify-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl">
                          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Uploading files...</span>
                        </div>
                      )}

                      {/* Enhanced Reply Attachment List */}
                      {replyAttachments.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Attached Files ({replyAttachments.length})</span>
                          </div>
                          <div className="space-y-2">
                            {replyAttachments.map((attachment, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                                    {getFileIcon(attachment.mimeType)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                      {attachment.originalName}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      {formatFileSize(attachment.size)}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttachment(index)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleSubmitReply(false)}
                        disabled={!getPlainTextFromHtml(replyContent).trim() || isSubmittingReply || uploadingFiles}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
                      >
                        {isSubmittingReply || uploadingFiles ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Sending...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            <span>Send Reply</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Enhanced Internal Note Tab */}
            <TabsContent value="internal">
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
                      <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    Add Internal Note
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Internal notes are only visible to admin users and won't be sent to the customer.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="internal-note-content" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Internal Note
                      </Label>
                      <WysiwygEditor
                        id="internal-note-content"
                        value={internalNoteContent}
                        onChange={(value) => handleEditorChange(value, true)}
                        onKeyDown={(event) => handleEditorKeyDown(event, true)}
                        placeholder="Add an internal note for your team... (Type '/' for canned responses)"
                        minHeight="100px"
                        toolbar="basic"
                        className="border-orange-200 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-400 rounded-xl transition-all duration-200"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={() => handleSubmitReply(true)}
                        disabled={!getPlainTextFromHtml(internalNoteContent).trim() || isSubmittingNote}
                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6"
                      >
                        {isSubmittingNote ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-orange-600/30 border-t-orange-600 rounded-full animate-spin"></div>
                            <span>Adding...</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Add Note</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Canned Response Picker */}
      <CannedResponsePicker
        isOpen={showCannedPicker}
        onSelect={handleCannedResponseSelect}
        onClose={() => setShowCannedPicker(false)}
        position={cannedPickerPosition}
        searchQuery={cannedSearchQuery}
        ticketService={ticket?.service}
      />

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <AttachmentPreview
          attachment={previewAttachment}
          isOpen={showPreview}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
} 