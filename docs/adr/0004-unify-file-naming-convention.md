# ADR-0004: Unify File Naming Convention

## Status

Accepted

## Context and Problem Statement

The codebase mixes kebab-case and PascalCase for `.ts` file names. React components and context files (`.tsx`) already use PascalCase, hooks use camelCase (`use*`), but services, repositories, and utilities use kebab-case. Since kebab-case files typically export PascalCase-named entities (e.g., `ollama-service.ts` exports `OllamaService`), this creates a mismatch between file names and their primary exports.

## Decision Drivers

- **Consistency**: A single naming convention reduces cognitive load
- **Discoverability**: File names matching export names make navigation easier
- **Alignment with React conventions**: PascalCase is standard for component files; extending this to services and repositories creates uniformity
- **IDE support**: PascalCase file names enable better auto-import suggestions when they match exported symbols

## Considered Options

### Option 1: Keep kebab-case for non-component files

Continue the current mixed convention. Components use PascalCase, everything else uses kebab-case.

### Option 2: Unify to PascalCase for module files (CHOSEN)

Rename all kebab-case module files to PascalCase, keeping generic files (`index.ts`, `types.ts`, `errors.ts`, `config.ts`, `client.ts`) lowercase.

### Option 3: Unify everything to kebab-case

Rename components and context files to kebab-case. This conflicts with React community conventions.

## Decision Outcome

**Chosen option: Unify to PascalCase for module files with specific exports**

### Naming Rules

| Category | Convention | Examples |
|----------|-----------|----------|
| Components, Context (`.tsx`) | PascalCase | `EntryList.tsx`, `ConfigContext.tsx` |
| Hooks | camelCase (`use*`) | `useReactions.ts`, `useEntries.ts` |
| Module files with specific exports | PascalCase | `OllamaService.ts`, `EntryRepository.ts` |
| Generic utility files | lowercase | `index.ts`, `types.ts`, `errors.ts`, `config.ts`, `client.ts` |

### What Qualifies as "Generic"

Files that serve as module entry points or contain shared type definitions remain lowercase:
- `index.ts` - barrel exports
- `types.ts` - shared type definitions
- `errors.ts` - error class definitions
- `config.ts` - configuration
- `client.ts` - client instances
- `retry.ts`, `detect.ts`, `stopwords.ts`, `prompts.ts` - single-concept utility files

## Consequences

### Positive

- **Consistent naming**: All module files follow the same convention
- **Better discoverability**: File name matches the primary export
- **Reduced ambiguity**: No need to guess whether a file uses kebab-case or PascalCase
- **Alignment with ecosystem**: Matches React/TypeScript community conventions

### Negative

- **One-time migration cost**: All imports must be updated across the codebase
- **Git history**: `git log --follow` is needed to trace file history across renames

### Neutral

- **No runtime impact**: File naming is purely a developer experience concern
- **Test files follow source**: `OllamaService.test.ts` matches `OllamaService.ts`

## Implementation Notes

- Use `git mv` for all renames to preserve git history
- macOS is case-insensitive by default, but `git mv` handles this correctly
- Update all import paths after renaming
- Test files are renamed alongside their source files

## Decision Date

2026-03-16
