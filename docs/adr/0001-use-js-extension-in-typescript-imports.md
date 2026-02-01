# ADR-0001: Use .js Extension in TypeScript Import Statements

## Status

Accepted

## Context and Problem Statement

When writing TypeScript source code for an ESM (ECMAScript Modules) project, developers must decide whether to include file extensions in import statements. The question arose: should we write `import { foo } from './bar'` or `import { foo } from './bar.js'` when importing TypeScript files?

This is particularly confusing because:
- We're importing `.ts` source files during development
- The compiled output will be `.js` files
- TypeScript's behavior differs from other module systems

## Decision Drivers

- **Node.js ESM specification requirements**
- **TypeScript compiler behavior and policies**
- **Industry best practices and popular repository patterns**
- **Build tool compatibility (Vite, Vitest)**
- **Developer experience and code maintainability**

## Considered Options

### Option 1: Omit file extensions in imports
```typescript
import { generateEntryId } from './id-service';
```

### Option 2: Use .ts extensions in imports
```typescript
import { generateEntryId } from './id-service.ts';
```

### Option 3: Use .js extensions in imports (CHOSEN)
```typescript
import { generateEntryId } from './id-service.js';
```

## Decision Outcome

**Chosen option: Use .js extensions in TypeScript imports**

We will use `.js` file extensions in all TypeScript import statements, even though we're importing `.ts` source files.

### Rationale

1. **Node.js ESM Requirement**: Node.js ESM specification requires file extensions in imports. Without them, Node.js cannot resolve modules correctly.

2. **TypeScript Official Policy**: According to TypeScript documentation, "you should always write the path you want to appear in the emitted JS". TypeScript does not rewrite import paths during compilation.

3. **Industry Standard**: Popular TypeScript ESM projects follow this pattern:
   - **Chalk** (by Sindre Sorhus): Uses `.js` extensions in TypeScript source
   - **Vite**: Requires `.js` extensions for TypeScript 4.7+ "Node16" module resolution
   - **Vitest**: Officially supports importing `.ts` files with `.js` extensions
   - **TypeScript ecosystem**: Sindre Sorhus's "Pure ESM package" guide mandates this approach

4. **Project Configuration Alignment**: Our `package.json` has `"type": "module"` and `tsconfig.json` has `"module": "ESNext"`, which are designed for ESM and require this pattern.

5. **Build Tool Compatibility**: Vite and Vitest (our testing framework) are designed to handle `.js` extensions in TypeScript imports correctly.

### How It Works

TypeScript's module resolution:
1. During development: TypeScript sees `import './foo.js'` and resolves it to `./foo.ts`
2. During compilation: TypeScript emits `import './foo.js'` unchanged
3. At runtime: Node.js loads the compiled `./foo.js` file

This appears counterintuitive but is the correct approach for TypeScript + ESM.

## Consequences

### Positive

- ✅ **Compliance with standards**: Follows Node.js ESM specification
- ✅ **Industry alignment**: Matches patterns used by popular open-source projects
- ✅ **Build tool compatibility**: Works seamlessly with Vite, Vitest, and other modern tools
- ✅ **Future-proof**: Aligns with TypeScript's long-term direction for ESM
- ✅ **No configuration hacks**: Doesn't require custom module resolution patches

### Negative

- ❌ **Developer confusion**: Initially counterintuitive to write `.js` when importing `.ts`
- ❌ **IDE false warnings**: Some IDEs may show warnings about missing `.js` files (though TypeScript LSP handles it correctly)
- ❌ **Migration overhead**: Existing code without extensions needs updating

### Neutral

- ⚪ **Documentation needed**: Requires this ADR and developer onboarding to explain the pattern
- ⚪ **Code review attention**: Reviewers must ensure new imports follow the convention

## Implementation Notes

### Current State

All test files already use `.js` extensions correctly:

```typescript
// src/services/entry-service.test.ts
import { initializeSchema } from '../infrastructure/database/schema.js';
import { EntryService } from './entry-service.js';

// src/services/id-service.test.ts
import { generateEntryId, isValidEntryId } from './id-service.js';
```

### Linting Enforcement

Consider adding a Biome rule or custom linter to enforce this pattern in the future.

## References

- [TypeScript Documentation: Modules Reference](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [Sindre Sorhus: Pure ESM package](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [Vite Issue #8993: TypeScript Node16 extension requirements](https://github.com/vitejs/vite/issues/8993)
- [Vitest Issue #5999: Importing TypeScript with .js extension](https://github.com/vitest-dev/vitest/issues/5999)
- [Using TypeScript Node.js with native ESM](https://gist.github.com/slavafomin/cd7a54035eff5dc1c7c2eff096b23b6b)

## Decision Date

2026-01-28
