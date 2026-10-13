package com.vygo.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vygo.exception.ErrorResponse;
import com.vygo.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;
    private final Environment environment;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter, AppProperties appProperties, ObjectMapper objectMapper,
                          Environment environment) {
        this.jwtFilter = jwtFilter;
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
        this.environment = environment;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(permitAllMatchers())
                        .permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(eh -> eh
                        .authenticationEntryPoint((request, response, ex) ->
                                writeError(request, response, 401, "Unauthorized"))
                        .accessDeniedHandler((request, response, ex) ->
                                writeError(request, response, 403, "Forbidden")))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private String[] permitAllMatchers() {
        boolean dev = environment.acceptsProfiles(Profiles.of("dev"));
        List<String> matchers = new ArrayList<>(Arrays.asList(
                "/api/v1/auth/**",
                "/api/v1/buses/**",
                "/api/v1/trips/*/seats",
                "/api/v1/routes",
                "/api/v1/route-tools",
                "/api/v1/route-tools/**",
                "/api/v1/assistant/**",
                "/api/v1/operators/public",
                "/api/v1/reviews/operator/**",
                "/api/v1/payments/sandbox/**",
                "/api/v1/health",
                "/api/v1/app/**",
                "/uploads/**",
                "/error"));
        if (dev) {
            matchers.add("/v3/api-docs/**");
            matchers.add("/swagger-ui/**");
            matchers.add("/swagger-ui.html");
            matchers.add("/h2-console/**");
        }
        return matchers.toArray(new String[0]);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        String allowedOrigins = appProperties.getCorsAllowedOrigins();
        if (allowedOrigins != null && !allowedOrigins.isBlank()) {
            config.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .toList());
        }
        // Fall back to pattern matching so any LAN origin on the dev port (and
        // the opaque `null` origin of file://-loaded Expo WebView bundles) is
        // accepted even though it can't be enumerated in application.yml.
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setExposedHeaders(List.of("Location"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private void writeError(HttpServletRequest request, HttpServletResponse response, int status, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), ErrorResponse.now(status, message, request.getRequestURI()));
    }
}
