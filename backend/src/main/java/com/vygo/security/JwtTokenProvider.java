package com.vygo.security;

import com.vygo.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Date;
import java.util.List;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long accessTokenTtlMinutes;

    public JwtTokenProvider(AppProperties appProperties) {
        this.key = Keys.hmacShaKeyFor(appProperties.getJwtSecret().getBytes(StandardCharsets.UTF_8));
        this.accessTokenTtlMinutes = appProperties.getAccessTokenTtlMinutes();
    }

    public String generateToken(SecurityUser user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + Duration.ofMinutes(accessTokenTtlMinutes).toMillis());
        List<String> roles = user.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        return Jwts.builder()
                .subject(String.valueOf(user.userId()))
                .issuedAt(now)
                .expiration(expiry)
                .claim("roles", roles)
                .claim("email", user.getEmail())
                .claim("mobile", user.getMobile())
                .signWith(key)
                .compact();
    }

    public String getUserId(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractUsername(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new JwtException("Invalid JWT token", e);
        }
    }
}
