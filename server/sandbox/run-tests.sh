#!/bin/sh
# Usage: run-tests <cpp|python|javascript> <time-limit-seconds>
# Reads $WORK/main.<ext> and $WORK/tests/*.in; writes $OUT/<n>.out, <n>.err, <n>.code and compile.err.
LANG_ID="$1"
TL="${2:-2}"
WORK="${WORK:-/work}"
OUT="${OUT:-/out}"
BUILD="${BUILD:-/tmp}"

case "$LANG_ID" in
  cpp)
    if ! g++ -O2 -std=c++17 -o "$BUILD/main.bin" "$WORK/main.cpp" 2> "$OUT/compile.err"; then
      echo 1 > "$OUT/compile.code"
      exit 0
    fi
    set -- "$BUILD/main.bin" ;;
  python) set -- python3 "$WORK/main.py" ;;
  javascript) set -- node "$WORK/main.js" ;;
  *) echo "unsupported language" > "$OUT/compile.err"; echo 1 > "$OUT/compile.code"; exit 0 ;;
esac
echo 0 > "$OUT/compile.code"
ulimit -f 4096

for f in "$WORK"/tests/*.in; do
  [ -e "$f" ] || continue
  n=$(basename "$f" .in)
  timeout -s KILL "$TL" "$@" < "$f" > "$OUT/$n.out" 2> "$OUT/$n.err"
  echo $? > "$OUT/$n.code"
  head -c 65536 "$OUT/$n.out" > "$OUT/$n.tmp" && mv "$OUT/$n.tmp" "$OUT/$n.out"
done
