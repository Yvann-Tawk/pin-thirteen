import os,json,base64,gzip,re
T=os.path.expanduser('~/Library/Arduino15/packages/arduino/tools/avr-gcc/7.3.0-atmel3.6.1-arduino7')
H=os.path.expanduser('~/Library/Arduino15/packages/arduino/hardware/avr/1.8.8')
F={}
def add(src,dst):F[dst]=base64.b64encode(open(src,'rb').read()).decode()
def tree(src,dst,skip=None):
    for r,_,fs in os.walk(src):
        for f in fs:
            p=os.path.join(r,f);rel=os.path.relpath(p,src)
            if skip and skip(rel):continue
            add(p,f'{dst}/{rel}')
io=re.compile(r'avr/io(?!\.h$|m328p\.h$).*\.h$')
tree(f'{T}/avr/include','/sysroot/avr/include',lambda r:bool(io.fullmatch(r)) or not r.endswith('.h'))
tree(f'{T}/lib/gcc/avr/7.3.0/include','/sysroot/lib/gcc/avr/7.3.0/include')
tree(f'{T}/lib/gcc/avr/7.3.0/include-fixed','/sysroot/lib/gcc/avr/7.3.0/include-fixed')
tree(f'{H}/cores/arduino','/core',lambda r:not r.endswith('.h'))
tree(f'{H}/variants/standard','/variant')
for n in 'crtatmega328p.o libm.a libc.a libatmega328p.a'.split():add(f'{T}/avr/lib/avr5/{n}',f'/lib/{n}')
add(f'{T}/lib/gcc/avr/7.3.0/avr5/libgcc.a','/lib/libgcc.a');add('native/core.a','/lib/core.a')
add('out/ldscripts/avr5.x','/sysroot/avr/lib/ldscripts/avr5.x');add('out/ldscripts/avr5.xn','/sysroot/avr/lib/ldscripts/avr5.xn')
b=json.dumps(F).encode();open('out/bundle.json','wb').write(b)
print(len(F),'files',len(b),'json; gz',len(gzip.compress(b,6)))
