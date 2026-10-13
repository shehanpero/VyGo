package com.vygo.app.ui

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.calculateWindowSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.vygo.app.MainViewModel
import com.vygo.app.ui.theme.VyGoAccent

@OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
@Composable
fun VyGoApp(
    onRequestRuntimePermissions: () -> Unit,
    viewModel: MainViewModel = viewModel(),
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    val windowSizeClass = calculateWindowSizeClass(findActivity())

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        when {
            state.loading -> LoadingScreen()

            state.serverBaseUrl == null -> ServerSetupScreen(
                windowSizeClass = windowSizeClass,
                onConnected = { url ->
                    viewModel.saveServerUrl(url)
                    onRequestRuntimePermissions()
                },
            )

            else -> WebShellScreen(
                serverBaseUrl = state.serverBaseUrl.orEmpty(),
                onChangeServer = { viewModel.clearServerUrl() },
            )
        }
    }
}

@Composable
private fun LoadingScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing),
        contentAlignment = Alignment.Center,
    ) {
        CircularProgressIndicator(color = VyGoAccent)
    }
}

@Composable
private fun findActivity(): Activity {
    val context = LocalContext.current
    return remember(context) {
        var current: Context? = context
        while (current is ContextWrapper) {
            if (current is Activity) return@remember current
            current = current.baseContext
        }
        throw IllegalStateException("VyGoApp requires an Activity context")
    }
}
