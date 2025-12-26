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

const getInsertRange = (editor: MonacoEditor, monacoInstance: MonacoInstance) => {
  const selection = editor.getSelection();
  if (selection) {
    return selection;
  }

  const position = editor.getPosition();
  if (!position) {
    return null;
  }

  return new monacoInstance.Range(
    position.lineNumber,
    position.column,
    position.lineNumber,
    position.column,
  );
};

const canEdit = (editor: MonacoEditor, monacoInstance: MonacoInstance) => {
  return !editor.getOption(monacoInstance.editor.EditorOption.readOnly);
};

export const addClipboardActions = (editor: MonacoEditor, monacoInstance: MonacoInstance) => {
  const replaceAction = (id: string, run: () => Promise<void>) => {
    const action = editor.getAction(id);
    if (!action) {
      return;
    }

    action.run = run;
  };

  replaceAction('editor.action.clipboardCopyAction', async () => {
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
  });

  replaceAction('editor.action.clipboardCutAction', async () => {
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
  });

  replaceAction('editor.action.clipboardPasteAction', async () => {
    if (!canEdit(editor, monacoInstance)) {
      return;
    }

    const selection = getInsertRange(editor, monacoInstance);
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
  });
};
