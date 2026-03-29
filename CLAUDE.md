# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## External Services

- Before implementing features that use Cloudflare platform APIs (Workers, D1, R2, KV, etc.), always check the latest official documentation to verify correct usage patterns, configuration, and TypeScript types.

## Development Commands

- `npm run dev` - Start development server with Vite HMR
- `npm run build` - Build the project (TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint on the codebase
- `npm test` - Run unit tests in watch mode with Vitest
- `npm run test:run` - Run TypeScript type check + all unit tests once
- `npm run test:ui` - Run tests with Vitest UI interface
- `npm run preview` - Build and preview the production build locally
- `npm run deploy` - Build and deploy to Cloudflare Workers
- `npm run cf-typegen` - Generate TypeScript types for Cloudflare Workers

## Database Development

### Local Development

```bash
# Apply database schema locally
npx wrangler d1 execute repeatnote-db --local --file=schema.sql

# Execute direct SQL commands locally
npx wrangler d1 execute repeatnote-db --local --command="SELECT * FROM items"

# Reset local database (development only)
rm -rf .wrangler/state/v3/d1
npx wrangler d1 execute repeatnote-db --local --file=schema.sql
```

### Production Database

```bash
# Apply schema to production database
npx wrangler d1 execute repeatnote-db --remote --file=schema.sql

# Execute commands on production database
npx wrangler d1 execute repeatnote-db --remote --command="SELECT * FROM items"
```

## Application Architecture

**RepeatNote** is a spaced repetition learning application implementing the SM-2 algorithm for optimal memory retention. Built with React + TypeScript + Vite frontend and Cloudflare Workers + D1 database backend.

### Core Functionality

- **Spaced Repetition**: SM-2 algorithm calculates optimal review intervals based on recall quality (0-5 scale)
- **Learning Items**: Create, edit, and delete study items with 750-character limit
- **Image Support**: Upload, edit, and delete images (JPEG/PNG/WebP/GIF, 5MB limit) with Cloudflare R2 storage
- **Review System**: Quality-based evaluation with visual feedback (😵 忘れた, 🤔 曖昧, 💡 思い出した, ✨ 完璧)
- **Master/Unmaster**: Mark items as "mastered" to exclude from review cycle, or unmaster to resume reviews
- **Smart Filtering**: Default view shows only items needing review; toggle to show all items
- **Text Search**: Keyword filter to narrow down the item list; case-insensitive, applied after status filter
- **Smart Sorting**: Items sorted by next_review date (ascending) for optimal study order
- **Review-First UI**: Collapsible add form prioritizes daily review workflow
- **Multiline Input**: Support for textarea input with automatic resize and proper line break display
- **Dropdown Actions**: Integrated edit/delete menu with hover effects and click-outside-to-close

### Frontend Architecture (`src/`)

- **`App.tsx`**: Main component handling all state management, API calls, and UI logic
  - State: items, editing, filtering, searchText, form data, dropdown visibility, image handling
  - Key functions: CRUD operations, SM-2 review processing, dropdown management, image upload/edit
- **`api.ts`**: Centralized API communication with error handling via ApiError class
- **`types.ts`**: TypeScript interfaces for Item, CreateItemData, UpdateItemData, and API responses
- **`constants.ts`**: Shared configuration for image validation and error messages
- **UI Features**:
  - Character counters with visual warnings (650+ orange, 750 red)
  - Textarea inputs with row configuration (1 for add, 6 for edit)
  - Dropdown menus with outside-click handling
  - Pre-wrap text display for multiline content
  - Image upload with preview thumbnails and validation
  - Collapsible add form for review-first workflow
  - Keyword search box with clear button (status filter → text search applied in sequence)

### Backend Architecture (`worker/`)

- **`index.ts`**: RESTful API router handling request validation, response formatting, and image processing
- **`database.ts`**: D1 database operations and SM-2 algorithm implementation
- **`constants.ts`**: Image configuration and validation constants
- **API Endpoints**:
  - `GET /api/items` - Retrieve all items
  - `POST /api/items` - Create new item (750 char limit, FormData/JSON support, image upload)
  - `PUT /api/items/:id` - Update item content and images
  - `PUT /api/items/:id/review` - Process review with quality score
  - `PUT /api/items/:id/master` - Mark item as mastered (exclude from reviews)
  - `PUT /api/items/:id/unmaster` - Unmaster item and reset review schedule
  - `DELETE /api/items/:id` - Delete item and associated images
  - `GET /api/images/:filename` - Serve images from R2 storage
  - `POST /api/external/items` - **外部API**: Cloudflare Access Service Auth認証付きでアイテムを追加（JSON/FormData対応、画像アップロード可）

### External API

外部ツールやスクリプトからアイテムを追加するための専用エンドポイント。Cloudflare Access Service Token による認証が必須。

```bash
# テキストのみ (JSON)
curl -X POST https://repeatnote.ifukazoo.workers.dev/api/external/items \
  -H "CF-Access-Client-Id: <CLIENT_ID>" \
  -H "CF-Access-Client-Secret: <CLIENT_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{"content": "学習アイテム"}'

# 画像付き (FormData)
curl -X POST https://repeatnote.ifukazoo.workers.dev/api/external/items \
  -H "CF-Access-Client-Id: <CLIENT_ID>" \
  -H "CF-Access-Client-Secret: <CLIENT_SECRET>" \
  -F "content=学習アイテム" \
  -F "image=@photo.jpg"
```

**セットアップ:**
Cloudflare One → Access controls → Service credentials → Service Tokens でサービストークンを作成し、`/api/external/items` パス用の Access アプリケーションに Service Auth ポリシーを設定する。

### Database Schema (`schema.sql`)

Items table with fields for SM-2 algorithm and image support:
- Core fields: `id`, `content`, `created_at`
- SM-2 fields: `interval_days`, `ease_factor`, `review_count`, `next_review`, `mastered`
- Image fields: `image_url`, `image_filename`

### Claude Desktop MCP Integration (`mcp/`)

Claude Desktop から `add_item` ツールで直接アイテムを追加できる MCP サーバー。

- **実装**: `mcp/src/index.ts`（`@modelcontextprotocol/sdk` 使用）
- **認証**: プロジェクトルートの `.env` から `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` を読み込む
- **ビルド**: `cd mcp && npm run build`
- **登録**: `~/Library/Application Support/Claude/claude_desktop_config.json` に `repeatnote` サーバーとして登録済み

### Architecture Diagram

システム全体のアーキテクチャ図は `architecture.drawio` に保存されている。構成に変更があった場合はこのファイルも更新すること。

### Key Integration Points

- **API Communication**: Frontend fetches from `/api/` endpoints handled by Cloudflare Worker
- **Image Storage**: Cloudflare R2 bucket (`repeatnote-images`) for secure image storage
- **SPA Routing**: `wrangler.jsonc` configured with `"not_found_handling": "single-page-application"`
- **Local Development**: `preview_database_id` in wrangler.jsonc enables local D1 database
- **Build Process**: Vite builds frontend, Wrangler handles worker deployment

## Deployment

### Production Environment

- **URL**: <https://repeatnote.ifukazoo.workers.dev>
- **Database**: Cloudflare D1 production database (ID: e111886a-f204-4088-b0de-65f08ec6eeb7)
- **Deploy Command**: `npm run deploy` (builds frontend and deploys worker)

### Environment Configuration

- **Local Database**: Uses `preview_database_id: "local-repeatnote-db"` for development
- **Production Database**: Uses `database_id` for production deployment
- **R2 Storage**: `repeatnote-images` bucket for image storage
- **CORS**: Same-Origin deployment eliminates CORS requirements

## Code Formatting Standards

This project uses Prettier for consistent code formatting. All code output should follow the configuration in `.prettierrc`:

```json
{
  "semi": true,
  "tabWidth": 2,
  "singleQuote": true
}
```

**Key formatting rules:**
- **Semicolons**: Required at the end of statements
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes for strings
- **Line length**: Automatic wrapping for readability
- **Import statements**: Multi-line with alphabetical sorting when needed
- **Object properties**: Proper line breaks and alignment
- **JSX attributes**: Consistent line breaks and indentation

**Usage:**
- Run `npx prettier --write .` to format all files
- Ensure all new code follows these standards
- Use the same formatting in code examples and outputs

## Current Status

Application fully deployed and functional with complete feature set including:
- ✅ Spaced repetition learning system with SM-2 algorithm
- ✅ Complete image upload/edit/delete functionality
- ✅ Review-first UI with collapsible add form
- ✅ Text search filter for narrowing down the item list
- ✅ External REST API with API key authentication for adding items from external tools
- ✅ Production-ready security and optimization

Remaining tasks in `TODO.md`: component refactoring (low priority), production environment optimization (medium priority).

## Testing Framework

**RepeatNote** uses a comprehensive unit testing suite built with modern JavaScript testing tools:

### Test Stack
- **Vitest**: Fast unit test runner with Vite integration
- **React Testing Library**: User-centric component testing
- **jsdom**: Browser environment simulation
- **@testing-library/user-event**: User interaction simulation

### Test Structure (`src/test/`)
- **`worker/index.test.ts`**: External API endpoint tests (5 tests)
  - JSON format (success, empty content, too long content)
  - FormData format (text only, with image upload)
- **`sm2-algorithm.test.ts`**: SM-2 spaced repetition algorithm tests (12 tests)
  - Interval calculations for different review stages
  - Ease factor updates and boundary conditions
  - Next review date generation
- **`api.test.ts`**: API client function tests (13 tests)
  - All CRUD operations (create, read, update, delete)
  - Review processing and master/unmaster operations
  - Error handling and response validation
- **`constants.test.ts`**: Configuration and validation tests (10 tests)
  - Image upload constraints and validation
  - File size and type restrictions
- **`sorting.test.ts`**: Item sorting and filtering tests
  - Next review date sorting logic
  - Frontend sort optimization
- **`app.test.tsx`**: React component integration tests (11 tests)
  - UI element rendering and interaction
  - Form expansion and input validation
  - Display toggling and accessibility
  - Text search input and clear button

### Test Commands
- `npm test` - Watch mode for development
- `npm run test:run` - Single run for CI/automation
- `npm run test:ui` - Interactive UI mode
- `npx vitest run src/test/<filename>.test.ts` - 単一テストファイルを実行

**Total: 57 tests** covering core business logic, API layer, validation, UI components, and external API.

## Development Notes

- **Comprehensive test coverage**: All critical functionality is covered by automated tests, ensuring code quality and preventing regressions.
- **Single component architecture**: The frontend uses a single `App.tsx` component by design for simplicity, though component extraction is noted as a future improvement.
- **Test-driven development**: ビジネスロジック（SM-2アルゴリズム、APIレイヤーなど）はTDDで開発する（テストを先に書いてから実装）。UIコンポーネントはモノリシックな `App.tsx` の制約上テストファーストが難しいため、実装後にテストを追加する。変更後は `npm test` でテストを確認し、`npm run dev` で手動UIテストをしてから `npm run deploy` でデプロイする。
- **Documentation update**: After adding or changing features, always update CLAUDE.md to reflect the changes (Core Functionality, Frontend Architecture, Current Status, test counts, etc.).
- **Frontend sorting optimization**: Items are sorted by next_review date (ascending) on the frontend for optimal performance and user experience. This approach avoids redundant backend sorting and provides instant visual feedback.
