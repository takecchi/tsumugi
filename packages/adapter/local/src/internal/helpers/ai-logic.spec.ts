import {
  toAIMessage,
  detectConflictFields,
  resolveProposedValues,
  applyLineEdits,
  resolveCreateValues,
  toAISDKMessages,
  buildContextSection,
  buildSystemPrompt,
  isProposalMessage,
  updateProposalStatusInArray,
  findProposalInArray,
  checkAllProposalsProcessedInArray,
  rejectAllPendingProposalsInArray,
  detectLineEditsConflict,
  validateLineEditsConsistency,
  type MessageJson,
  type ProposalJson,
} from './ai-logic';

// ── テストヘルパー ──

function makeProposalJson(overrides?: Partial<ProposalJson>): ProposalJson {
  return {
    id: 'prop-1',
    action: 'update',
    targetId: 'target-1',
    contentType: 'writing',
    targetName: 'テスト執筆',
    proposed: { content: { type: 'replace', value: '新しい内容' } },
    ...overrides,
  };
}

function makeProposalMessage(
  proposalStatus: 'pending' | 'accepted' | 'rejected' | 'conflict' = 'pending',
  overrides?: Partial<ProposalJson>,
): MessageJson {
  return {
    role: 'assistant',
    messageType: 'proposal',
    content: '',
    proposal: makeProposalJson(overrides),
    proposalStatus,
  };
}

// ── isProposalMessage ──

describe('isProposalMessage', () => {
  it('proposal メッセージを正しく判定する', () => {
    const msg = makeProposalMessage();
    expect(isProposalMessage(msg)).toBe(true);
  });

  it('テキストメッセージは false', () => {
    const msg: MessageJson = { role: 'user', messageType: 'text', content: 'hello' };
    expect(isProposalMessage(msg)).toBe(false);
  });

  it('proposal が null の場合は false', () => {
    const msg: MessageJson = { role: 'assistant', messageType: 'proposal', content: '' };
    expect(isProposalMessage(msg)).toBe(false);
  });
});

// ── toAIMessage ──

describe('toAIMessage', () => {
  it('テキストメッセージを変換する', () => {
    const json: MessageJson = { role: 'user', messageType: 'text', content: 'こんにちは' };
    const result = toAIMessage(json, 0, 'session-1');
    expect(result).toEqual({
      id: 'session-1#0',
      sessionId: 'session-1',
      role: 'user',
      messageType: 'text',
      content: 'こんにちは',
    });
  });

  it('proposal メッセージを変換する（updatedAt あり）', () => {
    const json = makeProposalMessage('pending', { updatedAt: '2025-01-01T00:00:00.000Z' });
    const result = toAIMessage(json, 2, 'session-1');
    expect(result.messageType).toBe('proposal');
    if (result.messageType === 'proposal') {
      expect(result.proposal.updatedAt).toEqual(new Date('2025-01-01T00:00:00.000Z'));
      expect(result.proposalStatus).toBe('pending');
    }
  });

  it('proposal メッセージを変換する（updatedAt なし）', () => {
    const json = makeProposalMessage('accepted');
    const result = toAIMessage(json, 1, 'session-1');
    if (result.messageType === 'proposal') {
      expect(result.proposal.updatedAt).toBeUndefined();
      expect(result.proposalStatus).toBe('accepted');
    }
  });
});

// ── detectConflictFields ──

describe('detectConflictFields', () => {
  it('一致するフィールドはコンフリクトなし', () => {
    const original = { name: 'Alice', age: '20' };
    const current = { name: 'Alice', age: '20', extra: 'x' };
    expect(detectConflictFields(original, current)).toEqual([]);
  });

  it('変更されたフィールドを検出する', () => {
    const original = { name: 'Alice', synopsis: '元のあらすじ' };
    const current = { name: 'Alice', synopsis: '変更されたあらすじ' };
    expect(detectConflictFields(original, current)).toEqual(['synopsis']);
  });

  it('複数フィールドのコンフリクトを検出する', () => {
    const original = { a: 1, b: 2, c: 3 };
    const current = { a: 10, b: 2, c: 30 };
    expect(detectConflictFields(original, current)).toEqual(['a', 'c']);
  });

  it('配列やオブジェクトの比較もJSONベースで行う', () => {
    const original = { tags: ['a', 'b'] };
    const current = { tags: ['a', 'b'] };
    expect(detectConflictFields(original, current)).toEqual([]);
  });

  it('配列の順序が異なる場合はコンフリクト', () => {
    const original = { tags: ['a', 'b'] };
    const current = { tags: ['b', 'a'] };
    expect(detectConflictFields(original, current)).toEqual(['tags']);
  });
});

