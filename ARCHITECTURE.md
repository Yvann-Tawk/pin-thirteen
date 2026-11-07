# Architecture

Dependencies point downward only. `pnpm boundaries` enforces this in CI.

```text
apps/web                 React UI, store, IndexedDB, art
packages/design-system   Paper and ink CSS
packages/registry        Component definitions, no drawing or UI code
packages/circuit-core    Pure document, commands, history, project files
```

- **Documents are immutable.** Every edit is a `Command`, which makes undo and redo a list of versions.
- **Nets are derived,** never saved. `buildNetlist` uses union-find over wires, seats and each part's declared connectivity.
- **Hole hit-testing is arithmetic.** `findPinAt` searches pin positions, so holes are not DOM nodes.
- **Project files are untrusted.** `parseProject` validates everything, and each schema change needs a migration.
- **Behaviour lives in the registry.** Application code should not branch on a component type, other than choosing art.
