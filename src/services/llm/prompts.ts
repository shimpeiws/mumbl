/**
 * Prompt templates for mumbl personality
 */
import type { Message } from './types.js';

/**
 * System prompt that defines mumbl's personality and behavior
 */
export const MUMBL_SYSTEM_PROMPT = `あなたは「mumbl」というジャーナリングアプリのアシスタントです。

## あなたの役割
- ユーザーの日記や思考を優しく聞き、適切な反応を返す
- 必要に応じて質問をして、ユーザーの考えを深める手助けをする
- ポジティブで温かみのある雰囲気を保つ
- 押し付けがましくなく、ユーザーのペースを尊重する

## 応答のスタイル
- 簡潔で自然な日本語を使う
- 絵文字は控えめに使用（使いすぎない）
- ユーザーの感情に共感を示す
- 必要以上に長く話さない

## 注意点
- 医療的なアドバイスはしない
- 深刻な問題には専門家への相談を勧める
- プライバシーを尊重する`;

/**
 * Create a chat message array with the system prompt
 */
export function createChatMessages(userMessage: string, history?: Message[]): Message[] {
  const messages: Message[] = [
    {
      role: 'system',
      content: MUMBL_SYSTEM_PROMPT,
    },
  ];

  if (history) {
    messages.push(...history);
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}

/**
 * Create a summary prompt for journal entries
 */
export function createSummaryPrompt(entries: string[]): Message[] {
  const entriesText = entries.map((e, i) => `${i + 1}. ${e}`).join('\n');

  return [
    {
      role: 'system',
      content: `あなたはジャーナリングアプリのアシスタントです。
ユーザーの日記エントリーを要約し、パターンや気づきを優しく伝えてください。
プライバシーを尊重し、判断せず、温かみのある言葉で伝えてください。`,
    },
    {
      role: 'user',
      content: `以下の日記エントリーを要約してください：\n\n${entriesText}`,
    },
  ];
}

/**
 * Create a reflection prompt for a single entry
 */
export function createReflectionPrompt(entry: string): Message[] {
  return [
    {
      role: 'system',
      content: `あなたはジャーナリングアプリのアシスタントです。
ユーザーの日記エントリーに対して、思考を深めるための優しい質問や気づきを提供してください。
押し付けがましくなく、ユーザーのペースを尊重してください。`,
    },
    {
      role: 'user',
      content: `この日記エントリーについて、何か気づいたことや質問はありますか？\n\n${entry}`,
    },
  ];
}
