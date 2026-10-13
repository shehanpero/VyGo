package com.vygo.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public endpoint that exposes the latest Android build so the website's
 * "Download app" page can hand the APK to a visitor's browser.
 *
 * <p>The APK is resolved from {@code app.download.apk-path} (defaults to the
 * Gradle release output) relative to the backend working directory. No
 * authentication is required: the app package is a public artifact.
 */
@RestController
@RequestMapping("/api/v1/app")
public class AppDownloadController {

    private final String apkPath;
    private final String version;

    public AppDownloadController(
            @Value("${app.download.apk-path:../android-v2/app/build/outputs/apk/release/app-release.apk}") String apkPath,
            @Value("${app.download.version:2.0.1}") String version) {
        this.apkPath = apkPath;
        this.version = version;
    }

    @GetMapping("/info")
    public Map<String, Object> info() {
        File file = apkFile();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("platform", "android");
        body.put("version", version);
        body.put("available", file.exists());
        body.put("fileName", fileName());
        body.put("sizeBytes", file.exists() ? file.length() : 0);
        return body;
    }

    @GetMapping("/download")
    public ResponseEntity<Resource> download() {
        File file = apkFile();
        if (!file.exists() || !file.isFile()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "App package not available");
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .contentType(MediaType.parseMediaType("application/vnd.android.package-archive"))
                .contentLength(file.length())
                .body(new FileSystemResource(file));
    }

    private File apkFile() {
        return new File(apkPath).getAbsoluteFile();
    }

    private String fileName() {
        return "vygo-" + version + ".apk";
    }
}
