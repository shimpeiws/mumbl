# Architecture Decision Records (ADRs)

This directory contains Architecture Decision Records (ADRs) for the mumbl project.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## Format

We use the [MADR (Markdown Architectural Decision Records)](https://adr.github.io/madr/) format for our ADRs.

## ADR List

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [0001](./0001-use-js-extension-in-typescript-imports.md) | Use .js Extension in TypeScript Import Statements | Accepted | 2026-01-28 |
| [0002](./0002-defer-hot-reload-for-tui-development.md) | Defer Hot Reload for TUI Development | Accepted | 2026-01-28 |
| [0003](./0003-prefer-function-interfaces-over-classes.md) | Prefer Function Interfaces Over Classes | Accepted | 2026-02-08 |

## Creating a New ADR

1. Create a new markdown file in this directory with the naming convention: `NNNN-title-with-dashes.md`
2. Use the MADR template structure:
   - Status (Proposed/Accepted/Rejected/Deprecated/Superseded)
   - Context and Problem Statement
   - Decision Drivers
   - Considered Options
   - Decision Outcome
   - Consequences
   - References
   - Decision Date

3. Add the ADR to the table above

## Status Definitions

- **Proposed**: The ADR is under discussion
- **Accepted**: The decision has been approved and should be followed
- **Rejected**: The decision was considered but not adopted
- **Deprecated**: The decision is no longer relevant
- **Superseded**: The decision has been replaced by another ADR

## References

- [MADR - Markdown Architectural Decision Records](https://adr.github.io/madr/)
- [Architecture Decision Records](https://adr.github.io/)
