# What sketches can use

The educational simulator runs a defined part of the Arduino language. Anything else gets a message with its line number, never a silent guess.

## Supported

- **Types:** `void`, `bool`, `boolean`, `char`, `byte`, `int`, `unsigned int`, `word`, `long`, `unsigned long`, `float`, `double` (32-bit, as on the UNO), and `uint8_t`-style names.
- **Variables:** globals, locals, `const`, one-dimensional arrays.
- **Control:** functions, recursion, `if`, `else`, `for`, `while`, `do`, `switch`, `break`, `continue`, `return`, `?:`.
- **Operators:** arithmetic, comparison, logic, bitwise, compound assignment, `++`, `--`, casts.
- **Arduino:** `tone`, `noTone`, `pulseIn`, `pinMode`, `digitalWrite`, `digitalRead`, `analogRead`, `analogWrite`, `delay`, `delayMicroseconds`, `millis`, `micros`, `map`, `constrain`, `abs`, `min`, `max`.
- **Serial:** `begin`, `print`, `println`, `available`, `read`. One value at a time, with no format argument.
- **Constants:** `HIGH`, `LOW`, `INPUT`, `OUTPUT`, `INPUT_PULLUP`, `LED_BUILTIN`, `A0` to `A5`, `true`, `false`.

Integers wrap as they do on the UNO: `int` is 16-bit.

## Educational approximations

- **Timing:** each VM instruction costs 1 µs. `delay` and `millis` are accurate in simulated time, but code speed is not.
- **PWM:** duty cycle only, not a waveform.
- **Floating pins:** readings are arbitrary, and a note says so.
- **Serial speed:** output is instant. The baud rate is ignored.
- **Local variables** start at zero. On a real board they hold garbage, so do not rely on this.
- **`pulseIn`, `tone` and `Servo`** model their result, not their signals. Only `attach` and `write` exist on `Servo`.
- **Safety stops:** an out-of-range array index, division by zero, or very deep recursion stops the sketch with a message. A real board would misbehave silently.

## Not supported yet

Pointers, references, classes, structs, templates, `String`, `#define`, interrupts, direct port registers, multi-dimensional arrays, `random`, and any library other than the `Servo` shim.
