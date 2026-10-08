package com.mattia.nuotoparalimpico

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import java.io.ByteArrayInputStream

class MainActivity : ComponentActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        hideSystemBars()

        webView = WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = BundledAppWebViewClient()
            webChromeClient = WebChromeClient()
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

    override fun onSaveInstanceState(outState: Bundle) {
        webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    private fun hideSystemBars() {
        WindowCompat.getInsetsController(window, window.decorView).apply {
            systemBarsBehavior =
                androidx.core.view.WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            hide(WindowInsetsCompat.Type.systemBars())
        }
    }

    private inner class BundledAppWebViewClient : WebViewClient() {
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
