#!/usr/bin/env bash
# Helper comuni per il collaudo QA sul Pixel.
# Uso: source scripts/qa/lib.sh
ADB="${ADB:-/c/Users/matti/AppData/Local/Android/Sdk/platform-tools/adb.exe}"
PKG_QA="com.mattia.nuotoparalimpico.qa"
PKG_PROD="com.mattia.nuotoparalimpico"
QA_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHOT_DIR="$QA_DIR/shots"
mkdir -p "$SHOT_DIR"

qa_shot() {
  # qa_shot <nome>  -> screenshot compresso in docs/qa/pixel/<nome>.jpg
  local name="$1"
  local out="docs/qa/pixel/${name}.jpg"
  mkdir -p docs/qa/pixel
  "$ADB" exec-out screencap -p > "$SHOT_DIR/${name}.png"
  # comprimi a ~150KB con ImageMagick se disponibile, altrimenti convert da ffmpeg
  if command -v magick >/dev/null 2>&1; then
    magick "$SHOT_DIR/${name}.png" -resize 720x -quality 70 "$out"
  elif command -v ffmpeg >/dev/null 2>&1; then
    ffmpeg -y -loglevel error -i "$SHOT_DIR/${name}.png" -q:v 4 "$out"
  else
    cp "$SHOT_DIR/${name}.png" "$out"
  fi
  rm -f "$SHOT_DIR/${name}.png"
}

qa_logcat() {
  # qa_logcat [pid] : logcat filtrato sui tag di interesse
  local pid="${1:-$("$ADB" shell pidof "$PKG_QA" | tr -d '\r')}"
  "$ADB" logcat -d --pid="$pid" 2>/dev/null \
    | grep -iE "FINPcoach|chromium|JavaBridge|AndroidRuntime|FATAL|CONSOLE|WebView|VasciaSession|nativeBridge" \
    | tail -200
}

qa_forward_cdp() {
  # Forward del socket devtools della WebView (solo build debuggable)
  local pid="${1:-$("$ADB" shell pidof "$PKG_QA" | tr -d '\r' | awk '{print $1}')}"
  "$ADB" forward tcp:9222 "localabstract:webview_devtools_remote_${pid}"
}

qa_tap() { "$ADB" shell input tap "$1" "$2"; }
qa_swipe() { "$ADB" shell input swipe "$1" "$2" "$3" "$4" "$5"; }
qa_key() { "$ADB" shell input keyevent "$1"; }
qa_text() { "$ADB" shell input text "$1"; }
qa_uiautomator() { "$ADB" shell uiautomator dump /sdcard/ui.xml >/dev/null && "$ADB" pull /sdcard/ui.xml "$QA_DIR/ui.xml" >/dev/null && cat "$QA_DIR/ui.xml"; }
