/**
 * 文字レベルの差分を検出するユーティリティ
 */

export interface DiffSegment {
  type: 'equal' | 'delete' | 'insert';
  text: string;
}

/**
 * 2つのテキストの差分を文字レベルで検出
 */
export function computeCharDiff(oldText: string, newText: string): DiffSegment[] {
  const segments: DiffSegment[] = [];
  
  // シンプルなLCS（最長共通部分列）ベースの差分アルゴリズム
  const oldChars = Array.from(oldText);
  const newChars = Array.from(newText);
  
  const lcs = computeLCS(oldChars, newChars);
  
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;
  
  while (oldIndex < oldChars.length || newIndex < newChars.length) {
    if (lcsIndex < lcs.length && 
        oldIndex < oldChars.length && 
        newIndex < newChars.length &&
        oldChars[oldIndex] === lcs[lcsIndex] && 
        newChars[newIndex] === lcs[lcsIndex]) {
      // 共通部分
      segments.push({ type: 'equal', text: oldChars[oldIndex] });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (oldIndex < oldChars.length && 
               (lcsIndex >= lcs.length || oldChars[oldIndex] !== lcs[lcsIndex])) {
      // 削除された文字
      segments.push({ type: 'delete', text: oldChars[oldIndex] });
      oldIndex++;
    } else if (newIndex < newChars.length) {
      // 挿入された文字
      segments.push({ type: 'insert', text: newChars[newIndex] });
      newIndex++;
    }
  }
  
  // 連続する同じタイプのセグメントをマージ
  return mergeSegments(segments);
}

/**
 * 単語レベルの差分を検出（より読みやすい差分のため）
 */
export function computeWordDiff(oldText: string, newText: string): DiffSegment[] {
  // より細かい分割：単語境界、句読点、空白を考慮
  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);
  
  const lcs = computeLCS(oldTokens, newTokens);
  const segments: DiffSegment[] = [];
  
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;
  
  while (oldIndex < oldTokens.length || newIndex < newTokens.length) {
    if (lcsIndex < lcs.length && 
        oldIndex < oldTokens.length && 
        newIndex < newTokens.length &&
        oldTokens[oldIndex] === lcs[lcsIndex] && 
        newTokens[newIndex] === lcs[lcsIndex]) {
      // 共通部分
      segments.push({ type: 'equal', text: oldTokens[oldIndex] });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (oldIndex < oldTokens.length && 
               (lcsIndex >= lcs.length || oldTokens[oldIndex] !== lcs[lcsIndex])) {
      // 削除されたトークン
      segments.push({ type: 'delete', text: oldTokens[oldIndex] });
      oldIndex++;
    } else if (newIndex < newTokens.length) {
      // 挿入されたトークン
      segments.push({ type: 'insert', text: newTokens[newIndex] });
      newIndex++;
    }
  }
  
  return mergeSegments(segments);
}

/**
 * テキストをトークンに分割（日本語対応）
 */
function tokenize(text: string): string[] {
  // 日本語文字、英数字、句読点、空白を適切に分割
  const tokens: string[] = [];
  const regex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+|[a-zA-Z0-9]+|[^\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9]+|\s+/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  
  return tokens;
}

/**
 * 最長共通部分列（LCS）を計算
 */
function computeLCS<T>(seq1: T[], seq2: T[]): T[] {
  const m = seq1.length;
  const n = seq2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  // DPテーブルを構築
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (seq1[i - 1] === seq2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // LCSを復元
  const lcs: T[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (seq1[i - 1] === seq2[j - 1]) {
      lcs.unshift(seq1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  
  return lcs;
}

/**
 * 連続する同じタイプのセグメントをマージ
 */
function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  if (segments.length === 0) return segments;
  
  const merged: DiffSegment[] = [];
  let current = segments[0];
  
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].type === current.type) {
      current.text += segments[i].text;
    } else {
      merged.push(current);
      current = segments[i];
    }
  }
  
  merged.push(current);
  return merged;
}

/**
 * 行レベルの差分を検出
 */
export function computeLineDiff(oldText: string, newText: string): DiffSegment[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const lcs = computeLCS(oldLines, newLines);
  const segments: DiffSegment[] = [];
  
  let oldIndex = 0;
  let newIndex = 0;
  let lcsIndex = 0;
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (lcsIndex < lcs.length && 
        oldIndex < oldLines.length && 
        newIndex < newLines.length &&
        oldLines[oldIndex] === lcs[lcsIndex] && 
        newLines[newIndex] === lcs[lcsIndex]) {
      // 共通行
      segments.push({ type: 'equal', text: oldLines[oldIndex] + '\n' });
      oldIndex++;
      newIndex++;
      lcsIndex++;
    } else if (oldIndex < oldLines.length && 
               (lcsIndex >= lcs.length || oldLines[oldIndex] !== lcs[lcsIndex])) {
      // 削除された行
      segments.push({ type: 'delete', text: oldLines[oldIndex] + '\n' });
      oldIndex++;
    } else if (newIndex < newLines.length) {
      // 挿入された行
      segments.push({ type: 'insert', text: newLines[newIndex] + '\n' });
      newIndex++;
    }
  }
  
  // 最後の改行を調整
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    if (last.text.endsWith('\n') && !oldText.endsWith('\n') && !newText.endsWith('\n')) {
      last.text = last.text.slice(0, -1);
    }
  }
  
  return segments;
}
