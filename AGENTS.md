# Repository Guidelines

## Project Structure & Module Organization

- `src/`: Application source code (Astro + TypeScript).
  - `src/pages/`: Route entrypoints (`.astro`/`.md` map to URLs).
  - `src/components/`: Reusable UI components.
  - `src/layouts/`: Page/layout shells.
  - `src/data/blog/`: Blog posts in Markdown (`*.md`).
  - `src/styles/`: Global and shared styles (Tailwind).
  - `src/utils/`, `src/scripts/`: Shared helpers and scripts.
- `public/`: Static assets served as-is (e.g. `public/favicon.svg`).
  - `public/pagefind/` is generated during build; do not hand-edit.
- `dist/`: Build output (generated).

## Build, Test, and Development Commands

This repo uses `pnpm` (see `pnpm-lock.yaml`):

- `pnpm install`: Install dependencies.
- `pnpm dev`: Start local dev server (default `http://localhost:4321`).
- `pnpm build`: Type-check + build to `dist/`, then generate search index via Pagefind.
- `pnpm preview`: Serve the production build locally.
- `pnpm lint`: Run ESLint (includes Astro + TS rules).
- `pnpm format` / `pnpm format:check`: Format or verify formatting with Prettier.
- `pnpm sync`: Generate Astro TypeScript types (useful after adding integrations/content).

## Coding Style & Naming Conventions

- Formatting is enforced by Prettier (`.prettierrc.mjs`): 2-space indentation, `printWidth: 80`, semicolons.
- Tailwind class ordering is handled by `prettier-plugin-tailwindcss`.
- Linting uses ESLint (`eslint.config.js`); `console.*` is disallowed (`no-console: "error"`).
- Prefer descriptive names and consistent casing:
  - Components: `PascalCase` (e.g. `src/components/PostCard.astro`)
  - Utilities: `camelCase` exports in `src/utils/`
  - Content slugs/filenames: `kebab-case` (e.g. `src/data/blog/my-new-post.md`)

## Testing Guidelines

There is no dedicated unit test runner configured. Validation is primarily:

- `pnpm build` (includes `astro check`) for type/content correctness.
- `pnpm lint` and `pnpm format:check` for code quality and consistency.

## Commit & Pull Request Guidelines

- Use Conventional Commits (e.g. `feat: add tag filter`, `fix: correct RSS dates`, `refactor: simplify config`).
  - Commitizen configuration exists in `cz.yaml` if your workflow uses it.
- PRs should be small and focused, with:
  - Clear description of intent and impact
  - Linked issue (if applicable)
  - Screenshots for UI changes (light + dark mode when relevant)

## Configuration & Security Notes

- Use `.env` for environment configuration. Only `PUBLIC_*` variables are exposed to the client.
- Never commit secrets or tokens; keep local overrides in untracked env files.
