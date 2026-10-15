package com.vygo.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.windowsizeclass.ExperimentalMaterial3WindowSizeClassApi
import androidx.compose.material3.windowsizeclass.WindowSizeClass
import androidx.compose.material3.windowsizeclass.WindowWidthSizeClass
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.vygo.app.R
import com.vygo.app.data.ServerPreferences
import com.vygo.app.data.ServerTester
import com.vygo.app.normalizeBaseUrl
import com.vygo.app.ui.theme.VyGoError
import com.vygo.app.ui.theme.VyGoMuted
import com.vygo.app.ui.theme.VyGoOnBg
import com.vygo.app.ui.theme.VyGoSuccess
import com.vygo.app.ui.theme.VyGoSurface
import kotlinx.coroutines.launch

private sealed interface TestStatus {
    data object Testing : TestStatus
    data object Ok : TestStatus
    data object Failed : TestStatus
}

@OptIn(ExperimentalMaterial3WindowSizeClassApi::class)
@Composable
fun ServerSetupScreen(
    windowSizeClass: WindowSizeClass,
    onConnected: (String) -> Unit,
) {
    var url by rememberSaveable { mutableStateOf("") }
    var testing by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<TestStatus?>(null) }
    val tester = remember { ServerTester() }
    val scope = rememberCoroutineScope()

    val onTest: () -> Unit = {
        val normalized = normalizeBaseUrl(url)
        if (normalized == null) {
            status = TestStatus.Failed
        } else {
            testing = true
            status = TestStatus.Testing
            scope.launch {
                val result = tester.test(normalized)
                testing = false
                status = result.fold(
                    onSuccess = { code -> if (code in 200..499) TestStatus.Ok else TestStatus.Failed },
                    onFailure = { TestStatus.Failed },
                )
            }
        }
    }

    val onUseHosted: () -> Unit = {
        url = ServerPreferences.DEFAULT_SERVER_URL
        status = null
        onTest()
    }

    val expanded = windowSizeClass.widthSizeClass != WindowWidthSizeClass.Compact

    Box(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .imePadding()
            .padding(horizontal = 24.dp, vertical = 24.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (expanded) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 980.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                BrandPanel(modifier = Modifier.weight(1f).padding(end = 40.dp))
                SetupCard(
                    modifier = Modifier.weight(1f),
                    url = url,
                    onUrlChange = { url = it; status = null },
                    testing = testing,
                    status = status,
                    onTest = onTest,
                    onUseHosted = onUseHosted,
                    onContinue = { normalizeBaseUrl(url)?.let(onConnected) },
                )
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 520.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                BrandHeader()
                Spacer(Modifier.height(28.dp))
                SetupCard(
                    modifier = Modifier.fillMaxWidth(),
                    url = url,
                    onUrlChange = { url = it; status = null },
                    testing = testing,
                    status = status,
                    onTest = onTest,
                    onUseHosted = onUseHosted,
                    onContinue = { normalizeBaseUrl(url)?.let(onConnected) },
                )
            }
        }
    }
}

@Composable
private fun BrandPanel(modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(
            text = "VyGo",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.primary,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = "Bus travel made simple. Point the app at your VyGo backend to get started.",
            style = MaterialTheme.typography.bodyLarge,
            color = VyGoMuted,
        )
        Spacer(Modifier.height(24.dp))
        listOf(
            "Passenger, driver, conductor, operator and admin in one app",
            "Live tracking, bookings, expenses and reports",
            "Runs against your own self-hosted server",
        ).forEach { line ->
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(vertical = 6.dp),
            ) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(10.dp))
                Text(text = line, style = MaterialTheme.typography.bodyMedium, color = VyGoOnBg)
            }
        }
    }
}

@Composable
private fun BrandHeader() {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = "VyGo",
            style = MaterialTheme.typography.headlineLarge,
            color = MaterialTheme.colorScheme.primary,
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = "Version ${com.vygo.app.BuildConfig.VERSION_NAME}",
            style = MaterialTheme.typography.bodyMedium,
            color = VyGoMuted,
        )
    }
}

@Composable
private fun SetupCard(
    modifier: Modifier,
    url: String,
    onUrlChange: (String) -> Unit,
    testing: Boolean,
    status: TestStatus?,
    onTest: () -> Unit,
    onUseHosted: () -> Unit,
    onContinue: () -> Unit,
) {
    val connected = status == TestStatus.Ok
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = VyGoSurface),
        shape = MaterialTheme.shapes.large,
    ) {
        Column(modifier = Modifier.padding(24.dp)) {
            Text(
                text = stringResource(R.string.server_setup_title),
                style = MaterialTheme.typography.headlineMedium,
                color = VyGoOnBg,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.server_setup_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = VyGoMuted,
            )
            Spacer(Modifier.height(20.dp))
            OutlinedTextField(
                value = url,
                onValueChange = onUrlChange,
                singleLine = true,
                label = { Text(stringResource(R.string.server_url_label)) },
                placeholder = { Text(stringResource(R.string.server_url_hint)) },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Uri,
                    imeAction = ImeAction.Done,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                OutlinedButton(
                    onClick = onTest,
                    enabled = url.isNotBlank() && !testing,
                    modifier = Modifier.weight(1f),
                ) {
                    if (testing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(18.dp),
                            strokeWidth = 2.dp,
                            color = MaterialTheme.colorScheme.primary,
                        )
                    } else {
                        Text(stringResource(R.string.action_test))
                    }
                }
                Button(
                    onClick = onContinue,
                    enabled = connected,
                    modifier = Modifier.weight(1f),
                ) {
                    Text(stringResource(R.string.action_continue))
                }
            }
            Spacer(Modifier.height(12.dp))
            OutlinedButton(
                onClick = onUseHosted,
                enabled = !testing,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.action_use_hosted))
            }
            status?.let { TestStatusRow(it) }
        }
    }
}

@Composable
private fun TestStatusRow(status: TestStatus) {
    Spacer(Modifier.height(14.dp))
    when (status) {
        TestStatus.Testing -> Text(
            text = stringResource(R.string.testing),
            style = MaterialTheme.typography.bodyMedium,
            color = VyGoMuted,
        )

        TestStatus.Ok -> StatusMessage(
            color = VyGoSuccess,
            icon = Icons.Filled.CheckCircle,
            text = stringResource(R.string.test_success),
        )

        TestStatus.Failed -> StatusMessage(
            color = VyGoError,
            icon = Icons.Filled.ErrorOutline,
            text = stringResource(R.string.test_failure),
        )
    }
}

@Composable
private fun StatusMessage(color: Color, icon: ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = color,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(text = text, style = MaterialTheme.typography.bodyMedium, color = color)
    }
}
