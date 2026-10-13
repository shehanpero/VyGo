package com.vygo.service;

import com.vygo.config.AppProperties;
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
import com.vygo.entity.BusOperator;
import com.vygo.entity.Role;
import com.vygo.entity.Role.RoleCode;
import com.vygo.entity.User;
import com.vygo.exception.BadRequestException;
import com.vygo.exception.ConflictException;
import com.vygo.exception.ForbiddenException;
import com.vygo.exception.NotFoundException;
import com.vygo.exception.UnauthorizedException;
import com.vygo.repository.BusOperatorRepository;
import com.vygo.repository.RoleRepository;
import com.vygo.repository.UserRepository;
import com.vygo.security.JwtTokenProvider;
import com.vygo.security.SecurityUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String DEV_OTP = "123456";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BusOperatorRepository busOperatorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AppProperties appProperties;
    private final AuditService auditService;
    private final Environment environment;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       BusOperatorRepository busOperatorRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider,
                       AppProperties appProperties,
                       AuditService auditService,
                       Environment environment) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.busOperatorRepository = busOperatorRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.appProperties = appProperties;
        this.auditService = auditService;
        this.environment = environment;
    }

    @Transactional
    public UserDto register(RegisterRequest req) {
        if (req.email() != null && !req.email().isBlank()) {
            if (userRepository.existsByEmail(req.email().trim())) {
                throw new ConflictException("Email already registered");
            }
        }
        if (userRepository.existsByMobile(req.mobile())) {
            throw new ConflictException("Mobile number already registered");
        }

        RoleCode roleCode;
        try {
            roleCode = RoleCode.valueOf(req.role().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid role: " + req.role());
        }
        if (roleCode != RoleCode.PASSENGER && roleCode != RoleCode.OPERATOR
                && roleCode != RoleCode.DRIVER && roleCode != RoleCode.CONDUCTOR) {
            throw new BadRequestException("Role must be PASSENGER, OPERATOR, DRIVER or CONDUCTOR");
        }

        User user = User.builder()
                .fullName(req.fullName())
                .email(req.email() == null || req.email().isBlank() ? null : req.email().trim())
                .mobile(req.mobile())
                .passwordHash(passwordEncoder.encode(req.password()))
                .enabled(true)
                .otpVerified(false)
                .build();
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new NotFoundException("Role not seeded: " + roleCode));
        user.getRoles().add(role);

        if (roleCode == RoleCode.DRIVER || roleCode == RoleCode.CONDUCTOR) {
            if (req.ownerId() == null) {
                throw new BadRequestException("Select the bus owner / association you belong to");
            }
            BusOperator owner = busOperatorRepository.findById(req.ownerId())
                    .orElseThrow(() -> new BadRequestException("Bus owner / association not found"));
            user.setOwner(owner);
            user.setVerificationStatus(User.IdentityStatus.UNVERIFIED);
        }

        user = userRepository.save(user);

        if (roleCode == RoleCode.OPERATOR) {
            if (req.operator() == null) {
                throw new BadRequestException("Operator details are required for OPERATOR registration");
            }
            BusOperator operator = BusOperator.builder()
                    .user(user)
                    .name(req.operator().name())
                    .registrationNo(req.operator().registrationNo())
                    .licenseNo(req.operator().licenseNo())
                    .address(req.operator().address())
                    .contactPerson(req.operator().contactPerson())
                    .phone(req.operator().phone())
                    .email(req.operator().email())
                    .operatorType(parseOperatorType(req.operator().type()))
                    .status(BusOperator.OperatorStatus.PENDING)
                    .build();
            busOperatorRepository.save(operator);
        }

        auditService.record("REGISTER_USER", "User", String.valueOf(user.getId()),
                "Registered with role " + roleCode.name());
        return toDto(user);
    }

    public AuthResponse login(LoginRequest req) {
        User user = userRepository.findByEmailOrMobile(req.username(), req.username()).orElse(null);
        if (user == null
                || user.getPasswordHash() == null
                || !passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid credentials");
        }
        if (user.getEnabled() == null || !user.getEnabled()) {
            throw new ForbiddenException("Account is disabled");
        }
        return buildAuthResponse(user);
    }

    @Transactional
    public Map<String, String> otpRequest(OtpRequest req) {
        boolean dev = isDev();
        String otp = dev ? DEV_OTP : String.format("%06d", new SecureRandom().nextInt(1_000_000));
        User user = userRepository.findByMobile(req.mobile()).orElse(null);
        if (user != null) {
            user.setOtpCode(otp);
            user.setOtpExpiresAt(LocalDateTime.now().plusMinutes(5));
            userRepository.save(user);
        }
        if (dev) {
            log.info("OTP generated for mobile {}: {}", req.mobile(), otp);
            return Map.of("message", "OTP sent", "devOtp", otp);
        }
        return Map.of("message", "OTP sent");
    }

    @Transactional
    public AuthResponse otpVerify(OtpVerifyRequest req) {
        User user = userRepository.findByMobile(req.mobile()).orElse(null);
        if (user == null) {
            if (!isDev()) {
                throw new UnauthorizedException("Mobile number is not registered");
            }
            user = User.builder()
                    .fullName("User " + req.mobile())
                    .mobile(req.mobile())
                    .enabled(true)
                    .otpVerified(false)
                    .build();
            Role role = roleRepository.findByCode(RoleCode.PASSENGER)
                    .orElseThrow(() -> new NotFoundException("Role not seeded: PASSENGER"));
            user.getRoles().add(role);
            user = userRepository.save(user);
        }
        boolean otpOk = user.getOtpCode() != null && user.getOtpCode().equals(req.otp())
                && user.getOtpExpiresAt() != null && user.getOtpExpiresAt().isAfter(LocalDateTime.now());
        if (!otpOk) {
            throw new UnauthorizedException("Invalid or expired OTP");
        }
        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
        user.setOtpVerified(true);
        userRepository.save(user);
        auditService.record("OTP_VERIFY", "User", String.valueOf(user.getId()), "OTP login");
        return buildAuthResponse(user);
    }

    @Transactional
    public MessageResponse changePassword(Long userId, ChangePasswordRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
        return new MessageResponse("Password updated");
    }

    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));

        String mobile = req.mobile().trim();
        if (!mobile.equals(user.getMobile())) {
            if (userRepository.existsByMobile(mobile)) {
                throw new ConflictException("Mobile number already registered");
            }
            user.setMobile(mobile);
        }

        String email = req.email() == null || req.email().isBlank() ? null : req.email().trim();
        if (email == null) {
            user.setEmail(null);
        } else if (!email.equalsIgnoreCase(user.getEmail())) {
            if (userRepository.existsByEmail(email)) {
                throw new ConflictException("Email already registered");
            }
            user.setEmail(email);
        }

        user.setFullName(req.fullName().trim());
        User saved = userRepository.save(user);
        auditService.record("UPDATE_PROFILE", "User", String.valueOf(saved.getId()), "Profile updated");
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public UserDto currentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return toDto(user);
    }

    @Transactional
    public UserDto updateProfilePhoto(Long userId, ProfilePhotoRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        user.setProfileImageUrl(req.url().trim());
        User saved = userRepository.save(user);
        auditService.record("UPDATE_PROFILE_PHOTO", "User", String.valueOf(userId), "Profile photo updated");
        return toDto(saved);
    }

    @Transactional
    public Map<String, String> mobileVerifyRequest(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        boolean dev = isDev();
        String otp = dev ? DEV_OTP : String.format("%06d", new SecureRandom().nextInt(1_000_000));
        user.setOtpCode(otp);
        user.setOtpExpiresAt(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);
        if (dev) {
            log.info("Mobile verification OTP for user {}: {}", userId, otp);
            return Map.of("message", "OTP sent", "devOtp", otp);
        }
        return Map.of("message", "OTP sent");
    }

    @Transactional
    public UserDto mobileVerify(Long userId, OtpCodeRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        boolean ok = user.getOtpCode() != null && user.getOtpCode().equals(req.otp())
                && user.getOtpExpiresAt() != null && user.getOtpExpiresAt().isAfter(LocalDateTime.now());
        if (!ok) {
            throw new UnauthorizedException("Invalid or expired OTP");
        }
        user.setOtpCode(null);
        user.setOtpExpiresAt(null);
        user.setMobileVerified(true);
        User saved = userRepository.save(user);
        auditService.record("MOBILE_VERIFY", "User", String.valueOf(userId), "Mobile number verified");
        return toDto(saved);
    }

    @Transactional
    public StaffVerificationResponse submitVerification(Long userId, StaffVerificationRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        boolean isDriver = user.hasRole(RoleCode.DRIVER.name());
        boolean isConductor = user.hasRole(RoleCode.CONDUCTOR.name());
        if (!isDriver && !isConductor) {
            throw new ForbiddenException("Only drivers and conductors submit identity verification");
        }
        if (req.ownerId() != null) {
            BusOperator owner = busOperatorRepository.findById(req.ownerId())
                    .orElseThrow(() -> new BadRequestException("Bus owner / association not found"));
            user.setOwner(owner);
        }
        if (user.getOwner() == null) {
            throw new BadRequestException("Select the bus owner / association you belong to");
        }
        String idType = req.idType().trim().toUpperCase();
        if (!idType.equals("NIC") && !idType.equals("PASSPORT")) {
            throw new BadRequestException("ID type must be NIC or PASSPORT");
        }
        if (isBlank(req.idFrontUrl())) {
            throw new BadRequestException("Upload the front of your identity document");
        }
        if (idType.equals("NIC") && isBlank(req.idBackUrl())) {
            throw new BadRequestException("Upload both sides of your NIC");
        }
        if (isDriver && isBlank(req.licenseUrl())) {
            throw new BadRequestException("Upload your driving licence");
        }
        if (isBlank(req.selfieUrl())) {
            throw new BadRequestException("Complete the face scan");
        }
        user.setIdType(idType);
        user.setIdNumber(req.idNumber().trim());
        user.setIdFrontUrl(req.idFrontUrl().trim());
        user.setIdBackUrl(isBlank(req.idBackUrl()) ? null : req.idBackUrl().trim());
        user.setLicenseUrl(isBlank(req.licenseUrl()) ? null : req.licenseUrl().trim());
        user.setSelfieUrl(req.selfieUrl().trim());
        user.setVerificationStatus(User.IdentityStatus.PENDING);
        user.setVerificationNote(null);
        user.setSubmittedAt(LocalDateTime.now());
        user.setVerifiedAt(null);
        User saved = userRepository.save(user);
        auditService.record("SUBMIT_IDENTITY_VERIFICATION", "User", String.valueOf(userId),
                "Identity verification submitted");
        return toVerificationResponse(saved);
    }

    @Transactional(readOnly = true)
    public StaffVerificationResponse myVerification(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return toVerificationResponse(user);
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private BusOperator.OperatorType parseOperatorType(String type) {
        if (type != null && "ASSOCIATION".equalsIgnoreCase(type.trim())) {
            return BusOperator.OperatorType.ASSOCIATION;
        }
        return BusOperator.OperatorType.OWNER;
    }

    private StaffVerificationResponse toVerificationResponse(User u) {
        BusOperator owner = u.getOwner();
        String role = u.hasRole(RoleCode.DRIVER.name()) ? "DRIVER"
                : u.hasRole(RoleCode.CONDUCTOR.name()) ? "CONDUCTOR" : null;
        return new StaffVerificationResponse(u.getId(), u.getFullName(), u.getEmail(), u.getMobile(),
                u.getMobileVerified(), role,
                owner == null ? null : owner.getId(), owner == null ? null : owner.getName(),
                u.getIdType(), u.getIdNumber(), u.getIdFrontUrl(), u.getIdBackUrl(), u.getLicenseUrl(),
                u.getSelfieUrl(), u.getProfileImageUrl(),
                u.getVerificationStatus() == null ? null : u.getVerificationStatus().name(),
                u.getVerificationNote(),
                u.getSubmittedAt() == null ? null : u.getSubmittedAt().toString(),
                u.getVerifiedAt() == null ? null : u.getVerifiedAt().toString());
    }

    private boolean isDev() {
        return environment.acceptsProfiles(Profiles.of("dev"));
    }

    private AuthResponse buildAuthResponse(User user) {
        String token = jwtTokenProvider.generateToken(SecurityUser.from(user));
        long expiresIn = (long) appProperties.getAccessTokenTtlMinutes() * 60;
        return new AuthResponse(token, "Bearer", expiresIn, toDto(user));
    }

    private UserDto toDto(User user) {
        Long operatorId = busOperatorRepository.findByUserId(user.getId())
                .map(BusOperator::getId)
                .orElse(null);
        List<String> roles = user.getRoles() == null
                ? List.of()
                : user.getRoles().stream().map(r -> r.getCode().name()).sorted().toList();
        BusOperator owner = user.getOwner();
        return new UserDto(user.getId(), user.getFullName(), user.getEmail(), user.getMobile(),
                roles, user.getEnabled(), operatorId, user.getProfileImageUrl(), user.getMobileVerified(),
                user.getVerificationStatus() == null ? null : user.getVerificationStatus().name(),
                owner == null ? null : owner.getId(),
                owner == null ? null : owner.getName());
    }
}
