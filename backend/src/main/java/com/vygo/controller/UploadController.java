package com.vygo.controller;

import com.vygo.dto.common.UploadResponse;
import com.vygo.exception.BadRequestException;
import com.vygo.integration.StorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/v1/uploads")
@Tag(name = "Uploads", description = "File uploads for profile photos and identity documents")
public class UploadController {

    private static final long MAX_BYTES = 8L * 1024 * 1024;

    private final StorageService storageService;

    public UploadController(StorageService storageService) {
        this.storageService = storageService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Upload an image or PDF and get its public URL")
    public UploadResponse upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("A file is required");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new BadRequestException("File must be under 8 MB");
        }
        String contentType = file.getContentType();
        if (contentType == null
                || !(contentType.startsWith("image/") || contentType.equals("application/pdf"))) {
            throw new BadRequestException("Only image or PDF files are allowed");
        }
        try {
            String url = storageService.store(file.getBytes(), file.getOriginalFilename(), contentType);
            return new UploadResponse(url);
        } catch (IOException e) {
            throw new BadRequestException("Failed to read the uploaded file");
        }
    }
}
