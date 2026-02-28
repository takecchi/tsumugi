/**
 * バックエンドから受信する生のSSEデータの型定義
 * snake_caseのフィールド名を持つ
 */
import {
  AIStreamChunk,
  AIProposalFeedback,
  AIProposalResult,
} from '@tsumugi-chan/client';

// 文字列をcamelCaseからsnake_caseに変換する型
type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
  ? `${T extends Capitalize<T> ? '_' : ''}${Lowercase<T>}${CamelToSnakeCase<U>}`
  : S;

// オブジェクトの全てのキーをsnake_caseに変換し、値も再帰的に変換する型
type Raw<T> = T extends object
  ? T extends (infer U)[]
    ? Raw<U>[]
    : T extends Date | RegExp
      ? T
      : {
          [K in keyof T as CamelToSnakeCase<string & K>]: Raw<T[K]>;
        }
  : T;

/** 生のAIStreamChunk */
export interface RawAIStreamChunk {
  type: AIStreamChunk['type'];
  content: AIStreamChunk['content'];
  tool_call: AIStreamChunk['toolCall'];
  tool_result: AIStreamChunk['toolResult'];
  proposal: AIStreamChunk['proposal'];
  usage: AIStreamChunk['usage'];
  error: AIStreamChunk['error'];
}

/** 生のAIProposalResult */
export type RawAIProposalResult = Raw<AIProposalResult>;

/** 生のAIProposalFeedback */
export type RawAIProposalFeedback = Raw<AIProposalFeedback>;
