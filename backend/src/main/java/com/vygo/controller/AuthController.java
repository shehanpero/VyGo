package com.vygo.controller;

import com.vygo.dto.auth.AuthResponse;
import com.vygo.dto.auth.ChangePasswordRequest;
import com.vygo.dto.auth.LoginRequest;
import com.vygo.dto.auth.OtpCodeRequest;
import com.vygo.dto.auth.OtpRequest;
import com.vygo.dto.auth.OtpVerifyRequest;
import com.vygo.dto.auth.ProfilePhotoRequest;
import com.vygo.dto.auth.RegisterRequest;
import com.vygo.dto.auth.UpdateProfileRequest;
import com.vygo.dto.auth.UserDto;
import com.vygo.dto.common.MessageResponse;
import com.vygo.dto.staff.StaffVerificationRequest;
import com.vygo.dto.staff.StaffVerificationResponse;
import com.vygo.security.CurrentUser;
import com.vygo.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@Tag(name = "Authentication", description = "Register, login, OTP and profile endpoints")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new user (PASSENGER or OPERATOR)")
    public UserDto register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email or mobile and password")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/otp/request")
    @Operation(summary = "Request a mobile OTP (returns dev OTP in sandbox mode)")
    public Map<String, String> otpRequest(@Valid @RequestBody OtpRequest request) {
        return authService.otpRequest(request);
    }

    @PostMapping("/otp/verify")
    @Operation(summary = "Verify mobile OTP and log in (auto-registers new mobile users)")
    public AuthResponse otpVerify(@Valid @RequestBody OtpVerifyRequest request) {
        return authService.otpVerify(request);
    }

    @GetMapping("/me")
    @Operation(summary = "Get the current authenticated user")
    public UserDto me() {
        return authService.currentUser(CurrentUser.id());
    }

    @PutMapping("/me")
    @Operation(summary = "Update the current user's profile")
    public UserDto updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(CurrentUser.id(), request);
    }

    @PostMapping("/change-password")
    @Operation(summary = "Change the current user's password")
    public MessageResponse changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(CurrentUser.id(), request);
    }

    @PutMapping("/me/photo")
    @Operation(summary = "Set the current user's profile photo")
    public UserDto updateProfilePhoto(@Valid @RequestBody ProfilePhotoRequest request) {
        return authService.updateProfilePhoto(CurrentUser.id(), request);
    }

    @PostMapping("/mobile/verify-request")
    @Operation(summary = "Send an OTP to the current user's mobile number")
    public Map<String, String> mobileVerifyRequest() {
        return authService.mobileVerifyRequest(CurrentUser.id());
    }

    @PostMapping("/mobile/verify")
    @Operation(summary = "Confirm the OTP and mark the mobile number verified")
    public UserDto mobileVerify(@Valid @RequestBody OtpCodeRequest request) {
        return authService.mobileVerify(CurrentUser.id(), request);
    }

    @GetMapping("/verification")
    @Operation(summary = "Get the current user's identity verification status")
    public StaffVerificationResponse myVerification() {
        return authService.myVerification(CurrentUser.id());
    }

    @PostMapping("/verification")
    @Operation(summary = "Submit identity documents and face scan for review")
    public StaffVerificationResponse submitVerification(@Valid @RequestBody StaffVerificationRequest request) {
        return authService.submitVerification(CurrentUser.id(), request);
    }
}
