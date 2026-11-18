#!/usr/bin/env bash
# Impostazioni di sistema reversibili per il collaudo.
# Ogni funzione salvo/ripristina il valore precedente.
# Uso:
#   source scripts/qa/settings.sh
#   qa_save_all            # salva TUTTE le impostazioni in qa_settings.env
#   ... test ...
#   qa_restore_all         # ripristina tutto (chiamare SEMPRE in finally/trap)

ADB="${ADB:-/c/Users/matti/AppData/Local/Android/Sdk/platform-tools/adb.exe}"
SETTINGS_ENV="${SETTINGS_ENV:-$PWD/scripts/qa/qa_settings.env}"

qa_get() { "$ADB" shell settings get "$1" "$2" 2>/dev/null | tr -d '\r'; }
qa_put() { "$ADB" shell settings put "$1" "$2" "$3" >/dev/null; }

qa_save_all() {
  cat > "$SETTINGS_ENV" <<EOF
ACCELEROMETER_ROTATION=$(qa_get system accelerometer_rotation)
USER_ROTATION=$(qa_get system user_rotation)
FONT_SCALE=$(qa_get system font_scale)
UIMODE_NIGHT=$(qa_get secure ui_night_mode)
WINDOW_SIZE=$("$ADB" shell wm size | tr -d '\r' | sed 's/.*: //')
WINDOW_DENSITY=$("$ADB" shell wm density | tr -d '\r' | sed 's/.*: //')
WINDOW_ANIMATION_SCALE=$(qa_get global window_animation_scale)
TRANSITION_ANIMATION_SCALE=$(qa_get global transition_animation_scale)
ANIMATOR_DURATION_SCALE=$(qa_get global animator_duration_scale)
EOF
  chmod 600 "$SETTINGS_ENV"
  echo "Impostazioni salvate in $SETTINGS_ENV"
}

qa_restore_all() {
  [ -f "$SETTINGS_ENV" ] || { echo "Nessun file impostazioni: salto"; return 0; }
  # shellcheck disable=SC1090
  . "$SETTINGS_ENV"
  qa_put system accelerometer_rotation "${ACCELEROMETER_ROTATION:-1}"
  qa_put system user_rotation "${USER_ROTATION:-0}"
  qa_put system font_scale "${FONT_SCALE:-1.0}"
  # ui_night_mode: 1=auto, 2=no, 3=sì
  qa_put secure ui_night_mode "${UIMODE_NIGHT:-1}"
  # wm size/density: se il valore salvato e' "override", lo rimuoviamo
  case "$WINDOW_SIZE" in
    *x*) "$ADB" shell wm size "$WINDOW_SIZE" >/dev/null ;;
    *) "$ADB" shell wm size reset >/dev/null ;;
  esac
  case "$WINDOW_DENSITY" in
    *dpi*) "$ADB" shell wm density "$WINDOW_DENSITY" >/dev/null ;;
    *) "$ADB" shell wm density reset >/dev/null ;;
  esac
  qa_put global window_animation_scale "${WINDOW_ANIMATION_SCALE:-1}"
  qa_put global transition_animation_scale "${TRANSITION_ANIMATION_SCALE:-1}"
  qa_put global animator_duration_scale "${ANIMATOR_DURATION_SCALE:-1}"
  rm -f "$SETTINGS_ENV"
  echo "Impostazioni ripristinate"
}

qa_set_rotation_fixed() {
  qa_put system accelerometer_rotation 0
  qa_put system user_rotation "$1"   # 0=portrait 1=landscape
}
qa_rotation_auto() {
  qa_put system accelerometer_rotation 1
}
qa_set_font_scale() { qa_put system font_scale "$1"; }
qa_set_dark() { qa_put secure ui_night_mode 3; }
qa_set_light() { qa_put secure ui_night_mode 2; }
qa_no_anim() {
  qa_put global window_animation_scale 0
  qa_put global transition_animation_scale 0
  qa_put global animator_duration_scale 0
}
