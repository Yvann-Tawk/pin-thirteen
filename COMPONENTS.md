# Components

Generated from the registry. `registry.test.ts` fails if this file drifts.

## Supported

| Part               | Educational engine | Note                                                                                |
| ------------------ | ------------------ | ----------------------------------------------------------------------------------- |
| UNO R3             | partial            | Runs the supported sketch subset. Timing is approximate.                            |
| Breadboard         | full               | Connectivity only. Contact faults are not modelled.                                 |
| LED                | approximate        | Fixed forward voltage. Brightness follows estimated current and PWM duty.           |
| Resistor           | approximate        | Series paths only. Power rating is not modelled.                                    |
| Push Button        | full               | Ideal contact. Bounce is not modelled.                                              |
| Potentiometer      | approximate        | Unloaded divider. Linear taper.                                                     |
| Passive Buzzer     | approximate        | Plays the requested frequency. Volume and tone colour are not modelled.             |
| Water Level Sensor | approximate        | A slider sets the level. Corrosion and drift are not modelled.                      |
| Flame Sensor       | approximate        | A slider sets intensity. The digital output is not modelled.                        |
| Sound Sensor       | approximate        | A slider sets the level. No audio is captured.                                      |
| Joystick           | approximate        | Two sliders set the axes. The button is not modelled.                               |
| Tilt Sensor        | approximate        | Hold it to tilt. Bounce is not modelled.                                            |
| 7-Segment Display  | approximate        | Common cathode only. The decimal point is not modelled.                             |
| Ultrasonic Sensor  | approximate        | pulseIn returns an exact time from the slider. Trigger pulse timing is not checked. |
| Servo Motor        | approximate        | Models the Servo library, not its pulses. The move is instant.                      |

## Rest of the kit

| Item                                  | Tier | Status                                       |
| ------------------------------------- | ---- | -------------------------------------------- |
| Male-to-male and male-to-female wires | T0   | Full: drawn as wires, not separate parts     |
| KY-015 DHT11                          | T4   | Planned: needs protocol model                |
| MPU-6050 GY-521                       | T4   | Planned: needs AVR engine                    |
| RFID module, card and fob             | T4   | Planned: needs AVR engine                    |
| IR remote                             | T4   | Planned: no IR receiver listed in the kit    |
| 4-digit 7-segment display             | T3   | Planned                                      |
| 8×8 LED matrix                        | T3   | Planned: driver to confirm                   |
| LCD 16×2                              | T3   | Planned: interface to confirm                |
| 4×4 RGB LED module                    | T4   | Planned: part type to confirm                |
| DC motors and fan blade               | T3   | Planned                                      |
| Stepper motor                         | T3   | Planned                                      |
| L298N driver                          | T3   | Planned                                      |
| ULN2003 driver                        | T3   | Planned                                      |
| Servo mount bracket                   | R    | Reference only                               |
| 4×4 matrix keypad                     | T3   | Planned                                      |
| 4-channel IR tracking module          | T3   | Planned                                      |
| Relay KY-019                          | T3   | Planned: logic side only, never a mains load |
| DS1302 RTC                            | T4   | Planned: needs AVR engine                    |
| BC547 transistor                      | T3   | Planned: needs DC solver                     |
| IR LED                                | T3   | Planned                                      |
| 74HC595N shift register               | T3   | Planned                                      |
| V5.0 Sensor Shield                    | T3   | Planned                                      |
| DT830D multimeter                     | R    | Reference article                            |
| Screwdriver                           | R    | Reference only                               |
| Soldering iron, wire and stand        | R    | Reference article. Never simulated           |
| 2×18650 battery holder                | R    | Planned: ideal source later                  |
| Dual EU battery charger               | R    | Reference article. Never simulated           |
| 18650 batteries                       | R    | Reference article. Charging never simulated  |
