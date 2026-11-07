#!/bin/bash
# macOS adaptation of the avr-gcc WASM recipe (github.com/startabit/avr-gcc-wasm, scripts/build.sh).
set -euo pipefail
WORK="${WORK:-$HOME/avr-wasm}"; HERE="$(cd "$(dirname "$0")" && pwd)"; OUT="$HERE/out"; JOBS=4
BUILD=aarch64-apple-darwin
mkdir -p "$WORK/src" "$OUT"
[ -d "$WORK/emsdk" ] || git clone --depth 1 https://github.com/emscripten-core/emsdk.git "$WORK/emsdk"
(cd "$WORK/emsdk" && ./emsdk install 4.0.10 && ./emsdk activate 4.0.10) > "$WORK/emsdk.log" 2>&1
source "$WORK/emsdk/emsdk_env.sh" >/dev/null 2>&1
emcc --version | head -1
EM_LINK="-O2 -sALLOW_MEMORY_GROWTH=1 -sMODULARIZE=1 -sEXPORT_ES6=1 -sEXPORT_NAME=createTool -sFORCE_FILESYSTEM=1 -sINVOKE_RUN=0 -sEXIT_RUNTIME=1 -sENVIRONMENT=web,worker,node -sEXPORTED_RUNTIME_METHODS=FS,callMain -sSTACK_SIZE=8MB"
export ac_cv_func_psignal=yes ac_cv_func_strsignal=yes
cd "$WORK/src"
get(){ [ -f "$(basename $2)" ] || curl -fsSL -o "$(basename $2)" "$2"; [ "$(shasum -a 256 "$(basename $2)"|cut -d' ' -f1)" = "$1" ] || { echo "BAD SUM $2"; exit 1; }; }
get 832ca6ae04636adbb430e865a1451adf6979ab44ca1c8374f61fba65645ce15c https://ftp.gnu.org/gnu/gcc/gcc-7.3.0/gcc-7.3.0.tar.xz
get f6e4d41fd5fc778b06b7891457b3620da5ecea1006c6a4a41ae998109f85a800 https://ftp.gnu.org/gnu/binutils/binutils-2.42.tar.xz
get fd4829912cddd12f84181c3451cc752be224643e87fac497b69edddadc49b4f2 https://ftp.gnu.org/gnu/gmp/gmp-6.2.1.tar.xz
get 0c98a3f1732ff6ca4ea690552079da9c597872d30e96ec28414ee23c95558a7f https://ftp.gnu.org/gnu/mpfr/mpfr-4.1.0.tar.xz
get 17503d2c395dfcf106b622dc142683c1199431d095367c6aacba6eec30340459 https://ftp.gnu.org/gnu/mpc/mpc-1.2.1.tar.gz
get 96782c75dd11e994e1ab9250c41fc5cd81ba65bbcf44383cd9d660d01cc85f97 https://raw.githubusercontent.com/arduino/toolchain-avr/7.3.0-atmel3.6.1-arduino7/avr-gcc-patches/atmel-patches-gcc.7.3.0-arduino2.patch
[ -d gcc-7.3.0 ] || { tar xf gcc-7.3.0.tar.xz; (cd gcc-7.3.0 && patch -p1 < ../atmel-patches-gcc.7.3.0-arduino2.patch); }
for f in binutils-2.42.tar.xz gmp-6.2.1.tar.xz mpfr-4.1.0.tar.xz mpc-1.2.1.tar.gz; do d=${f%.tar.*}; [ -d $d ] || tar xf $f; done
echo STAGE binutils; rm -rf "$WORK/b-bin"; mkdir "$WORK/b-bin"; cd "$WORK/b-bin"
emconfigure ../src/binutils-2.42/configure --build=$BUILD --host=i686-pc-linux-gnu --target=avr --prefix=/sysroot --disable-nls --disable-werror --disable-gdb --disable-gdbserver --disable-sim --disable-gprof --disable-gprofng --disable-plugins --disable-shared --enable-static --disable-libctf --without-zstd --without-debuginfod CC_FOR_BUILD=clang CFLAGS=-O2 LDFLAGS="$EM_LINK" > configure.log 2>&1
emmake make MAKEINFO=true -j$JOBS all-gas all-ld all-binutils > make.log 2>&1
echo STAGE hostlibs; P="$WORK/hostlibs"; rm -rf "$P" "$WORK"/b-gmp "$WORK"/b-mpfr "$WORK"/b-mpc
mkdir "$WORK/b-gmp"; cd "$WORK/b-gmp"; emconfigure ../src/gmp-6.2.1/configure --host=none --build=$BUILD --disable-assembly --disable-shared --enable-static --prefix="$P" CC_FOR_BUILD=clang > c.log 2>&1; emmake make MAKEINFO=true -j$JOBS install > m.log 2>&1
mkdir "$WORK/b-mpfr"; cd "$WORK/b-mpfr"; emconfigure ../src/mpfr-4.1.0/configure --host=none --build=$BUILD --disable-shared --enable-static --with-gmp="$P" --prefix="$P" > c.log 2>&1; emmake make MAKEINFO=true -j$JOBS install > m.log 2>&1
mkdir "$WORK/b-mpc"; cd "$WORK/b-mpc"; emconfigure ../src/mpc-1.2.1/configure --host=none --build=$BUILD --disable-shared --enable-static --with-gmp="$P" --with-mpfr="$P" --prefix="$P" > c.log 2>&1; emmake make MAKEINFO=true -j$JOBS install > m.log 2>&1
echo STAGE gcc; mkdir -p "$WORK/b-gcc"; cd "$WORK/b-gcc"
[ -f Makefile ] || emconfigure ../src/gcc-7.3.0/configure --build=$BUILD --host=i686-pc-linux-gnu --target=avr --prefix=/sysroot --enable-fixed-point --enable-languages=c,c++ --disable-nls --disable-libssp --disable-libada --disable-shared --with-avrlibc=yes --with-dwarf2 --disable-doc --disable-plugin --disable-lto --without-isl --disable-bootstrap --with-gmp="$P" --with-mpfr="$P" --with-mpc="$P" CC_FOR_BUILD=clang CXX_FOR_BUILD=clang++ CFLAGS=-O2 CXXFLAGS="-O2 -std=gnu++98 -Wno-register -Wno-deprecated" LDFLAGS="$EM_LINK" > configure.log 2>&1
emmake make MAKEINFO=true -j$JOBS configure-gcc all-libiberty all-libcpp all-libdecnumber all-libbacktrace all-build-libiberty all-build-libcpp all-build-fixincludes > make-libs.log 2>&1
emmake make MAKEINFO=true -j$JOBS -C gcc cc1plus CC_FOR_BUILD=clang CXX_FOR_BUILD=clang++ CFLAGS_FOR_BUILD=-O2 CXXFLAGS_FOR_BUILD="-O2 -std=gnu++11" LDFLAGS_FOR_BUILD= ZLIB=-sUSE_ZLIB=1 > make-cc1plus.log 2>&1
echo STAGE install; B="$WORK/b-bin"
cp "$WORK/b-gcc/gcc/cc1plus" "$OUT/cc1plus.mjs"; cp "$WORK/b-gcc/gcc/cc1plus.wasm" "$OUT/"
cp "$B/gas/as-new" "$OUT/as.mjs"; cp "$B/gas/as-new.wasm" "$OUT/as.wasm"; cp "$B/ld/ld-new" "$OUT/ld.mjs"; cp "$B/ld/ld-new.wasm" "$OUT/ld.wasm"; cp "$B/binutils/objcopy" "$OUT/objcopy.mjs"; cp "$B/binutils/objcopy.wasm" "$OUT/"
mkdir -p "$OUT/ldscripts"; cp "$B"/ld/ldscripts/avr5.* "$OUT/ldscripts/"; ls -la "$OUT"; echo BUILD_OK
