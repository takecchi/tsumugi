/**
 * フルパスから指定ディレクトリの親パス（= projectId）を抽出する。
 * パス区切り文字として `/` と `\` の両方をサポートする。
 *
 * 例:
 *   extractParentPath('/path/to/project/characters/uuid.json', 'characters')
 *   → '/path/to/project'
 *
 *   extractParentPath('C:\\Users\\user\\project\\characters\\uuid.json', 'characters')
 *   → 'C:\\Users\\user\\project'
 */
export function extractParentPath(fullPath: string, dirName: string): string {
  // `/` と `\` の両方で分割
  const parts = fullPath.split(/[\\/]/);
  const dirIndex = parts.lastIndexOf(dirName);
  if (dirIndex === -1) {
    throw new Error(`Invalid path: directory '${dirName}' not found in '${fullPath}'`);
  }

  // 元のパスの区切り文字を保持するため、分割ではなくインデックスで切り出す
  // dirName の開始位置を特定
  let pos = 0;
  for (let i = 0; i < dirIndex; i++) {
    pos += parts[i].length + 1; // +1 for separator
  }
  // pos は dirName の先頭を指す。その直前の区切り文字を除いた部分が親パス
  return fullPath.slice(0, pos > 0 ? pos - 1 : 0);
}
