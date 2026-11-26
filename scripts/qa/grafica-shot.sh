#!/usr/bin/env bash
# Screenshot compressi in docs/qa/grafica/<nome>.jpg (JPG <150KB)
# Uso: grafica-shot.sh <nome> [sottodir]   (sottodir: prima|dopo)
set -e
ADB="${ADB:-/c/Users/matti/AppData/Local/Android/Sdk/platform-tools/adb.exe}"
NAME="$1"; SUB="${2:-shots}"
OUT="docs/qa/grafica/${SUB}/${NAME}.jpg"
TMP="docs/qa/grafica/shots/${NAME}.png"
mkdir -p "$(dirname "$OUT")" "docs/qa/grafica/shots"
"$ADB" exec-out screencap -p > "$TMP"
python - "$TMP" "$OUT" <<'PY'
import sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
# riduci a larghezza max 720 mantenendo proporzioni
if im.width > 720:
    im = im.resize((720, int(im.height*720/im.width)), Image.LANCZOS)
im.save(dst, 'JPEG', quality=72, optimize=True)
import os
print(dst, os.path.getsize(dst), 'bytes')
PY
rm -f "$TMP"
