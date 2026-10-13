package com.vygo.integration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Component
public final class StorageService {

    private static final Logger log = LoggerFactory.getLogger(StorageService.class);

    private final Path root;

    public StorageService() {
        this.root = Paths.get("uploads").toAbsolutePath().normalize();
        ensureDirectory();
    }

    public String store(byte[] data, String originalFilename, String contentType) {
        ensureDirectory();
        String filename = UUID.randomUUID() + extension(originalFilename, contentType);
        Path target = root.resolve(filename).normalize();
        try {
            Files.write(target, data);
        } catch (IOException e) {
            log.error("[VYGO STORAGE] failed to write {}: {}", target, e.getMessage(), e);
            throw new IllegalStateException("Failed to store file", e);
        }
        log.info("[VYGO STORAGE] stored {}", filename);
        return "/uploads/" + filename;
    }

    public void ensureDirectory() {
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to create uploads directory " + root, e);
        }
    }

    private static String extension(String originalFilename, String contentType) {
        if (contentType != null) {
            String type = contentType.split(";")[0].trim().toLowerCase();
            switch (type) {
                case "image/png" -> {
                    return ".png";
                }
                case "image/jpeg", "image/jpg" -> {
                    return ".jpg";
                }
                case "image/gif" -> {
                    return ".gif";
                }
                case "image/webp" -> {
                    return ".webp";
                }
                case "application/pdf" -> {
                    return ".pdf";
                }
                default -> {
                    // fall through to original filename extension
                }
            }
        }
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0 && dot < originalFilename.length() - 1) {
                String ext = originalFilename.substring(dot + 1);
                if (ext.matches("[A-Za-z0-9]{1,10}")) {
                    return "." + ext.toLowerCase();
                }
            }
        }
        return "";
    }
}
