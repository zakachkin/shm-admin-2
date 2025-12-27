import ttSnippets from './ttSnippets';

function normalizeBody(body: string | string[]): string {
  return Array.isArray(body) ? body.join('\n') : body;
}

function normalizePrefixes(prefix: string | string[]): string[] {
  return Array.isArray(prefix) ? prefix : [prefix];
}

type TokenAtPosition = {
  token: string;
  startColumn: number;
  endColumn: number;
};

const methodDescriptions = new Map<string, string>();

const addDescription = (key: string, description?: string) => {
  if (!key || !description || methodDescriptions.has(key)) {
    return;
  }
  methodDescriptions.set(key, description);
};

const collectLookupKeys = (prefix: string) => {
  const trimmed = prefix.trim();
  const keys = new Set<string>();
  if (trimmed) {
    keys.add(trimmed);
  }

  const methodMatch = /tt_method\s*-\s*([A-Za-z0-9_.]+)/i.exec(trimmed);
  if (methodMatch?.[1]) {
    keys.add(methodMatch[1]);
  }

  const tokens = trimmed.match(/[A-Za-z0-9_.]+/g);
  if (tokens && tokens.length > 0) {
    keys.add(tokens[0]);
    const lastToken = tokens[tokens.length - 1];
    if (trimmed.includes(' ') || lastToken.includes('.')) {
      keys.add(lastToken);
    }
  }

  return [...keys];
};

Object.values(ttSnippets).forEach((snippet) => {
  const prefixes = normalizePrefixes(snippet.prefix);
  prefixes.forEach((prefix) => {
    collectLookupKeys(String(prefix)).forEach((key) => {
      addDescription(key, snippet.description);
    });
  });
});

const isTokenChar = (char: string) => /[A-Za-z0-9_.]/.test(char);

const getTokenAtPosition = (model: any, position: any): TokenAtPosition | null => {
  const line = model.getLineContent(position.lineNumber);
  if (!line) {
    return null;
  }

  let index = position.column - 1;
  if (index >= line.length) {
    index = line.length - 1;
  }
  if (index < 0) {
    return null;
  }

  if (!isTokenChar(line[index])) {
    if (index === 0 || !isTokenChar(line[index - 1])) {
      return null;
    }
    index -= 1;
  }

  let start = index;
  while (start > 0 && isTokenChar(line[start - 1])) {
    start -= 1;
  }

  let end = index;
  while (end < line.length - 1 && isTokenChar(line[end + 1])) {
    end += 1;
  }

  const token = line.slice(start, end + 1);
  return {
    token,
    startColumn: start + 1,
    endColumn: end + 2,
  };
};

const registerTTHover = (monaco: any) => {
  if (!monaco || (monaco as any).__ttHoverRegistered) {
    return;
  }
  (monaco as any).__ttHoverRegistered = true;

  const languages = ['tt', 'plaintext', 'html', 'json', 'javascript', 'shell', 'perl'];
  languages.forEach((language) => {
    monaco.languages.registerHoverProvider(language, {
      provideHover: (model: any, position: any) => {
        const token = getTokenAtPosition(model, position);
        if (!token) {
          return null;
        }
        const description = methodDescriptions.get(token.token);
        if (!description) {
          return null;
        }
        return {
          range: new monaco.Range(position.lineNumber, token.startColumn, position.lineNumber, token.endColumn),
          contents: [{ value: `**${token.token}**\n\n${description}` }],
        };
      },
    });
  });
};

export function registerTTMethodHelp(editor: any, monaco: any) {
  if (!editor || (editor as any).__ttMethodHelpRegistered) {
    return;
  }
  (editor as any).__ttMethodHelpRegistered = true;
  registerTTHover(monaco);

  editor.addAction({
    id: 'tt.showMethodDescription',
    label: 'Show method description',
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyH],
    run: () => {
      editor.trigger('keyboard', 'editor.action.showHover', null);
    },
  });
}

