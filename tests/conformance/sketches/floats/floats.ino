void setup() {
  Serial.begin(9600);
  float a = 2.5; Serial.println(a * 1.5);
  Serial.println(1.0 / 3.0);
  Serial.println(-0.126);
  Serial.println(1234.567);
  Serial.println(0.005);
  Serial.println(99.999);
  float f = 7 / 2; Serial.println(f);
  float g = 7 / 2.0; Serial.println(g);
  int i = 3.99; Serial.println(i);
  int j = -3.99; Serial.println(j);
  float big = 100000.0; Serial.println(big * big);
  Serial.println(0.1 + 0.2);
}
void loop() {}
