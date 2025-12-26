import React, { useState } from 'react';
import Modal from '../components/Modal';
import { X, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { shm_request } from '../lib/shm_request';
import UserSelect from '../components/UserSelect';

interface TemplateTestModalProps {
  open: boolean;
  onClose: () => void;
  templateId: string;
}

export default function TemplateTestModal({
  open,
  onClose,
  templateId,
}: TemplateTestModalProps) {
  const [userId, setUserId] = useState<number>(1);
  const [usi, setUsi] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState('');

  const formatDumperPretty = (input: string) => {
    let out = '';
    let indent = 0;
    let inString = false;
    let quote = '';
    const indentStep = 2;
    const pushIndent = () => {
      out += `\n${' '.repeat(indent)}`;
    };

    let startIndex = 0;
    const prefixMatch = input.match(/^\$VAR\d+\s*=\s*/i);
    if (prefixMatch) {
      out += prefixMatch[0].trim();
      out += '\n';
      indent = indentStep;
      out += ' '.repeat(indent);
      startIndex = prefixMatch[0].length;
    }

    for (let i = startIndex; i < input.length; i += 1) {
      const ch = input[i];
      const next = input[i + 1];

      if (inString) {
        out += ch;
        if (ch === '\\') {
          if (next) {
            out += next;
            i += 1;
          }
          continue;
        }
        if (ch === quote) {
          inString = false;
          quote = '';
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = true;
        quote = ch;
        out += ch;
        continue;
      }

      if (ch === '=' && next === '>') {
        out += ' => ';
        i += 1;
        continue;
      }

      if (ch === '{' || ch === '[' || ch === '(') {
        out += ch;
        indent += indentStep;
        pushIndent();
        continue;
      }

      if (ch === '}' || ch === ']' || ch === ')') {
        indent = Math.max(0, indent - indentStep);
        pushIndent();
        out += ch;
        continue;
      }

      if (ch === ',') {
        out += ch;
        pushIndent();
        continue;
      }

      if (/\s/.test(ch)) {
        if (out.endsWith(' ')) {
          continue;
        }
        out += ' ';
        continue;
      }

      out += ch;
    }

    return out.trim();
  };

  const formatRenderResult = (result: any) => {
    if (result == null) {
      return '';
    }
    if (typeof result !== 'string') {
      return JSON.stringify(result, null, 2);
    }
    const trimmed = result.trim();
    if (trimmed.startsWith('$VAR')) {
      return formatDumperPretty(trimmed);
    }
    return trimmed;
  };

  const handleRender = async () => {
    if (!userId) {
      toast.error('Выберите пользователя');
      return;
    }

    setRendering(true);
    try {
      const params = new URLSearchParams({
        user_id: String(userId),
        dry_run: dryRun ? '1' : '0',
        format: 'default',
      });
      
      if (usi) {
        params.append('usi', usi);
      }

      const response = await shm_request(`/shm/v1/template/${templateId}?${params.toString()}`);
      const result = response.data?.[0] ?? response.data ?? response;
      setRenderResult(formatRenderResult(result));
      toast.success('Успех');
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setRendering(false);
    }
  };

  const handleClose = () => {
    setRenderResult('');
    setUserId(1);
    setUsi('');
    setDryRun(true);
    onClose();
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  const labelStyles = {
    color: 'var(--theme-content-text-muted)',
  };

  const renderFooter = () => (
    <div className="flex justify-end items-center w-full gap-2">
      <button
        onClick={handleClose}
        className="px-4 py-2 rounded flex items-center gap-2"
        style={{
          backgroundColor: 'var(--theme-button-secondary-bg)',
          color: 'var(--theme-button-secondary-text)',
          border: '1px solid var(--theme-button-secondary-border)',
        }}
      >
        <X className="w-4 h-4" />
        Закрыть
      </button>
      <button
        onClick={handleRender}
        disabled={rendering || !userId}
        className="px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 btn-primary"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
      >
        <Play className="w-4 h-4" />
        {rendering ? 'Рендер...' : 'Render'}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Тест шаблона"
      size="lg"
      resizable={true}
      footer={renderFooter()}
    >
      <div className="space-y-4 flex flex-col h-full">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Пользователь *
          </label>
          <div className="flex-1">
            <UserSelect
              value={userId}
              onChange={(value) => setUserId(value || 1)}
            />
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            USI
          </label>
          <input
            type="number"
            value={usi}
            onChange={(e) => setUsi(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
            placeholder="Введите USI (опционально)"
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Dry Run
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{
                accentColor: 'var(--accent-primary)',
              }}
            />
            <span className="text-sm" style={{ color: 'var(--theme-content-text)' }}>
              Не сохранять изменения в БД при тестировании шаблона
            </span>
          </label>
        </div>

        {}
        <div className="flex items-start gap-3 flex-1 min-h-0">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Результат
          </label>
          <textarea
            value={renderResult}
            readOnly
            className="flex-1 h-full px-2 py-1.5 text-sm rounded border font-mono leading-snug"
            style={{ ...inputStyles, resize: 'none', minHeight: 280 }}
            placeholder="Результат рендера появится здесь..."
          />
        </div>
      </div>
    </Modal>
  );
}





