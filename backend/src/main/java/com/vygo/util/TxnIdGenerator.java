package com.vygo.util;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Component
public class TxnIdGenerator {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final String HEX_CHARS = "0123456789ABCDEF";
    private final SecureRandom random = new SecureRandom();

    public String next() {
        return "PY-" + LocalDate.now().format(DATE) + "-" + hex(16);
    }

    private String hex(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(HEX_CHARS.charAt(random.nextInt(HEX_CHARS.length())));
        }
        return sb.toString();
    }
}
