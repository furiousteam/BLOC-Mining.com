#! /bin/bash
set -x

emcc -O3 -s SINGLE_FILE=1  -s NO_FILESYSTEM=1  -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' --llvm-lto 1 -s TOTAL_MEMORY=67108864  -s WASM=1 -s "BINARYEN_TRAP_MODE='allow'"  -s EXPORTED_FUNCTIONS="['_hash_cn']"  --shell-file html_template/shell_minimal.html -Wall -msse2 -c -o blake256.o blake256.c

emcc -O3 -s SINGLE_FILE=1  -s NO_FILESYSTEM=1  -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' --llvm-lto 1 -s TOTAL_MEMORY=67108864  -s WASM=1 -s "BINARYEN_TRAP_MODE='allow'"  -s EXPORTED_FUNCTIONS="['_hash_cn']"  --shell-file html_template/shell_minimal.html -Wall -msse2 -c -o groestl.o groestl.c

emcc -O3 -s SINGLE_FILE=1  -s NO_FILESYSTEM=1  -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' --llvm-lto 1 -s TOTAL_MEMORY=67108864  -s WASM=1 -s "BINARYEN_TRAP_MODE='allow'"  -s EXPORTED_FUNCTIONS="['_hash_cn']"  --shell-file html_template/shell_minimal.html -Wall -msse2 -c -o jh.o jh.c

emcc -O3 -s SINGLE_FILE=1  -s NO_FILESYSTEM=1  -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' --llvm-lto 1 -s TOTAL_MEMORY=67108864  -s WASM=1 -s "BINARYEN_TRAP_MODE='allow'"  -s EXPORTED_FUNCTIONS="['_hash_cn']"  --shell-file html_template/shell_minimal.html -Wall -msse2 -c -o keccak.o keccak.c

emcc -O3 -s SINGLE_FILE=1  -s NO_FILESYSTEM=1  -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' --llvm-lto 1 -s TOTAL_MEMORY=67108864  -s WASM=1 -s "BINARYEN_TRAP_MODE='allow'"  -s EXPORTED_FUNCTIONS="['_hash_cn']"  --shell-file html_template/shell_minimal.html -Wall -msse2 -c -o skein.o skein.c

emcc -O3 -s SINGLE_FILE=1  -std=c++11 -s NO_FILESYSTEM=1  -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' --llvm-lto 1 -s TOTAL_MEMORY=67108864  -s WASM=1 -s "BINARYEN_TRAP_MODE='allow'"  -s EXPORTED_FUNCTIONS="['_hash_cn']"  --shell-file html_template/shell_minimal.html -Wall -msse2 -c -o cn_slow_hash_soft.o cn_slow_hash_soft.cpp

emcc -O3 -s SINGLE_FILE=1  -std=c++11 -s NO_FILESYSTEM=1  -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]' --llvm-lto 1 -s TOTAL_MEMORY=67108864  -s WASM=1 -s "BINARYEN_TRAP_MODE='allow'"  -s EXPORTED_FUNCTIONS="['_hash_cn']"  --shell-file html_template/shell_minimal.html -Wall -msse2 -c -o main.o main.cpp

emcc -O3 -s SINGLE_FILE=1  -s NO_FILESYSTEM=1  -s 'EXTRA_EXPORTED_RUNTIME_METHODS=["ccall", "cwrap"]'  --llvm-lto 1 -s TOTAL_MEMORY=67108864  -s WASM=1 -s "BINARYEN_TRAP_MODE='allow'"  -s EXPORTED_FUNCTIONS="['_hash_cn']"  --shell-file shell_minimal.html  main.o skein.o keccak.o jh.o groestl.o blake256.o cn_slow_hash_soft.o -Wall -lm -o cn.html
