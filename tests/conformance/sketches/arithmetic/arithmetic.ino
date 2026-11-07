void setup() {
  Serial.begin(9600);
  Serial.println(-7 / 2);
  Serial.println(-7 % 3);
  Serial.println(7 % -3);
  Serial.println(1 << 14);
  Serial.println(1 << 15);
  Serial.println(1L << 20);
  Serial.println(-16 >> 2);
  unsigned int u = 40000; Serial.println(u >> 1);
  Serial.println(~5);
  Serial.println(0xF0 & 0x3C);
  Serial.println(0xF0 | 0x0F);
  Serial.println(0xF0 ^ 0xFF);
  unsigned long ul = 5; Serial.println(ul - 6);
  int n = -1; unsigned int v = 1; Serial.println(n < v ? 1 : 0);
  long l = -1; unsigned long w = 1; Serial.println(l < w ? 1 : 0);
  Serial.println(n < 1L ? 1 : 0);
  Serial.println(map(512, 0, 1023, 0, 255));
  Serial.println(map(100, 0, 50, 10, 0));
  Serial.println(constrain(300, 0, 255));
  Serial.println(abs(-9));
  Serial.println(min(3, 4));
  Serial.println(max(3, 4));
}
void loop() {}
