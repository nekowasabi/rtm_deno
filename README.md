# rtm_deno

VimからRemember The Milk（RTM）を操作するためのdenopsプラグインです。タスクの追加、編集、削除、完了などの完全なCRUD操作をサポートしています。

## Features

### Core Functionality
- ✅ **Complete CRUD Operations**: タスクの作成、読み取り、更新、削除
- 🎯 **Rich Task Management**: 優先度、期限、完了状態の管理
- 📝 **Batch Operations**: 複数タスクの一括追加（選択範囲から）
- 🔍 **Advanced Filtering**: RTMの強力なフィルタリング機能をフル活用

### Dual Interface
- 💻 **Vim Plugin**: denopsベースの高性能Vimプラグイン
- 🖥️ **CLI Tool**: スタンドアロンコマンドラインインターフェース
- 📦 **Binary Distribution**: クロスプラットフォームバイナリ配布

### Configuration & Security  
- 🔐 **Flexible Configuration**: 環境変数またはVim変数での設定
- 🔒 **Secure Token Management**: 環境変数による安全な認証情報管理
- 🚀 **Fast Performance**: Deno + TypeScriptによる高速処理

### Quality Assurance
- 🧪 **Comprehensive Testing**: 13テストケースによる完全テストカバレッジ
- 🔧 **Type Safety**: TypeScriptによる型安全性
- 📊 **Error Handling**: 堅牢なエラーハンドリングとタイムアウト処理

## Requirements