// ── applyLineEdits ──

describe('applyLineEdits', () => {
  const text = 'テスト\nホゲ\nホガ';

  it('単一行の置換', () => {
    const result = applyLineEdits(text, [
      { startLine: 2, endLine: 2, newText: 'フガ' },
    ]);
    expect(result).toBe('テスト\nフガ\nホガ');
  });

  it('複数行の置換', () => {
    const result = applyLineEdits(text, [
      { startLine: 2, endLine: 3, newText: '新しい2行目\n新しい3行目' },
    ]);
    expect(result).toBe('テスト\n新しい2行目\n新しい3行目');
  });

  it('行の削除（空文字列）', () => {
    const result = applyLineEdits(text, [
      { startLine: 2, endLine: 2, newText: '' },
    ]);
    expect(result).toBe('テスト\nホガ');
  });

  it('行の挿入（startLine > endLine）', () => {
    const result = applyLineEdits(text, [
      { startLine: 2, endLine: 1, newText: '挿入行' },
    ]);
    expect(result).toBe('テスト\n挿入行\nホゲ\nホガ');
  });

  it('複数の編集を同時に適用（後ろから適用）', () => {
    const result = applyLineEdits(text, [
      { startLine: 1, endLine: 1, newText: '新テスト' },
      { startLine: 3, endLine: 3, newText: '新ホガ' },
    ]);
    expect(result).toBe('新テスト\nホゲ\n新ホガ');
  });

  it('1行を複数行に置換', () => {
    const result = applyLineEdits(text, [
      { startLine: 2, endLine: 2, newText: '行A\n行B\n行C' },
    ]);
    expect(result).toBe('テスト\n行A\n行B\n行C\nホガ');
  });

  it('空テキストに対する操作', () => {
    const result = applyLineEdits('', [
      { startLine: 1, endLine: 1, newText: '新しい行' },
    ]);
    expect(result).toBe('新しい行');
  });
});

// ── resolveProposedValues ──

describe('resolveProposedValues', () => {
  it('replace フィールドを解決する', () => {
    const proposed = {
      name: { type: 'replace' as const, value: '新しい名前' },
      synopsis: { type: 'replace' as const, value: '新しいあらすじ' },
    };
    const result = resolveProposedValues(proposed, {});
    expect(result).toEqual({ name: '新しい名前', synopsis: '新しいあらすじ' });
  });

  it('line_edits フィールドを解決する', () => {
    const proposed = {
      content: {
        type: 'line_edits' as const,
        edits: [{ startLine: 2, endLine: 2, newText: 'フガ' }],
      },
    };
    const currentRecord = { content: 'テスト\nホゲ\nホガ' };
    const result = resolveProposedValues(proposed, currentRecord);
    expect(result).toEqual({ content: 'テスト\nフガ\nホガ' });
  });

  it('replace と line_edits の混合', () => {
    const proposed = {
      name: { type: 'replace' as const, value: '新タイトル' },
      content: {
        type: 'line_edits' as const,
        edits: [{ startLine: 1, endLine: 1, newText: '最初の行' }],
      },
    };
    const currentRecord = { name: '旧タイトル', content: '元の行\n二行目' };
    const result = resolveProposedValues(proposed, currentRecord);
    expect(result).toEqual({ name: '新タイトル', content: '最初の行\n二行目' });
  });
});

// ── resolveCreateValues ──

describe('resolveCreateValues', () => {
  it('replace のみを抽出する', () => {
    const proposed = {
      name: { type: 'replace' as const, value: 'テスト' },
      content: { type: 'replace' as const, value: '本文' },
    };
    expect(resolveCreateValues(proposed)).toEqual({ name: 'テスト', content: '本文' });
  });

  it('line_edits は無視する', () => {
    const proposed = {
      name: { type: 'replace' as const, value: 'テスト' },
      content: {
        type: 'line_edits' as const,
        edits: [{ startLine: 1, endLine: 1, newText: 'x' }],
      },
    };
    expect(resolveCreateValues(proposed)).toEqual({ name: 'テスト' });
  });
});

