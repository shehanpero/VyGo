package com.vygo.app

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.vygo.app.ui.VyGoApp
import com.vygo.app.ui.theme.VyGoTheme

class MainActivity : ComponentActivity() {

    private val permissionLauncher =
        registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        enableHighRefreshRate()

        setContent {
            VyGoTheme {
                VyGoApp(
                    onRequestRuntimePermissions = ::requestRuntimePermissions,
                )
            }
        }
    }

    /**
     * Ask the window to drive the panel at its highest available refresh rate
     * (e.g. 120Hz on capable devices, falling back to 90/60Hz). Keeps scroll and
     * animation as smooth as the hardware allows.
     */
    private fun enableHighRefreshRate() {
        try {
            val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                display
            } else {
                @Suppress("DEPRECATION")
                windowManager.defaultDisplay
            } ?: return

            val nativeWidth = display.mode?.physicalWidth ?: 0
            val mode = display.supportedModes
                .filter { nativeWidth == 0 || it.physicalWidth == nativeWidth }
                .maxByOrNull { it.refreshRate }
                ?: display.supportedModes.maxByOrNull { it.refreshRate }
                ?: return

            window.attributes = window.attributes.apply {
                preferredDisplayModeId = mode.modeId
                preferredRefreshRate = mode.refreshRate
            }
        } catch (_: Throwable) {
            // Best-effort only; never block app start over refresh-rate hints.
        }
    }

    private fun requestRuntimePermissions() {
        permissionLauncher.launch(
            arrayOf(
                Manifest.permission.CAMERA,
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            )
        )
    }
}
