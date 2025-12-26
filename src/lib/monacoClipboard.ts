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
  editor.updateOptions({ contextmenu: false });

  const runCopy = async () => {
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
  };

  const runCut = async () => {
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
  };

  const runPaste = async () => {
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
  };

  const domNode = editor.getDomNode();
  if (!domNode) {
    return;
  }

  const menu = document.createElement('div');
  menu.style.position = 'fixed';
  menu.style.zIndex = '100000';
  menu.style.display = 'none';
  menu.style.minWidth = '160px';
  menu.style.background = 'var(--theme-content-bg, #1f2937)';
  menu.style.border = '1px solid var(--theme-border, #374151)';
  menu.style.borderRadius = '6px';
  menu.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.35)';
  menu.style.padding = '4px 0';
  menu.style.color = 'var(--theme-content-text, #e5e7eb)';
  menu.style.fontSize = '13px';
  menu.style.fontFamily = 'inherit';

  const buildItem = (label: string, onClick: () => void) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.textContent = label;
    item.style.display = 'block';
    item.style.width = '100%';
    item.style.padding = '6px 12px';
    item.style.background = 'transparent';
    item.style.border = '0';
    item.style.textAlign = 'left';
    item.style.cursor = 'pointer';
    item.style.color = 'inherit';
    item.onmouseenter = () => {
      item.style.background = 'var(--theme-button-secondary-bg, #374151)';
    };
    item.onmouseleave = () => {
      item.style.background = 'transparent';
    };
    item.onclick = () => {
      hideMenu();
      onClick();
    };
    return item;
  };

  const hideMenu = () => {
    menu.style.display = 'none';
  };

  const showMenu = (x: number, y: number) => {
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.style.display = 'block';
  };

  menu.appendChild(buildItem('Cut', () => void runCut()));
  menu.appendChild(buildItem('Copy', () => void runCopy()));
  menu.appendChild(buildItem('Paste', () => void runPaste()));

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    showMenu(event.clientX, event.clientY);
  };

  const handleGlobalClick = (event: MouseEvent) => {
    if (!menu.contains(event.target as Node)) {
      hideMenu();
    }
  };

  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideMenu();
    }
  };

  domNode.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', handleGlobalClick);
  document.addEventListener('keydown', handleEscape);
  window.addEventListener('blur', hideMenu);
  document.body.appendChild(menu);

  editor.onDidDispose(() => {
    domNode.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('click', handleGlobalClick);
    document.removeEventListener('keydown', handleEscape);
    window.removeEventListener('blur', hideMenu);
    menu.remove();
  });
};
