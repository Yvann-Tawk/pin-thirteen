# Architecture

Dependencies point downward only. `pnpm boundaries` enforces this in CI.

```text
apps/web                 React UI, store, IndexedDB, art
packages/design-system   Paper and ink CSS
packages/learning        Lesson types, checks, evaluation
packages/knowledge       Articles, search, rule-based help
content/                 Lessons and articles (CC BY 4.0)
packages/validation      Circuit checks: error, hazard, limitation
packages/sim-edu         Sketch compiler, bytecode VM, educational engine
packages/sim-avr         avr8js engine, optional compiler driver
packages/sim-core        Engine contracts and the circuit solver
packages/registry        Component definitions, no drawing or UI code
packages/circuit-core    Pure document, commands, history, project files
```

- **Documents are immutable.** Every edit is a `Command`, which makes undo and redo a list of versions.
- **Nets are derived,** never saved. `buildNetlist` uses union-find over wires, seats and each part's declared connectivity.
- **Hole hit-testing is arithmetic.** `findPinAt` searches pin positions, so holes are not DOM nodes.
- **Project files are untrusted.** `parseProject` validates everything, and each schema change needs a migration.
- **Behaviour lives in the registry.** Application code should not branch on a component type, other than choosing art.
- **Sketches never run as JavaScript.** `sim-edu` parses to bytecode, and the VM's only exits are the `ArduinoHost` methods. It runs in a Web Worker, which Stop terminates.
- **Time is virtual.** `advance()` makes runs deterministic, and a busy loop only spends virtual time.
- **The solver is an estimate.** It follows the lowest-resistance path from a node to a source. It does not solve general networks, so parallel paths and series LEDs are approximate.
- **Behaviour comes from `electrical` data** in each component definition, not from type checks.
- **Conformance:** `tests/conformance` holds output from real avr-gcc on avr8js, and `sim-edu` must match it exactly.
- **Lessons are data.** Verification is a list of typed checks evaluated against the circuit, the sketch, and what the simulator observed.
- **Learning events** (`onLearningEvent`) leave room for later features without changing lessons.
- **Help is rule-based.** `explainPin` and the article links are where an optional AI provider could attach later.
- **Two engines, one circuit model.** `AvrEngine` runs compiled code and uses the same `CircuitModel`. External parts on it are currently limited to LEDs, switches and analog inputs.
- **The GPL compiler stays separate.** It loads at runtime from `public/toolchain` only if someone installed it.
