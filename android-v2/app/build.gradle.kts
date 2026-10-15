import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) {
        keystorePropsFile.inputStream().use { load(it) }
    }
}

android {
    namespace = "com.vygo.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.vygo.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 5
        versionName = "2.0.3"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }
    }

    signingConfigs {
        create("release") {
            val storeFilePath = keystoreProps.getProperty("storeFile")
                ?: System.getenv("VYGO_KEYSTORE")
            val storePass = keystoreProps.getProperty("storePassword")
                ?: System.getenv("VYGO_STOREPASS")
            val aliasName = keystoreProps.getProperty("keyAlias")
                ?: System.getenv("VYGO_KEYALIAS")
            if (storeFilePath != null && storePass != null && aliasName != null) {
                storeFile = file(storeFilePath)
                storePassword = storePass
                keyAlias = aliasName
                keyPassword = keystoreProps.getProperty("keyPassword") ?: storePass
                enableV1Signing = true
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

// Bundle the freshly built web app (Vite output) into the APK assets on every build.
val webDistDir = rootProject.file("../frontend/dist")
val webAssetsDir = layout.projectDirectory.dir("src/main/assets").asFile

val syncWebAssets by tasks.registering(Copy::class) {
    description = "Copies frontend/dist into app/src/main/assets for the WebView shell."
    onlyIf { webDistDir.exists() }
    from(webDistDir)
    into(webAssetsDir)
    doFirst {
        logger.lifecycle("Syncing web assets from ${webDistDir.absolutePath}")
        webAssetsDir.listFiles()?.forEach { it.deleteRecursively() }
    }
}

tasks.matching { it.name == "preBuild" }.configureEach {
    dependsOn(syncWebAssets)
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.webkit)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.okhttp)
    implementation(libs.material)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material3.window)
    implementation(libs.compose.material.icons.extended)

    debugImplementation(libs.compose.ui.tooling)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.compose.bom))
}
