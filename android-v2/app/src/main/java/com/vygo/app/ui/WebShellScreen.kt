package com.vygo.app.ui

import android.webkit.WebView
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.vygo.app.R
import com.vygo.app.ui.theme.VyGoBg
import com.vygo.app.ui.theme.VyGoError
import com.vygo.app.ui.theme.VyGoMuted
import com.vygo.app.ui.theme.VyGoOnBg
import com.vygo.app.web.WebAppHost

@Composable
fun WebShellScreen(
    serverBaseUrl: String,
    onChangeServer: () -> Unit,
) {
    val context = LocalContext.current
    var webView by remember { mutableStateOf<WebView?>(null) }
    var progress by remember { mutableIntStateOf(0) }
    var isLoading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var canGoBack by remember { mutableStateOf(false) }

    BackHandler(enabled = canGoBack) { webView?.goBack() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(VyGoBg)
            .windowInsetsPadding(WindowInsets.safeDrawing),
    ) {
        key(serverBaseUrl) {
            val assetLoader = remember { WebAppHost.createAssetLoader(context) }
            val injection = remember(serverBaseUrl) { WebAppHost.buildInjection(serverBaseUrl) }
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    WebAppHost.createWebView(
                        context = ctx,
                        injection = injection,
                        assetLoader = assetLoader,
                        onProgress = { value ->
                            progress = value
                            if (value >= 100) isLoading = false
                        },
                        onError = { message ->
                            error = message
                            isLoading = false
                        },
                        onBackAvailable = { canGoBack = it },
                    ).also { webView = it }
                },
            )
        }

        if (isLoading) {
            LinearProgressIndicator(
                progress = { progress.coerceIn(0, 100) / 100f },
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .fillMaxWidth(),
            )
        }

        error?.let { message ->
            WebErrorOverlay(
                message = message,
                onRetry = {
                    error = null
                    isLoading = true
                    progress = 0
                    webView?.reload()
                },
                onChangeServer = onChangeServer,
            )
        }
    }
}

@Composable
private fun WebErrorOverlay(
    message: String,
    onRetry: () -> Unit,
    onChangeServer: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(VyGoBg),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 420.dp)
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                imageVector = Icons.Filled.CloudOff,
                contentDescription = null,
                tint = VyGoError,
                modifier = Modifier.size(48.dp),
            )
            Spacer(Modifier.height(16.dp))
            Text(
                text = stringResource(R.string.web_error_title),
                style = MaterialTheme.typography.headlineMedium,
                color = VyGoOnBg,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = VyGoMuted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedButton(onClick = onChangeServer) {
                    Text(stringResource(R.string.action_change_server))
                }
                Button(onClick = onRetry) {
                    Text(stringResource(R.string.action_retry))
                }
            }
        }
    }
}
