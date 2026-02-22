# ローカルテストガイド (PR #89-99)

PR #89-99で追加された機能の手動検証手順: 言語別リアクション、Wordgrain語彙統合、calloutコマンド、会話メモリ、トレンド検出、フォローアップ、会話モード、コンテキスト蓄積、stopwords-iso置換。

すべてのPRはmainにマージ済み。DBマイグレーションは自動実行: v2 -> v3 -> v4 -> v5。

## Phase 0: 環境セットアップ

### 前提条件

| 要件 | 確認方法 |
|------|----------|
| Node.js >= 20 | `node --version` |
| pnpm >= 9 | `pnpm --version` |
| Ollama | `ollama --version` |

### セットアップ

```bash
cd /Users/shin/src/github.com/shimpeiws/mumbl
git checkout main && git pull
pnpm install
```

### Ollamaの起動

```bash
ollama serve
ollama pull qwen2.5-coder:7b
curl http://localhost:11434/api/tags  # レスポンスを確認
```

### DBのバックアップとリセット（クリーンテスト用）

```bash
cp ~/.mumbl/mumbl.db ~/.mumbl/mumbl.db.backup-pre-test
rm -f ~/.mumbl/mumbl.db ~/.mumbl/mumbl.db-shm ~/.mumbl/mumbl.db-wal
```

---

## Phase 1: 自動テスト

```bash
pnpm type-check        # 型チェック
pnpm lint              # Biome lint
pnpm test:unit         # ユニットテスト
pnpm test:integration  # 統合テスト
pnpm ci:all            # フルCI（型チェック + lint + カバレッジ >= 70%のテスト）
pnpm build             # ビルド検証
```

すべてのコマンドがエラーなく完了すること。

---

## Phase 2: DBマイグレーション検証

### 2.1 新規DB作成

```bash
rm -f ~/.mumbl/mumbl.db*
pnpm dev   # 起動後 Ctrl+C
sqlite3 ~/.mumbl/mumbl.db ".tables"
```

**期待値**: 11テーブルが存在 -- `entries`, `reactions`, `schema_version`, `conversations`, `conversation_entries`, `conversation_memory`, `topics`, `entry_topics`, `trend_summaries`, `follow_ups`, `user_context`

```bash
sqlite3 ~/.mumbl/mumbl.db "SELECT version FROM schema_version"
```

**期待値**: `5`

### 2.2 冪等性

```bash
pnpm dev   # 起動 -> Ctrl+C を2回繰り返す
```

**期待値**: エラーなし。スキーマバージョンは`5`のまま。

---

## Phase 3: 手動機能検証（独立機能）

### 3.1 PR #89: 言語別リアクション

#### 自動検出（デフォルト）

```bash
unset MUMBL_REACTION_LANGUAGE
pnpm dev
```

1. TAB -> 英語エントリ `work has been stressful lately` -> Enter -> 英語スラングでリアクション
2. TAB -> 日本語エントリ `今日は仕事つらかった` -> Enter -> ローマ字日本語でリアクション

言語検出はCJK文字比率を使用（CJK > 10% = 日本語）。

#### 環境変数による強制指定

```bash
MUMBL_REACTION_LANGUAGE=ja pnpm dev
# 英語エントリでも日本語リアクション

MUMBL_REACTION_LANGUAGE=en pnpm dev
# 日本語エントリでも英語リアクション
```

#### 無効な値

```bash
MUMBL_REACTION_LANGUAGE=invalid pnpm dev
# -> autoにフォールバック、正常に起動
```

### 3.2 PR #90: Wordgrain語彙統合

#### 通常動作（実データ）

barscanで生成済みのKOHHのWordgrainファイルを使用:

```bash
MUMBL_WORDGRAIN_DIR=/Users/shin/src/github.com/shimpeiws/barscan pnpm dev
# エントリを入力 -> KOHHの語彙（cbd, 吸うなど）がLLMプロンプトに注入される（リアクションに反映される場合あり）
```

#### エラーハンドリング

```bash
MUMBL_WORDGRAIN_DIR=/nonexistent/path pnpm dev    # 正常に起動（空配列で続行）

mkdir -p /tmp/mumbl-wordgrain-test
echo "{ invalid }" > /tmp/mumbl-wordgrain-test/bad.wg.json
MUMBL_WORDGRAIN_DIR=/tmp/mumbl-wordgrain-test pnpm dev  # 無効なファイルをスキップ
```

