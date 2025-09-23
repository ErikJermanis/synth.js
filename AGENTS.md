# Agent Guidelines for synth.js

## Build/Development Commands

- **Dev server**: `npm run dev` (Vite dev server)
- **Build**: `npm run build` (Vite production build)
- **Preview**: `npm run preview` (Preview built app on port 4173)
- **Lint**: `npm run lint` (ESLint check)
- **Format**: `npm run format` (Prettier formatting)
- **No test framework configured** - add tests manually or ask user

## Code Style & Conventions

- **TypeScript**: Strict mode enabled with ES2020 target
- **Path aliases**: Use `@/*` for `src/*` imports (configured in tsconfig.json)
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Private fields**: Prefix with underscore (`_tempo`, `_isPlaying`)
- **Types**: Explicit typing required, avoid `any` except for callbacks
- **Error handling**: Throw descriptive errors with null checks
- **Imports**: Use ES6 imports, group by: external libs, local modules, types

## Architecture Patterns

- **Audio classes**: Export as named exports with clear interfaces
- **Event handling**: Use proper TypeScript event typing
- **State management**: Private fields with public getters/setters
- **Audio scheduling**: Use absolute timing with AudioContext.currentTime
