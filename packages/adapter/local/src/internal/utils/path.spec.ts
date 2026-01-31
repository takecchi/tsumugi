import { extractParentPath } from './path';

describe('extractParentPath', () => {
  describe('Unix パス（現在の動作確認）', () => {
    it('characters ディレクトリからプロジェクトパスを抽出できる', () => {
      const path = '/Users/user/TsumugiProjects/vampire/characters/c3fb4304-17af-4702-a0a3-a33b17cfe268.json';
      expect(extractParentPath(path, 'characters')).toBe('/Users/user/TsumugiProjects/vampire');
    });

    it('writings ディレクトリからプロジェクトパスを抽出できる', () => {
      const path = '/Users/user/TsumugiProjects/vampire/writings/abc123.json';
      expect(extractParentPath(path, 'writings')).toBe('/Users/user/TsumugiProjects/vampire');
    });

    it('memos ディレクトリからプロジェクトパスを抽出できる', () => {
      const path = '/Users/user/TsumugiProjects/vampire/memos/memo1.json';
      expect(extractParentPath(path, 'memos')).toBe('/Users/user/TsumugiProjects/vampire');
    });

    it('plots ディレクトリからプロジェクトパスを抽出できる', () => {
      const path = '/Users/user/TsumugiProjects/vampire/plots/plot1.json';
      expect(extractParentPath(path, 'plots')).toBe('/Users/user/TsumugiProjects/vampire');
    });

    it('.tsumugi ディレクトリからプロジェクトパスを抽出できる（AIセッション）', () => {
      const path = '/Users/user/TsumugiProjects/vampire/.tsumugi/ai-sessions/session-uuid';
      expect(extractParentPath(path, '.tsumugi')).toBe('/Users/user/TsumugiProjects/vampire');
    });
  });

  describe('Windows パス（バグ再現 → 修正確認）', () => {
    it('characters ディレクトリからプロジェクトパスを抽出できる', () => {
      const path = 'C:\\Users\\uikota\\TsumugiProjects\\vampire\\characters\\c3fb4304-17af-4702-a0a3-a33b17cfe268.json';
      expect(extractParentPath(path, 'characters')).toBe('C:\\Users\\uikota\\TsumugiProjects\\vampire');
    });

    it('writings ディレクトリからプロジェクトパスを抽出できる', () => {
      const path = 'C:\\Users\\uikota\\TsumugiProjects\\vampire\\writings\\abc123.json';
      expect(extractParentPath(path, 'writings')).toBe('C:\\Users\\uikota\\TsumugiProjects\\vampire');
    });

    it('memos ディレクトリからプロジェクトパスを抽出できる', () => {
      const path = 'C:\\Users\\uikota\\TsumugiProjects\\vampire\\memos\\memo1.json';
      expect(extractParentPath(path, 'memos')).toBe('C:\\Users\\uikota\\TsumugiProjects\\vampire');
    });

    it('plots ディレクトリからプロジェクトパスを抽出できる', () => {
      const path = 'C:\\Users\\uikota\\TsumugiProjects\\vampire\\plots\\plot1.json';
      expect(extractParentPath(path, 'plots')).toBe('C:\\Users\\uikota\\TsumugiProjects\\vampire');
    });

    it('.tsumugi ディレクトリからプロジェクトパスを抽出できる（AIセッション）', () => {
      const path = 'C:\\Users\\uikota\\TsumugiProjects\\vampire\\.tsumugi\\ai-sessions\\session-uuid';
      expect(extractParentPath(path, '.tsumugi')).toBe('C:\\Users\\uikota\\TsumugiProjects\\vampire');
    });
  });

  describe('エラーケース', () => {
    it('指定ディレクトリが存在しないパスではエラーを投げる', () => {
      const path = '/Users/user/TsumugiProjects/vampire/unknown/file.json';
      expect(() => extractParentPath(path, 'characters')).toThrow(
        "Invalid path: directory 'characters' not found in '/Users/user/TsumugiProjects/vampire/unknown/file.json'",
      );
    });

    it('Windows パスでも指定ディレクトリが存在しない場合エラーを投げる', () => {
      const path = 'C:\\Users\\uikota\\TsumugiProjects\\vampire\\unknown\\file.json';
      expect(() => extractParentPath(path, 'characters')).toThrow(
        "Invalid path: directory 'characters' not found",
      );
    });
  });

  describe('エッジケース', () => {
    it('同名ディレクトリが複数ある場合、最後のものを使う', () => {
      const path = '/Users/user/characters/project/characters/file.json';
      expect(extractParentPath(path, 'characters')).toBe('/Users/user/characters/project');
    });

    it('ルート直下のディレクトリ', () => {
      const path = '/characters/file.json';
      expect(extractParentPath(path, 'characters')).toBe('');
    });
  });
});
