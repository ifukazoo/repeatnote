# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite HMR
- `npm run build` - Build the project (TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint on the codebase
- `npm run preview` - Build and preview the production build locally
- `npm run deploy` - Build and deploy to Cloudflare Workers
- `npm run cf-typegen` - Generate TypeScript types for Cloudflare Workers

## Local D1 Database Development

```bash
# Apply database schema locally
npx wrangler d1 execute repeatnote-db --local --file=schema.sql

# Execute direct SQL commands
npx wrangler d1 execute repeatnote-db --local --command="SELECT * FROM items"

# Reset local database (development only)
rm -rf .wrangler/state/v3/d1
npx wrangler d1 execute repeatnote-db --local --file=schema.sql
```

## Application Architecture

**RepeatNote** is a spaced repetition learning application implementing the SM-2 algorithm for optimal memory retention. Built with React + TypeScript + Vite frontend and Cloudflare Workers + D1 database backend.

### Core Functionality
- **Spaced Repetition**: SM-2 algorithm calculates optimal review intervals based on recall quality (0-5 scale)
- **Learning Items**: Create, edit, and delete study items with 750-character limit
- **Review System**: Quality-based evaluation with visual feedback (😵 忘れた, 🤔 曖昧, 💡 思い出した, ✨ 完璧)
- **Smart Filtering**: Default view shows only items needing review; toggle to show all items

### Frontend Architecture (`src/`)
- **`App.tsx`**: Main component (~300 lines) handling all state management, API calls, and UI logic
- **`api.ts`**: Centralized API communication with error handling via ApiError class
- **`types.ts`**: TypeScript interfaces for Item, CreateItemData, UpdateItemData, and API responses
- **State Management**: Local React state for items, editing, filtering, and form data
- **UI Features**: Character counters with visual warnings, inline editing, responsive design

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

### Current Status
Main features complete. Remaining tasks in `TODO.md`: delete button UX improvements, component refactoring, production CORS configuration.