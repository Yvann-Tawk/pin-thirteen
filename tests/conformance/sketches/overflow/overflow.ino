void setup() {
  Serial.begin(9600);
  int a = 32767; a++; Serial.println(a);
  int b = -32768; b--; Serial.println(b);
  unsigned int c = 0; c--; Serial.println(c);
  byte d = 255; d++; Serial.println(d);
  long e = 2147483647L; e++; Serial.println(e);
  unsigned long f = 0; f--; Serial.println(f);
  int g = 300; Serial.println(g * g);
  long h = 300; Serial.println(h * h);
  Serial.println(1000 * 1000L);
  char k = 127; k++; Serial.println((int)k);
  Serial.println(40000 + 30000);
  int m = 20000; Serial.println(m + m);
  Serial.println(m + 20000L);
}
void loop() {}
