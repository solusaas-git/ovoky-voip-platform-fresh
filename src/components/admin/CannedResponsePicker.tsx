'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  CornerDownLeft,
  Clock,
  Tag,
  GripHorizontal,
  Filter,
  X,
  RotateCcw
} from 'lucide-react';
import { useCannedResponses, CannedResponse } from '@/hooks/useCannedResponses';

interface CannedResponsePickerProps {
  isOpen: boolean;
  onSelect: (response: CannedResponse) => void;
  onClose: () => void;
  position: { top: number; left: number };
  searchQuery?: string;
  ticketService?: string;
}

export function CannedResponsePicker({
  isOpen,
  onSelect,
  onClose,
  position,
  searchQuery = '',
  ticketService
}: CannedResponsePickerProps) {
  const { responses, loading, fetchResponses, incrementUsage } = useCannedResponses();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredResponses, setFilteredResponses] = useState<CannedResponse[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Default values
  const defaultDimensions = { width: 640, height: 384 };

  // Load saved preferences from localStorage
  const loadSavedPreferences = () => {
    if (typeof window === 'undefined') return { dimensions: defaultDimensions, position };
    
    try {
      const savedDimensions = localStorage.getItem('cannedResponsePicker_dimensions');
      const savedPosition = localStorage.getItem('cannedResponsePicker_position');
      
      return {
        dimensions: savedDimensions ? JSON.parse(savedDimensions) : defaultDimensions,
        position: savedPosition ? JSON.parse(savedPosition) : position
      };
    } catch {
      return {
        dimensions: defaultDimensions,
        position: position
      };
    }
  };



  // Separate save functions for better control
  const savePosition = useCallback((position: { top: number; left: number }) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('cannedResponsePicker_position', JSON.stringify(position));
    } catch {
      // Silent fail for localStorage errors
    }
  }, []);

  const saveDimensions = useCallback((dims: { width: number; height: number }) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('cannedResponsePicker_dimensions', JSON.stringify(dims));
    } catch {
      // No need to warn here
    }
  }, []);

  // Reset to default position and size
  const resetToDefaults = () => {
    setCurrentPosition(position);
    setDimensions(defaultDimensions);
    
    // Clear saved preferences
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('cannedResponsePicker_dimensions');
        localStorage.removeItem('cannedResponsePicker_position');
      } catch {
        // No need to warn here
      }
    }
  };

  // Initialize position on mount - saved position takes precedence over prop
  useEffect(() => {
    if (isOpen) {
      const savedPrefs = loadSavedPreferences();
      setCurrentPosition(savedPrefs.position);
      setDimensions(savedPrefs.dimensions);
    }
  }, [isOpen]);

  // Drag state
  const [currentPosition, setCurrentPosition] = useState(position);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resize state
  const [dimensions, setDimensions] = useState(defaultDimensions);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Debounced save refs
  const positionSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const dimensionsSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  // Filter state
  const [filters, setFilters] = useState({
    category: '',
    service: '',
    sortBy: 'usage' // 'usage', 'alphabetical', 'recent'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch responses when opened
  useEffect(() => {
    if (isOpen) {
      fetchResponses({ service: ticketService });
    }
  }, [isOpen, fetchResponses, ticketService]);

  // Filter responses based on search query and filters
  useEffect(() => {
    let filtered = responses;
    
    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(response => 
        response.title.toLowerCase().includes(query) ||
        response.content.toLowerCase().includes(query) ||
        response.category.toLowerCase().includes(query) ||
        response.keywords?.some(keyword => keyword.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    if (filters.category) {
      filtered = filtered.filter(response => response.category === filters.category);
    }
    
    // Apply service filter (in addition to the automatic ticket service filtering)
    if (filters.service) {
      filtered = filtered.filter(response => 
        response.services?.includes(filters.service) || response.services?.length === 0
      );
    }
    
    // Apply sorting
    switch (filters.sortBy) {
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'recent':
        filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'usage':
      default:
        filtered.sort((a, b) => b.usageCount - a.usageCount);
        break;
    }
    
    setFilteredResponses(filtered);
    setSelectedIndex(0);
  }, [responses, searchQuery, filters]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredResponses.length - 1
          );
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredResponses.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredResponses[selectedIndex]) {
            handleSelect(filteredResponses[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResponses, selectedIndex, onClose]);

  const handleSelect = async (response: CannedResponse) => {
    await incrementUsage(response._id);
    onSelect(response);
    onClose();
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  // Resize handlers
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent dragging when resizing
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: dimensions.width,
      height: dimensions.height
    });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        top: e.clientY - dragOffset.y,
        left: e.clientX - dragOffset.x
      };
      
      // Keep within screen bounds
      const boundedPosition = {
        top: Math.max(10, Math.min(newPosition.top, window.innerHeight - dimensions.height)),
        left: Math.max(10, Math.min(newPosition.left, window.innerWidth - dimensions.width))
      };
      
      setCurrentPosition(boundedPosition);
      
      // Debounced save during drag
      if (positionSaveTimeout.current) {
        clearTimeout(positionSaveTimeout.current);
      }
      positionSaveTimeout.current = setTimeout(() => {
        savePosition(boundedPosition);
      }, 100);
    }
    
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(400, Math.min(800, resizeStart.width + deltaX)); // Min 400px, Max 800px
      const newHeight = Math.max(300, Math.min(600, resizeStart.height + deltaY)); // Min 300px, Max 600px
      
      const newDimensions = { width: newWidth, height: newHeight };
      setDimensions(newDimensions);
      
      // Debounced save during resize
      if (dimensionsSaveTimeout.current) {
        clearTimeout(dimensionsSaveTimeout.current);
      }
      dimensionsSaveTimeout.current = setTimeout(() => {
        saveDimensions(newDimensions);
      }, 100);
    }
  }, [isDragging, isResizing, dragOffset, resizeStart, dimensions, savePosition, saveDimensions]);

  const handleMouseUp = useCallback(() => {
    // Clear any pending saves and do final save
    if (isDragging) {
      if (positionSaveTimeout.current) {
        clearTimeout(positionSaveTimeout.current);
      }
      // Final save for position
      savePosition(currentPosition);
    }
    
    if (isResizing) {
      if (dimensionsSaveTimeout.current) {
        clearTimeout(dimensionsSaveTimeout.current);
      }
      // Final save for dimensions
      saveDimensions(dimensions);
    }
    
    setIsDragging(false);
    setIsResizing(false);
  }, [isDragging, isResizing, currentPosition, dimensions, savePosition, saveDimensions]);

  // Add global mouse event listeners for dragging and resizing
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (positionSaveTimeout.current) {
        clearTimeout(positionSaveTimeout.current);
      }
      if (dimensionsSaveTimeout.current) {
        clearTimeout(dimensionsSaveTimeout.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          initial={{ y: 50, scale: 0.95, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 50, scale: 0.95, opacity: 0 }}
          transition={{ 
            type: "spring", 
            damping: 25, 
            stiffness: 300,
            duration: 0.3 
          }}
          className={`fixed z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden ${
            isDragging ? 'shadow-2xl cursor-grabbing select-none' : isResizing ? 'shadow-2xl select-none' : 'cursor-auto'
          }`}
          style={{
            top: Math.max(10, Math.min(currentPosition.top, window.innerHeight - dimensions.height)),
            left: Math.max(10, Math.min(currentPosition.left, window.innerWidth - dimensions.width)),
            width: dimensions.width,
            height: dimensions.height,
            userSelect: isDragging || isResizing ? 'none' : 'auto',
          }}
          onMouseDown={handleMouseDown}
        >
          {/* Header */}
          <div className={`drag-handle p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}>
            <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <GripHorizontal className="h-4 w-4 text-slate-400" />
                <MessageSquare className="h-4 w-4" />
                <span>Select a canned response • Drag to move</span>
              </div>
              <div className="flex items-center gap-2">
                {searchQuery && (
                  <div className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    <span className="text-xs">"{searchQuery}"</span>
                  </div>
                )}
                <button
                  onClick={resetToDefaults}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Reset position and size"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors ${
                    showFilters ? 'bg-slate-200 dark:bg-slate-700' : ''
                  }`}
                  title="Toggle filters"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          {showFilters && (
            <div className="p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-25 dark:bg-slate-850">
              <div className="grid grid-cols-3 gap-3">
                {/* Category Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">All Categories</option>
                    {Array.from(new Set(responses.map(r => r.category))).map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Service Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    Service
                  </label>
                  <select
                    value={filters.service}
                    onChange={(e) => setFilters(prev => ({ ...prev, service: e.target.value }))}
                    className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="">All Services</option>
                    <option value="outbound_calls">Outbound Calls</option>
                    <option value="inbound_calls">Inbound Calls</option>
                    <option value="did_numbers">DID Numbers</option>
                    <option value="sms">SMS</option>
                    <option value="emailing">Emailing</option>
                    <option value="whatsapp_business">WhatsApp Business</option>
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Sort Filter */}
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full text-xs p-2 border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="usage">Most Used</option>
                    <option value="alphabetical">Alphabetical</option>
                    <option value="recent">Recently Updated</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters */}
              {(filters.category || filters.service || filters.sortBy !== 'usage') && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setFilters({ category: '', service: '', sortBy: 'usage' })}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                  >
                    <X className="h-3 w-3" />
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="p-4 text-center">
              <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full mx-auto"></div>
              <p className="text-sm text-slate-500 mt-2">Loading responses...</p>
            </div>
          )}

          {/* No results */}
          {!loading && filteredResponses.length === 0 && (
            <div className="p-6 text-center">
              <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-2">
                {searchQuery ? 'No responses match your search' : 'No canned responses found'}
              </p>
              {searchQuery && (
                <p className="text-xs text-slate-400">
                  Try searching for different keywords or clear your search
                </p>
              )}
            </div>
          )}

          {/* Response List */}
          {!loading && filteredResponses.length > 0 && (
            <div 
              className="overflow-y-auto"
              style={{ 
                height: dimensions.height - (showFilters ? 180 : 120) // Account for header, footer, and optional filter bar
              }}
            >
              {filteredResponses.map((response, index) => (
                <div
                  key={response._id}
                  className={`p-4 cursor-pointer border-b border-slate-100 dark:border-slate-800 transition-colors ${
                    index === selectedIndex
                      ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => handleSelect(response)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-base text-slate-900 dark:text-slate-100 truncate">
                          {response.title}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Tag className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                            {response.category}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 mb-3">
                        {response.content.length > 150 
                          ? `${response.content.substring(0, 150)}...`
                          : response.content
                        }
                      </p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Used {response.usageCount} times</span>
                        </div>
                        {response.keywords && response.keywords.length > 0 && (
                          <div className="flex items-center gap-1">
                            <span>•</span>
                            <span>{response.keywords.slice(0, 3).join(', ')}</span>
                            {response.keywords.length > 3 && <span>...</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    {index === selectedIndex && (
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <CornerDownLeft className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Enhanced Footer */}
          {(loading || filteredResponses.length > 0) && (
            <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 pr-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <ArrowUp className="h-3 w-3" />
                      <ArrowDown className="h-3 w-3" />
                    </div>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CornerDownLeft className="h-3 w-3" />
                    <span>Select</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-medium">Esc</span>
                    <span>Close</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {loading ? 'Loading...' : (
                    <>
                      {filteredResponses.length} of {responses.length} responses
                      {(filters.category || filters.service || searchQuery) && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400">
                          • Filtered
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resize Handle */}
          <div
            className={`absolute bottom-0 right-0 w-4 h-4 ${
              isResizing ? 'cursor-nw-resize' : 'cursor-nw-resize hover:bg-slate-200 dark:hover:bg-slate-700'
            } transition-colors`}
            onMouseDown={handleResizeMouseDown}
            style={{
              background: `linear-gradient(-45deg, transparent 30%, ${isResizing ? '#3b82f6' : '#cbd5e1'} 30%, ${isResizing ? '#3b82f6' : '#cbd5e1'} 35%, transparent 35%, transparent 65%, ${isResizing ? '#3b82f6' : '#cbd5e1'} 65%, ${isResizing ? '#3b82f6' : '#cbd5e1'} 70%, transparent 70%)`
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
} 