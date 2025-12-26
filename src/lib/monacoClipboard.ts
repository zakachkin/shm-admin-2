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
  const builtinIds = [
    'editor.action.clipboardCopyAction',
    'editor.action.clipboardCutAction',
    'editor.action.clipboardPasteAction',
  ];

  builtinIds.forEach((id) => {
    const action = editor.getAction(id);
    if (action && typeof (action as { dispose?: () => void }).dispose === 'function') {
      (action as { dispose: () => void }).dispose();
    }
  });

  editor.addAction({
    id: 'clipboard-copy',
    label: 'Copy',
    contextMenuGroupId: 'clipboard',
    contextMenuOrder: 1,
    run: async () => {
      const text = getSelectionText(editor);
      if (!text) {
        return;
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return;
        }
      } catch {
      }

      window.prompt('Copy text:', text);
    },
  });

  editor.addAction({
    id: 'clipboard-cut',
    label: 'Cut',
    contextMenuGroupId: 'clipboard',
    contextMenuOrder: 2,
    run: async () => {
      if (!canEdit(editor, monacoInstance)) {
        return;
      }

      const selection = editor.getSelection();
      const text = getSelectionText(editor);
      if (!selection || !text) {
        return;
      }

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          editor.executeEdits('clipboard.cut', [
            { range: selection, text: '', forceMoveMarkers: true },
          ]);
          return;
        }
      } catch {
      }

      const manual = window.prompt('Copy text and click OK to cut:', text);
      if (manual === null) {
        return;
      }

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
      if (!canEdit(editor, monacoInstance)) {
        return;
      }

      const selection = editor.getSelection();
      if (!selection) {
        return;
      }

      try {
        if (navigator.clipboard?.readText) {
          const text = await navigator.clipboard.readText();
          if (text) {
            editor.executeEdits('clipboard.paste', [
              { range: selection, text, forceMoveMarkers: true },
            ]);
            return;
          }
        }
      } catch {
      }

      const text = window.prompt('Paste text:', '');
      if (!text) {
        return;
      }

      editor.executeEdits('clipboard.paste', [
        { range: selection, text, forceMoveMarkers: true },
      ]);
    },
  });
};
