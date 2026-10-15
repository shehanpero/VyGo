package com.vygo.app.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "vygo_settings")

class ServerPreferences(private val context: Context) {

    val serverBaseUrl: Flow<String?> = context.dataStore.data.map { prefs ->
        when (prefs[KEY_SERVER_URL]) {
            null -> DEFAULT_SERVER_URL
            else -> prefs[KEY_SERVER_URL]?.takeIf { it.isNotBlank() }
        }
    }

    suspend fun setServerBaseUrl(url: String) {
        context.dataStore.edit { prefs -> prefs[KEY_SERVER_URL] = url }
    }

    companion object {
        val KEY_SERVER_URL = stringPreferencesKey("server_base_url")
        const val DEFAULT_SERVER_URL = "https://vygo-perovin.pages.dev"
    }
}
