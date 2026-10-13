package com.vygo.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record ProfilePhotoRequest(@NotBlank String url) {
}
