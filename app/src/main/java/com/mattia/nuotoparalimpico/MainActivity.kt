package com.mattia.nuotoparalimpico

import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Context
import android.content.Intent
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
            settings.allowFileAccess = true
            settings.allowContentAccess = true

            // Ponte minimale verso la web app: la pagina carica solo risorse dell'app
            // (le navigazioni esterne vengono aperte nel browser), quindi l'esposizione è limitata.
            addJavascriptInterface(AndroidBridge(), "AndroidBridge")

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

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    /** Funzioni native richiamabili dalla web app (window.AndroidBridge). */
    private inner class AndroidBridge {
        @JavascriptInterface
        fun setSystemBarsDark(dark: Boolean) {
            runOnUiThread { applySystemBarsAppearance(dark) }
        }

        @JavascriptInterface
        fun setKeepScreenOn(keepOn: Boolean) {
            runOnUiThread {
                if (keepOn) {
                    window.addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                } else {
                    window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                }
            }
        }

        /** Salva un file di testo nella cartella Download (usato dall'export backup JSON). */
        @JavascriptInterface
        fun exportTextFile(fileName: String, content: String): Boolean {
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
        }

        @JavascriptInterface
        fun getSystemIsDark(): Boolean {
            return (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val isDark = (newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES
        applySystemBarsAppearance(dark = isDark)
        webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('android-system-theme-changed', {detail: {isDark: $isDark}}));", null)
    }

    private inner class BundledAppWebViewClient : WebViewClient() {

        override fun onPageFinished(view: WebView, url: String) {
            super.onPageFinished(view, url)
            updateWebViewInsets()
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
