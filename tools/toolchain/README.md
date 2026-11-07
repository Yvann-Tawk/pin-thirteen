# Optional AVR toolchain

The AVR engine needs avr-gcc built for WebAssembly. These tools are GPL-3.0 with other notices, so they are **not** in this repository, and the app works without them.

`build.sh` is GPL-3.0, adapted from github.com/startabit/avr-gcc-wasm. It is a separate tool, not part of the Apache-2.0 application.

1. Run `build.sh`, which downloads verified GNU and Arduino sources.
2. Run `make-bundle.py` beside its output. It needs a local Arduino IDE install, and a natively built `core.a`.
3. Run `install.sh <output-folder>` to copy the files into `apps/web/public/toolchain`, which git ignores.

Anyone distributing these files must meet their licences, including offering corresponding source. Get this reviewed before hosting it publicly.