export function registerTTCompletion(monaco: any) {
  if (!monaco || (monaco as any).__ttCompletionRegistered) {
    return;
  }
  (monaco as any).__ttCompletionRegistered = true;

  if (!monaco.languages.getLanguages().some((lang: any) => lang.id === 'tt')) {
    monaco.languages.register({ id: 'tt' });
  }

  if (!(monaco as any).__ttSyntaxRegistered) {
    (monaco as any).__ttSyntaxRegistered = true;
    monaco.languages.setMonarchTokensProvider('tt', {
      tokenizer: {
        root: [
          [/\{\{/, { token: 'delimiter.bracket', next: '@tt' }],
          [/[^{}]+/, ''],
        ],
        tt: [
          [/\}\}/, { token: 'delimiter.bracket', next: '@pop' }],
          [/\s+/, 'white'],
          [/#.*$/, 'comment'],
          [/"([^"\\]|\\.)*"/, 'string'],
          [/'([^'\\]|\\.)*'/, 'string'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/\b(?:IF|ELSIF|ELSE|UNLESS|FOREACH|FOR|WHILE|END|BLOCK|CALL|SET|DEFAULT|INCLUDE|PROCESS|WRAPPER|FILTER|MACRO|USE|NEXT|LAST|STOP|RETURN|BREAK|CONTINUE|SWITCH|CASE|PERL|TRY|CATCH|FINAL|INSERT)\b/i, 'keyword'],
          [/\b(?:true|false|undef|null)\b/i, 'constant'],
          [/[=<>!~?:&|+\-*/%]+/, 'operator'],
          [/[()[\],.]/, 'delimiter'],
          [/@[A-Za-z_][\w.]*/, 'variable'],
          [/[A-Za-z_][\w.]*/, 'identifier'],
          [/./, ''],
        ],
      },
    });

    monaco.languages.setLanguageConfiguration('tt', {
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '{{', close: '}}' },
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"', notIn: ['string', 'comment'] },
        { open: "'", close: "'", notIn: ['string', 'comment'] },
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });
  }

  const allSuggestions = Object.entries(ttSnippets).flatMap(([key, snippet]) => {
    const body = normalizeBody(snippet.body);
    const prefixes = normalizePrefixes(snippet.prefix);
    return prefixes.map((prefix) => ({
      label: prefix,
      kind: monaco.languages.CompletionItemKind.Snippet,
      detail: snippet.description || key,
      documentation: snippet.description || key,
      insertText: body,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
    }));
  });

  const getSuggestions = (model: any, position: any) => {
    const lineContent = model.getLineContent(position.lineNumber);
    const before = lineContent.slice(0, position.column - 1);
    const lastOpen = Math.max(before.lastIndexOf('{{'), before.lastIndexOf('[%'));
    const lastClose = Math.max(before.lastIndexOf('}}'), before.lastIndexOf('%]'));
    const inTag = lastOpen > lastClose;

    if (!inTag) {
      return [];
    }

    const trimmed = before.replace(/\s+$/, '');
    const ifMatch = /(?:^|[^A-Za-z0-9_])IF\s*$/i.test(trimmed);
    if (ifMatch) {
      return allSuggestions;
    }

    const dotMatch = /([A-Za-z0-9_.]+)\.$/.exec(trimmed);
    const groupPrefix = dotMatch ? `${dotMatch[1]}.` : null;

    if (groupPrefix) {
      const filtered = allSuggestions.filter((item) => String(item.label).startsWith(groupPrefix));
      return filtered.length > 0 ? filtered : allSuggestions;
    }

    if (before.trim().endsWith('.')) {
      return allSuggestions.filter((item) => String(item.label).includes('.'));
    }

    return allSuggestions;
  };

  const languages = ['tt', 'plaintext', 'html', 'json', 'javascript', 'shell', 'perl'];
  languages.forEach((language) => {
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['{', '[', '.', ' ', 'I'],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: word.endColumn,
        };

        const suggestions = getSuggestions(model, position).map((item: any) => ({
          ...item,
          range,
        }));

        return { suggestions };
      },
    });
  });

  registerTTHover(monaco);
}

