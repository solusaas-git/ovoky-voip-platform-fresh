'use client';

import { useState, useCallback } from 'react';

export interface CannedResponse {
  _id: string;
  title: string;
  content: string;
  category: string;
  services?: string[];
  keywords?: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function useCannedResponses() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResponses = useCallback(async (filters?: {
    category?: string;
    service?: string;
    search?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.service) params.append('service', filters.service);
      if (filters?.search) params.append('search', filters.search);
      params.append('isActive', 'true'); // Only fetch active responses

      const url = `/api/admin/support/canned-responses?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch canned responses');
      }

      setResponses(data.responses || []);
      return data.responses || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const incrementUsage = useCallback(async (responseId: string) => {
    try {
      await fetch(`/api/admin/support/canned-responses/${responseId}/usage`, {
        method: 'POST',
      });
      
      // Update local state
      setResponses(prev => prev.map(response => 
        response._id === responseId 
          ? { ...response, usageCount: response.usageCount + 1 }
          : response
      ));
    } catch (err) {
      console.error('Failed to increment usage count:', err);
    }
  }, []);

  return {
    responses,
    loading,
    error,
    fetchResponses,
    incrementUsage,
  };
} 