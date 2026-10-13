package com.vygo.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val VyGoBg = Color(0xFF020617)
val VyGoSurface = Color(0xFF0F172A)
val VyGoSurfaceVariant = Color(0xFF1E293B)
val VyGoAccent = Color(0xFF22D3EE)
val VyGoAccentDim = Color(0xFF0891B2)
val VyGoOnBg = Color(0xFFF8FAFC)
val VyGoMuted = Color(0xFF94A3B8)
val VyGoError = Color(0xFFF87171)
val VyGoSuccess = Color(0xFF34D399)

private val VyGoColorScheme = darkColorScheme(
    primary = VyGoAccent,
    onPrimary = VyGoBg,
    primaryContainer = VyGoAccentDim,
    onPrimaryContainer = VyGoOnBg,
    secondary = VyGoAccent,
    onSecondary = VyGoBg,
    background = VyGoBg,
    onBackground = VyGoOnBg,
    surface = VyGoSurface,
    onSurface = VyGoOnBg,
    surfaceVariant = VyGoSurfaceVariant,
    onSurfaceVariant = VyGoMuted,
    outline = VyGoMuted,
    error = VyGoError,
)

@Composable
fun VyGoTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = VyGoColorScheme,
        typography = VyGoTypography,
        content = content,
    )
}
