const fs = require('fs');
const p = 'app/src/main/java/com/mattia/nuotoparalimpico/MainActivity.kt';
let s = fs.readFileSync(p, 'utf8');
const rep = (o, n, tag) => {
  if (!s.includes(o)) { console.log('NF ' + tag); process.exit(1); }
  s = s.replace(o, n);
};

rep('    @Volatile\n    private var currentPageHost: String? = null',
`    @Volatile
    private var currentPageHost: String? = null

    // Modalita immersive (barre di sistema nascoste) attiva durante il live.
    // Solo il thread UI la modifica.
    private var immersive = false`, '1');

rep('    private fun updateWebViewInsets() {',
`    /** Mostra/nasconde le barre di sistema (swipe per rimostrarle). Solo thread UI. */
    private fun applyImmersive(enabled: Boolean) {
        immersive = enabled
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        if (enabled) {
            controller.systemBarsBehavior =
                androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(androidx.core.view.WindowInsetsCompat.Type.systemBars())
        } else {
            controller.show(androidx.core.view.WindowInsetsCompat.Type.systemBars())
        }
    }

    private fun updateWebViewInsets() {`, '2');

rep(`    override fun onDestroy() {
        // Alla chiusura dell'app si torna sempre all'orientamento di sistema.
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        webView.destroy()
        super.onDestroy()
    }`,
`    override fun onStop() {
        // Mai lasciare le barre di sistema nascoste quando l'app va in background.
        if (immersive) applyImmersive(false)
        super.onStop()
    }

    override fun onDestroy() {
        // Alla chiusura dell'app si torna sempre all'orientamento di sistema
        // e alle barre di sistema visibili.
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        if (immersive) applyImmersive(false)
        webView.destroy()
        super.onDestroy()
    }`, '3');

rep(`        /** Salva un file di testo nella cartella Download (usato dall'export backup JSON). */`,
`        /** Modalita immersiva: nasconde le barre di sistema durante il live. */
        @JavascriptInterface
        fun setImmersive(on: Boolean) {
            try {
                if (!isTrustedPage()) return
                runOnUiThread { applyImmersive(on) }
            } catch (e: Exception) {
                Log.e(TAG, "setImmersive failed", e)
            }
        }

        /** Salva un file di testo nella cartella Download (usato dall'export backup JSON). */`, '4');

fs.writeFileSync(p, s);
console.log('PATCH OK');
