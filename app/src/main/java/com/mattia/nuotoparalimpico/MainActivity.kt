package com.mattia.nuotoparalimpico

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.view.WindowInsetsController
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
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

        // Enable true edge-to-edge display optimized for modern devices like Pixel 10
        // Il contenuto va sotto la barra di stato, ma usiamo padding intelligente
        WindowCompat.setDecorFitsSystemWindows(window, false)

        // Imposta i colori delle barre di sistema usando l'API moderna (Android 11+)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
            window.insetsController?.setSystemBarsAppearance(
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
            )
        } else {
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

        // Intelligently feed system window insets as CSS variables into the web app root
        ViewCompat.setOnApplyWindowInsetsListener(webView) { _, windowInsets ->
            currentTopInset = windowInsets.getInsets(WindowInsetsCompat.Type.statusBars()).top
            currentBottomInset = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom
            updateWebViewInsets()
            windowInsets
        }

        setContentView(webView)

        if (savedInstanceState == null || webView.restoreState(savedInstanceState) == null) {
            webView.loadUrl(APP_URL)
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })
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
            if (uri.scheme == "https" && uri.host == ASSET_HOST) return false
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
        const val APP_URL = "https://$ASSET_HOST/assets/web/index.html"
    }
}
