'use client';

import { useState } from 'react';
import { Download, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCdrData, useCdrDownload } from '@/lib/hooks';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface CdrTableProps {
  accountId?: number;
  startDate?: string;
  endDate?: string;
}

export function CdrTable({ accountId, startDate, endDate }: CdrTableProps) {
  const [page, setPage] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const pageSize = 20;
  
  const { data: cdrs, isLoading, error } = useCdrData({
    accountId,
    startDate,
    endDate,
    offset: page * pageSize,
    limit: pageSize,
  });
  
  const { downloadCdrs } = useCdrDownload();

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date string
  const formatDate = (dateStr: string): string => {
    try {
      return format(new Date(dateStr), 'yyyy-MM-dd HH:mm:ss');
    } catch {
      return 'Invalid date';
    }
  };

  // Handle pagination
  const nextPage = () => setPage(prev => prev + 1);
  const prevPage = () => setPage(prev => (prev > 0 ? prev - 1 : 0));

  // Handle export as CSV
  const handleExport = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select a date range for export');
      return;
    }
    
    setIsExporting(true);
    
    try {
      const cdrData = await downloadCdrs({
        accountId,
        startDate,
        endDate,
        filename: `cdrs_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      });
      
      if (!cdrData || cdrData.length === 0) {
        toast.error('No CDR data to export');
        return;
      }
      
      // Convert to CSV with Papa Parse
      const csv = Papa.unparse(cdrData);
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cdrs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('CDR data exported successfully');
    } catch (error) {
      console.error('Error exporting CDRs:', error);
      toast.error('Failed to export CDR data');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-destructive rounded-md text-destructive bg-destructive/10">
        <p>Error loading CDR data</p>
      </div>
    );
  }

  if (!cdrs || cdrs.length === 0) {
    return (
      <div className="p-8 text-center border rounded-md">
        <p className="text-muted-foreground">No CDR data available for the selected period</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {page * pageSize + 1} to {page * pageSize + cdrs.length} records
        </div>
        <Button 
          variant="outline" 
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </div>
      
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CDR ID</TableHead>
              <TableHead>CLI</TableHead>
              <TableHead>CLD</TableHead>
              <TableHead>Connect Time</TableHead>
              <TableHead>Disconnect Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Disconnect Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cdrs.map((cdr) => (
              <TableRow key={cdr.i_cdr}>
                <TableCell>{cdr.i_cdr}</TableCell>
                <TableCell>{cdr.cli}</TableCell>
                <TableCell>{cdr.cld}</TableCell>
                <TableCell>{formatDate(cdr.connect_time)}</TableCell>
                <TableCell>{formatDate(cdr.disconnect_time)}</TableCell>
                <TableCell>{formatDuration(cdr.duration)}</TableCell>
                <TableCell>${cdr.charged_amount.toFixed(4)}</TableCell>
                <TableCell>{cdr.disconnect_cause}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          size="sm"
          onClick={prevPage}
          disabled={page === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        
        <span className="text-sm">Page {page + 1}</span>
        
        <Button
          variant="outline"
          size="sm"
          onClick={nextPage}
          disabled={cdrs.length < pageSize}
        >
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
} 