// ── toAISDKMessages ──

describe('toAISDKMessages', () => {
  it('テキストメッセージを変換する', () => {
    const messages: MessageJson[] = [
      { role: 'user', messageType: 'text', content: 'こんにちは' },
      { role: 'assistant', messageType: 'text', content: '返答' },
    ];
    const result = toAISDKMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ role: 'user', content: 'こんにちは' });
    expect(result[1]).toEqual({ role: 'assistant', content: [{ type: 'text', text: '返答' }] });
  });

  it('proposal メッセージはスキップされる', () => {
    const messages: MessageJson[] = [
      { role: 'user', messageType: 'text', content: 'テスト' },
      makeProposalMessage('pending'),
    ];
    const result = toAISDKMessages(messages);
    // user message + no proposal in output
    expect(result.filter(m => m.role !== 'user' || (m as { content: string }).content !== '[提案の処理結果]')).toHaveLength(1);
  });

  it('処理済み提案のフィードバックが注入される', () => {
    const messages: MessageJson[] = [
      { role: 'user', messageType: 'text', content: 'テスト' },
      makeProposalMessage('accepted'),
    ];
    const result = toAISDKMessages(messages);
    const feedback = result.find(m => m.role === 'user' && typeof m.content === 'string' && m.content.includes('提案の処理結果'));
    expect(feedback).toBeDefined();
    expect((feedback as { content: string }).content).toContain('承認');
  });

  it('古いターンのツール結果は圧縮される', () => {
    const messages: MessageJson[] = [
      { role: 'user', messageType: 'text', content: '最初の質問' },
      {
        role: 'assistant',
        messageType: 'tool_call',
        content: JSON.stringify([{ toolCallId: 'tc1', toolName: 'get_plot', args: { id: 'p1' } }]),
      },
      {
        role: 'tool',
        messageType: 'tool_result',
        content: JSON.stringify([{ toolCallId: 'tc1', toolName: 'get_plot', result: { id: 'p1', name: 'プロット1' } }]),
      },
      { role: 'assistant', messageType: 'text', content: '回答1' },
      { role: 'user', messageType: 'text', content: '2番目の質問' },
      { role: 'assistant', messageType: 'text', content: '回答2' },
    ];
    const result = toAISDKMessages(messages);
    // 古いターンのtool resultは省略テキストになるはず
    const toolMsg = result.find(m => m.role === 'tool');
    expect(toolMsg).toBeDefined();
    const toolContent = (toolMsg as { content: unknown[] }).content;
    expect(toolContent).toHaveLength(1);
    const toolResult = toolContent[0] as { output: { value: unknown } };
    expect(typeof toolResult.output.value).toBe('string');
    expect(toolResult.output.value).toContain('省略');
  });
});

// ── buildContextSection ──

describe('buildContextSection', () => {
  it('コンテキストがなければ空文字列', () => {
    expect(buildContextSection()).toBe('');
    expect(buildContextSection({ openTabs: [] })).toBe('');
  });

  it('タブ情報を含む', () => {
    const result = buildContextSection({
      openTabs: [
        { id: 'w1', name: '第一章', contentType: 'writing', active: true },
        { id: 'p1', name: 'メインプロット', contentType: 'plot' },
      ],
    });
    expect(result).toContain('[執筆] 第一章');
    expect(result).toContain('現在編集中');
    expect(result).toContain('[プロット] メインプロット');
  });
});

// ── buildSystemPrompt ──

