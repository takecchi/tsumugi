import {
  applyFieldDrafts,
  clearSavedDraft,
  draftsOf,
  markFieldDraft,
  releaseFieldDraft,
} from './field-drafts';

/** エディタが描画しているサーバ由来の値（フィールドごとに違う値を入れておく） */
const serverWriting = {
  id: 'w-31',
  name: '第三章 港の灯',
  content: '波止場に立つと、潮の匂いがした。',
  wordCount: 16,
};

describe('applyFieldDrafts', () => {
  it('未保存の編集が無ければサーバ値をそのまま返す', () => {
    expect(applyFieldDrafts(serverWriting, {})).toBe(serverWriting);
  });

  it('編集中のフィールドはローカルの入力が勝つ', () => {
    const displayed = applyFieldDrafts(serverWriting, {
      content: '灯台の光が、霧の向こうで一度だけ瞬いた。',
    });
    expect(displayed.content).toBe('灯台の光が、霧の向こうで一度だけ瞬いた。');
  });

  it('編集していないフィールドにはサーバ値が反映される（同期は止めない）', () => {
    const displayed = applyFieldDrafts(serverWriting, {
      content: '書きかけの本文',
    });
    expect(displayed.name).toBe('第三章 港の灯');
    expect(displayed.wordCount).toBe(16);
  });

  it('サーバ値のオブジェクトを書き換えない', () => {
    applyFieldDrafts(serverWriting, { content: '書きかけの本文' });
    expect(serverWriting.content).toBe('波止場に立つと、潮の匂いがした。');
  });
});

describe('clearSavedDraft', () => {
  it('保存した値と下書きが一致していれば下書きを落とす', () => {
    const drafts = { content: '保存した本文', name: '第三章 港の灯' };
    expect(clearSavedDraft(drafts, 'content', '保存した本文')).toEqual({
      name: '第三章 港の灯',
    });
  });

  it('保存の往復中に更に編集されていたら下書きを残す', () => {
    const drafts = { content: '保存した本文＋続きを書いた分' };
    expect(clearSavedDraft(drafts, 'content', '保存した本文')).toEqual(drafts);
  });

  it('下書きに無いフィールドは何も変えない', () => {
    const drafts = { content: '書きかけの本文' };
    expect(clearSavedDraft(drafts, 'name', '第三章 港の灯')).toBe(drafts);
  });

  it('元の下書きオブジェクトを書き換えない', () => {
    const drafts = { content: '保存した本文' };
    clearSavedDraft(drafts, 'content', '保存した本文');
    expect(drafts).toEqual({ content: '保存した本文' });
  });

  it('タグのような配列は、別インスタンスでも内容が同じなら落とす', () => {
    const drafts = { tags: ['港町', '回想'] };
    expect(clearSavedDraft(drafts, 'tags', ['港町', '回想'])).toEqual({});
  });

  it('タグの内容が違えば下書きを残す', () => {
    const drafts = { tags: ['港町', '回想', '伏線'] };
    expect(clearSavedDraft(drafts, 'tags', ['港町', '回想'])).toEqual(drafts);
  });
});

describe('編集中に再フェッチが届いたときの流れ', () => {
  // Issue #16: AI提案の反映・自律Run・バージョン復元・フォーカス復帰・再マウントは
  // ユーザーの入力と無関係に item キーを再フェッチする。debounce 500ms が発火する前に
  // 届いたサーバ値でキャッシュが置き換わると、制御コンポーネントの表示が巻き戻る。
  it('未保存のまま再フェッチが届いても、編集内容が表示に残る', () => {
    const typed =
      '波止場に立つと、潮の匂いがした。港の灯がゆっくり回っている。';
    const drafts = { content: typed };

    // 保存前にサーバから届いた（＝編集を含まない）値
    const refetched = { ...serverWriting, wordCount: 16 };

    expect(applyFieldDrafts(refetched, drafts).content).toBe(typed);
  });

  it('保存が完了したフィールドは、以後サーバ値が表示に反映される', () => {
    const typed =
      '波止場に立つと、潮の匂いがした。港の灯がゆっくり回っている。';
    const afterSave = clearSavedDraft({ content: typed }, 'content', typed);

    // 保存後、他端末の更新を含むサーバ値が届いた
    const refetched = { ...serverWriting, content: '別の端末で直した本文' };

    expect(applyFieldDrafts(refetched, afterSave).content).toBe(
      '別の端末で直した本文',
    );
  });

  it('保存の往復中に続きを打っていたら、遅れて届いたサーバ値に負けない', () => {
    const sent = '波止場に立つと、潮の匂いがした。';
    const typedWhileSaving = '波止場に立つと、潮の匂いがした。港の灯が回る。';

    // 送信後に更に入力された状態で、送信分の保存が完了した
    const afterSave = clearSavedDraft(
      { content: typedWhileSaving },
      'content',
      sent,
    );

    // 続いて、送信分までしか含まないサーバ値が再フェッチで届いた
    const refetched = { ...serverWriting, content: sent };

    expect(applyFieldDrafts(refetched, afterSave).content).toBe(
      typedWhileSaving,
    );
  });
});

describe('編集対象が切り替わったときの下書き', () => {
  // workspace-editor.tsx は同じ種別のノード間ではエディタを再マウントせず
  // id prop だけを差し替えるため、下書きを対象と紐付けずに持つと隣の章へ漏れる。
  it('別のノードへ切り替わったら下書きは引き継がれない', () => {
    const state = markFieldDraft(
      { ownerId: 'w-31', drafts: {} },
      'w-31',
      'content',
      '第三章の書きかけ',
    );
    expect(draftsOf(state, 'w-32')).toEqual({});
  });

  it('同じノードのままなら下書きは残る', () => {
    const state = markFieldDraft(
      { ownerId: 'w-31', drafts: {} },
      'w-31',
      'content',
      '第三章の書きかけ',
    );
    expect(draftsOf(state, 'w-31')).toEqual({ content: '第三章の書きかけ' });
  });

  it('切り替えた先で記録した下書きに、前のノードの分は混ざらない', () => {
    const before = markFieldDraft(
      { ownerId: 'w-31', drafts: {} },
      'w-31',
      'name',
      '第三章 港の灯',
    );
    const after = markFieldDraft(before, 'w-32', 'content', '第四章の書きかけ');
    expect(draftsOf(after, 'w-32')).toEqual({ content: '第四章の書きかけ' });
  });

  it('別のノードの保存が遅れて完了しても、内容がたまたま同じでも今の下書きは消さない', () => {
    const current = markFieldDraft(
      { ownerId: 'w-32', drafts: {} },
      'w-32',
      'name',
      '港の灯',
    );
    // 切り替え前のノード w-31 について、同じ文字列の保存が遅れて完了した
    const released = releaseFieldDraft(current, 'w-31', 'name', '港の灯');
    expect(draftsOf(released, 'w-32')).toEqual({ name: '港の灯' });
  });

  it('保存できたフィールドは、同じノードのままなら下書きから外れる', () => {
    const current = markFieldDraft(
      { ownerId: 'w-31', drafts: {} },
      'w-31',
      'content',
      '第三章の書きかけ',
    );
    const released = releaseFieldDraft(
      current,
      'w-31',
      'content',
      '第三章の書きかけ',
    );
    expect(draftsOf(released, 'w-31')).toEqual({});
  });
});
