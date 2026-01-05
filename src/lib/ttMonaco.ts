import ttSnippets from './ttSnippets';

function normalizeBody(body: string | string[]): string {
  return Array.isArray(body) ? body.join('\n') : body;
}

function normalizePrefixes(prefix: string | string[]): string[] {
  return Array.isArray(prefix) ? prefix : [prefix];
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
    const lastOpen = before.lastIndexOf('{{');
    const lastClose = before.lastIndexOf('}}');
    const inTag = lastOpen > lastClose;

    if (!inTag) {
      return [];
    }

    const dotMatch = /([A-Za-z0-9_]+)\.$/.exec(before.trim());
    const groupPrefix = dotMatch ? `${dotMatch[1]}.` : null;

    if (groupPrefix) {
      return allSuggestions.filter((item) => String(item.label).startsWith(groupPrefix));
    }

    if (before.trim().endsWith('.')) {
      return allSuggestions.filter((item) => String(item.label).includes('.'));
    }

    return allSuggestions;
  };

  const languages = ['tt', 'plaintext', 'html', 'json', 'javascript', 'shell', 'perl'];
  languages.forEach((language) => {
    monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ['{', '.'],
      provideCompletionItems: (model: any, position: any) => ({
        suggestions: getSuggestions(model, position),
      }),
    });
  });
}
