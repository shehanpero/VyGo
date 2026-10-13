package com.vygo.app

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.vygo.app.data.ServerPreferences
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel(app: Application) : AndroidViewModel(app) {

    private val preferences = ServerPreferences(app)

    val uiState: StateFlow<MainUiState> = preferences.serverBaseUrl
        .map { MainUiState(loading = false, serverBaseUrl = it) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = MainUiState(loading = true),
        )

    fun saveServerUrl(rawUrl: String) {
        val normalized = normalizeBaseUrl(rawUrl) ?: return
        viewModelScope.launch { preferences.setServerBaseUrl(normalized) }
    }

    fun clearServerUrl() {
        viewModelScope.launch { preferences.setServerBaseUrl("") }
    }
}

data class MainUiState(
    val loading: Boolean = false,
    val serverBaseUrl: String? = null,
)

fun normalizeBaseUrl(raw: String): String? {
    val trimmed = raw.trim()
    if (trimmed.isEmpty()) return null
    val withScheme = if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        trimmed
    } else {
        "http://$trimmed"
    }
    return withScheme.trimEnd('/')
}
