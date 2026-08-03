import {
  stripEmptyQueryParams,
  toOptionalQueryValue,
  toPaginationQuery,
} from '@/internal/helpers/query';

describe('stripEmptyQueryParams', () => {
  it('クエリが無い URL はそのまま返す', () => {
    expect(stripEmptyQueryParams('https://api.example.com/v1/commits')).toBe(
      'https://api.example.com/v1/commits',
    );
  });

  it('値が空文字のパラメータを取り除く', () => {
    expect(stripEmptyQueryParams('https://x/v1/commits?limit=50&cursor=')).toBe(
      'https://x/v1/commits?limit=50',
    );
  });

  it('全てのパラメータが空文字なら ? ごと取り除く', () => {
    expect(stripEmptyQueryParams('https://x/v1/commits?limit=&cursor=')).toBe(
      'https://x/v1/commits',
    );
  });

  it('値を持つパラメータは順序を保って残す', () => {
    expect(
      stripEmptyQueryParams('https://x/v1/diff?a=1&base_commit_id=&b=2'),
    ).toBe('https://x/v1/diff?a=1&b=2');
  });

  it('値なしパラメータ（= を含まない）は残す', () => {
    expect(stripEmptyQueryParams('https://x/v1/commits?flag&cursor=')).toBe(
      'https://x/v1/commits?flag',
    );
  });

  it('値に = を含むパラメータは残す', () => {
    expect(stripEmptyQueryParams('https://x/v1/commits?cursor=abc%3D')).toBe(
      'https://x/v1/commits?cursor=abc%3D',
    );
    expect(stripEmptyQueryParams('https://x/v1/commits?cursor=a=b')).toBe(
      'https://x/v1/commits?cursor=a=b',
    );
  });

  it('フラグメントを保持する', () => {
    expect(stripEmptyQueryParams('https://x/p?limit=10&cursor=#frag')).toBe(
      'https://x/p?limit=10#frag',
    );
    expect(stripEmptyQueryParams('https://x/p?limit=&cursor=#frag')).toBe(
      'https://x/p#frag',
    );
  });

  it('空のクエリ（? のみ）を取り除く', () => {
    expect(stripEmptyQueryParams('https://x/v1/commits?')).toBe(
      'https://x/v1/commits',
    );
  });
});

describe('toOptionalQueryValue', () => {
  it('undefined / null は空文字に変換する', () => {
    expect(toOptionalQueryValue(undefined)).toBe('');
    expect(toOptionalQueryValue(null)).toBe('');
  });

  it('値はそのまま返す', () => {
    expect(toOptionalQueryValue('commit_1')).toBe('commit_1');
  });
});

describe('toPaginationQuery', () => {
  it('未指定なら limit / cursor ともに空文字（バックエンドの既定値に任せる）', () => {
    expect(toPaginationQuery()).toEqual({ limit: '', cursor: '' });
    expect(toPaginationQuery({})).toEqual({ limit: '', cursor: '' });
  });

  it('limit / cursor を文字列に変換する', () => {
    expect(toPaginationQuery({ limit: 20, cursor: 'c1' })).toEqual({
      limit: '20',
      cursor: 'c1',
    });
  });

  it('limit を 1〜100 にクランプする', () => {
    expect(toPaginationQuery({ limit: 0 }).limit).toBe('1');
    expect(toPaginationQuery({ limit: -10 }).limit).toBe('1');
    expect(toPaginationQuery({ limit: 100 }).limit).toBe('100');
    expect(toPaginationQuery({ limit: 1000 }).limit).toBe('100');
  });

  it('小数の limit は整数に丸める', () => {
    expect(toPaginationQuery({ limit: 25.9 }).limit).toBe('25');
  });

  it('NaN / Infinity の limit は未指定として扱う', () => {
    expect(toPaginationQuery({ limit: Number.NaN }).limit).toBe('');
    expect(toPaginationQuery({ limit: Number.POSITIVE_INFINITY }).limit).toBe(
      '',
    );
  });

  it('cursor が null なら空文字にする', () => {
    expect(toPaginationQuery({ cursor: null }).cursor).toBe('');
  });
});
