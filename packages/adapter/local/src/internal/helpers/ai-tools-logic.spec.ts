import { filterUnchangedFields, diffFields, toReplaceFields } from './ai-tools-logic';

// ── filterUnchangedFields ──

describe('filterUnchangedFields', () => {
  it('変更されたフィールドのみ返す', () => {
    const data = { name: '新しい名前', synopsis: '同じあらすじ' };
    const current = { name: '古い名前', synopsis: '同じあらすじ' };
    expect(filterUnchangedFields(data, current)).toEqual({ name: '新しい名前' });
  });

  it('全て同じなら空オブジェクト', () => {
    const data = { name: 'Alice', age: '20' };
    const current = { name: 'Alice', age: '20' };
    expect(filterUnchangedFields(data, current)).toEqual({});
  });

  it('undefined のフィールドは除外する', () => {
    const data = { name: '新しい名前', synopsis: undefined };
    const current = { name: '古い名前', synopsis: '旧あらすじ' };
    expect(filterUnchangedFields(data, current)).toEqual({ name: '新しい名前' });
  });

  it('current にないフィールドは変更扱い', () => {
    const data = { name: '新しい名前', newField: '値' };
    const current = { name: '新しい名前' };
    expect(filterUnchangedFields(data, current)).toEqual({ newField: '値' });
  });

  it('空のデータは空オブジェクト', () => {
    expect(filterUnchangedFields({}, { name: 'Alice' })).toEqual({});
  });
});

// ── diffFields ──

describe('diffFields', () => {
  it('変更差分と元値を返す', () => {
    const data = { name: '新しい名前', synopsis: '変更なし' };
    const current = { name: '古い名前', synopsis: '変更なし', theme: 'テーマ' };
    const result = diffFields(data, current);
    expect(result).toEqual({
      changed: { name: '新しい名前' },
      original: { name: '古い名前' },
    });
  });

  it('変更がなければ null', () => {
    const data = { name: 'Alice' };
    const current = { name: 'Alice' };
    expect(diffFields(data, current)).toBeNull();
  });

  it('複数フィールドの変更', () => {
    const data = { a: 1, b: 20, c: 3 };
    const current = { a: 1, b: 2, c: 3 };
    const result = diffFields(data, current);
    expect(result).toEqual({
      changed: { b: 20 },
      original: { b: 2 },
    });
  });

  it('current に存在しないフィールドへの変更', () => {
    const data = { newField: 'value' };
    const current = {};
    const result = diffFields(data, current);
    expect(result).toEqual({
      changed: { newField: 'value' },
      original: { newField: undefined },
    });
  });
});

// ── toReplaceFields ──

describe('toReplaceFields', () => {
  it('各値を { type: "replace", value } に変換する', () => {
    const data = { name: 'Alice', synopsis: 'あらすじ' };
    expect(toReplaceFields(data)).toEqual({
      name: { type: 'replace', value: 'Alice' },
      synopsis: { type: 'replace', value: 'あらすじ' },
    });
  });

  it('undefined は除外する', () => {
    const data = { name: 'Alice', synopsis: undefined };
    expect(toReplaceFields(data)).toEqual({
      name: { type: 'replace', value: 'Alice' },
    });
  });

  it('空オブジェクトは空オブジェクトを返す', () => {
    expect(toReplaceFields({})).toEqual({});
  });

  it('配列やオブジェクトもそのまま値として保持する', () => {
    const data = { tags: ['a', 'b'], nested: { key: 'value' } };
    expect(toReplaceFields(data)).toEqual({
      tags: { type: 'replace', value: ['a', 'b'] },
      nested: { type: 'replace', value: { key: 'value' } },
    });
  });

  it('null 値も保持する（undefined とは区別）', () => {
    const data = { parentId: null };
    expect(toReplaceFields(data)).toEqual({
      parentId: { type: 'replace', value: null },
    });
  });
});
