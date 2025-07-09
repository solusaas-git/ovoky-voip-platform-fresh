'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Upload, 
  Download, 
  Search,
  Users,
  AlertTriangle,
  CheckCircle,
  X,
  UserPlus,
  Loader2,
  FileText
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ContactList {
  _id: string;
  name: string;
  description?: string;
  contactCount: number;
  canDelete: boolean;
  createdAt: string;
  tags?: string[];
}

interface Contact {
  _id: string;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  dateOfBirth?: string;
  displayName: string;
}

interface ColumnMapping {
  phoneNumber: number;
  firstName?: number;
  lastName?: number;
  address?: number;
  city?: number;
  zipCode?: number;
  dateOfBirth?: number;
  customFields?: Record<string, number>;
}

interface ImportProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  message?: string;
}

export default function ContactListManager() {
  const { t } = useTranslations();
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Contact viewing pagination and search states
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalContacts, setTotalContacts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [editContactDialogOpen, setEditContactDialogOpen] = useState(false);
  const [deleteContactDialogOpen, setDeleteContactDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [] as string[]
  });

  // Contact form state
  const [contactFormData, setContactFormData] = useState({
    phoneNumber: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    zipCode: '',
    dateOfBirth: ''
  });

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  // Import states
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    phoneNumber: 0
  });
  const [importOptions, setImportOptions] = useState({
    updateOnDuplicate: false
  });
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    status: 'idle'
  });
  const [importStartTime, setImportStartTime] = useState<number | null>(null);
  const [customFieldNames, setCustomFieldNames] = useState<string[]>([]);
  const [availableCustomColumns, setAvailableCustomColumns] = useState<number[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchContactLists();
  }, []);

  const fetchContactLists = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sms/contact-lists');
      const data = await response.json();
      
      if (data.success) {
        setContactLists(data.contactLists);
      } else {
        toast.error(t('sms.contacts.fetchError'));
      }
    } catch (error) {
      console.error('Error fetching contact lists:', error);
      toast.error(t('sms.contacts.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsForList = async (listId: string, page: number = 1, search: string = '', size: number = 10) => {
    try {
      setContactsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: size.toString(),
        search: search.trim()
      });
      
      const response = await fetch(`/api/sms/contact-lists/${listId}/contacts?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setContacts(data.contacts || []);
        setTotalContacts(data.total || 0);
        setTotalPages(Math.ceil((data.total || 0) / size));
        setCurrentPage(page);
      } else {
        toast.error(t('sms.contacts.fetchError'));
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error(t('sms.contacts.fetchError'));
    } finally {
      setContactsLoading(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useRef<NodeJS.Timeout | null>(null);
  const handleContactSearch = (searchValue: string) => {
    setContactSearchTerm(searchValue);
    
    if (debouncedSearch.current) {
      clearTimeout(debouncedSearch.current);
    }
    
    debouncedSearch.current = setTimeout(() => {
      if (selectedList) {
        setCurrentPage(1); // Reset to first page when searching
        fetchContactsForList(selectedList._id, 1, searchValue, pageSize);
      }
    }, 300);
  };

  const handlePageChange = (page: number) => {
    if (selectedList && page >= 1 && page <= totalPages) {
      fetchContactsForList(selectedList._id, page, contactSearchTerm, pageSize);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    if (selectedList) {
      setCurrentPage(1); // Reset to first page when changing page size
      fetchContactsForList(selectedList._id, 1, contactSearchTerm, newPageSize);
    }
  };

  const handleCreateList = async () => {
    try {
      const response = await fetch('/api/sms/contact-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('sms.contacts.createSuccess'));
        setCreateDialogOpen(false);
        setFormData({ name: '', description: '', tags: [] });
        fetchContactLists();
      } else {
        toast.error(data.error || t('sms.contacts.createError'));
      }
    } catch (error) {
      console.error('Error creating contact list:', error);
      toast.error(t('sms.contacts.createError'));
    }
  };

  const handleEditList = async () => {
    if (!selectedList) return;

    try {
      const response = await fetch(`/api/sms/contact-lists/${selectedList._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('sms.contacts.updateSuccess'));
        setEditDialogOpen(false);
        setSelectedList(null);
        setFormData({ name: '', description: '', tags: [] });
        fetchContactLists();
      } else {
        toast.error(data.error || t('sms.contacts.updateError'));
      }
    } catch (error) {
      console.error('Error updating contact list:', error);
      toast.error(t('sms.contacts.updateError'));
    }
  };

  const handleDeleteList = async () => {
    if (!selectedList || isDeleting) return;

    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/sms/contact-lists/${selectedList._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('sms.contacts.deleteSuccess'));
        setDeleteDialogOpen(false);
        setSelectedList(null);
        fetchContactLists();
      } else {
        toast.error(data.error || t('sms.contacts.deleteError'));
      }
    } catch (error) {
      console.error('Error deleting contact list:', error);
      toast.error(t('sms.contacts.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to detect CSV delimiter
  const detectDelimiter = (text: string): string => {
    const delimiters = [',', ';', '\t', '|'];
    const lines = text.split('\n').slice(0, 5); // Check first 5 lines
    
    let bestDelimiter = ',';
    let maxConsistency = 0;
    
    for (const delimiter of delimiters) {
      const columnCounts = lines
        .filter(line => line.trim())
        .map(line => line.split(delimiter).length);
      
      if (columnCounts.length === 0) continue;
      
      // Calculate consistency (how often the same number of columns appears)
      const mostCommonCount = columnCounts
        .sort((a, b) => 
          columnCounts.filter(v => v === a).length - columnCounts.filter(v => v === b).length
        )
        .pop();
      
      const consistency = columnCounts.filter(count => count === mostCommonCount).length / columnCounts.length;
      
      // Prefer delimiters that create more than 1 column and have high consistency
      if (mostCommonCount! > 1 && consistency > maxConsistency) {
        maxConsistency = consistency;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  };

  // Function to parse CSV with proper quote handling
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
        i++;
      } else {
        current += char;
        i++;
      }
    }
    
    // Add the last field
    result.push(current.trim());
    
    return result.map(cell => cell.replace(/^"(.*)"$/, '$1'));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        toast.error(t('sms.import.emptyFile'));
        return;
      }

      // Detect delimiter automatically
      const delimiter = detectDelimiter(text);
      
      // Parse CSV with detected delimiter
      const parsedData = lines.map(line => parseCSVLine(line, delimiter));

      const headers = parsedData[0];
      const data = parsedData.slice(1);

      setCsvHeaders(headers);
      setCsvData(data);
      setColumnMapping({ phoneNumber: 0 }); // Reset mapping
      
      // Reset import progress
      setImportProgress({
        total: data.length,
        processed: 0,
        successful: 0,
        failed: 0,
        status: 'idle'
      });
      
      // Identify available columns for custom field mapping
      // Standard fields that shouldn't be mapped as custom
      const standardFields = ['phoneNumber', 'firstName', 'lastName', 'address', 'city', 'zipCode', 'dateOfBirth'];
      const availableColumns: number[] = [];
      
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        const isStandardField = standardFields.some(field => 
          headerLower.includes(field.toLowerCase()) || 
          headerLower.includes(field.replace(/([A-Z])/g, '_$1').toLowerCase()) ||
          headerLower.includes(field.replace(/([A-Z])/g, ' $1').toLowerCase())
        );
        
        if (!isStandardField) {
          availableColumns.push(index);
        }
      });
      
      setAvailableCustomColumns(availableColumns);
      setCustomFieldNames([]);
      setImportDialogOpen(true);
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedList || csvData.length === 0) return;

    try {
      const startTime = Date.now();
      setImportStartTime(startTime);
      setImportProgress({
        total: csvData.length,
        processed: 0,
        successful: 0,
        failed: 0,
        status: 'processing',
        message: 'Starting optimized parallel import...'
      });
      
      // Build custom fields mapping from selected custom field names
      const customFieldsMapping: Record<string, number> = {};
      customFieldNames.forEach((fieldName, index) => {
        if (fieldName.trim() && availableCustomColumns[index] !== undefined) {
          customFieldsMapping[fieldName.trim()] = availableCustomColumns[index];
        }
      });
      
      const mappingWithCustomFields = {
        ...columnMapping,
        customFields: customFieldsMapping
      };

      // Process contacts in chunks with parallel processing for maximum speed
      const CHUNK_SIZE = 500; // Increased chunk size for bulk operations
      const MAX_CONCURRENT_CHUNKS = 3; // Process multiple chunks in parallel
      
      const chunks = [];
      for (let i = 0; i < csvData.length; i += CHUNK_SIZE) {
        chunks.push({
          data: csvData.slice(i, i + CHUNK_SIZE),
          index: i / CHUNK_SIZE,
          startIndex: i
        });
      }

      let totalSuccessful = 0;
      let totalFailed = 0;
      let allErrors: any[] = [];
      let processedChunks = 0;

      // Process chunks in parallel batches
      for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_CHUNKS) {
        const batchChunks = chunks.slice(i, i + MAX_CONCURRENT_CHUNKS);
        
        // Update progress message for batch
        setImportProgress(prev => ({
          ...prev,
          message: `Processing batch ${Math.floor(i / MAX_CONCURRENT_CHUNKS) + 1} of ${Math.ceil(chunks.length / MAX_CONCURRENT_CHUNKS)}... (${prev.processed}/${prev.total} contacts)`
        }));

        // Process chunks in parallel
        const chunkPromises = batchChunks.map(async (chunk) => {
          try {
            const response = await fetch(`/api/sms/contact-lists/${selectedList._id}/import`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contacts: chunk.data,
                columnMapping: mappingWithCustomFields,
                options: importOptions,
                chunkInfo: {
                  index: chunk.index,
                  total: chunks.length,
                  startIndex: chunk.startIndex
                }
              }),
            });

            const data = await response.json();
            return {
              success: data.success,
              imported: data.imported || 0,
              errors: data.errors || [],
              chunkSize: chunk.data.length,
              error: data.error
            };
          } catch (error) {
            console.error('Error processing chunk:', error);
            return {
              success: false,
              imported: 0,
              errors: [],
              chunkSize: chunk.data.length,
              error: 'Network error processing chunk'
            };
          }
        });

        // Wait for all chunks in this batch to complete
        const results = await Promise.all(chunkPromises);
        
        // Process results
        results.forEach((result, index) => {
          if (result.success) {
            totalSuccessful += result.imported;
            totalFailed += result.errors.length;
            if (result.errors.length > 0) {
              allErrors.push(...result.errors);
            }
          } else {
            totalFailed += result.chunkSize;
            allErrors.push({
              error: result.error || 'Chunk processing failed',
              count: result.chunkSize
            });
          }
          processedChunks++;
        });

        // Update progress after batch completion
        const processed = Math.min(processedChunks * CHUNK_SIZE, csvData.length);
        setImportProgress(prev => ({
          ...prev,
          processed,
          successful: totalSuccessful,
          failed: totalFailed,
          message: `Processed ${processed}/${csvData.length} contacts... (${Math.round((processed / csvData.length) * 100)}%)`
        }));

        // Minimal delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Final progress update
      const endTime = Date.now();
      const totalTime = importStartTime ? (endTime - importStartTime) / 1000 : 0;
      const avgSpeed = totalTime > 0 ? Math.round(csvData.length / totalTime) : 0;
      
      setImportProgress({
        total: csvData.length,
        processed: csvData.length,
        successful: totalSuccessful,
        failed: totalFailed,
        status: 'completed',
        message: `Import completed in ${totalTime.toFixed(1)}s! ${totalSuccessful} contacts imported (${avgSpeed} contacts/sec)`
      });
      
      // Show detailed results
      setTimeout(() => {
        toast.success(`Import completed! ${totalSuccessful} contacts imported successfully.`);
        if (totalFailed > 0) {
          toast.warning(`${totalFailed} contacts failed to import.`);
        }
        
        // Close dialog after showing results for a moment
        setTimeout(() => {
          setImportDialogOpen(false);
          setCsvData([]);
          setCsvHeaders([]);
          setCustomFieldNames([]);
          setAvailableCustomColumns([]);
          fetchContactLists();
          if (viewDialogOpen) {
            fetchContactsForList(selectedList._id, currentPage, contactSearchTerm, pageSize);
          }
        }, 3000);
      }, 500);

    } catch (error) {
      console.error('Error importing contacts:', error);
      setImportProgress(prev => ({
        ...prev,
        status: 'failed',
        message: 'Network error occurred'
      }));
      toast.error(t('sms.import.error'));
    }
  };

  const addCustomField = () => {
    if (customFieldNames.length < availableCustomColumns.length) {
      setCustomFieldNames([...customFieldNames, '']);
    }
  };

  const removeCustomField = (index: number) => {
    const newFields = customFieldNames.filter((_, i) => i !== index);
    setCustomFieldNames(newFields);
  };

  const updateCustomFieldName = (index: number, name: string) => {
    const newFields = [...customFieldNames];
    newFields[index] = name;
    setCustomFieldNames(newFields);
  };

  const openViewDialog = (list: ContactList) => {
    setSelectedList(list);
    setViewDialogOpen(true);
    // Reset pagination and search state when opening dialog
    setCurrentPage(1);
    setContactSearchTerm('');
    setPageSize(10);
    fetchContactsForList(list._id, 1, '', 10);
  };

  const openEditDialog = (list: ContactList) => {
    setSelectedList(list);
    setFormData({
      name: list.name,
      description: list.description || '',
      tags: list.tags || []
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (list: ContactList) => {
    setSelectedList(list);
    setDeleteDialogOpen(true);
  };

  // Contact management functions
  const handleAddContact = async () => {
    if (!selectedList) return;

    try {
      const response = await fetch(`/api/sms/contact-lists/${selectedList._id}/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactFormData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('sms.contacts.addContactSuccess'));
        setAddContactDialogOpen(false);
        setContactFormData({
          phoneNumber: '',
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          zipCode: '',
          dateOfBirth: ''
        });
        fetchContactsForList(selectedList._id, currentPage, contactSearchTerm, pageSize);
        fetchContactLists(); // Refresh counts
      } else {
        toast.error(data.error || t('sms.contacts.addContactError'));
      }
    } catch (error) {
      console.error('Error adding contact:', error);
      toast.error(t('sms.contacts.addContactError'));
    }
  };

  const handleEditContact = async () => {
    if (!selectedList || !selectedContact) return;

    try {
      const response = await fetch(`/api/sms/contact-lists/${selectedList._id}/contacts/${selectedContact._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactFormData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('sms.contacts.updateContactSuccess'));
        setEditContactDialogOpen(false);
        setSelectedContact(null);
        setContactFormData({
          phoneNumber: '',
          firstName: '',
          lastName: '',
          address: '',
          city: '',
          zipCode: '',
          dateOfBirth: ''
        });
        fetchContactsForList(selectedList._id, currentPage, contactSearchTerm, pageSize);
      } else {
        toast.error(data.error || t('sms.contacts.updateContactError'));
      }
    } catch (error) {
      console.error('Error updating contact:', error);
      toast.error(t('sms.contacts.updateContactError'));
    }
  };

  const handleDeleteContact = async () => {
    if (!selectedList || !selectedContact) return;

    try {
      const response = await fetch(`/api/sms/contact-lists/${selectedList._id}/contacts/${selectedContact._id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('sms.contacts.deleteContactSuccess'));
        setDeleteContactDialogOpen(false);
        setSelectedContact(null);
        fetchContactsForList(selectedList._id, currentPage, contactSearchTerm, pageSize);
        fetchContactLists(); // Refresh counts
      } else {
        toast.error(data.error || t('sms.contacts.deleteContactError'));
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error(t('sms.contacts.deleteContactError'));
    }
  };

  const openAddContactDialog = (list: ContactList) => {
    setSelectedList(list);
    setAddContactDialogOpen(true);
  };

  const openEditContactDialog = (contact: Contact) => {
    setSelectedContact(contact);
    setContactFormData({
      phoneNumber: contact.phoneNumber,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      address: contact.address || '',
      city: contact.city || '',
      zipCode: contact.zipCode || '',
      dateOfBirth: contact.dateOfBirth ? contact.dateOfBirth.split('T')[0] : ''
    });
    setEditContactDialogOpen(true);
  };

  const openDeleteContactDialog = (contact: Contact) => {
    setSelectedContact(contact);
    setDeleteContactDialogOpen(true);
  };

  const filteredLists = contactLists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (list.description && list.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">{t('sms.contacts.loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t('sms.contacts.title')}</h2>
          <p className="text-muted-foreground">{t('sms.contacts.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('sms.contacts.create')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t('sms.contacts.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Contact Lists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLists.map((list) => (
          <Card key={list._id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg">{list.name}</CardTitle>
                  {list.description && (
                    <p className="text-sm text-muted-foreground mt-1">{list.description}</p>
                  )}
                </div>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {list.contactCount}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openViewDialog(list)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(list)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {list.canDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(list)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {!list.canDelete && (
                  <Badge variant="outline" className="text-yellow-600">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {t('sms.contacts.inUse')}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLists.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">{t('sms.contacts.noLists')}</p>
            <p className="text-muted-foreground mb-4">{t('sms.contacts.createFirst')}</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('sms.contacts.create')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sms.contacts.createTitle')}</DialogTitle>
            <DialogDescription>
              {t('sms.contacts.createDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('sms.contacts.name')} *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('sms.contacts.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('sms.contacts.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('sms.contacts.descriptionPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t('sms.common.buttons.cancel')}
            </Button>
            <Button onClick={handleCreateList} disabled={!formData.name.trim()}>
              {t('sms.contacts.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sms.contacts.editTitle')}</DialogTitle>
            <DialogDescription>
              {t('sms.contacts.editDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('sms.contacts.name')} *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('sms.contacts.namePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">{t('sms.contacts.description')}</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('sms.contacts.descriptionPlaceholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              {t('sms.common.buttons.cancel')}
            </Button>
            <Button onClick={handleEditList} disabled={!formData.name.trim()}>
              {t('sms.contacts.update')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent 
          className="flex flex-col p-0" 
          style={{ 
            width: '70vw', 
            maxWidth: '70vw', 
            height: '80vh', 
            maxHeight: '80vh' 
          }}
        >
          <DialogHeader className="flex-shrink-0 bg-background border-b rounded-t-lg">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-2xl font-bold mb-2">{selectedList?.name}</DialogTitle>
                  <DialogDescription className="text-base text-muted-foreground mb-3">
                    {selectedList?.description || t('sms.contacts.noDescription')}
                  </DialogDescription>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 text-sm">
                      <Users className="h-4 w-4" />
                      {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Created {selectedList?.createdAt ? new Date(selectedList.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-3 ml-6 mr-8">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => openAddContactDialog(selectedList!)}
                    className="flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    {t('sms.contacts.addContact')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    {t('sms.import.title')}
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden pb-6 px-6">
            {/* Search and Controls */}
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search contacts by name or phone..."
                    value={contactSearchTerm}
                    onChange={(e) => handleContactSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 per page</SelectItem>
                    <SelectItem value="25">25 per page</SelectItem>
                    <SelectItem value="50">50 per page</SelectItem>
                    <SelectItem value="100">100 per page</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Results info */}
              <div className="text-sm text-muted-foreground">
                {contactsLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : (
                  `Showing ${((currentPage - 1) * pageSize) + 1}-${Math.min(currentPage * pageSize, totalContacts)} of ${totalContacts} contacts`
                )}
              </div>
            </div>

            {contacts.length > 0 || contactsLoading ? (
              <div className="border rounded-lg overflow-hidden flex flex-col bg-background m-2" style={{ height: 'calc(100% - 3rem)' }}>
                <div className="overflow-auto flex-1">
                  {contactsLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Loading contacts...</p>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="sticky top-0 bg-background border-b">
                        <TableRow>
                          <TableHead className="w-[200px] py-3 font-semibold text-sm">
                            {t('sms.contacts.fields.name')}
                          </TableHead>
                          <TableHead className="w-[180px] py-3 font-semibold text-sm">
                            {t('sms.contacts.fields.phone')}
                          </TableHead>
                          <TableHead className="w-[120px] py-3 font-semibold text-sm">
                            {t('sms.contacts.fields.city')}
                          </TableHead>
                          <TableHead className="w-[200px] py-3 font-semibold text-sm">
                            {t('sms.contacts.fields.address')}
                          </TableHead>
                          <TableHead className="w-[100px] py-3 font-semibold text-sm">
                            {t('sms.contacts.fields.zipCode')}
                          </TableHead>
                          <TableHead className="w-[120px] py-3 font-semibold text-sm">
                            {t('sms.contacts.fields.dateOfBirth')}
                          </TableHead>
                          <TableHead className="w-[120px] py-3 font-semibold text-sm text-center">
                            {t('sms.common.actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contacts.map((contact) => (
                          <TableRow key={contact._id} className="hover:bg-muted/50">
                            <TableCell className="py-3">
                              <span className="font-medium text-sm">
                                {contact.displayName || `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'N/A'}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 font-mono text-sm">
                              {contact.phoneNumber}
                            </TableCell>
                            <TableCell className="py-3 text-sm">
                              {contact.city || '-'}
                            </TableCell>
                            <TableCell className="py-3 text-sm">
                              <div className="truncate" title={contact.address}>
                                {contact.address || '-'}
                              </div>
                            </TableCell>
                            <TableCell className="py-3 text-sm">
                              {contact.zipCode || '-'}
                            </TableCell>
                            <TableCell className="py-3 text-sm">
                              {contact.dateOfBirth ? new Date(contact.dateOfBirth).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditContactDialog(contact)}
                                  className="h-8 w-8 p-0"
                                  title="Edit contact"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteContactDialog(contact)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Delete contact"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                
                {/* Pagination */}
                {!contactsLoading && totalPages > 1 && (
                  <div className="border-t p-3 flex items-center justify-between bg-background flex-shrink-0 min-h-[60px]">
                    <div className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm px-2">
                        {Math.max(1, currentPage - 2)} - {Math.min(totalPages, currentPage + 2)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        Last
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <Users className="h-24 w-24 text-muted-foreground mb-6" />
                <h3 className="text-2xl font-semibold mb-4">{t('sms.contacts.noContacts')}</h3>
                <p className="text-muted-foreground mb-8 text-center max-w-lg text-lg">
                  {contactSearchTerm ? 
                    `No contacts found matching "${contactSearchTerm}". Try adjusting your search terms.` :
                    'This contact list is empty. Add contacts individually or import them from a CSV file to get started.'
                  }
                </p>
                <div className="flex gap-4">
                  <Button
                    size="lg"
                    onClick={() => openAddContactDialog(selectedList!)}
                    className="flex items-center gap-2 px-6 py-3"
                  >
                    <UserPlus className="h-5 w-5" />
                    {t('sms.contacts.addContact')}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3"
                  >
                    <Upload className="h-5 w-5" />
                    {t('sms.import.title')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onOpenChange={isDeleting ? undefined : setDeleteDialogOpen}
      >
        <DialogContent className="sm:max-w-md" onPointerDownOutside={isDeleting ? (e) => e.preventDefault() : undefined}>
          <DialogHeader>
            <DialogTitle>{t('sms.contacts.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {isDeleting 
                ? t('sms.contacts.deletingDescription').replace('{name}', selectedList?.name || '')
                : t('sms.contacts.deleteDescription').replace('{name}', selectedList?.name || '')
              }
            </DialogDescription>
          </DialogHeader>
          
          {isDeleting ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <Loader2 className="h-8 w-8 animate-spin text-destructive" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">{t('sms.contacts.deletingProgress')}</p>
                <p className="text-xs text-muted-foreground">
                  {t('sms.contacts.deletingSubtext')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">
                {t('sms.contacts.deleteWarning')}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('sms.common.buttons.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteList}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('sms.contacts.deleting')}
                </>
              ) : (
                t('sms.contacts.delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl w-full overflow-x-hidden">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-xl">{t('sms.import.title')}</DialogTitle>
            <DialogDescription className="text-base mt-2">
              {t('sms.import.description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-8 px-1 overflow-x-hidden">
            {/* Column Mapping Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <Label className="text-lg font-semibold">{t('sms.import.columnMapping')}</Label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="phone-mapping" className="text-xs font-medium text-muted-foreground">
                    {t('sms.contacts.fields.phone')} *
                  </Label>
                  <Select
                    value={columnMapping.phoneNumber.toString()}
                    onValueChange={(value) => 
                      setColumnMapping({ ...columnMapping, phoneNumber: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header || `${t('sms.import.column')} ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="firstName-mapping" className="text-xs font-medium text-muted-foreground">
                    {t('sms.contacts.fields.firstName')}
                  </Label>
                  <Select
                    value={columnMapping.firstName?.toString() || 'skip'}
                    onValueChange={(value) => 
                      setColumnMapping({ 
                        ...columnMapping, 
                        firstName: value === 'skip' ? undefined : parseInt(value) 
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">{t('sms.import.skipColumn')}</SelectItem>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header || `${t('sms.import.column')} ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 min-w-0">
                  <Label htmlFor="lastName-mapping" className="text-xs font-medium text-muted-foreground">
                    {t('sms.contacts.fields.lastName')}
                  </Label>
                  <Select
                    value={columnMapping.lastName?.toString() || 'skip'}
                    onValueChange={(value) => 
                      setColumnMapping({ 
                        ...columnMapping, 
                        lastName: value === 'skip' ? undefined : parseInt(value) 
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">{t('sms.import.skipColumn')}</SelectItem>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header || `${t('sms.import.column')} ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 min-w-0">
                  <Label htmlFor="city-mapping" className="text-xs font-medium text-muted-foreground">
                    {t('sms.contacts.fields.city')}
                  </Label>
                  <Select
                    value={columnMapping.city?.toString() || 'skip'}
                    onValueChange={(value) => 
                      setColumnMapping({ 
                        ...columnMapping, 
                        city: value === 'skip' ? undefined : parseInt(value) 
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">{t('sms.import.skipColumn')}</SelectItem>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header || `${t('sms.import.column')} ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 min-w-0">
                  <Label htmlFor="address-mapping" className="text-xs font-medium text-muted-foreground">
                    {t('sms.contacts.fields.address')}
                  </Label>
                  <Select
                    value={columnMapping.address?.toString() || 'skip'}
                    onValueChange={(value) => 
                      setColumnMapping({ 
                        ...columnMapping, 
                        address: value === 'skip' ? undefined : parseInt(value) 
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">{t('sms.import.skipColumn')}</SelectItem>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header || `${t('sms.import.column')} ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 min-w-0">
                  <Label htmlFor="zipCode-mapping" className="text-xs font-medium text-muted-foreground">
                    {t('sms.contacts.fields.zipCode')}
                  </Label>
                  <Select
                    value={columnMapping.zipCode?.toString() || 'skip'}
                    onValueChange={(value) => 
                      setColumnMapping({ 
                        ...columnMapping, 
                        zipCode: value === 'skip' ? undefined : parseInt(value) 
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">{t('sms.import.skipColumn')}</SelectItem>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header || `${t('sms.import.column')} ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 min-w-0">
                  <Label htmlFor="dateOfBirth-mapping" className="text-xs font-medium text-muted-foreground">
                    {t('sms.contacts.fields.dateOfBirth')}
                  </Label>
                  <Select
                    value={columnMapping.dateOfBirth?.toString() || 'skip'}
                    onValueChange={(value) => 
                      setColumnMapping({ 
                        ...columnMapping, 
                        dateOfBirth: value === 'skip' ? undefined : parseInt(value) 
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">{t('sms.import.skipColumn')}</SelectItem>
                      {csvHeaders.map((header, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {header || `${t('sms.import.column')} ${index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>



            {/* Custom Fields Manual Mapping */}
            {availableCustomColumns.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <Label className="text-lg font-semibold">Custom Fields Mapping</Label>
                </div>
                
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 overflow-x-hidden">
                  <p className="text-sm text-orange-800 mb-3">
                    Map additional CSV columns to custom fields that can be used in templates.
                  </p>
                  <p className="text-xs text-orange-700 mb-3 break-words">
                    Available columns: {availableCustomColumns.map(colIndex => csvHeaders[colIndex]).join(', ')}
                  </p>
                </div>

                <div className="space-y-2">
                  {customFieldNames.map((fieldName, index) => (
                    <div key={index} className="flex items-end gap-2 min-w-0">
                      <div className="flex-1 grid grid-cols-2 gap-2 min-w-0">
                        <div className="min-w-0">
                          <Label className="text-xs font-medium text-muted-foreground">Field Name</Label>
                          <Input
                            value={fieldName}
                            onChange={(e) => updateCustomFieldName(index, e.target.value)}
                            placeholder="e.g., company, department"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="min-w-0">
                          <Label className="text-xs font-medium text-muted-foreground">CSV Column</Label>
                          <Select value={availableCustomColumns[index]?.toString() || ''} disabled>
                            <SelectTrigger className="h-8">
                              <SelectValue>
                                {csvHeaders[availableCustomColumns[index]] || 'No column'}
                              </SelectValue>
                            </SelectTrigger>
                          </Select>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCustomField(index)}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {customFieldNames.length < availableCustomColumns.length && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomField}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Custom Field
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Import Progress */}
            {importProgress.status !== 'idle' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <Label className="text-lg font-semibold">Import Progress</Label>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Progress</span>
                    <div className="text-right">
                      <span className="font-mono">
                        {importProgress.processed} / {importProgress.total} 
                        ({importProgress.total > 0 ? Math.round((importProgress.processed / importProgress.total) * 100) : 0}%)
                      </span>
                      {importStartTime && importProgress.processed > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Speed: {Math.round(importProgress.processed / ((Date.now() - importStartTime) / 1000))} contacts/sec
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Progress 
                    value={importProgress.total > 0 ? (importProgress.processed / importProgress.total) * 100 : 0}
                    className="h-3"
                  />
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-xl font-bold text-green-700">{importProgress.successful}</div>
                      <div className="text-xs text-green-600 font-medium">Successful</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-xl font-bold text-red-700">{importProgress.failed}</div>
                      <div className="text-xs text-red-600 font-medium">Failed</div>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-xl font-bold text-blue-700">{importProgress.total}</div>
                      <div className="text-xs text-blue-600 font-medium">Total</div>
                    </div>
                  </div>
                  
                  {importProgress.message && (
                    <div className="p-3 bg-muted rounded-lg border">
                      <div className="flex items-center gap-2">
                        {importProgress.status === 'processing' && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        )}
                        <p className="text-sm text-muted-foreground font-medium">{importProgress.message}</p>
                      </div>
                    </div>
                  )}
                  
                                     {importProgress.status === 'processing' && (
                     <div className="text-center space-y-2">
                       <p className="text-xs text-muted-foreground">
                         Please wait while we import your contacts...
                       </p>
                       <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                         <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                         <span>Processing in parallel for maximum speed</span>
                       </div>
                       <p className="text-xs text-orange-600 font-medium">
                         ⚡ Optimized bulk processing active
                       </p>
                     </div>
                   )}
                </div>
              </div>
            )}

            {/* Import Options Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-border">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Label className="text-lg font-semibold">{t('sms.import.options')}</Label>
              </div>
              
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="update-duplicates"
                    checked={importOptions.updateOnDuplicate}
                    onChange={(e) => 
                      setImportOptions({ 
                        ...importOptions, 
                        updateOnDuplicate: e.target.checked 
                      })
                    }
                    className="w-4 h-4 rounded border-input focus:ring-2 focus:ring-ring"
                  />
                  <Label htmlFor="update-duplicates" className="text-sm font-medium cursor-pointer">
                    {t('sms.import.updateDuplicates')}
                  </Label>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            {csvData.length > 0 && importProgress.status === 'idle' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-border">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <Label className="text-lg font-semibold">{t('sms.import.preview')}</Label>
                </div>
                
                <div className="mt-6 border border-border rounded-lg bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          {csvHeaders.map((header, index) => (
                            <TableHead key={index} className="font-semibold py-4 px-6 whitespace-nowrap">
                              {header || `${t('sms.import.column')} ${index + 1}`}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, 3).map((row, index) => (
                          <TableRow key={index} className="hover:bg-muted/30">
                            {row.map((cell, cellIndex) => (
                              <TableCell key={cellIndex} className="py-4 px-6 text-sm whitespace-nowrap">
                                {cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {csvData.length > 3 && (
                    <div className="text-center py-4 text-sm text-muted-foreground bg-muted/50 border-t border-border">
                      {t('sms.import.moreRows').replace('{count}', (csvData.length - 3).toString())}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="pt-8 mt-6 border-t border-border">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)} className="px-6 py-2">
              {t('sms.common.buttons.cancel')}
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={csvData.length === 0 || importProgress.status === 'processing'}
              className="px-6 py-2"
            >
              {importProgress.status === 'processing' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                t('sms.import.start')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sms.contacts.addContactTitle')}</DialogTitle>
            <DialogDescription>
              {t('sms.contacts.addContactDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact-phone">{t('sms.contacts.fields.phone')} *</Label>
              <Input
                id="contact-phone"
                value={contactFormData.phoneNumber}
                onChange={(e) => setContactFormData({ ...contactFormData, phoneNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-firstName">{t('sms.contacts.fields.firstName')}</Label>
                <Input
                  id="contact-firstName"
                  value={contactFormData.firstName}
                  onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
                  placeholder={t('sms.contacts.fields.firstNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-lastName">{t('sms.contacts.fields.lastName')}</Label>
                <Input
                  id="contact-lastName"
                  value={contactFormData.lastName}
                  onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
                  placeholder={t('sms.contacts.fields.lastNamePlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-address">{t('sms.contacts.fields.address')}</Label>
              <Input
                id="contact-address"
                value={contactFormData.address}
                onChange={(e) => setContactFormData({ ...contactFormData, address: e.target.value })}
                placeholder={t('sms.contacts.fields.addressPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact-city">{t('sms.contacts.fields.city')}</Label>
                <Input
                  id="contact-city"
                  value={contactFormData.city}
                  onChange={(e) => setContactFormData({ ...contactFormData, city: e.target.value })}
                  placeholder={t('sms.contacts.fields.cityPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-zipCode">{t('sms.contacts.fields.zipCode')}</Label>
                <Input
                  id="contact-zipCode"
                  value={contactFormData.zipCode}
                  onChange={(e) => setContactFormData({ ...contactFormData, zipCode: e.target.value })}
                  placeholder={t('sms.contacts.fields.zipCodePlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-dateOfBirth">{t('sms.contacts.fields.dateOfBirth')}</Label>
              <Input
                id="contact-dateOfBirth"
                type="date"
                value={contactFormData.dateOfBirth}
                onChange={(e) => setContactFormData({ ...contactFormData, dateOfBirth: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContactDialogOpen(false)}>
              {t('sms.common.buttons.cancel')}
            </Button>
            <Button onClick={handleAddContact} disabled={!contactFormData.phoneNumber.trim()}>
              {t('sms.contacts.addContact')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={editContactDialogOpen} onOpenChange={setEditContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sms.contacts.editContactTitle')}</DialogTitle>
            <DialogDescription>
              {t('sms.contacts.editContactDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-contact-phone">{t('sms.contacts.fields.phone')} *</Label>
              <Input
                id="edit-contact-phone"
                value={contactFormData.phoneNumber}
                onChange={(e) => setContactFormData({ ...contactFormData, phoneNumber: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contact-firstName">{t('sms.contacts.fields.firstName')}</Label>
                <Input
                  id="edit-contact-firstName"
                  value={contactFormData.firstName}
                  onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
                  placeholder={t('sms.contacts.fields.firstNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact-lastName">{t('sms.contacts.fields.lastName')}</Label>
                <Input
                  id="edit-contact-lastName"
                  value={contactFormData.lastName}
                  onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
                  placeholder={t('sms.contacts.fields.lastNamePlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact-address">{t('sms.contacts.fields.address')}</Label>
              <Input
                id="edit-contact-address"
                value={contactFormData.address}
                onChange={(e) => setContactFormData({ ...contactFormData, address: e.target.value })}
                placeholder={t('sms.contacts.fields.addressPlaceholder')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contact-city">{t('sms.contacts.fields.city')}</Label>
                <Input
                  id="edit-contact-city"
                  value={contactFormData.city}
                  onChange={(e) => setContactFormData({ ...contactFormData, city: e.target.value })}
                  placeholder={t('sms.contacts.fields.cityPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-contact-zipCode">{t('sms.contacts.fields.zipCode')}</Label>
                <Input
                  id="edit-contact-zipCode"
                  value={contactFormData.zipCode}
                  onChange={(e) => setContactFormData({ ...contactFormData, zipCode: e.target.value })}
                  placeholder={t('sms.contacts.fields.zipCodePlaceholder')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact-dateOfBirth">{t('sms.contacts.fields.dateOfBirth')}</Label>
              <Input
                id="edit-contact-dateOfBirth"
                type="date"
                value={contactFormData.dateOfBirth}
                onChange={(e) => setContactFormData({ ...contactFormData, dateOfBirth: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContactDialogOpen(false)}>
              {t('sms.common.buttons.cancel')}
            </Button>
            <Button onClick={handleEditContact} disabled={!contactFormData.phoneNumber.trim()}>
              {t('sms.contacts.updateContact')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Contact Dialog */}
      <Dialog open={deleteContactDialogOpen} onOpenChange={setDeleteContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sms.contacts.deleteContactTitle')}</DialogTitle>
            <DialogDescription>
              {t('sms.contacts.deleteContactDescription').replace('{name}', selectedContact?.displayName || selectedContact?.phoneNumber || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 p-4 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              {t('sms.contacts.deleteContactWarning')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteContactDialogOpen(false)}>
              {t('sms.common.buttons.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteContact}>
              {t('sms.contacts.deleteContact')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 