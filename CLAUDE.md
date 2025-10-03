# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite HMR
- `npm run build` - Build the project (TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint on the codebase
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
- **Review System**: Quality-based evaluation with visual feedback (😵 忘れた, 🤔 曖昧, 💡 思い出した, ✨ 完璧)
- **Smart Filtering**: Default view shows only items needing review; toggle to show all items
- **Multiline Input**: Support for textarea input with automatic resize and proper line break display
- **Dropdown Actions**: Integrated edit/delete menu with hover effects and click-outside-to-close

### Frontend Architecture (`src/`)

- **`App.tsx`**: Main component handling all state management, API calls, and UI logic
  - State: items, editing, filtering, form data, dropdown visibility
  - Key functions: CRUD operations, SM-2 review processing, dropdown management
- **`api.ts`**: Centralized API communication with error handling via ApiError class
- **`types.ts`**: TypeScript interfaces for Item, CreateItemData, UpdateItemData, and API responses
- **UI Features**:
  - Character counters with visual warnings (650+ orange, 750 red)
  - Textarea inputs with row configuration (1 for add, 6 for edit)
  - Dropdown menus with outside-click handling
  - Pre-wrap text display for multiline content

### Backend Architecture (`worker/`)

- **`index.ts`**: RESTful API router handling CORS, request validation, and response formatting
- **`database.ts`**: D1 database operations and SM-2 algorithm implementation
- **API Endpoints**:
  - `GET /api/items` - Retrieve all items
  - `POST /api/items` - Create new item (750 char limit)
  - `PUT /api/items/:id` - Update item content
  - `PUT /api/items/:id/review` - Process review with quality score
  - `DELETE /api/items/:id` - Delete item

### Database Schema (`schema.sql`)

Items table with fields for SM-2 algorithm: `interval_days`, `ease_factor`, `review_count`, `next_review`

### Key Integration Points

- **API Communication**: Frontend fetches from `/api/` endpoints handled by Cloudflare Worker
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
- **CORS**: Currently set to `*` for all origins (TODO: restrict for production)

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

Application fully deployed and functional. Remaining tasks in `TODO.md`: component refactoring (low priority), production CORS configuration (high priority for security).
