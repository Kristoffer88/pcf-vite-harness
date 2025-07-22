# CLAUDE Rules & Guidelines

## Operational Boundaries

### DO
- Edit existing files to implement requested features
- Follow established project patterns and conventions
- Run `npm run lint` and `npm run build` after making changes
- Use existing libraries and utilities already in the project
- Preserve exact indentation and code style
- Create commits only when explicitly requested
- Test changes with fixture projects when available

### DON'T  
- Create unnecessary new files when existing ones can be modified
- Ignore test failures or build errors
- Modify `git config` or repository settings
- Add dependencies without checking if alternatives exist in the codebase
- Use emojis unless explicitly requested
- Create documentation files unless explicitly requested
- Make changes to files without reading them first

## File Access Guidelines

### Safe to Modify
- `src/` directory - Core library code
- `tests/` directory - Test files and fixtures
- `bin/` directory - CLI scripts
- Configuration files: `tsup.config.ts`, `biome.json`, `vite.config.ts`
- Development files in `tests/fixtures/` for testing

### Require Approval Before Modifying
- `package.json` - Package configuration
- Root configuration files: `.gitignore`, `.npmignore`
- Build configuration files that affect production builds

### Read-Only (Never Modify)
- `package-lock.json` - Auto-generated dependency lock
- `.git/` directory - Git internals
- `node_modules/` - Installed dependencies
- `dist/` or `build/` - Generated build artifacts

## Context Hygiene Rules

### Session Management
- Use `/clear` command between unrelated work types
- Start new sessions when switching from DevTools work to core library changes
- Start new sessions when switching from bug fixes to new features
- Keep dataset-related work separate from UI component work

### Context Poisoning Prevention
- Don't mix architectural discussions with implementation tasks
- Separate research sessions from coding sessions
- Use Plan Mode for complex multi-file changes before executing

## Tool Usage Preferences

### When to Use Task Tool
- Multi-file searches across the entire codebase
- Open-ended research requiring multiple rounds of exploration
- When you need to find patterns or keywords across many files
- Complex analysis requiring multiple search strategies

### When to Use Direct Tools (Read/Grep/Glob)
- Reading specific known file paths
- Searching for specific class definitions or function names
- Working within a known set of 2-3 files
- Quick targeted searches with known patterns

### TodoWrite Tool Usage
- Use for any task requiring 3+ distinct steps
- Mark tasks as `in_progress` BEFORE starting work
- Complete tasks IMMEDIATELY after finishing - don't batch completions
- Only have ONE task `in_progress` at a time

### Plan Mode Usage
- Use for large refactoring operations spanning multiple files
- Use when implementing new features affecting multiple components
- Use when making changes that could impact the build system
- Use for complex DevTools or dataset-related changes

### Batch Operations
- Always batch multiple independent bash commands in a single response
- Run `git status`, `git diff`, and `git log` in parallel when creating commits
- Batch multiple file reads when exploring related functionality