package com.vygo.util;

import java.time.LocalDate;
import java.time.Year;

/**
 * Structural validation for Sri Lankan identity documents.
 *
 * <p>NIC numbers embed the holder's date of birth and gender, so we validate the
 * format <em>and</em> the encoded birth day (a real, reliable check). The 12-digit
 * NIC's final check digit algorithm is not published by the Department for
 * Registration of Persons, so it is deliberately not enforced here to avoid
 * rejecting genuine cards.</p>
 *
 * <ul>
 *   <li>Old NIC: {@code YYDDDSSSSV} — 9 digits + {@code V}/{@code X}</li>
 *   <li>New NIC: {@code YYYYDDDSSSSS C} — 12 digits</li>
 * </ul>
 * where {@code DDD} is the day of year (females have 500 added).
 */
public final class SriLankaIdValidator {

    private SriLankaIdValidator() {
    }

    /**
     * @return {@code null} when valid, otherwise a user-facing error message.
     */
    public static String validateIdNumber(String idType, String rawNumber) {
        if (rawNumber == null || rawNumber.isBlank()) {
            return "Document number is required";
        }
        String type = idType == null ? "" : idType.trim().toUpperCase();
        return switch (type) {
            case "NIC" -> validateNic(rawNumber);
            case "PASSPORT" -> validatePassport(rawNumber);
            default -> "ID type must be NIC or PASSPORT";
        };
    }

    public static String validateNic(String raw) {
        String nic = normalize(raw);
        if (nic.matches("\\d{9}[VX]")) {
            return validateOldNic(nic);
        }
        if (nic.matches("\\d{12}")) {
            return validateNewNic(nic);
        }
        return "Enter a valid NIC, e.g. 199012345678 or 901234567V";
    }

    public static String validatePassport(String raw) {
        String p = normalize(raw);
        if (p.matches("[A-Z]{1,2}\\d{6,9}")) {
            return null;
        }
        return "Enter a valid passport number, e.g. N1234567";
    }

    /** Sri Lankan driving licence numbers are alphanumeric (often NIC-based). */
    public static String validateLicence(String raw) {
        String l = normalize(raw);
        if (l.matches("[A-Z0-9]{6,15}")) {
            return null;
        }
        return "Enter a valid driving licence number";
    }

    public static String normalize(String raw) {
        return raw == null ? "" : raw.replaceAll("[\\s-]", "").toUpperCase();
    }

    private static String validateOldNic(String nic) {
        int year = Integer.parseInt(nic.substring(0, 2));
        int day = Integer.parseInt(nic.substring(2, 5));
        return validateBirthDay(year, day, 2, "NIC");
    }

    private static String validateNewNic(String nic) {
        int year = Integer.parseInt(nic.substring(0, 4));
        int day = Integer.parseInt(nic.substring(4, 7));
        return validateBirthDay(year, day, 4, "NIC");
    }

    private static String validateBirthDay(int year, int day, int yearDigits, String doc) {
        int fullYear = year;
        if (yearDigits == 2) {
            fullYear = year >= 30 ? 1900 + year : 2000 + year;
        }
        int current = Year.now().getValue();
        if (fullYear < 1900 || fullYear > current) {
            return "The birth year encoded in the " + doc + " is not valid";
        }
        int effectiveDay = day > 500 ? day - 500 : day;
        if (effectiveDay < 1 || effectiveDay > 366) {
            return "The birth day encoded in the " + doc + " is not valid";
        }
        int maxDay = LocalDate.ofYearDay(fullYear, 1).lengthOfYear();
        if (effectiveDay > maxDay) {
            return "The birth date encoded in the " + doc + " is not a real date";
        }
        return null;
    }

    /** Human-readable birth info decoded from a NIC (for admin review context). */
    public static String describeNic(String raw) {
        String nic = normalize(raw);
        try {
            int year;
            int day;
            if (nic.matches("\\d{9}[VX]")) {
                year = Integer.parseInt(nic.substring(0, 2));
                year = year >= 30 ? 1900 + year : 2000 + year;
                day = Integer.parseInt(nic.substring(2, 5));
            } else if (nic.matches("\\d{12}")) {
                year = Integer.parseInt(nic.substring(0, 4));
                day = Integer.parseInt(nic.substring(4, 7));
            } else {
                return null;
            }
            boolean female = day > 500;
            int effectiveDay = female ? day - 500 : day;
            if (effectiveDay < 1 || effectiveDay > 366) {
                return null;
            }
            LocalDate dob = LocalDate.ofYearDay(year, effectiveDay);
            return "DOB " + dob + ", " + (female ? "female" : "male");
        } catch (Exception e) {
            return null;
        }
    }
}
