# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite HMR
- `npm run build` - Build the project (TypeScript compilation + Vite build)
- `npm run lint` - Run ESLint on the codebase
- `npm run preview` - Build and preview the production build locally
- `npm run deploy` - Build and deploy to Cloudflare Workers
- `npm run cf-typegen` - Generate TypeScript types for Cloudflare Workers

## Architecture

This is a React + TypeScript + Vite application deployed on Cloudflare Workers with the following structure:

### Frontend (React SPA)
- **Entry Point**: `src/main.tsx` - React app entry point
- **Main Component**: `src/App.tsx` - Main React component with state management
- **Assets**: `src/assets/` - Static assets (logos, images)
- **Styling**: `src/App.css` and `src/index.css` - Component and global styles

### Backend (Cloudflare Worker)
- **Worker Entry**: `worker/index.ts` - Cloudflare Worker that handles API requests
- **API Pattern**: Routes starting with `/api/` are handled by the worker
- **Static Assets**: All other routes serve the React SPA (configured via `assets.not_found_handling`)

### Key Integration Points
- **API Communication**: Frontend fetches from `/api/` endpoints which are handled by the Cloudflare Worker
- **Build Process**: Vite builds the frontend, Wrangler handles worker deployment
- **Development**: Vite dev server for frontend, worker logic can be tested via preview/deploy

### Configuration Files
- **wrangler.jsonc**: Cloudflare Workers configuration with SPA asset handling
- **vite.config.ts**: Vite configuration with React SWC and Cloudflare plugin
- **eslint.config.js**: ESLint configuration with TypeScript and React rules
- **tsconfig.*.json**: TypeScript configurations for different build targets

### Deployment
The application is deployed as a Cloudflare Worker with static assets, combining both the React frontend and API backend in a single deployment unit.