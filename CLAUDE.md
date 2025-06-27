# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

rtm_denoは、VimからRemember The Milk（RTM）を操作するためのdenopsプラグインです。DenoとTypeScriptで構築されており、RTM APIを通じてタスクの追加と認証機能を提供します。

## Architecture

### Project Structure
```
rtm_deno/
├── README.md           # プラグインの基本的な使い方とCLI使用方法
├── CLAUDE.md           # 開発者向けガイド
├── deno.json           # Denoプロジェクト設定とタスク定義
├── cli.ts              # CLIエントリポイント
├── src/
│   └── rtm-client.ts   # スタンドアロンRTMクライアント（CLI用）
├── denops/
│   ├── rtm/
│   │   ├── main.ts     # denopsプラグインのメインエントリポイント
│   │   └── auth.ts     # RTM API認証とタスク管理クラス
│   └── tests/
│       └── auth.test.ts # Auth クラスのテスト
```

### Core Components

#### main.ts
- denopsプラグインのメインエントリポイント
- Vimコマンドのディスパッチャーを定義
- 以下のVimコマンドを提供:
  - `:RtmAuth` - RTM認証
  - `:RtmAddTask` - 単一タスクの追加
  - `:RtmAddSelectedTask` - 選択されたテキストから複数タスクの追加
  - `:RtmGetTaskList` - タスクリストの取得（フィルタ指定可能）
  - `:RtmDeleteTask` - タスクの削除
  - `:RtmCompleteTask` - タスクの完了
  - `:RtmUncompleteTask` - タスクの未完了化
  - `:RtmSetTaskName` - タスク名の更新
  - `:RtmSetTaskPriority` - タスク優先度の設定
  - `:RtmSetTaskDueDate` - タスク期限の設定

#### auth.ts
- RTM APIとの通信を担う`Auth`クラス
- OAuth認証フロー（frob取得 → ブラウザ認証 → token取得）
- API署名生成（MD5ハッシュ）
- CRUD機能:
  - Create: `addTask()` - タスクの追加
  - Read: `getTaskList()` - タスクリストの取得
  - Update: `setTaskName()`, `setTaskPriority()`, `setTaskDueDate()` - タスクの更新
  - Delete: `deleteTask()` - タスクの削除
  - Status: `completeTask()`, `uncompleteTask()` - タスクの完了/未完了切り替え

#### src/rtm-client.ts
- Denopsに依存しないスタンドアロンRTMクライアント
- CLI及び他のプロジェクトからの流用を想定
- 環境変数による設定取得
- 完全なCRUD操作サポート

#### cli.ts
- コマンドラインインターフェース
- すべてのRTM操作をCLIから実行可能
- JSONフォーマット出力対応
- ヘルプとエラーハンドリング

## Development Commands

### テスト実行
```bash
# 単体テストの実行
deno task test:auth

# 全テストの実行
deno task test
```

### 型チェック
```bash
# TypeScript型チェック
deno task check
```

### CLIテスト
```bash
# CLI認証
deno task cli:auth

# CLIタスク一覧
deno task cli:list

# CLIヘルプ
deno task cli:help
```

### コードフォーマット・リント
```bash
# フォーマット
deno task fmt

# リント
deno task lint
```

### バイナリビルド
```bash
# 現在のプラットフォーム用ビルド
deno task build

# 全プラットフォーム用ビルド
deno task build:all

# 特定プラットフォーム用ビルド
deno task build:linux
deno task build:mac
deno task build:mac-arm
deno task build:windows
```

## Configuration Requirements

このプラグインを使用するには、以下の設定が必要です：

### 環境変数による設定（推奨）
```bash
export RTM_API_KEY="your_rtm_api_key"
export RTM_SECRET_KEY="your_rtm_secret_key"
export RTM_TOKEN_PATH="path/to/.rtm_token"
export RTM_TOKEN="your_rtm_token"  # オプション：既存トークンがある場合
```

### Vim変数による設定
```vim
let g:rtm_api_key = "your_rtm_api_key"
let g:rtm_secret_key = "your_rtm_secret_key" 
let g:setting_path = "path/to/.rtm_token"
```

**優先順位**: 環境変数 > Vim変数
これにより、セキュリティの向上とCI/CD環境での利用が容易になります。

## Dependencies

- denops.vim - Vim/Neovim用のDenoベースプラグインエンジン
- Deno standard library modules
- unknownutil - 型安全性のためのユーティリティ

## API Integration

RTM APIの以下のエンドポイントを使用:
- `rtm.auth.getFrob` - 認証用frob取得
- `rtm.auth.getToken` - 認証token取得  
- `rtm.timelines.create` - timeline作成
- `rtm.tasks.add` - タスク追加
- `rtm.tasks.getList` - タスクリスト取得
- `rtm.tasks.delete` - タスク削除
- `rtm.tasks.complete` - タスク完了
- `rtm.tasks.uncomplete` - タスク未完了化
- `rtm.tasks.setName` - タスク名更新
- `rtm.tasks.setPriority` - タスク優先度設定
- `rtm.tasks.setDueDate` - タスク期限設定

## Security Notes

- APIキーとシークレットキーはVim変数として設定
- 認証tokenはローカルファイルに保存
- 認証フローではブラウザでの手動認証が必要