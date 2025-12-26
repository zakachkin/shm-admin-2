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
  const wrapAction = (
    id: string,
    fallback: () => Promise<boolean>,
    fallbackFirst = false,
  ) => {
    const action = editor.getAction(id);
    if (!action) {
      return;
    }

    const originalRun = action.run?.bind(action);
    const runOriginal = async () => {
      if (!originalRun) {
        return false;
      }
      try {
        await originalRun();
        return true;
      } catch {
        return false;
      }
    };

    action.run = async () => {
      if (fallbackFirst) {
        const ok = await fallback();
        if (!ok) {
          await runOriginal();
        }
        return;
      }

      const ok = await runOriginal();
      if (!ok) {
        await fallback();
      }
    };
  };

  wrapAction('editor.action.clipboardCopyAction', async () => {
    const text = getSelectionText(editor);
    if (!text || !navigator.clipboard?.writeText) {
      return false;
    }

    await navigator.clipboard.writeText(text);
    return true;
  });

  wrapAction(
    'editor.action.clipboardCutAction',
    async () => {
      if (!canEdit(editor, monacoInstance)) {
        return false;
      }

      const selection = editor.getSelection();
      const text = getSelectionText(editor);
      if (!selection || !text || !navigator.clipboard?.writeText) {
        return false;
      }

      await navigator.clipboard.writeText(text);
      editor.executeEdits('clipboard.cut', [
        { range: selection, text: '', forceMoveMarkers: true },
      ]);
      return true;
    },
    true,
  );

  wrapAction(
    'editor.action.clipboardPasteAction',
    async () => {
      if (!canEdit(editor, monacoInstance)) {
        return false;
      }

      if (!navigator.clipboard?.readText) {
        return false;
      }

      const selection = editor.getSelection();
      if (!selection) {
        return false;
      }

      const text = await navigator.clipboard.readText();
      if (!text) {
        return false;
      }

      editor.executeEdits('clipboard.paste', [
        { range: selection, text, forceMoveMarkers: true },
      ]);
      return true;
    },
    true,
  );
};
