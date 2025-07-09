'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import FontFamily from '@tiptap/extension-font-family';
import ListKeymap from '@tiptap/extension-list-keymap';
import { forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Type,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Image as ImageIcon,
  Minus,
  Highlighter,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Indent,
  Outdent,
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react';

// Type for editor reference  
type EditorElement = HTMLDivElement;

// Type for keyboard events
interface KeyboardEventHandler {
  (event: KeyboardEvent): void;
}

interface WysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minHeight?: string;
  toolbar?: 'basic' | 'standard' | 'full';
  onKeyDown?: KeyboardEventHandler;
  id?: string;
}

const WysiwygEditor = forwardRef<EditorElement, WysiwygEditorProps>(
  ({ 
    value, 
    onChange, 
    placeholder = "Type your message here...", 
    className = "",
    disabled = false,
    minHeight = "120px",
    toolbar = "standard",
    onKeyDown,
    id
  }, ref) => {

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);

    const extensions = useMemo(() => [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Underline,
      TextStyle,
      Color.configure({
        types: ['textStyle'],
      }),
      Highlight.configure({
        multicolor: true,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      HorizontalRule,
      Superscript,
      Subscript,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      ListKeymap,
    ], [placeholder]);

    const editor = useEditor({
      extensions,
      content: value,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        if (html !== value) {
          onChange(html);
        }
      },
      editorProps: {
        attributes: {
          class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[' + minHeight + '] p-4',
          style: `min-height: ${minHeight}`,
        },
        handleKeyDown: (view, event) => {
          if (onKeyDown) {
            onKeyDown(event);
          }
          return false;
        },
      },
    });

    // Update editor content when value prop changes
    useEffect(() => {
      if (editor && value !== editor.getHTML()) {
        editor.commands.setContent(value);
      }
    }, [value, editor]);

    // Handle disabled state
    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [disabled, editor]);

    const setLink = useCallback(() => {
      if (!editor) return;
      
      const previousUrl = editor.getAttributes('link').href;
      const url = window.prompt('URL', previousUrl);

      if (url === null) {
        return;
      }

      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
        return;
      }

      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addImage = useCallback(() => {
      if (!editor) return;
      
      const url = window.prompt('Image URL');

      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }, [editor]);

    const insertTable = useCallback(() => {
      if (!editor) return;
      
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }, [editor]);

    const colors = [
      '#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff',
      '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff',
      '#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc',
      '#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd',
      '#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0',
      '#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79',
      '#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47',
      '#5b0f00', '#660000', '#783f04', '#7f6000', '#274e13', '#0c343d', '#1c4587', '#073763', '#20124d', '#4c1130'
    ];

    const ToolbarButton = ({ 
      onClick, 
      isActive = false, 
      disabled = false, 
      children, 
      title,
      variant = 'default'
    }: {
      onClick: (e?: React.MouseEvent) => void;
      isActive?: boolean;
      disabled?: boolean;
      children: React.ReactNode;
      title: string;
      variant?: 'default' | 'dropdown';
    }) => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`h-8 ${variant === 'dropdown' ? 'w-auto px-2' : 'w-8'} p-0 ${
          isActive 
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100' 
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
        }`}
      >
        {children}
      </Button>
    );

    const ColorPickerModal = ({ 
      isOpen, 
      onClose, 
      onColorSelect, 
      colors: colorPalette,
      title 
    }: { 
      isOpen: boolean;
      onClose: () => void;
      onColorSelect: (color: string) => void;
      colors: string[];
      title: string;
    }) => {
      if (!isOpen) return null;

      const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      };

      const handleModalClick = (e: React.MouseEvent) => {
        e.stopPropagation();
      };

      return (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal */}
          <div 
            className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200"
            onClick={handleModalClick}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {title}
              </h3>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-10 gap-3 mb-6">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="w-8 h-8 rounded-lg border-2 border-slate-300 dark:border-slate-600 hover:scale-110 hover:shadow-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onColorSelect(color);
                    onClose();
                  }}
                  title={color}
                />
              ))}
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors border border-slate-300 dark:border-slate-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onColorSelect('');
                  onClose();
                }}
              >
                Remove Color
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    };

    const renderToolbar = () => {
      if (!editor) return null;

      const basicTools = (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            isActive={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
        </>
      );

      const standardTools = (
        <>
          {basicTools}
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          
          {/* Text Color */}
          <div className="relative">
            <ToolbarButton
              onClick={(e) => {
                e?.stopPropagation();
                setShowColorPicker(!showColorPicker);
                setShowHighlightPicker(false);
              }}
              isActive={showColorPicker}
              title="Text Color"
            >
              <div className="flex flex-col items-center">
                <Type className="h-3 w-3" />
                <div 
                  className="w-3 h-1 mt-0.5 border border-slate-300 dark:border-slate-600"
                  style={{ backgroundColor: editor.getAttributes('textStyle').color || '#000000' }}
                />
              </div>
            </ToolbarButton>
          </div>

          {/* Highlight Color */}
          <div className="relative">
            <ToolbarButton
              onClick={(e) => {
                e?.stopPropagation();
                setShowHighlightPicker(!showHighlightPicker);
                setShowColorPicker(false);
              }}
              isActive={editor.isActive('highlight') || showHighlightPicker}
              title="Highlight"
            >
              <Highlighter className="h-4 w-4" />
            </ToolbarButton>
          </div>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            isActive={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

          <ToolbarButton
            onClick={setLink}
            isActive={editor.isActive('link')}
            title="Add Link"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
        </>
      );

      const fullTools = (
        <>
          {/* Headings */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            isActive={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          
          {standardTools}
          
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

          {/* Advanced formatting */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            isActive={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            isActive={editor.isActive('superscript')}
            title="Superscript"
          >
            <SuperscriptIcon className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            isActive={editor.isActive('subscript')}
            title="Subscript"
          >
            <SubscriptIcon className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            isActive={editor.isActive('code')}
            title="Inline Code"
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
            title="Code Block"
          >
            <Code2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

          {/* Alignment */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            isActive={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            isActive={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            isActive={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            isActive={editor.isActive({ textAlign: 'justify' })}
            title="Justify"
          >
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

          {/* Lists indentation */}
          <ToolbarButton
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            disabled={!editor.can().sinkListItem('listItem')}
            title="Indent List"
          >
            <Indent className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            disabled={!editor.can().liftListItem('listItem')}
            title="Outdent List"
          >
            <Outdent className="h-4 w-4" />
          </ToolbarButton>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />

          {/* Insert elements */}
          <ToolbarButton
            onClick={() => insertTable()}
            title="Insert Table"
          >
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => addImage()}
            title="Insert Image"
          >
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Insert Horizontal Rule"
          >
            <Minus className="h-4 w-4" />
          </ToolbarButton>

          {/* Table controls when in table */}
          {editor.isActive('table') && (
            <>
              <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
              <ToolbarButton
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                title="Add Column Before"
              >
                <div className="text-xs">+Col</div>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteColumn().run()}
                title="Delete Column"
              >
                <Trash2 className="h-3 w-3" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().addRowBefore().run()}
                title="Add Row Before"
              >
                <div className="text-xs">+Row</div>
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteRow().run()}
                title="Delete Row"
              >
                <Trash2 className="h-3 w-3" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteTable().run()}
                title="Delete Table"
              >
                <Trash2 className="h-4 w-4" />
              </ToolbarButton>
            </>
          )}
        </>
      );

      const undoRedoTools = (
        <>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </>
      );

      const fullscreenTools = (
        <>
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
          <ToolbarButton
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </ToolbarButton>
        </>
      );

      return (
        <div className="flex items-center gap-1 p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-t-xl overflow-x-auto relative">
          {toolbar === 'basic' && basicTools}
          {toolbar === 'standard' && standardTools}
          {toolbar === 'full' && fullTools}
          {undoRedoTools}
          {fullscreenTools}
        </div>
      );
    };

    if (!editor) {
      return (
        <div className={`wysiwyg-editor ${className}`}>
          <div className="min-h-[120px] border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 animate-pulse" />
        </div>
      );
    }

    const editorContainerClass = isFullscreen 
      ? "fixed inset-0 z-50 bg-white dark:bg-slate-900 flex flex-col"
      : `wysiwyg-editor ${className}`;

    return (
      <div className={editorContainerClass} id={id} ref={ref}>
        <div 
          className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 dark:focus-within:border-blue-400 flex flex-col flex-1 relative"
          onClick={() => {
            if (editor && !editor.isFocused) {
              editor.commands.focus();
            }
          }}
        >
          {renderToolbar()}
          <div 
            className={`relative ${isFullscreen ? 'flex-1 overflow-auto' : ''}`}
            style={!isFullscreen ? { minHeight } : { minHeight: '100%' }}
          >
            <EditorContent 
              editor={editor} 
              className={`prose prose-sm max-w-none dark:prose-invert focus:outline-none ${isFullscreen ? 'h-full' : ''}`}
              style={!isFullscreen ? { minHeight } : { minHeight: '100%' }}
            />
          </div>
        </div>

        {/* Color Picker Modals */}
        <ColorPickerModal 
          isOpen={showColorPicker}
          onClose={() => {
            setShowColorPicker(false);
            setShowHighlightPicker(false);
          }} 
          onColorSelect={(color) => {
            if (color) {
              editor.chain().focus().setColor(color).run();
            } else {
              editor.chain().focus().unsetColor().run();
            }
          }} 
          colors={colors}
          title="Text Color"
        />

        <ColorPickerModal 
          isOpen={showHighlightPicker}
          onClose={() => {
            setShowHighlightPicker(false);
            setShowColorPicker(false);
          }} 
          onColorSelect={(color) => {
            if (color) {
              editor.chain().focus().setHighlight({ color }).run();
            } else {
              editor.chain().focus().unsetHighlight().run();
            }
          }} 
          colors={colors}
          title="Highlight"
        />

        <style jsx global>{`
          .ProseMirror {
            outline: none;
            padding: 16px;
            min-height: ${isFullscreen ? '100%' : minHeight};
            color: rgb(30 41 59);
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
            font-size: 14px;
            line-height: 1.6;
          }

          .dark .ProseMirror {
            color: rgb(226 232 240);
          }

          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: rgb(148 163 184);
            pointer-events: none;
            height: 0;
          }

          .dark .ProseMirror p.is-editor-empty:first-child::before {
            color: rgb(100 116 139);
          }

          .ProseMirror h1 {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
          }

          .ProseMirror h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
          }

          .ProseMirror h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
          }

          .ProseMirror h4 {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
          }

          .ProseMirror h5 {
            font-size: 1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
          }

          .ProseMirror h6 {
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            margin-top: 1rem;
          }

          .ProseMirror blockquote {
            border-left: 4px solid rgb(226 232 240);
            padding-left: 16px;
            margin: 16px 0;
            font-style: italic;
            color: rgb(71 85 105);
          }

          .dark .ProseMirror blockquote {
            border-left-color: rgb(51 65 85);
            color: rgb(148 163 184);
          }

          .ProseMirror code {
            background: rgb(248 250 252);
            padding: 2px 4px;
            border-radius: 4px;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
            font-size: 0.875rem;
          }

          .dark .ProseMirror code {
            background: rgb(30 41 59);
          }

          .ProseMirror pre {
            background: rgb(248 250 252);
            border: 1px solid rgb(226 232 240);
            border-radius: 8px;
            padding: 16px;
            margin: 16px 0;
            overflow-x: auto;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
          }

          .dark .ProseMirror pre {
            background: rgb(30 41 59);
            border-color: rgb(51 65 85);
          }

          .ProseMirror ul, .ProseMirror ol {
            padding-left: 1.5rem;
            margin: 1rem 0;
          }

          .ProseMirror ul {
            list-style-type: disc;
          }

          .ProseMirror ol {
            list-style-type: decimal;
          }

          .ProseMirror li {
            margin: 0.25rem 0;
          }

          .ProseMirror a {
            color: rgb(59 130 246);
            text-decoration: underline;
            cursor: pointer;
          }

          .dark .ProseMirror a {
            color: rgb(96 165 250);
          }

          .ProseMirror strong {
            font-weight: 700;
          }

          .ProseMirror em {
            font-style: italic;
          }

          .ProseMirror u {
            text-decoration: underline;
          }

          .ProseMirror s {
            text-decoration: line-through;
          }

          .ProseMirror sup {
            font-size: 0.75rem;
            vertical-align: super;
          }

          .ProseMirror sub {
            font-size: 0.75rem;
            vertical-align: sub;
          }

          .ProseMirror mark {
            background: rgb(254 240 138);
            padding: 1px 2px;
            border-radius: 2px;
          }

          .dark .ProseMirror mark {
            background: rgb(92 124 250);
            color: white;
          }

          .ProseMirror p {
            margin: 0.5rem 0;
          }

          .ProseMirror p:first-child {
            margin-top: 0;
          }

          .ProseMirror p:last-child {
            margin-bottom: 0;
          }

          .ProseMirror hr {
            border: none;
            border-top: 2px solid rgb(226 232 240);
            margin: 2rem 0;
          }

          .dark .ProseMirror hr {
            border-top-color: rgb(51 65 85);
          }

          .ProseMirror img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            margin: 1rem 0;
          }

          .ProseMirror table {
            border-collapse: collapse;
            margin: 1rem 0;
            table-layout: fixed;
            width: 100%;
          }

          .ProseMirror table td,
          .ProseMirror table th {
            border: 1px solid rgb(226 232 240);
            box-sizing: border-box;
            min-width: 1em;
            padding: 8px 12px;
            position: relative;
            vertical-align: top;
          }

          .dark .ProseMirror table td,
          .dark .ProseMirror table th {
            border-color: rgb(51 65 85);
          }

          .ProseMirror table th {
            background-color: rgb(248 250 252);
            font-weight: 600;
          }

          .dark .ProseMirror table th {
            background-color: rgb(30 41 59);
          }

          .ProseMirror .selectedCell:after {
            background: rgba(59, 130, 246, 0.1);
            content: "";
            left: 0;
            right: 0;
            top: 0;
            bottom: 0;
            pointer-events: none;
            position: absolute;
            z-index: 2;
          }

          .ProseMirror .column-resize-handle {
            background-color: rgb(59 130 246);
            bottom: -2px;
            position: absolute;
            right: -2px;
            pointer-events: none;
            top: 0;
            width: 4px;
          }

          .ProseMirror.resize-cursor {
            cursor: ew-resize;
            cursor: col-resize;
          }
        `}</style>
      </div>
    );
  }
);

WysiwygEditor.displayName = 'WysiwygEditor';

export default WysiwygEditor; 