'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Eye,
  FileText,
  Image as ImageIcon,
  File
} from 'lucide-react';

interface AttachmentPreviewProps {
  attachment: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url?: string;
  };
  onClose: () => void;
  isOpen: boolean;
}

const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ 
  attachment, 
  onClose, 
  isOpen 
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const fileUrl = attachment.url || `/uploads/tickets/${attachment.filename}`;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 300));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 25));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const resetTransform = () => {
    setZoom(100);
    setRotation(0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    if (mimeType === 'application/pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    if (mimeType.startsWith('text/')) {
      return <FileText className="h-8 w-8 text-green-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const isImage = attachment.mimeType.startsWith('image/');
  const isPDF = attachment.mimeType === 'application/pdf';
  const isText = attachment.mimeType.startsWith('text/');
  const isPreviewable = isImage || isPDF || isText;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full h-full max-w-7xl max-h-screen mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-t-xl border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {getFileIcon(attachment.mimeType)}
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
                {attachment.originalName}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {attachment.mimeType} • {formatFileSize(attachment.size)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isImage && !imageError && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  disabled={zoom <= 25}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[4rem] text-center">
                  {zoom}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  disabled={zoom >= 300}
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRotate}
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetTransform}
                  title="Reset"
                  className="text-xs"
                >
                  Reset
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              asChild
              title="Download"
            >
              <a
                href={fileUrl}
                download={attachment.originalName}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
              </a>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-b-xl overflow-hidden">
          {isPreviewable ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto">
              {/* Image Preview */}
              {isImage && !imageError && (
                <div className="flex items-center justify-center p-4 w-full h-full">
                  <img
                    src={fileUrl}
                    alt={attachment.originalName}
                    className="max-w-full max-h-full object-contain"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transition: 'transform 0.2s ease-in-out'
                    }}
                    onError={() => setImageError(true)}
                  />
                </div>
              )}

              {/* PDF Preview */}
              {isPDF && (
                <div className="w-full h-full">
                  <iframe
                    src={`${fileUrl}#view=FitH`}
                    className="w-full h-full border-0"
                    title={attachment.originalName}
                  />
                </div>
              )}

              {/* Text File Preview */}
              {isText && (
                <div className="w-full h-full p-6 overflow-auto">
                  <iframe
                    src={fileUrl}
                    className="w-full h-full border-0 bg-white dark:bg-slate-900 rounded"
                    title={attachment.originalName}
                  />
                </div>
              )}

              {/* Error State for Images */}
              {isImage && imageError && (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <ImageIcon className="h-16 w-16 text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                    Cannot preview image
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    The image file could not be loaded or displayed.
                  </p>
                  <Button asChild>
                    <a
                      href={fileUrl}
                      download={attachment.originalName}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Non-previewable files */
            <div className="flex flex-col items-center justify-center p-8 text-center h-full">
              {getFileIcon(attachment.mimeType)}
              <h3 className="text-xl font-medium text-slate-900 dark:text-slate-100 mt-4 mb-2">
                {attachment.originalName}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                This file type cannot be previewed in the browser.
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <a
                    href={fileUrl}
                    download={attachment.originalName}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download File
                  </a>
                </Button>
                <Button 
                  variant="outline"
                  asChild
                >
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Open in New Tab
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentPreview; 