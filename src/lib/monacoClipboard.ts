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
  const wrapAction = (id: string, fallback: () => Promise<void>) => {
    const action = editor.getAction(id);
    if (!action) {
      return;
    }

    const originalRun = action.run?.bind(action);
    action.run = async () => {
      if (originalRun) {
        try {
          await originalRun();
          return;
        } catch {
          // Fall back to clipboard API.
        }
      }

      await fallback();
    };
  };

  wrapAction('editor.action.clipboardCopyAction', async () => {
    const text = getSelectionText(editor);
    if (!text || !navigator.clipboard?.writeText) {
      return;
    }

    await navigator.clipboard.writeText(text);
  });

  wrapAction('editor.action.clipboardCutAction', async () => {
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
  });

  wrapAction('editor.action.clipboardPasteAction', async () => {
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
  });
};