describe('buildSystemPrompt', () => {
  it('ask モードで読み取りモードのテキストを含む', () => {
    const result = buildSystemPrompt('ask');
    expect(result).toContain('読み取りモード');
    expect(result).not.toContain('書き込みモード');
  });

  it('write モードで書き込みモードのテキストを含む', () => {
    const result = buildSystemPrompt('write');
    expect(result).toContain('書き込みモード');
    expect(result).not.toContain('読み取りモード');
  });

  it('projectSummary が注入される', () => {
    const result = buildSystemPrompt('ask', undefined, 'プロジェクトサマリー');
    expect(result).toContain('プロジェクトサマリー');
  });

  it('activeTabContent が注入される', () => {
    const result = buildSystemPrompt('write', undefined, undefined, 'アクティブタブ内容');
    expect(result).toContain('アクティブタブ内容');
  });

  it('memoriesSection が注入される', () => {
    const result = buildSystemPrompt('ask', undefined, undefined, undefined, '\n\n## AIメモリ\nテスト記憶');
    expect(result).toContain('AIメモリ');
    expect(result).toContain('テスト記憶');
  });

  it('固定部分（projectSummary, memoriesSection）が変動部分（contextSection, activeTabContent）より前に配置される', () => {
    const context = { openTabs: [{ id: '1', name: 'テスト', contentType: 'writing' as const }] };
    const result = buildSystemPrompt('write', context, 'プロジェクトサマリー', 'アクティブタブ内容', '\n\nメモリ内容');
    const summaryIndex = result.indexOf('プロジェクトサマリー');
    const memoriesIndex = result.indexOf('メモリ内容');
    const contextIndex = result.indexOf('ユーザーの作業状況');
    const activeIndex = result.indexOf('アクティブタブ内容');
    expect(summaryIndex).toBeLessThan(contextIndex);
    expect(memoriesIndex).toBeLessThan(contextIndex);
    expect(summaryIndex).toBeLessThan(activeIndex);
    expect(memoriesIndex).toBeLessThan(activeIndex);
  });
});

// ── updateProposalStatusInArray ──

describe('updateProposalStatusInArray', () => {
  it('提案のステータスを更新する', () => {
    const messages: MessageJson[] = [
      { role: 'user', messageType: 'text', content: 'テスト' },
      makeProposalMessage('pending'),
    ];
    const result = updateProposalStatusInArray(messages, 'prop-1', 'accepted');
    expect(result).toBe(true);
    expect(messages[1].proposalStatus).toBe('accepted');
  });

  it('存在しない提案IDの場合は false', () => {
    const messages: MessageJson[] = [makeProposalMessage('pending')];
    const result = updateProposalStatusInArray(messages, 'nonexistent', 'accepted');
    expect(result).toBe(false);
  });
});

// ── findProposalInArray ──

describe('findProposalInArray', () => {
  it('提案を検索して AIProposal に変換する', () => {
    const messages: MessageJson[] = [
      makeProposalMessage('pending', { id: 'prop-42', updatedAt: '2025-01-01T00:00:00.000Z' }),
    ];
    const result = findProposalInArray(messages, 'prop-42');
    expect(result).toBeDefined();
    expect(result?.id).toBe('prop-42');
    expect(result?.updatedAt).toEqual(new Date('2025-01-01T00:00:00.000Z'));
  });

  it('見つからない場合は undefined', () => {
    const messages: MessageJson[] = [makeProposalMessage('pending')];
    expect(findProposalInArray(messages, 'nonexistent')).toBeUndefined();
  });
});

// ── checkAllProposalsProcessedInArray ──

describe('checkAllProposalsProcessedInArray', () => {
  it('提案がない場合は allProcessed: false', () => {
    const messages: MessageJson[] = [
      { role: 'user', messageType: 'text', content: 'テスト' },
    ];
    const result = checkAllProposalsProcessedInArray(messages);
    expect(result.allProcessed).toBe(false);
    expect(result.feedbackSummaries).toEqual([]);
  });

  it('pending がある場合は allProcessed: false', () => {
    const messages: MessageJson[] = [
      makeProposalMessage('accepted', { id: 'p1' }),
      makeProposalMessage('pending', { id: 'p2' }),
    ];
    const result = checkAllProposalsProcessedInArray(messages);
    expect(result.allProcessed).toBe(false);
    expect(result.feedbackSummaries).toHaveLength(2);
  });

  it('全て処理済みなら allProcessed: true', () => {
    const messages: MessageJson[] = [
      makeProposalMessage('accepted', { id: 'p1' }),
      makeProposalMessage('rejected', { id: 'p2' }),
    ];
    const result = checkAllProposalsProcessedInArray(messages);
    expect(result.allProcessed).toBe(true);
    expect(result.feedbackSummaries).toHaveLength(2);
  });
});

// ── rejectAllPendingProposalsInArray ──