- [denops.vim](https://github.com/vim-denops/denops.vim)
- Deno runtime
- Remember The Milk API key

## Installation

### Using vim-plug
```vim
Plug 'vim-denops/denops.vim'
Plug 'nekowasabi/rtm_deno'
```

### Using dein.vim
```vim
call dein#add('vim-denops/denops.vim')
call dein#add('nekowasabi/rtm_deno')
```

## Configuration

### Option 1: Environment Variables (Recommended)
```bash
export RTM_API_KEY="your_rtm_api_key"
export RTM_SECRET_KEY="your_rtm_secret_key"
export RTM_TOKEN_PATH="$HOME/.rtm_token"
export RTM_TOKEN="your_rtm_token"  # Optional: Skip auth process if you already have a token
```

### Option 2: Vim Variables
```vim
let g:rtm_api_key = "your_rtm_api_key"
let g:rtm_secret_key = "your_rtm_secret_key" 
let g:setting_path = "~/.rtm_token"
```

**Note**: Environment variables take precedence over Vim variables. This allows for better security and easier CI/CD integration.

### Getting API Keys
1. Visit [Remember The Milk API page](https://www.rememberthemilk.com/services/api/)
2. Apply for an API key
3. Note your API key and secret key

## Usage

### Initial Setup
```vim
" Authorize with Remember The Milk
:RtmAuth
```

### Task Management

#### Create Tasks
```vim
" Add a single task (will prompt for task name)
:RtmAddTask

" Add a specific task
:RtmAddTask "Buy groceries"

" Add multiple tasks from selected text
" 1. Select lines in visual mode
" 2. Execute the command
:'<,'>RtmAddSelectedTask
```

#### Read Tasks
```vim
" Get all tasks
:RtmGetTaskList

" Get tasks with filter
:RtmGetTaskList "priority:1"
:RtmGetTaskList "due:today"
:RtmGetTaskList "list:Work"
```

#### Update Tasks
```vim
" Update task name
:RtmSetTaskName {list_id} {taskseries_id} {task_id} "New task name"

" Set task priority (N=none, 1=high, 2=medium, 3=low)
:RtmSetTaskPriority {list_id} {taskseries_id} {task_id} 1

" Set due date
:RtmSetTaskDueDate {list_id} {taskseries_id} {task_id} "tomorrow"
:RtmSetTaskDueDate {list_id} {taskseries_id} {task_id} "2024-12-31"
```

#### Complete/Uncomplete Tasks
```vim
" Mark task as completed
:RtmCompleteTask {list_id} {taskseries_id} {task_id}

" Reopen completed task
:RtmUncompleteTask {list_id} {taskseries_id} {task_id}
```

#### Delete Tasks
```vim
" Delete a task
:RtmDeleteTask {list_id} {taskseries_id} {task_id}
```

## Command Reference

| Command | Description | Arguments |
|---------|-------------|-----------|
| `:RtmAuth` | Authenticate with RTM | None |
| `:RtmAddTask [name]` | Add single task | Optional task name |
| `:RtmAddSelectedTask` | Add multiple tasks from selection | None (visual mode) |
| `:RtmGetTaskList [filter]` | Get task list | Optional filter string |
| `:RtmDeleteTask` | Delete task | list_id, taskseries_id, task_id |
| `:RtmCompleteTask` | Complete task | list_id, taskseries_id, task_id |
| `:RtmUncompleteTask` | Uncomplete task | list_id, taskseries_id, task_id |
| `:RtmSetTaskName` | Update task name | list_id, taskseries_id, task_id, new_name |
| `:RtmSetTaskPriority` | Set task priority | list_id, taskseries_id, task_id, priority |
| `:RtmSetTaskDueDate` | Set task due date | list_id, taskseries_id, task_id, due_date |

## Filter Examples

RTM supports powerful filtering for task queries:

```vim
" Priority-based filters
:RtmGetTaskList "priority:1"              " High priority tasks
:RtmGetTaskList "priority:none"           " Tasks without priority

" Date-based filters
:RtmGetTaskList "due:today"               " Due today
:RtmGetTaskList "due:tomorrow"            " Due tomorrow
:RtmGetTaskList "due:overdue"             " Overdue tasks
:RtmGetTaskList "dueWithin:'1 week'"      " Due within a week

" Status filters
:RtmGetTaskList "status:incomplete"       " Incomplete tasks
:RtmGetTaskList "status:completed"        " Completed tasks

" List-based filters
:RtmGetTaskList "list:Work"               " Tasks in Work list
:RtmGetTaskList "list:Personal"           " Tasks in Personal list

" Tag-based filters
:RtmGetTaskList "tag:urgent"              " Tasks tagged as urgent
:RtmGetTaskList "tag:shopping"            " Tasks tagged as shopping

" Combined filters
:RtmGetTaskList "priority:1 AND due:today"           " High priority tasks due today
:RtmGetTaskList "list:Work AND status:incomplete"    " Incomplete work tasks
```

## Development

### Running Tests

The project includes comprehensive test coverage for all functionality:

```bash
# Run all tests (includes API signature tests, CLI tests, and integration tests)
deno task test

# Run specific test suites
deno task test:auth          # API signature and authentication tests
deno task test:cli           # CLI command tests
deno task test:integration   # Full integration tests with RTM API

# Run tests individually
deno test denops/tests/auth.test.ts --allow-env
deno test denops/tests/cli.test.ts --allow-net --allow-env --allow-read --allow-write --allow-run
deno test denops/tests/integration.test.ts --allow-net --allow-env --allow-read --allow-write
```

### Test Coverage

**Unit Tests** (`auth.test.ts`):
- ✅ API signature generation (MD5 hashing)
- ✅ Parameter handling and validation

**CLI Tests** (`cli.test.ts`):
- ✅ Help command and argument validation
- ✅ Error handling for missing arguments
- ✅ Environment variable configuration testing
- ✅ Invalid input validation
- ✅ Process execution and timeout handling

**Integration Tests** (`integration.test.ts`):
- ✅ Full task lifecycle testing (create → modify → complete → delete)
- ✅ RTM API connectivity testing
- ✅ Timeout and error handling
- ✅ Environment-based test skipping

**Test Results**:
```
✅ 13 tests passed, 0 failed
- auth.test.ts: 2 tests
- cli.test.ts: 9 tests  
- integration.test.ts: 2 tests
```

### Type Checking
```bash
# Check TypeScript types for all modules
deno task check

# Individual type checking
deno check denops/rtm/*.ts src/*.ts cli.ts
```

### Code Quality
```bash
# Format code
deno task fmt

# Lint code
deno task lint
```

### Project Structure
```
rtm_deno/
├── README.md                    # This file
├── CLAUDE.md                    # Development guide for Claude Code
├── deno.json                    # Deno project configuration and tasks
├── cli.ts                       # CLI entry point
├── src/
│   └── rtm-client.ts           # Standalone RTM client (CLI & reusable)
├── denops/
│   ├── rtm/
│   │   ├── main.ts             # Plugin entry point and command dispatcher  
│   │   └── auth.ts             # RTM API integration and CRUD operations
│   └── tests/
│       ├── auth.test.ts        # Unit tests for API signature generation
│       ├── cli.test.ts         # CLI command and process tests
│       └── integration.test.ts # Full integration tests with RTM API
└── dist/                       # Compiled binaries (created by build tasks)
    ├── rtm-linux
    ├── rtm-mac
    ├── rtm-mac-arm64  
    ├── rtm-windows.exe
    └── checksums.txt
```

### Development Workflow

1. **Setup Development Environment**:
   ```bash
   # Set RTM credentials for testing
   export RTM_API_KEY="your_api_key"
   export RTM_SECRET_KEY="your_secret_key"  
   export RTM_TOKEN_PATH="$HOME/.rtm_token"
   ```

2. **Make Changes**: Edit TypeScript files in `denops/rtm/`, `src/`, or `cli.ts`

3. **Run Type Check**: `deno task check`

4. **Run Tests**:
   ```bash
   # Quick tests (no API calls)
   deno task test:auth
   deno task test:cli
   
   # Full integration tests (requires RTM credentials)
   deno task test:integration
   
   # All tests
   deno task test
   ```

5. **Test CLI Manually**:
   ```bash
   deno task cli:help
   deno task cli:list
   deno task cli -- add "Test task"
   ```

6. **Build and Test Binaries**:
   ```bash
   deno task build
   ./rtm help
   ```

## Troubleshooting

### Authentication Issues
```bash
# Check if environment variables are set
echo $RTM_API_KEY
echo $RTM_SECRET_KEY
echo $RTM_TOKEN_PATH

# Verify token file exists and is readable
ls -la ~/.rtm_token
cat ~/.rtm_token

# Test CLI authentication
deno task cli:auth
```

### Plugin Not Loading
```vim
" Check if denops is working
:echo denops#server#status()

" Check if plugin is loaded
:echo exists('g:loaded_rtm_deno')

" Debug denops plugins
:DenopsInfo

" Test plugin commands
:RtmAuth
```

### API Errors
- Ensure your API key and secret are correct
- Check that you have the necessary permissions (delete permission required)
- Verify your internet connection
- Check RTM service status

### Development Issues

**Running Tests**:
```bash
# If integration tests fail with network timeouts
deno task test:auth test:cli  # Run only local tests

# Check if RTM credentials are configured for integration tests
deno task test:integration

# Verify types and code quality
deno task check
deno task fmt
deno task lint
```

**CLI Issues**:
```bash
# If CLI commands fail
# 1. Check permissions
ls -la cli.ts

# 2. Verify environment variables
env | grep RTM

# 3. Test with Deno directly
deno run --allow-net --allow-env --allow-read --allow-write cli.ts help

# 4. Check binary build
deno task build
./rtm help
```

**Performance Issues**:
- Integration tests may take up to 60 seconds due to RTM API rate limits
- CLI tests include 30-second timeouts for network operations
- Use `deno task test:auth` for quick validation during development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run quality checks:
   ```bash
   # Type checking
   deno task check
   
   # Code formatting
   deno task fmt
   
   # Linting
   deno task lint
   
   # Unit and CLI tests (fast)
   deno task test:auth
   deno task test:cli
   
   # Integration tests (requires RTM credentials)
   deno task test:integration
   
   # All tests
   deno task test
   ```
6. Ensure all tests pass and code quality checks succeed
7. Submit a pull request with a clear description of changes

### Test Requirements

- **Unit tests**: Required for all new API functions
- **CLI tests**: Required for new CLI commands or argument handling
- **Integration tests**: Required for new RTM API interactions
- **Type safety**: All code must pass TypeScript type checking
- **Code quality**: Must pass formatting and linting checks

### Testing Guidelines

- Write tests before implementing new features (TDD approach)
- Use descriptive test names that explain the behavior being tested
- Include both positive and negative test cases
- Mock external dependencies where appropriate
- Ensure tests are deterministic and don't depend on external state

## License

This project follows the same license as the original repository.

## CLI Usage

In addition to the Vim plugin, you can use RTM functionality as a standalone CLI tool.

### Setup CLI
```bash
# Set environment variables
export RTM_API_KEY="your_rtm_api_key"
export RTM_SECRET_KEY="your_rtm_secret_key"
export RTM_TOKEN_PATH="$HOME/.rtm_token"

# Authenticate (first time only)
deno task cli:auth
```

### CLI Commands
```bash
# List all tasks
deno task cli:list

# List tasks with filter
deno task cli -- list --filter "priority:1"

# Add a task
deno task cli -- add "Buy groceries"

# Complete a task
deno task cli -- complete 123456 789012 345678

# Update task name
deno task cli -- set-name 123456 789012 345678 "Updated task name"

# Set task priority
deno task cli -- set-priority 123456 789012 345678 1

# Set due date
deno task cli -- set-due 123456 789012 345678 "tomorrow"

# Delete a task
deno task cli -- delete 123456 789012 345678

# Get help
deno task cli:help
```

### CLI Options
- `--json` - Output results in JSON format
- `--filter` - Filter tasks (for list command)
- `--help` - Show help information

### Direct Execution
You can also run the CLI directly:
```bash
# Make executable
chmod +x cli.ts

# Run directly
./cli.ts help
./cli.ts list --filter "due:today"
./cli.ts add "New task"
```

### Binary Distribution

You can compile the CLI into standalone executables for distribution:

#### Build for Current Platform
```bash
# Build for your current platform
deno task build

# Run the binary
./rtm help
./rtm list
./rtm add "New task"
```

#### Build for All Platforms
```bash
# Build for all supported platforms
deno task build:all

# This creates binaries in the dist/ directory:
# - dist/rtm-linux (Linux x86_64)
# - dist/rtm-mac-intel (macOS Intel)
# - dist/rtm-mac-arm64 (macOS Apple Silicon)
# - dist/rtm-windows.exe (Windows x86_64)
# - dist/checksums.txt (SHA-256 checksums)
```

#### Build for Specific Platforms
```bash
# Linux
deno task build:linux

# macOS Intel
deno task build:mac

# macOS Apple Silicon
deno task build:mac-arm

# Windows
deno task build:windows
```

#### Installation
Once built, you can install the binary system-wide:

```bash
# Linux/macOS
sudo cp dist/rtm-linux /usr/local/bin/rtm  # or appropriate binary
chmod +x /usr/local/bin/rtm

# Windows
# Copy dist/rtm-windows.exe to a directory in your PATH

# Verify installation
rtm help
```

## Related Links

- [Remember The Milk](https://www.rememberthemilk.com/)
- [RTM API Documentation](https://www.rememberthemilk.com/services/api/)
- [denops.vim](https://github.com/vim-denops/denops.vim)
- [Deno](https://deno.land/)