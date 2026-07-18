# CLAUDE.md

## 常時ロードするルール

@.claude/rules/architecture.md
@.claude/rules/coding-rules.md
@.claude/rules/component-design.md

## オンデマンドで参照する Skills

以下は該当タスクのときに自動で読み込まれる（`.claude/skills/`）。

- **swr-hooks** — `apps/desktop/app/hooks` の SWR hooks を書く/直すとき
- **ui-stories** — `packages/ui` のコンポーネントに `*.stories.tsx` を作る/更新するとき
