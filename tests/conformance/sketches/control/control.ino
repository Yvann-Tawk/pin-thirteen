int total = 0;
int squares[5];
const int LIMIT = 3;
long fact(long n) {
  if (n <= 1) return 1;
  return n * fact(n - 1);
}
int bump() {
  total++;
  return total;
}
void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 5; i++) squares[i] = i * i;
  for (int i = 4; i >= 0; i--) { Serial.print(squares[i]); Serial.print(' '); }
  Serial.println();
  int w = 0;
  while (true) { w++; if (w == 2) continue; if (w > LIMIT) break; Serial.print(w); }
  Serial.println();
  int d = 10;
  do { d += 5; } while (d < 12);
  Serial.println(d);
  for (int c = 0; c < 4; c++) {
    switch (c) {
      case 0: Serial.print("zero ");
      case 1: Serial.print("one "); break;
      case 2: { Serial.print("two "); break; }
      default: Serial.print("many ");
    }
  }
  Serial.println();
  Serial.println(fact(10));
  bool yes = bump() > 5 && bump() > 0;
  Serial.println(total);
  yes = bump() > 0 || bump() > 0;
  Serial.println(total);
  Serial.println(yes);
  int t[3] = {1, 2};
  int idx = 0;
  t[idx++] += 10;
  Serial.println(t[0]); Serial.println(t[2]); Serial.println(idx);
  int x = 5; int y = x++ + ++x; Serial.println(y);
  char letter = 'A'; letter++; Serial.println(letter); Serial.println(letter + 1);
  byte b = 200; Serial.println(b + b);
  Serial.println(true);
  x <<= 2; Serial.println(x); x %= 5; Serial.println(x);
}
void loop() {}
