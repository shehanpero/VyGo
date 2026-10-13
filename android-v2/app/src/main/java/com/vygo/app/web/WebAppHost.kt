package com.vygo.app.web

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.core.content.ContextCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebResourceErrorCompat
import androidx.webkit.WebViewClientCompat
import com.vygo.app.BuildConfig
import java.io.ByteArrayInputStream

object WebAppHost {

    const val APP_DOMAIN = "localhost"
    private const val ENTRY_PATH = "/index.html"

    fun startUrl(): String = "https://$APP_DOMAIN/"

    fun createAssetLoader(context: Context): WebViewAssetLoader =
        WebViewAssetLoader.Builder()
            .setDomain(APP_DOMAIN)
            .setHttpAllowed(false)
            .addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(context))
            .build()

    fun buildInjection(serverBaseUrl: String): String {
        val base = serverBaseUrl.trimEnd('/')
            .replace("\\", "\\\\")
            .replace("'", "\\'")
        return buildString {
            append("window.VYGO_NATIVE=true;")
            append("try{document.documentElement.classList.add('vygo-native');}catch(e){}")
            append("window.VYGO_API_BASE='")
            append(base)
            append("';")
            append("try{localStorage.setItem('vygo.apiBase','")
            append(base)
            append("');}catch(e){}")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    fun createWebView(
        context: Context,
        injection: String,
        assetLoader: WebViewAssetLoader,
        onProgress: (Int) -> Unit,
        onError: (String) -> Unit,
        onBackAvailable: (Boolean) -> Unit,
    ): WebView = WebView(context).apply {
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.setSupportZoom(false)
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        settings.loadsImagesAutomatically = true
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.allowFileAccess = false
        settings.allowContentAccess = false
        settings.userAgentString = "${settings.userAgentString} VyGoAndroid/${com.vygo.app.BuildConfig.VERSION_NAME}"

        setBackgroundColor(Color.parseColor("#020617"))
        webViewClient = VyGoWebViewClient(context, assetLoader, injection, onError, onBackAvailable)
        webChromeClient = VyGoWebChromeClient(context, onProgress)

        loadUrl(startUrl())
    }
}

private class VyGoWebViewClient(
    private val context: Context,
    private val assetLoader: WebViewAssetLoader,
    private val injection: String,
    private val onError: (String) -> Unit,
    private val onBackAvailable: (Boolean) -> Unit,
) : WebViewClientCompat() {

    override fun shouldInterceptRequest(
        view: WebView,
        request: WebResourceRequest,
    ): WebResourceResponse? {
        val url = request.url
        if (url.host == WebAppHost.APP_DOMAIN) {
            val path = url.path ?: "/"
            val lastSegment = path.substringAfterLast('/', "")
            val isRouteNavigation = request.isForMainFrame && !lastSegment.contains('.')
            if (path == "/" || path == ENTRY_PATH || isRouteNavigation) {
                return serveInjectedIndex()
            }
        }
        return assetLoader.shouldInterceptRequest(url)
    }

    private fun serveInjectedIndex(): WebResourceResponse? {
        val html = context.assets.open("index.html").bufferedReader().use { it.readText() }
        val headMatch = Regex("<head[^>]*>", RegexOption.IGNORE_CASE).find(html)
        val injected = if (headMatch != null) {
            val insertAt = headMatch.range.last + 1
            html.substring(0, insertAt) +
                "<script>$injection</script>" +
                html.substring(insertAt)
        } else {
            "<script>$injection</script>$html"
        }
        return WebResourceResponse(
            "text/html",
            "utf-8",
            ByteArrayInputStream(injected.toByteArray(Charsets.UTF_8)),
        )
    }

    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val url: Uri = request.url
        return if (url.host == WebAppHost.APP_DOMAIN) {
            false
        } else {
            runCatching {
                context.startActivity(
                    Intent(Intent.ACTION_VIEW, url).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
            true
        }
    }

    override fun onPageFinished(view: WebView, url: String?) {
        super.onPageFinished(view, url)
        onBackAvailable(view.canGoBack())
    }

    override fun doUpdateVisitedHistory(view: WebView, url: String?, isReload: Boolean) {
        super.doUpdateVisitedHistory(view, url, isReload)
        onBackAvailable(view.canGoBack())
    }

    override fun onReceivedError(
        view: WebView,
        request: WebResourceRequest,
        error: WebResourceErrorCompat,
    ) {
        super.onReceivedError(view, request, error)
        if (request.isForMainFrame) {
            onError(error.description?.toString() ?: "WebView error")
        }
    }

    private companion object {
        const val ENTRY_PATH = "/index.html"
    }
}

private class VyGoWebChromeClient(
    private val context: Context,
    private val onProgress: (Int) -> Unit,
) : WebChromeClient() {

    override fun onProgressChanged(view: WebView, newProgress: Int) {
        onProgress(newProgress)
    }

    override fun onPermissionRequest(request: PermissionRequest) {
        val granted = request.resources.all { resource ->
            when (resource) {
                PermissionRequest.RESOURCE_VIDEO_CAPTURE ->
                    ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.CAMERA,
                    ) == PackageManager.PERMISSION_GRANTED

                else -> true
            }
        }
        if (granted) request.grant(request.resources) else request.deny()
    }

    override fun onGeolocationPermissionsShowPrompt(
        origin: String,
        callback: GeolocationPermissions.Callback,
    ) {
        val granted = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        callback.invoke(origin, granted, false)
    }
}
