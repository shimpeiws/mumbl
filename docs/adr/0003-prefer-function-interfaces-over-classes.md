# ADR-0003: Prefer Function Interfaces Over Classes

## Status

Accepted

## Context and Problem Statement

This codebase uses 42 classes across various patterns (Repository, Service, Adapter, Strategy, etc.). However, many of these classes are stateless wrappers that could be expressed more simply as functions.

The question arose: when should we use classes vs. functions in TypeScript? This decision affects code readability, testability, and alignment with modern TypeScript/React ecosystem trends.

## Decision Drivers

- **Modern TypeScript/React trends**: Functional components and hooks are the standard
- **Simplicity**: Functions have less boilerplate than classes
- **Testability**: Functions are easier to mock and test
- **`this` binding issues**: Classes require careful handling of `this` in callbacks
- **Tree-shaking**: Functions are more amenable to dead code elimination
- **Consistency**: Establish a clear guideline for the codebase

## Considered Options

### Option 1: Continue using classes freely

Use classes for services, repositories, adapters, and other patterns as currently done.

### Option 2: Prefer functions, allow classes when necessary (CHOSEN)

Default to function interfaces. Use classes only when they provide unique value.

### Option 3: Eliminate all classes

Refactor everything to functions, even error hierarchies.

## Decision Outcome

**Chosen option: Prefer function interfaces, use classes only when strictly necessary**

### When Classes ARE Required

| Use Case | Reason | Example |
|----------|--------|---------|
| **Error hierarchies** | `extends Error` is the standard pattern; required for proper stack traces | `class LLMError extends Error` |
| **Abstract base classes** | Shared implementation via Template Method pattern | `abstract class BaseAgentAdapter` |
| **`instanceof` checks** | Type guards that require class identity | `if (error instanceof RateLimitError)` |
| **Decorator-based frameworks** | NestJS, TypeORM require class syntax | `@Injectable() class UserService` |
| **Private fields (`#`)** | True runtime privacy (ES private fields) | `class Counter { #count = 0; }` |

### When Functions Should Be Used

| Pattern | Class Version | Function Version |
|---------|---------------|------------------|
| **Repository** | `class EntryRepository { constructor(db) {} }` | `createEntryRepository(db) => ({ insert, find, ... })` |
| **Stateless Service** | `class OllamaService { listModels() {} }` | `export const ollamaService = { listModels, ... }` |
| **Strategy** | `class AnthropicProvider implements LLMProvider` | `const anthropicProvider: LLMProvider = { chat, stream }` |
| **Detector** | `class ClaudeCodeDetector { detect() {} }` | `const claudeCodeDetector: AgentDetector = { detect }` |
| **Stateful Service** | `class LLMService { private state; }` | `createLLMService(deps) => { let state; return { ... } }` |

### Function Pattern for Stateful Services

Use closures to maintain state:

```typescript
export const createLLMService = (initialProvider: LLMProvider) => {
  // State via closure (truly private)
  let currentProvider = initialProvider;
  const sessionHistory = createSessionMessageHistory();

  return {
    chat: async (messages: Message[]): Promise<string> => {
      // Access currentProvider, sessionHistory via closure
    },
    switchProvider: async (config: ModelConfig): Promise<void> => {
      currentProvider = createProvider(config);
    },
  };
};

export type LLMService = ReturnType<typeof createLLMService>;
```

## Consequences

### Positive

- **Simpler code**: Less boilerplate, no `this` binding issues
- **Better testability**: Easy to create test doubles
- **True encapsulation**: Closure variables are genuinely private (unlike `private` keyword)
- **Alignment with React/Ink**: Matches the functional paradigm of the UI layer
- **Tree-shaking friendly**: Unused functions can be eliminated

### Negative

- **Refactoring effort**: Existing classes need to be converted
- **Type ergonomics**: `ReturnType<typeof createX>` is less elegant than `class X`
- **No `instanceof`**: Cannot use `instanceof` for type guards on function-created objects
- **Learning curve**: Developers accustomed to OOP may need adjustment

### Neutral

- **Performance**: No meaningful difference in runtime performance
- **Debugging**: Stack traces are slightly different but equally useful

## Implementation Notes

### Migration Strategy

Adopt incrementally:
1. New code follows this guideline
2. Existing code is refactored when modified for other reasons
3. No big-bang refactoring required

### Exceptions

The following classes should remain as classes:
- All error classes (`src/domain/errors/`, `src/services/llm/errors.ts`, `src/services/ollama/errors.ts`)
- `BaseAgentAdapter` (abstract class with shared implementation)
- Any future code requiring decorators or `instanceof`

## References

- [Do you need classes in JS/TS? [2025 version] - DEV Community](https://dev.to/latobibor/do-you-need-classes-in-jsts-2025-version-j46)
- [TypeScript Best Practices in 2025 - DEV Community](https://dev.to/mitu_mariam/typescript-best-practices-in-2025-57hb)
- [The 8 trends that will define web development in 2026 - LogRocket Blog](https://blog.logrocket.com/8-trends-web-dev-2026/)

## Decision Date

2026-02-08
