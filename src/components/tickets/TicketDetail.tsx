'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTickets } from '@/hooks/useTickets';
import { 
  TicketReply,
  SERVICE_LABELS, 
  PRIORITY_LABELS, 
  STATUS_LABELS,
  PRIORITY_COLORS,
  STATUS_COLORS,
  TicketAttachment,
  canReopenTicket,
  canReRateTicket,
  getTimeRemaining,
  ACTION_RESTRICTIONS
} from '@/types/ticket';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
  Archive,
  RefreshCw,
  Timer,
  CircleDot,
  Heart,
  Sparkles,
  MessageSquare,
  Building,
  Tag,
  Settings,
  Info,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import WysiwygEditor from '@/components/ui/WysiwygEditor';
import AttachmentPreview from '@/components/ui/AttachmentPreview';

interface TicketDetailProps {
  ticketId: string;
}

export default function TicketDetail({ ticketId }: TicketDetailProps) {
  const { 
    ticket, 
    loading, 
    error, 
    fetchTicket, 
    updateTicket, 
    uploadFiles,
    clearError,
    clearTicket
  } = useTickets();

  const [newReply, setNewReply] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [showSatisfactionRating, setShowSatisfactionRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [isDialogShaking, setIsDialogShaking] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Check restrictions
  const reopenCheck = ticket ? canReopenTicket(ticket) : { allowed: false };
  const reRateCheck = ticket ? canReRateTicket(ticket) : { allowed: false };

  useEffect(() => {
    if (ticketId) {
      clearError();
      clearTicket();
      setNewReply('');
      setReplyAttachments([]);
      setShowSatisfactionRating(false);
      fetchTicket(ticketId);
    }
  }, [ticketId, fetchTicket, clearError, clearTicket]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  // File upload with drag and drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setReplyAttachments(prev => [...prev, ...acceptedFiles].slice(0, 5));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploadingFiles
  });

  const removeAttachment = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReply.trim()) return;

    setIsSubmittingReply(true);
    clearError();

    try {
      let attachments: TicketAttachment[] = [];
      
      if (replyAttachments.length > 0) {
        setUploadingFiles(true);
        const fileList = new DataTransfer();
        replyAttachments.forEach(file => fileList.items.add(file));
        attachments = await uploadFiles(fileList.files);
      }

      const success = await updateTicket(ticketId, {
        action: 'add_reply',
        content: newReply,
        attachments,
      });

      if (success) {
        setNewReply('');
        setReplyAttachments([]);
      }
    } catch (err) {
      console.error('Reply submission error:', err);
    } finally {
      setIsSubmittingReply(false);
      setUploadingFiles(false);
    }
  };



  const handleReopenTicket = async () => {
    // Check if reopening is allowed
    if (!reopenCheck.allowed) {
      console.warn('Reopening not allowed:', reopenCheck.reason);
      return;
    }
    
    try {
      await updateTicket(ticketId, {
        action: 'reopen_ticket',
      });
    } catch (error: unknown) {
      // Handle specific error codes from API
      const ticketError = error as { code?: string; message?: string };
      if (ticketError?.code === 'REOPEN_TIME_EXPIRED') {
        console.error('Reopen time expired:', ticketError.message);
        // The UI will automatically update to show the restriction
      } else {
        console.error('Error reopening ticket:', error);
      }
    }
  };

  const handleMarkResolved = async () => {
    const success = await updateTicket(ticketId, {
      action: 'update_status',
      status: 'resolved',
    });
    
    if (success) {
      // Show satisfaction rating modal when ticket is marked as resolved
      setShowSatisfactionRating(true);
    }
  };

  const handleSatisfactionRating = async (selectedRating: number) => {
    setRating(selectedRating);
    
    // If rating is 2 or less, don't submit yet - let user add comment
    if (selectedRating <= 2) {
      return; // Keep dialog open for comment
    }
    
    // For ratings 3+, submit immediately
    setIsSubmittingRating(true);
    
    try {
      await updateTicket(ticketId, {
        action: 'rate_satisfaction',
        rating: selectedRating,
      });
      
      setShowSatisfactionRating(false);
      setRating(0);
      setRatingComment('');
    } catch (error: unknown) {
      // Handle specific error codes from API
      const ratingError = error as { code?: string; message?: string };
      if (ratingError?.code === 'RERATING_TIME_EXPIRED') {
        console.error('Re-rating time expired:', ratingError.message);
        setShowSatisfactionRating(false);
        setRating(0);
        setRatingComment('');
      } else {
        console.error('Error submitting rating:', error);
      }
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleSubmitRatingWithComment = async () => {
    if (rating <= 2 && !ratingComment.trim()) {
      return; // Don't submit if comment is required but empty
    }
    
    setIsSubmittingRating(true);
    
    try {
      await updateTicket(ticketId, {
        action: 'rate_satisfaction',
        rating: rating,
        comment: ratingComment,
      });
      
      setShowSatisfactionRating(false);
      setRating(0);
      setRatingComment('');
    } catch (error: unknown) {
      // Handle specific error codes from API
      const commentError = error as { code?: string; message?: string };
      if (commentError?.code === 'RERATING_TIME_EXPIRED') {
        console.error('Re-rating time expired:', commentError.message);
        setShowSatisfactionRating(false);
        setRating(0);
        setRatingComment('');
      } else {
        console.error('Error submitting rating with comment:', error);
      }
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleCancelRating = () => {
    setShowSatisfactionRating(false);
    setRating(0);
    setRatingComment('');
    setIsDialogShaking(false);
  };

  const handleReRate = () => {
    // Check if re-rating is allowed
    if (!reRateCheck.allowed) {
      // Could show a toast or error message here
      console.warn('Re-rating not allowed:', reRateCheck.reason);
      return;
    }
    
    // Reset all rating states for a fresh rating experience
    setRating(0);
    setRatingComment('');
    setIsDialogShaking(false);
    setShowSatisfactionRating(true);
  };



  // Utility functions
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

  // Helper function to identify system messages
  const isSystemMessage = (reply: TicketReply) => {
    const systemMessages = [
      '✅ Customer marked this ticket as resolved.',
      '🔄 Customer reopened this ticket.',
      '🔄 Support team changed status to',
      '👤 Ticket assigned to',
      '👤 Ticket unassigned.',
      '⚡ Support team changed priority to',
      '⭐', // Rating messages contain star emojis
      'Status changed to',
      'Priority changed to',
      'Ticket closed'
    ];
    return systemMessages.some(msg => reply.content.includes(msg));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <CircleDot className="h-4 w-4" />;
      case 'waiting_admin': return <Timer className="h-4 w-4" />;
      case 'resolved': return <CheckCircle2 className="h-4 w-4" />;
      case 'closed': return <Archive className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
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

  const getUserInitials = (email: string, firstName?: string, lastName?: string, name?: string) => {
    // If name field exists, extract initials from it
    if (name) {
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
      }
      return name[0].toUpperCase();
    }
    
    // Fallback to firstName/lastName
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const formatAssignedUser = (assignedTo: string | { _id: string; email: string; firstName?: string; lastName?: string; name?: string; role?: string; }) => {
    if (typeof assignedTo === 'string') {
      return assignedTo; // Just the ID string
    }
    
    // If it's an object with user details
    const { firstName, lastName, name, email, role } = assignedTo;
    
    // Prioritize the 'name' field (from database)
    if (name && name.trim()) {
      return name.trim();
    }
    
    // Fallback to firstName/lastName combination
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

  // Function to trigger shake animation when trying to close modal
  const triggerDialogShake = () => {
    setIsDialogShaking(true);
    setTimeout(() => setIsDialogShaking(false), 500); // Reset after animation
  };

  const handlePreviewAttachment = (attachment: TicketAttachment) => {
    setPreviewAttachment(attachment);
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewAttachment(null);
  };

  // Loading state
  if (loading && !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 dark:rounded-2xl">
        <div className="text-center space-y-8">
          <div className="relative mx-auto w-20 h-20">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 w-20 h-20 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
            {/* Inner spinning ring with gradient */}
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-spin border-t-blue-600 border-r-blue-500 border-b-blue-400"></div>
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-3 max-w-sm mx-auto">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Loading ticket details</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Please wait while we load your information</p>
            {/* Progress indicator */}
            <div className="w-32 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !loading && !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 dark:rounded-2xl">
        <div className="text-center max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-red-900 dark:text-red-100">Error Loading Ticket</h3>
            <p className="text-red-700 dark:text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Not found state
  if (!loading && !error && !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 dark:rounded-2xl">
        <div className="text-center max-w-md mx-auto space-y-6">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Ticket Not Found</h3>
            <p className="text-slate-600 dark:text-slate-400">This ticket doesn't exist or you don't have permission to view it.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-900 dark:rounded-2xl">
        <div className="text-center space-y-8">
          <div className="relative mx-auto w-20 h-20">
            {/* Outer spinning ring */}
            <div className="absolute inset-0 w-20 h-20 border-4 border-slate-200 dark:border-slate-700 rounded-full"></div>
            {/* Inner spinning ring with gradient */}
            <div className="absolute inset-0 w-20 h-20 border-4 border-transparent rounded-full animate-spin border-t-blue-600 border-r-blue-500 border-b-blue-400"></div>
            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
            </div>
          </div>
          <div className="space-y-3 max-w-sm mx-auto">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Loading ticket details</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Please wait while we load your information</p>
            {/* Progress indicator */}
            <div className="w-32 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 dark:rounded-2xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              <MessageCircle className="h-4 w-4" />
              Support Ticket
            </div>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {ticket.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Ticket #{ticket.ticketNumber} • Created {formatDate(ticket.createdAt)}
          </p>
        </div>

        {/* Error Message */}
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

        {/* Satisfaction Rating Dialog */}
        <Dialog open={showSatisfactionRating} onOpenChange={() => {}}>
          <DialogContent 
            className="sm:max-w-md"
            onPointerDownOutside={(e) => {
              e.preventDefault();
              triggerDialogShake();
            }}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              triggerDialogShake();
            }}
          >
            <motion.div
              animate={isDialogShaking ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Close button - always show and always works */}
              <button
                onClick={handleCancelRating}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-50"
                disabled={isSubmittingRating}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>

              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  How was our support?
                </DialogTitle>
                <DialogDescription>
                  Your feedback helps us improve our service quality
                </DialogDescription>
              </DialogHeader>

              <div className="py-6">
                {/* Star Rating */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">Rate your experience</Label>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <button
                        key={stars}
                        onClick={() => handleSatisfactionRating(stars)}
                        disabled={isSubmittingRating}
                        className={`group p-3 rounded-xl transition-all duration-200 hover:scale-110 ${
                          rating >= stars 
                            ? 'bg-amber-100 dark:bg-amber-900/50' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Star className={`w-8 h-8 transition-colors ${
                          rating >= stars 
                            ? 'text-amber-500 fill-current' 
                            : 'text-slate-300 dark:text-slate-600 group-hover:text-amber-400'
                        }`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment Field for Low Ratings */}
                {rating > 0 && rating <= 2 && (
                  <div className="mt-6 space-y-3">
                    <Label htmlFor="rating-comment" className="text-sm font-medium text-red-700 dark:text-red-400">
                      Help us improve - What went wrong? *
                    </Label>
                    <Textarea
                      id="rating-comment"
                      placeholder="Please tell us what we could have done better..."
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      className="min-h-[100px] border-red-200 dark:border-red-800 focus:border-red-400 dark:focus:border-red-600"
                      disabled={isSubmittingRating}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6">
                  {/* Buttons for Low Ratings with Comment */}
                  {rating > 0 && rating <= 2 && (
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        onClick={handleCancelRating}
                        disabled={isSubmittingRating}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSubmitRatingWithComment}
                        disabled={isSubmittingRating || !ratingComment.trim()}
                        className="flex-1 bg-amber-600 hover:bg-amber-700"
                      >
                        {isSubmittingRating ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </div>
                        ) : (
                          'Submit Feedback'
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Success Message and Close Button for High Ratings */}
                  {rating >= 3 && (
                    <div className="text-center space-y-4">
                      <div className="text-green-600 dark:text-green-400 font-medium">
                        Thank you for your {rating} star rating!
                      </div>
                      {isSubmittingRating ? (
                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting your rating...
                        </div>
                      ) : (
                        <Button 
                          onClick={handleCancelRating}
                          className="bg-green-600 hover:bg-green-700 px-8"
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  )}

                  {/* No Rating Selected - Show Instructions and Skip Option */}
                  {rating === 0 && (
                    <div className="text-center space-y-4">
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Please select a rating above to continue
                      </p>
                      <Button 
                        variant="outline"
                        onClick={handleCancelRating}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        Skip Rating
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>

        {/* Quick Info Cards */}
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

          {/* Priority Card */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  PRIORITY_COLORS[ticket.priority]?.includes('red') ? 'bg-red-100 dark:bg-red-900/50' :
                  PRIORITY_COLORS[ticket.priority]?.includes('orange') ? 'bg-orange-100 dark:bg-orange-900/50' :
                  PRIORITY_COLORS[ticket.priority]?.includes('yellow') ? 'bg-yellow-100 dark:bg-yellow-900/50' :
                  'bg-slate-100 dark:bg-slate-800'
                }`}>
                  <AlertCircle className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Priority</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{PRIORITY_LABELS[ticket.priority]}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Card */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/50">
                  <Building className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Service</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{SERVICE_LABELS[ticket.service]}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Agent Card */}
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  ticket.assignedTo ? 'bg-green-100 dark:bg-green-900/50' : 'bg-orange-100 dark:bg-orange-900/50'
                }`}>
                  <User className={`h-5 w-5 ${
                    ticket.assignedTo ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Assigned Agent</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {ticket.assignedTo ? formatAssignedUser(ticket.assignedTo) : 'Unassigned'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {ticket.assignedTo ? 'Support agent handling your ticket' : 'Waiting for assignment'}
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
                      {ticket.outboundCallData?.examples?.map((example, index) => (
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
                      <h4 className="font-medium text-slate-900 dark:text-slate-100">Related Phone Numbers</h4>
                      <Badge variant="outline" className="text-xs text-indigo-600 border-indigo-200">
                        {ticket.selectedPhoneNumbers.length} selected
                      </Badge>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-2 font-medium">
                        Numbers you selected as related to this issue:
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
                      {ticket.assignedNumbers?.map((assignedNumber, index) => (
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
                  <div 
                    className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none prose-slate dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: ticket.description }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Attachments Card */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100 dark:bg-purple-900/50">
                      <Paperclip className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    Attachments ({ticket.attachments?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {ticket.attachments?.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                            {getFileIcon(attachment.mimeType)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{attachment.originalName}</p>
                            <p className="text-xs text-slate-500">{formatFileSize(attachment.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handlePreviewAttachment(attachment)}
                            title="Preview"
                            className="h-6 w-6 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                            <a
                              href={attachment.url || `/uploads/tickets/${attachment.filename}`}
                              download={attachment.originalName}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <Download className="h-3 w-3" />
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
            
            {/* Actions Card */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/50">
                    <CircleDot className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Mark as Resolved - Show for all active statuses */}
                {(ticket.status === 'open' || ticket.status === 'in_progress' || ticket.status === 'waiting_admin' || ticket.status === 'waiting_user') && (
                  <Button 
                    onClick={handleMarkResolved} 
                    className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md"
                    size="sm"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark as Resolved
                  </Button>
                )}

                {/* Reopen Ticket - Show when closed or resolved */}
                {(ticket.status === 'closed' || ticket.status === 'resolved') && (
                  <div className="space-y-2">
                    <Button 
                      onClick={handleReopenTicket} 
                      variant="outline"
                      disabled={!reopenCheck.allowed}
                      className={`w-full ${
                        reopenCheck.allowed 
                          ? 'border-amber-300 text-amber-600 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-950/20' 
                          : 'border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500 cursor-not-allowed'
                      }`}
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reopen Ticket
                    </Button>
                    
                    {/* Show restriction message */}
                    {!reopenCheck.allowed && reopenCheck.reason && (
                      <div className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-xs text-slate-600 dark:text-slate-400">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{reopenCheck.reason}</span>
                      </div>
                    )}
                    
                    {/* Show time remaining if within restriction period */}
                    {reopenCheck.allowed && ticket.resolvedAt && (
                      <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md text-xs text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>
                          {getTimeRemaining(
                            ticket.status === 'resolved' ? ticket.resolvedAt : ticket.closedAt!, 
                            ACTION_RESTRICTIONS.REOPEN_HOURS
                          )} to reopen
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Information text based on status */}
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  {ticket.status === 'open' && "Mark as resolved when your issue is fixed"}
                  {ticket.status === 'in_progress' && "Mark as resolved when your issue is fixed"}
                  {ticket.status === 'waiting_admin' && "Mark as resolved when your issue is fixed"}
                  {ticket.status === 'waiting_user' && "Mark as resolved when your issue is fixed"}
                  {ticket.status === 'resolved' && (
                    reopenCheck.allowed 
                      ? "Reopen if you need further assistance" 
                      : "Tickets can only be reopened within 48 hours"
                  )}
                  {ticket.status === 'closed' && (
                    reopenCheck.allowed 
                      ? "Reopen if you need further assistance" 
                      : "Tickets can only be reopened within 48 hours"
                  )}
                </div>
              </CardContent>
            </Card>
            
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
              <CardContent className="space-y-3">
                {ticket.estimatedResolutionTime && (
                  <div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Estimated Resolution</span>
                    <p className="font-medium text-amber-600 dark:text-amber-400">{formatDate(ticket.estimatedResolutionTime)}</p>
                  </div>
                )}

                <div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Resolve Date</span>
                  {ticket.resolvedAt ? (
                    <p className="font-medium text-green-600 dark:text-green-400">{formatDate(ticket.resolvedAt)}</p>
                  ) : (
                    <p className="font-medium text-slate-500 dark:text-slate-400">Not yet resolved</p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Rating</span>
                  {ticket.customerSatisfactionRating ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-amber-500 fill-current" />
                          <p className="font-medium text-amber-600 dark:text-amber-400">{ticket.customerSatisfactionRating}/5</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReRate}
                          disabled={!reRateCheck.allowed}
                          className={`h-7 px-3 text-xs ${
                            reRateCheck.allowed
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 hover:border-amber-300 dark:bg-amber-950/20 dark:hover:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 dark:hover:border-amber-700'
                              : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600 cursor-not-allowed'
                          }`}
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Re-rate
                        </Button>
                      </div>
                      
                      {/* Show restriction message or time remaining */}
                      {!reRateCheck.allowed && reRateCheck.reason && (
                        <div className="flex items-start gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-xs text-slate-600 dark:text-slate-400">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{reRateCheck.reason}</span>
                        </div>
                      )}
                      
                      {reRateCheck.allowed && ticket.resolvedAt && (
                        <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-md text-xs text-amber-600 dark:text-amber-400">
                          <Clock className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>
                            {getTimeRemaining(
                              ticket.status === 'resolved' ? ticket.resolvedAt : ticket.closedAt!, 
                              ACTION_RESTRICTIONS.RERATING_HOURS
                            )} to re-rate
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="font-medium text-slate-500 dark:text-slate-400">Not yet rated</p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Last Updated</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100">{getTimeAgo(ticket.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Tags Card */}
            {ticket.tags && ticket.tags.length > 0 && (
              <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/50">
                      <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
                  <div className="bg-purple-100/50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200/50 dark:border-purple-700/50">
                    <div 
                      className="text-purple-900 dark:text-purple-100 whitespace-pre-wrap text-sm leading-relaxed prose prose-sm max-w-none prose-slate dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: ticket.internalNotes }}
                    />
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
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100 dark:bg-blue-900/50">
                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <span>Conversation</span>
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                    ({ticket.replies.filter(reply => !reply.isInternal).length} messages)
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticket.replies.filter(reply => !reply.isInternal).length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <MessageCircle className="h-6 w-6 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-600 dark:text-slate-400 mb-1">No messages yet</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500">Start the conversation below</p>
                  </div>
                ) : (
                  ticket.replies
                    .filter(reply => !reply.isInternal)
                    .map((reply, index) => {
                      const isSystem = isSystemMessage(reply);
                      
                      return (
                        <div key={index} className="flex gap-3">
                          <Avatar className="h-8 w-8 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
                            <AvatarFallback className={`text-xs font-medium ${
                              isSystem
                                ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                                : reply.authorType === 'admin' 
                                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}>
                              {isSystem ? (
                                <Settings className="h-4 w-4" />
                              ) : (
                                reply.author 
                                  ? getUserInitials(reply.author.email, reply.author.firstName, reply.author.lastName, reply.author.name)
                                  : reply.authorType === 'admin' ? 'S' : 'Y'
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-slate-900 dark:text-slate-100">
                                {isSystem ? 'System' : (
                                  reply.author 
                                    ? reply.author.name || (reply.author.firstName && reply.author.lastName ? `${reply.author.firstName} ${reply.author.lastName}` : reply.author.firstName || reply.author.lastName) || reply.author.email
                                    : reply.authorType === 'admin' ? 'Support Team' : 'You'
                                )}
                              </span>
                              <Badge variant="outline" className={`text-xs ${
                                isSystem
                                  ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                                  : reply.authorType === 'admin' 
                                    ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800' 
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}>
                                {isSystem ? 'System' : (reply.authorType === 'admin' ? 'Support' : 'Customer')}
                              </Badge>
                              <span className="text-slate-500 dark:text-slate-500">
                                {formatDate(reply.createdAt)}
                              </span>
                            </div>
                            <div className={`rounded-lg p-3 shadow-sm transition-colors hover:shadow-md ${
                              isSystem
                                ? 'bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50'
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
                                      <div className="flex items-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handlePreviewAttachment(attachment)}
                                          title="Preview"
                                          className="h-6 w-6 p-0"
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="sm" asChild className="h-6 w-6 p-0">
                                          <a
                                            href={attachment.url || `/uploads/tickets/${attachment.filename}`}
                                            download={attachment.originalName}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400"
                                          >
                                            <Download className="h-3 w-3" />
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
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Reply Form */}
          {ticket.status !== 'closed' && (
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-lg rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-900/50">
                    <Send className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  Add Reply
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleReplySubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="reply-content" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Your Message
                    </Label>
                    <WysiwygEditor
                      id="reply-content"
                      value={newReply}
                      onChange={(value) => setNewReply(value)}
                      placeholder="Type your message here..."
                      minHeight="120px"
                      toolbar="standard"
                      className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl transition-all duration-200"
                    />
                  </div>

                  {/* File Upload with Drag & Drop */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">Attachments</Label>
                      <div className="text-xs text-slate-500">
                        Max 5 files, 10MB each
                      </div>
                    </div>
                    
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
                        isDragActive
                          ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 shadow-md'
                          : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="space-y-4">
                        <div className="mx-auto w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                          <Upload className="h-6 w-6 text-slate-500" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
                            {isDragActive ? 'Drop files here' : 'Upload attachments'}
                          </p>
                          <p className="text-sm text-slate-500">
                            Drag & drop files here, or click to browse
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* File Preview */}
                    {replyAttachments.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-slate-500" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            Selected Files ({replyAttachments.length})
                          </span>
                        </div>
                        <div className="space-y-2">
                          {replyAttachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                            >
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm">
                                  {getFileIcon(file.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                    {file.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {formatFileSize(file.size)}
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
                      type="submit" 
                      disabled={isSubmittingReply || uploadingFiles || !getPlainTextFromHtml(newReply).trim()}
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
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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