import * as monaco from 'monaco-editor';

type MonacoEditor = monaco.editor.IStandaloneCodeEditor;
type MonacoInstance = typeof monaco;

const getSelectionText = (editor: MonacoEditor) => {
  const selection = editor.getSelection();
  const model = editor.getModel();
  if (!selection || !model) {
    return '';
  }
  return model.getValueInRange(selection);
};

const canEdit = (editor: MonacoEditor, monacoInstance: MonacoInstance) => {
  return !editor.getOption(monacoInstance.editor.EditorOption.readOnly);
};

export const addClipboardActions = (editor: MonacoEditor, monacoInstance: MonacoInstance) => {
  editor.addAction({
    id: 'clipboard-copy',
    label: 'Copy',
    contextMenuGroupId: 'clipboard',
    contextMenuOrder: 1,
    run: async () => {
      const action = editor.getAction('editor.action.clipboardCopyAction');
      if (action) {
        try {
          await action.run();
          return;
        } catch {
          // Fall back to clipboard API.
        }
      }

      const text = getSelectionText(editor);
      if (!text || !navigator.clipboard?.writeText) {
        return;
      }

      await navigator.clipboard.writeText(text);
    },
  });

  editor.addAction({
    id: 'clipboard-cut',
    label: 'Cut',
    contextMenuGroupId: 'clipboard',
    contextMenuOrder: 2,
    run: async () => {
      const action = editor.getAction('editor.action.clipboardCutAction');
      if (action) {
        try {
          await action.run();
          return;
        } catch {
          // Fall back to clipboard API.
        }
      }

      if (!canEdit(editor, monacoInstance)) {
        return;
      }

      const selection = editor.getSelection();
      const text = getSelectionText(editor);
      if (!selection || !text || !navigator.clipboard?.writeText) {
        return;
      }

      await navigator.clipboard.writeText(text);
      editor.executeEdits('clipboard.cut', [
        { range: selection, text: '', forceMoveMarkers: true },
      ]);
    },
  });

  editor.addAction({
    id: 'clipboard-paste',
    label: 'Paste',
    contextMenuGroupId: 'clipboard',
    contextMenuOrder: 3,
    run: async () => {
      const action = editor.getAction('editor.action.clipboardPasteAction');
      if (action) {
        try {
          await action.run();
          return;
        } catch {
          // Fall back to clipboard API.
        }
      }

      if (!canEdit(editor, monacoInstance)) {
        return;
      }

      if (!navigator.clipboard?.readText) {
        return;
      }

      const selection = editor.getSelection();
      if (!selection) {
        return;
      }

      const text = await navigator.clipboard.readText();
      if (!text) {
        return;
      }

      editor.executeEdits('clipboard.paste', [
        { range: selection, text, forceMoveMarkers: true },
      ]);
    },
  });
};
