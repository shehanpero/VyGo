package com.vygo.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Runs before {@link DataInitializer} to reconcile H2 native ENUM columns with
 * values added to Java enums after the schema was first created (Hibernate's
 * {@code ddl-auto: update} does not alter existing ENUM constraints).
 */
@Component
@Profile("dev")
@Order(1)
public class DevSchemaMigration implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DevSchemaMigration.class);

    private final JdbcTemplate jdbcTemplate;

    public DevSchemaMigration(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        alterEnum("roles", "code", "'PASSENGER','OPERATOR','CONDUCTOR','DRIVER','ADMIN'");
    }

    private void alterEnum(String table, String column, String values) {
        try {
            jdbcTemplate.execute("ALTER TABLE " + table + " ALTER COLUMN " + column + " ENUM(" + values + ")");
        } catch (Exception e) {
            log.debug("Enum migration skipped for {}.{}: {}", table, column, e.getMessage());
        }
    }
}
