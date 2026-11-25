package com.mattia.nuotoparalimpico

import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.util.Log
import android.view.ViewGroup
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import java.io.ByteArrayInputStream

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView
    private var uploadMessage: ValueCallback<Array<Uri>>? = null
    private var currentTopInset = 0
    private var currentBottomInset = 0

    // Host della pagina corrente, aggiornato SOLO sul thread UI dai callback
    // di WebViewClient. I metodi @JavascriptInterface girano sul thread
    // JavaBridge (non UI): non possono toccare la WebView, quindi leggono
    // solo questo stato volatile.
    @Volatile
    private var currentPageHost: String? = null

    // Modalita immersive (barre di sistema nascoste) attiva durante il live.
    // Solo il thread UI la modifica.
    private var immersive = false

    // ActivityResultLauncher per file picker (API moderna)
    private val filePickerLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (uploadMessage == null) return@registerForActivityResult
        val results = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        uploadMessage?.onReceiveValue(results)
        uploadMessage = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Edge-to-edge: il contenuto va sotto le barre di sistema, i margini arrivano
        // alla web app come variabili CSS (--safe-top / --safe-bottom).
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // DevTools della WebView solo negli APK debuggable (mai in release).
        WebView.setWebContentsDebuggingEnabled(
            (applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0
        )

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            @Suppress("DEPRECATION")
            window.statusBarColor = Color.TRANSPARENT
            @Suppress("DEPRECATION")
            window.navigationBarColor = Color.TRANSPARENT
        }

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            // La pagina carica solo risorse bundle (asset host): nessun file:// o content://
            // deve essere raggiungibile dalla web app. contentAccess resta attivo perche'
            // il file chooser (<input type="file"> per backup e OCR immagini) restituisce
            // URI content:// che la pagina deve poter leggere.
            settings.allowFileAccess = false
            settings.allowContentAccess = true

            // Ponte minimale verso la web app: la pagina carica solo risorse dell'app
            // (le navigazioni esterne vengono aperte nel browser), quindi l'esposizione è limitata.
            addJavascriptInterface(AndroidBridge(), "AndroidBridge")
            addJavascriptInterface(NativeOrientationBridge(), "NativeOrientation")

            webViewClient = BundledAppWebViewClient()
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    uploadMessage?.onReceiveValue(null)
                    uploadMessage = filePathCallback
                    val intent = fileChooserParams?.createIntent()
                    if (intent == null) {
                        uploadMessage = null
                        return false
                    }
                    try {
                        filePickerLauncher.launch(intent)
                    } catch (e: Exception) {
                        uploadMessage = null
                        return false
                    }
                    return true
                }
            }
        }

        // Passa i margini di sistema alla web app come variabili CSS
        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, windowInsets ->
            currentTopInset = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars()).top
            currentBottomInset = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
            updateWebViewInsets()
            windowInsets
        }

        setContentView(webView)

        // Icone delle barre di sistema: partono dal tema di sistema.
        // Se in app scegli un tema diverso, la web app le aggiorna tramite AndroidBridge.
        val systemIsDark =
            (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        applySystemBarsAppearance(dark = systemIsDark)

        // Host iniziale per isTrustedPage(): la pagina caricata e' l'app bundle.
        currentPageHost = ASSET_HOST

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(APP_URL)
        }

        // Tasto indietro: prima lo gestisce la web app (chiude popup, torna a "Oggi"),
        // poi la cronologia della WebView, infine si esce.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                webView.evaluateJavascript(
                    "(function(){return !!(window.__finpHandleBack && window.__finpHandleBack());})()"
                ) { consumed ->
                    if (consumed == "true") return@evaluateJavascript
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        finish()
                    }
                }
            }
        })
    }

    /** Icone chiare su sfondo scuro e viceversa, per barra di stato e barra di navigazione. */
    private fun applySystemBarsAppearance(dark: Boolean) {
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.isAppearanceLightStatusBars = !dark
        controller.isAppearanceLightNavigationBars = !dark
    }

    /** Mostra/nasconde le barre di sistema (swipe per rimostrarle). Solo thread UI. */
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

    private fun updateWebViewInsets() {
        val density = resources.displayMetrics.density
        val topDp = if (density > 0f) currentTopInset / density else currentTopInset.toFloat()
        val bottomDp = if (density > 0f) currentBottomInset / density else currentBottomInset.toFloat()
        val script = """
            (function() {
              document.documentElement.style.setProperty('--safe-top', '${topDp}px');
              document.documentElement.style.setProperty('--safe-bottom', '${bottomDp}px');
            })();
        """
        webView.evaluateJavascript(script, null)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onStop() {
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
    }

    /**
     * Bridge usato dalla schermata Vasca per forzare l'orientamento mentre è
     * aperta ("portrait" | "landscape" | "system"). configChanges nel manifest
     * evita che la rotazione ricrei Activity e WebView.
     */
    private inner class NativeOrientationBridge {
        @JavascriptInterface
        fun setOrientation(mode: String) {
            try {
                if (!isTrustedPage()) return
                runOnUiThread {
                    requestedOrientation = when (mode) {
                        "portrait" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT
                        "landscape" -> ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
                        else -> ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "setOrientation failed", e)
            }
        }
    }

    /**
     * I bridge JS esposti (AndroidBridge, NativeOrientation) devono rispondere solo
     * quando la pagina corrente e' l'app bundle servita dall'asset host. Se la WebView
     * mostrasse mai un'altra origine, le chiamate vengono ignorate.
     *
     * IMPORTANTE: gira sul thread JavaBridge, non su quello UI. Non deve MAI
     * toccare webView o qualunque View: usa solo lo stato volatile aggiornato
     * dai callback di WebViewClient (sempre sul thread UI).
     */
    private fun isTrustedPage(): Boolean {
        val host = currentPageHost
        return host == ASSET_HOST || host == REMOTE_HOST
    }

    /** Funzioni native richiamabili dalla web app (window.AndroidBridge). */
    private inner class AndroidBridge {
        @JavascriptInterface
        fun setSystemBarsDark(dark: Boolean) {
            try {
                if (!isTrustedPage()) return
                runOnUiThread { applySystemBarsAppearance(dark) }
            } catch (e: Exception) {
                Log.e(TAG, "setSystemBarsDark failed", e)
            }
        }

        @JavascriptInterface
        fun setKeepScreenOn(keepOn: Boolean) {
            try {
                if (!isTrustedPage()) return
                runOnUiThread {
                    if (keepOn) {
                        window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    } else {
                        window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "setKeepScreenOn failed", e)
            }
        }

        /** Modalita immersiva: nasconde le barre di sistema durante il live. */
        @JavascriptInterface
        fun setImmersive(on: Boolean) {
            try {
                if (!isTrustedPage()) return
                runOnUiThread { applyImmersive(on) }
            } catch (e: Exception) {
                Log.e(TAG, "setImmersive failed", e)
            }
        }

        /** Salva un file di testo nella cartella Download (usato dall'export backup JSON). */
        @JavascriptInterface
        fun exportTextFile(fileName: String, content: String): Boolean {
            if (!isTrustedPage()) return false
            return try {
                val safeName = fileName.replace(Regex("[^A-Za-z0-9._ -]"), "_")
                val values = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, safeName)
                    put(MediaStore.Downloads.MIME_TYPE, "application/json")
                    put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                    ?: return false
                contentResolver.openOutputStream(uri)?.use {
                    it.write(content.toByteArray(Charsets.UTF_8))
                } ?: return false
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "File salvato in Download: $safeName", Toast.LENGTH_LONG).show()
                }
                true
            } catch (e: Exception) {
                Log.e(TAG, "exportTextFile failed", e)
                false
            }
        }

        /** Apre la stampa nativa Android della pagina corrente (il WebView non supporta window.print). */
        @JavascriptInterface
        fun printPage() {
            try {
                if (!isTrustedPage()) return
                runOnUiThread {
                    try {
                        val pm = getSystemService(Context.PRINT_SERVICE) as PrintManager
                        pm.print(
                            "FINPcoach",
                            webView.createPrintDocumentAdapter("FINPcoach"),
                            PrintAttributes.Builder().build()
                        )
                    } catch (e: Exception) {
                        Log.e(TAG, "printPage failed", e)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "printPage failed", e)
            }
        }

        /** Stampa un documento HTML arbitrario (es. composizione corsie) via PrintManager. */
        @JavascriptInterface
        fun printHtml(html: String?) {
            try {
                if (!isTrustedPage() || html.isNullOrEmpty()) return
                runOnUiThread {
                    try {
                        val pm = getSystemService(Context.PRINT_SERVICE) as PrintManager
                        val doc = WebView(this@MainActivity).apply {
                            settings.javaScriptEnabled = false
                            webViewClient = object : android.webkit.WebViewClient() {
                                override fun onPageFinished(view: WebView, url: String) {
                                    try {
                                        pm.print(
                                            "FINPcoach",
                                            view.createPrintDocumentAdapter("FINPcoach"),
                                            PrintAttributes.Builder().build()
                                        )
                                    } catch (e: Exception) {
                                        Log.e(TAG, "printHtml failed", e)
                                    }
                                }
                            }
                        }
                        doc.loadDataWithBaseURL("https://appassets.androidplatform.net/", html, "text/html", "utf-8", null)
                    } catch (e: Exception) {
                        Log.e(TAG, "printHtml failed", e)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "printHtml failed", e)
            }
        }

        @JavascriptInterface
        fun getSystemIsDark(): Boolean {
            try {
                if (!isTrustedPage()) return true
                return (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
            } catch (e: Exception) {
                Log.e(TAG, "getSystemIsDark failed", e)
                return true
            }
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val isDark = (newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        applySystemBarsAppearance(dark = isDark)
        webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('android-system-theme-changed', {detail: {isDark: $isDark}}));", null)
    }

    private inner class BundledAppWebViewClient : WebViewClient() {

        /**
         * Aggiorna il tracciamento dell'host corrente. Chiamare SOLO dal thread
         * UI (tutti i callback di WebViewClient lo sono).
         */
        private fun notePageHost(url: String?) {
            currentPageHost = url?.let { runCatching { Uri.parse(it).host }.getOrNull() }
        }

        override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
            super.onPageStarted(view, url, favicon)
            notePageHost(url)
        }

        override fun doUpdateVisitedHistory(view: WebView, url: String, isReload: Boolean) {
            super.doUpdateVisitedHistory(view, url, isReload)
            notePageHost(url)
        }

        override fun onPageFinished(view: WebView, url: String) {
            super.onPageFinished(view, url)
            notePageHost(url)
            updateWebViewInsets()
            if (BuildConfig.IS_QA_BUILD) injectQaBadge(view)
        }

        /**
         * Build QA (.qa): badge fisso in alto "QA · dati simulati" per non
         * confondere la build di collaudo con l'app reale. Solo DOM: non
         * tocca i dati e non esiste nella build di produzione.
         */
        private fun injectQaBadge(view: WebView) {
            view.evaluateJavascript(
                """
                (function(){
                  try {
                    if (document.getElementById('finp-qa-badge')) return;
                    var d = document.createElement('div');
                    d.id = 'finp-qa-badge';
                    d.textContent = 'QA · dati simulati';
                    d.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483647;background:#DC2626;color:#fff;font:700 12px/1.5 sans-serif;padding:4px 14px;border-radius:0 0 10px 10px;pointer-events:none;letter-spacing:.05em;box-shadow:0 1px 4px rgba(0,0,0,.35);';
                    (document.body || document.documentElement).appendChild(d);
                  } catch (e) {}
                })();
                """.trimIndent(),
                null
            )
        }

        override fun shouldInterceptRequest(
            view: WebView,
            request: WebResourceRequest
        ): WebResourceResponse? {
            val uri = request.url
            if (uri.scheme != "https" || uri.host != ASSET_HOST) return null

            val path = uri.path.orEmpty()
            val assetPath = when {
                path == "/" -> "web/index.html"
                path.startsWith("/assets/") -> path.removePrefix("/assets/")
                else -> "web/${path.removePrefix("/")}"
            }

            if (assetPath.split('/').any { it == "." || it == ".." }) {
                return response404()
            }

            return try {
                WebResourceResponse(
                    mimeType(assetPath),
                    if (assetPath.endsWith(".png") || assetPath.endsWith(".webp") || assetPath.endsWith(".ico")) null else "UTF-8",
                    assets.open(assetPath)
                )
            } catch (error: java.io.IOException) {
                Log.e(TAG, "Unable to load bundled web asset: $assetPath", error)
                response404()
            }
        }

        override fun shouldOverrideUrlLoading(
            view: WebView,
            request: WebResourceRequest
        ): Boolean {
            val uri = request.url
            if (uri.scheme == "https" && (uri.host == ASSET_HOST || uri.host == REMOTE_HOST)) return false
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            return true
        }

        override fun onReceivedError(
            view: WebView,
            request: WebResourceRequest,
            error: android.webkit.WebResourceError
        ) {
            if (request.isForMainFrame) {
                Log.e(TAG, "Web app failed to load: ${error.description}")
            }
        }

        private fun response404() = WebResourceResponse(
            "text/plain",
            "UTF-8",
            404,
            "Not Found",
            emptyMap(),
            ByteArrayInputStream(ByteArray(0))
        )

        private fun mimeType(path: String): String = when (path.substringAfterLast('.', "")) {
            "html" -> "text/html"
            "css" -> "text/css"
            "js", "mjs" -> "application/javascript"
            "json" -> "application/json"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "webp" -> "image/webp"
            "ico" -> "image/x-icon"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            else -> "application/octet-stream"
        }
    }

    private companion object {
        const val TAG = "FINPcoach"
        const val ASSET_HOST = "appassets.androidplatform.net"
        const val REMOTE_HOST = "mvalentino1988-creator.github.io"
        const val APP_URL = "https://$ASSET_HOST/assets/web/index.html"
    }
}
