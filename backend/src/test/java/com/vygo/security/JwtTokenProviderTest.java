package com.vygo.security;

import com.vygo.config.AppProperties;
import com.vygo.entity.Role;
import com.vygo.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties();
        props.setSecret("test-secret-key-that-is-long-enough-for-hs256-0123456789");
        props.setAccessTokenTtlMinutes(60);
        tokenProvider = new JwtTokenProvider(props);
    }

    private SecurityUser user(String email, String mobile, Role.RoleCode code) {
        Role role = Role.builder().code(code).name(code.name()).build();
        User u = new User();
        u.setId(42L);
        u.setEmail(email);
        u.setMobile(mobile);
        u.setPasswordHash("hash");
        u.setEnabled(true);
        u.setRoles(Set.of(role));
        return SecurityUser.from(u);
    }

    @Test
    void generatesAndValidatesToken() {
        String token = tokenProvider.generateToken(user("nimal@vygo.lk", "0712345678", Role.RoleCode.PASSENGER));
        assertTrue(tokenProvider.validateToken(token));
    }

    @Test
    void extractsUserIdAndUsername() {
        String token = tokenProvider.generateToken(user("nimal@vygo.lk", "0712345678", Role.RoleCode.PASSENGER));
        assertEquals("42", tokenProvider.getUserId(token));
        assertEquals("42", tokenProvider.extractUsername(token));
    }

    @Test
    void rejectsTamperedToken() {
        String token = tokenProvider.generateToken(user("a@vygo.lk", "0712345678", Role.RoleCode.PASSENGER));
        String tampered = token.substring(0, token.length() - 4) + "AAAA";
        assertFalse(tokenProvider.validateToken(tampered));
    }

    @Test
    void rejectsGarbageToken() {
        assertFalse(tokenProvider.validateToken("not-a-jwt"));
        assertFalse(tokenProvider.validateToken(""));
        assertFalse(tokenProvider.validateToken(null));
    }
}