describe('rejectAllPendingProposalsInArray', () => {
  it('pending を全て rejected に更新する', () => {
    const messages: MessageJson[] = [
      makeProposalMessage('pending', { id: 'p1' }),
      makeProposalMessage('accepted', { id: 'p2' }),
      makeProposalMessage('pending', { id: 'p3' }),
    ];
    const changed = rejectAllPendingProposalsInArray(messages);
    expect(changed).toBe(true);
    expect(messages[0].proposalStatus).toBe('rejected');
    expect(messages[1].proposalStatus).toBe('accepted');
    expect(messages[2].proposalStatus).toBe('rejected');
  });

  it('pending がなければ false', () => {
    const messages: MessageJson[] = [
      makeProposalMessage('accepted', { id: 'p1' }),
    ];
    expect(rejectAllPendingProposalsInArray(messages)).toBe(false);
  });
});

// ── detectLineEditsConflict ──

describe('detectLineEditsConflict', () => {
  it('行内容が一致すればコンフリクトなし', () => {
    const original = { line_1: 'テスト', line_2: 'ホゲ' };
    const currentText = 'テスト\nホゲ\nホガ';
    expect(detectLineEditsConflict(original, currentText)).toEqual([]);
  });

  it('行内容が変わっていればコンフリクトを検出', () => {
    const original = { line_2: 'ホゲ' };
    const currentText = 'テスト\n変更済み\nホガ';
    expect(detectLineEditsConflict(original, currentText)).toEqual(['line_2']);
  });

  it('行数が足りない場合もコンフリクト', () => {
    const original = { line_5: '存在しない行' };
    const currentText = 'テスト\nホゲ';
    expect(detectLineEditsConflict(original, currentText)).toEqual(['line_5']);
  });

  it('line_ 以外のキーは無視する', () => {
    const original = { name: 'テスト', line_1: 'テスト' };
    const currentText = 'テスト\nホゲ';
    expect(detectLineEditsConflict(original, currentText)).toEqual([]);
  });
});

// ── validateLineEditsConsistency ──

describe('validateLineEditsConsistency', () => {
  it('expectedText が一致すれば valid', () => {
    const lines = ['テスト', 'ホゲ', 'ホガ'];
    const edits = [
      { startLine: 2, endLine: 2, newText: 'フガ', expectedText: 'ホゲ' },
    ];
    const result = validateLineEditsConsistency(lines, edits);
    expect(result.valid).toBe(true);
    expect(result.mismatches).toEqual([]);
  });

  it('expectedText が不一致なら invalid', () => {
    const lines = ['テスト', '変更済み', 'ホガ'];
    const edits = [
      { startLine: 2, endLine: 2, newText: 'フガ', expectedText: 'ホゲ' },
    ];
    const result = validateLineEditsConsistency(lines, edits);
    expect(result.valid).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0]).toEqual({ line: 2, expected: 'ホゲ', actual: '変更済み' });
  });

  it('expectedText がなければスキップ', () => {
    const lines = ['テスト', 'ホゲ', 'ホガ'];
    const edits = [
      { startLine: 2, endLine: 2, newText: 'フガ' },
    ];
    const result = validateLineEditsConsistency(lines, edits);
    expect(result.valid).toBe(true);
  });

  it('挿入（startLine > endLine）はスキップ', () => {
    const lines = ['テスト', 'ホゲ'];
    const edits = [
      { startLine: 2, endLine: 1, newText: '挿入行', expectedText: '何か' },
    ];
    const result = validateLineEditsConsistency(lines, edits);
    expect(result.valid).toBe(true);
  });

  it('複数行の expectedText を検証', () => {
    const lines = ['テスト', 'ホゲ', 'ホガ', '最終行'];
    const edits = [
      { startLine: 2, endLine: 3, newText: '新2\n新3', expectedText: 'ホゲ\nホガ' },
    ];
    const result = validateLineEditsConsistency(lines, edits);
    expect(result.valid).toBe(true);
  });

  it('複数行の expectedText で一部不一致', () => {
    const lines = ['テスト', '変更済み', 'ホガ', '最終行'];
    const edits = [
      { startLine: 2, endLine: 3, newText: '新2\n新3', expectedText: 'ホゲ\nホガ' },
    ];
    const result = validateLineEditsConsistency(lines, edits);
    expect(result.valid).toBe(false);
    expect(result.mismatches).toHaveLength(1);
    expect(result.mismatches[0].line).toBe(2);
  });
});
