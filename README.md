# Pin Thirteen

A browser-based, open-source playground for learning electronics, drawn like a comic book made of paper. Compatible with Arduino sketches.

**Status: early development.** Build a circuit, write a sketch, run it in the educational simulator, and follow lessons in the Academy. See [what sketches can use](docs/sketch-subset.md).

## Run it

Requires Node 24+ and pnpm 10.

```bash
pnpm install
pnpm dev
```

## Check it

```bash
pnpm lint && pnpm typecheck && pnpm boundaries && pnpm test
pnpm build && pnpm e2e
```

## Licensing

See [LICENSING.md](LICENSING.md). Code is Apache-2.0; illustrations are reserved.

Arduino® is a trademark of Arduino S.r.l. This project is independent and is not affiliated with or endorsed by Arduino.