### 3.3 PR #91: generate-calloutコマンド

#### エントリが存在する場合

```bash
rm -f /tmp/mumbl-callout-timestamp /tmp/mumbl-message
pnpm dev generate-callout
echo "Exit code: $?"
# calloutメッセージが生成されていることを確認
cat /tmp/mumbl-message
```

#### クールダウン（5分）

```bash
pnpm dev generate-callout  # すぐに再実行 -> 何もしない（既存メッセージを維持）
```

#### LLM障害時

```bash
MUMBL_OLLAMA_URL=http://localhost:99999 pnpm dev generate-callout
echo "Exit code: $?"   # -> 0（サイレント失敗）
```

---

## Phase 4: 手動機能検証（会話 + 派生機能）

### 4.1 PR #92: 会話メモリシステム

```bash
pnpm dev
```

いくつかエントリを作成後:

```bash
sqlite3 ~/.mumbl/mumbl.db "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'conversation%'"
```

**期待値**: `conversations`, `conversation_entries`, `conversation_memory`

### 4.2 PR #93: トレンド検出

繰り返しテーマのあるエントリを作成:
1. `coffee was great this morning, feeling energized`
2. `the project deadline is approaching fast`
3. `had coffee again, thinking about the project deadline`

```bash
sqlite3 ~/.mumbl/mumbl.db "SELECT name, total_count FROM topics ORDER BY total_count DESC LIMIT 10"
```

**期待値**: "coffee"、"project"、"deadline"などのトピックが表示される

トピック抽出はユニグラム、バイグラム、トライグラムを生成（エントリあたり最大10トピック、最小単語長2文字）。

#### ストップワード除外 (PR #99)

```bash
sqlite3 ~/.mumbl/mumbl.db "SELECT name FROM topics WHERE name IN ('the', 'is', 'was', 'a')"
```

**期待値**: 結果なし（stopwords-isoによりフィルタ済み）

### 4.3 PR #94: 遅延フォローアップ

感情的なエントリを作成:

`feeling really stressed about work, haven't been sleeping well for days`

```bash
sqlite3 ~/.mumbl/mumbl.db "SELECT id, entry_id, scheduled_at, interval_type, status FROM follow_ups"
```

**期待値**: `status='pending'`、`interval_type`は`1d`/`3d`/`1w`のいずれか

軽微なエントリ `had lunch` ではフォローアップが生成されないことを確認。

### 4.4 PR #95: 会話モード

#### トリガー検出

```bash
pnpm dev
```

質問エントリを作成: `What should I do about the project deadline?`

**期待値**: 会話モードに遷移 -> チャットUI表示（You: / mumbl:）

トリガーパターン: 疑問詞（who/what/where/why/how）、疑問符、対話パターン（"I wonder"、"should I"、"can you"）、日本語の疑問表現。

#### 会話のやり取り

1. フォローアップメッセージを入力 -> LLMレスポンスを確認
2. `Escape`を押して会話を終了

```bash
sqlite3 ~/.mumbl/mumbl.db "SELECT id, status FROM conversations ORDER BY updated_at DESC LIMIT 1"
```

**期待値**: `status = 'archived'`

#### 日本語トリガー

`どうしよう` と入力 -> 会話モードに遷移

#### 非トリガー

`Finished the deployment today` -> 通常モードのまま

### 4.5 PR #97: コンテキスト蓄積

個人情報を含むエントリを作成:
1. `I love drinking coffee every morning before work`
2. `Working as a software engineer at a startup`
3. `My favorite programming language is TypeScript`

```bash
sqlite3 ~/.mumbl/mumbl.db "SELECT context_type, key, value, confidence FROM user_context"
```

**期待値**: preference/profileの項目が蓄積される

コンテキストサービス設定: minConfidence=0.3, decayRate=0.95。信頼度ラベル: high (>=0.7), medium (>=0.4), low。

---

## Phase 5: 統合テスト

### 全機能同時実行

```bash
MUMBL_WORDGRAIN_DIR=/Users/shin/src/github.com/shimpeiws/barscan pnpm dev
```

エントリを作成: `I'm stressed about the coffee shop project deadline, wondering if I should ask for help`

