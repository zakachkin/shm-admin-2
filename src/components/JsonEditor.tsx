import React, { useState, useEffect, useRef } from 'react';
import { Settings, Copy, Check } from 'lucide-react';
import Modal from './Modal';
// @ts-ignore - vanilla-jsoneditor types issue
import { JSONEditor, Mode, type Content, type OnChangeStatus } from 'vanilla-jsoneditor';

interface JsonEditorProps {
  data: any;
  onChange?: (data: any) => void;
  readonly?: boolean;
  label?: string;
  className?: string;
  showInput?: boolean;
}

// Обёртка для vanilla-jsoneditor в React
function VanillaJsonEditor({
  initialContent,
  onChange,
  readonly = false,
  mode = Mode.tree,
}: {
  initialContent: Content;
  onChange?: (content: Content, previousContent: Content, status: OnChangeStatus) => void;
  readonly?: boolean;
  mode?: Mode.tree;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);

  // Храним актуальный onChange в ref
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Обёртка для onChange, которая использует актуальный callback из ref
    const handleChange = (content: Content, previousContent: Content, status: OnChangeStatus) => {
      if (onChangeRef.current) {
        onChangeRef.current(content, previousContent, status);
      }
    };

    // @ts-ignore - vanilla-jsoneditor types
    editorRef.current = new JSONEditor({
      target: containerRef.current,
      props: {
        content: initialContent,
        onChange: handleChange,
        readOnly: readonly,
        mode,
        mainMenuBar: true,
        navigationBar: false,
        statusBar: true,
        askToFormat: false,
        escapeControlCharacters: false,
        escapeUnicodeCharacters: false,
      }
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // Обновляем readonly при изменении пропсов
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateProps({ readOnly: readonly });
    }
  }, [readonly]);

  return (
    <div 
      ref={containerRef} 
      className="vanilla-jsoneditor-container"
      style={{ height: '400px' }}
    />
  );
}

export default function JsonEditor({ 
  data, 
  onChange, 
  readonly = false, 
  label, 
  className = '',
  showInput = true,
}: JsonEditorProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [localContent, setLocalContent] = useState<Content>({ json: data });
  const [copied, setCopied] = useState(false);
  
  // Ref для хранения актуального content (для использования в handleSave)
  const contentRef = useRef<Content>({ json: data });

  useEffect(() => {
    setLocalContent({ json: data });
    contentRef.current = { json: data };
  }, [data]);

  const handleOpen = () => {
    const initialContent = { json: data };
    setLocalContent(initialContent);
    contentRef.current = initialContent;
    setModalOpen(true);
  };

  const handleContentChange = (content: Content, _previousContent: Content, status: OnChangeStatus) => {
    // Сохраняем content если нет ошибок (contentErrors может быть null или undefined)
    if (!status.contentErrors) {
      setLocalContent(content);
      contentRef.current = content;
    }
  };

  const handleSave = () => {
    if (onChange) {
      // Получаем JSON из content - используем ref для актуальных данных
      const currentContent = contentRef.current;
      let jsonData: any;
      if ('json' in currentContent && currentContent.json !== undefined) {
        jsonData = currentContent.json;
      } else if ('text' in currentContent && currentContent.text) {
        try {
          jsonData = JSON.parse(currentContent.text);
        } catch (e) {
          console.error('Failed to parse JSON text:', e);
          return; // Не закрываем если невалидный JSON
        }
      } else {
        jsonData = {};
      }
      onChange(jsonData);
    }
    setModalOpen(false);
  };

  const handleCopy = async () => {
    try {
      const text = 'json' in localContent 
        ? JSON.stringify(localContent.json, null, 2)
        : localContent.text || '';
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  const getPreview = () => {
    if (data === null || data === undefined) return '';
    try {
      const str = JSON.stringify(data);
      return str.length > 50 ? str.slice(0, 50) + '...' : str;
    } catch {
      return '[Object]';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      {showInput && (
        <input
          type="text"
          value={getPreview()}
          readOnly
          className="flex-1 px-3 py-2 text-sm rounded border"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
            color: 'var(--text-muted)',
          }}
        />
      )}
      <button
        type="button"
        onClick={handleOpen}
        className="p-2 rounded border hover:opacity-80 transition-opacity"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          borderColor: 'var(--border-color)',
          color: 'var(--text-primary)',
        }}
        title={readonly ? 'Просмотр JSON' : 'Редактировать JSON'}
      >
        <Settings className="w-5 h-5" />
      </button>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={readonly ? 'Просмотр JSON' : 'JSON редактор'}
        size="xl"
        footer={
          <div className="flex justify-between w-full">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-2 rounded border flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                {readonly ? 'Закрыть' : 'Отмена'}
              </button>
              {!readonly && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-2 rounded text-white"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Сохранить
                </button>
              )}
            </div>
          </div>
        }
      >
        {readonly && (
          <div 
            className="mb-3 px-3 py-1.5 text-xs rounded inline-block"
            style={{ 
              backgroundColor: 'var(--warning-bg, #fef3c7)', 
              color: 'var(--warning-text, #92400e)' 
            }}
          >
            Только чтение
          </div>
        )}
        
        {modalOpen && (
          <VanillaJsonEditor
            initialContent={localContent}
            onChange={handleContentChange}
            readonly={readonly}
          />
        )}
      </Modal>
    </div>
  );
}