**期待される動作**:
1. エントリが保存される
2. リアクションが生成される（言語自動検出 + Wordgrain語彙）
3. トピック抽出（"stressed"、"coffee shop"、"project deadline"）
4. コンテキスト抽出（ストレスパターン）
5. フォローアップ評価
6. 会話トリガー検出（"wondering if I should"）

```bash
sqlite3 ~/.mumbl/mumbl.db << 'EOF'
SELECT 'entries' as tbl, COUNT(*) FROM entries
UNION ALL SELECT 'reactions', COUNT(*) FROM reactions
UNION ALL SELECT 'topics', COUNT(*) FROM topics
UNION ALL SELECT 'entry_topics', COUNT(*) FROM entry_topics
UNION ALL SELECT 'user_context', COUNT(*) FROM user_context
UNION ALL SELECT 'follow_ups', COUNT(*) FROM follow_ups;
EOF
```

---

## Phase 6: エッジケース

| シナリオ | 手順 | 期待値 |
|----------|------|--------|
| Ollama停止 | `killall ollama` -> `pnpm dev`、エントリ作成 | エントリは正常保存、リアクション生成はサイレント失敗 |
| 空DB | `rm ~/.mumbl/mumbl.db*` -> `pnpm dev` | EmptyStateが表示、クラッシュなし |
| 長文エントリ | 1000文字以上のエントリ | トピック抽出はMAX_TOPICS=10で制限、正常動作 |
| 混合言語 | `Today was 大変 but also 楽しい` | CJK比率で言語検出、トピック抽出は正常動作 |
| 高速連続入力 | 複数エントリを素早く投稿 | キューが順次処理、WALモードでDBロックなし |

---

## チェックリスト

| # | 項目 | 合否 |
|---|------|------|
| 1 | `pnpm type-check` 成功 | |
| 2 | `pnpm lint` 成功 | |
| 3 | `pnpm test:unit` 全パス | |
| 4 | `pnpm test:integration` 全パス | |
| 5 | `pnpm ci:all` カバレッジ >= 70% | |
| 6 | `pnpm build` 成功 | |
| 7 | 新規DB: 11テーブル、スキーマ v5 | |
| 8 | マイグレーション冪等性 | |
| 9 | 言語自動検出（EN/JA） | |
| 10 | `MUMBL_REACTION_LANGUAGE` オーバーライド | |
| 11 | Wordgrain語彙読み込み | |
| 12 | Wordgrainエラーハンドリング | |
| 13 | `generate-callout` メッセージ生成 | |
| 14 | `generate-callout` クールダウン | |
| 15 | トピック抽出とDB保存 | |
| 16 | ストップワード除外 | |
| 17 | フォローアップスケジューリング | |
| 18 | 軽微なエントリでフォローアップなし | |
| 19 | 会話モードトリガー検出 | |
| 20 | 会話UIとアーカイブ | |
| 21 | コンテキスト蓄積 | |
| 22 | 全機能統合 | |
| 23 | Ollama停止時の正常動作 | |
| 24 | 空DBでのEmptyState | |

---

## リファレンス: 主要ソースファイル

| ファイル | 目的 |
|----------|------|
| `src/index.tsx` | エントリポイント、全サービスの接続 |
| `src/infrastructure/database/schema.ts` | DBスキーマ、マイグレーション v1-v5 |
| `src/services/entry-service.ts` | エントリ作成オーケストレーション |
| `src/services/language/detect.ts` | 言語自動検出（CJK比率） |
| `src/services/wordgrain/wordgrain-loader.ts` | Wordgrainファイル読み込み |
| `src/commands/generate-callout.ts` | Calloutサブコマンド |
| `src/services/conversation/trigger-detector.ts` | 会話トリガー検出 |
| `src/services/conversation/conversation-service.ts` | 会話ライフサイクル管理 |
| `src/services/trends/topic-extractor.ts` | トピック抽出（ユニグラム/バイグラム/トライグラム） |
| `src/services/trends/stopwords.ts` | stopwords-iso統合 |
| `src/services/follow-up/follow-up-service.ts` | フォローアップ評価とスケジューリング |
| `src/services/context/context-service.ts` | コンテキスト蓄積エンジン |
| `vitest.config.ts` | テスト設定、カバレッジ閾値 |
