package com.vygo.service;

import com.vygo.entity.Route;
import com.vygo.repository.RouteRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Component
public class CityGazetteer {

    private static final Map<String, String> ALIASES = buildAliases();

    private final RouteRepository routeRepository;
    private volatile Snapshot snapshot;

    public CityGazetteer(RouteRepository routeRepository) {
        this.routeRepository = routeRepository;
    }

    public Optional<String> normalize(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String key = raw.trim().toLowerCase(Locale.ROOT);
        if (key.isEmpty()) {
            return Optional.empty();
        }
        String canonical = snapshot().byLower.get(key);
        return Optional.ofNullable(canonical);
    }

    public List<String> findCities(String text) {
        return findCityMatches(text).stream()
                .map(CityMatch::city)
                .toList();
    }

    public List<CityMatch> findCityMatches(String text) {
        if (text == null) {
            return List.of();
        }
        String lower = text.trim().toLowerCase(Locale.ROOT);
        if (lower.isEmpty()) {
            return List.of();
        }
        List<CityMatch> result = new ArrayList<>();
        int index = 0;
        int length = lower.length();
        while (index < length) {
            boolean matched = false;
            for (Map.Entry<String, String> candidate : snapshot().candidates) {
                String key = candidate.getKey();
                int end = index + key.length();
                if (end <= length
                        && lower.startsWith(key, index)
                        && hasLeftBoundary(lower, index)
                        && hasRightBoundary(lower, end)) {
                    result.add(new CityMatch(candidate.getValue(), index));
                    index = end;
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                index++;
            }
        }
        return result;
    }

    public boolean containsAnyCity(String lowerText) {
        if (lowerText == null || lowerText.isBlank()) {
            return false;
        }
        return !findCities(lowerText).isEmpty();
    }

    private Snapshot snapshot() {
        Snapshot current = snapshot;
        if (current == null) {
            synchronized (this) {
                current = snapshot;
                if (current == null) {
                    current = load();
                    snapshot = current;
                }
            }
        }
        return current;
    }

    private Snapshot load() {
        Map<String, String> byLower = new LinkedHashMap<>();
        for (Route route : routeRepository.findAll()) {
            addCity(byLower, route.getFromCity());
            addCity(byLower, route.getToCity());
        }
        for (Map.Entry<String, String> alias : ALIASES.entrySet()) {
            byLower.put(alias.getKey(), alias.getValue());
        }
        List<Map.Entry<String, String>> candidates = new ArrayList<>(byLower.entrySet());
        candidates.sort(Comparator.comparingInt((Map.Entry<String, String> entry) -> entry.getKey().length())
                .reversed());
        return new Snapshot(byLower, List.copyOf(candidates));
    }

    private static void addCity(Map<String, String> byLower, String city) {
        if (city == null) {
            return;
        }
        String key = city.trim().toLowerCase(Locale.ROOT);
        if (key.isEmpty()) {
            return;
        }
        byLower.put(key, titleCase(city));
    }

    private static String titleCase(String city) {
        String[] words = city.trim().split("\\s+");
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            String word = words[i];
            if (word.isEmpty()) {
                continue;
            }
            if (i > 0) {
                builder.append(' ');
            }
            builder.append(Character.toUpperCase(word.charAt(0)));
            if (word.length() > 1) {
                builder.append(word.substring(1).toLowerCase(Locale.ROOT));
            }
        }
        return builder.toString();
    }

    private static boolean hasLeftBoundary(String lower, int start) {
        return start == 0 || !Character.isLetterOrDigit(lower.charAt(start - 1));
    }

    private static boolean hasRightBoundary(String lower, int end) {
        return end >= lower.length() || !Character.isLetterOrDigit(lower.charAt(end));
    }

    private static Map<String, String> buildAliases() {
        Map<String, String> aliases = new HashMap<>();
        aliases.put("makumbara", "Makumbura");
        aliases.put("colombo fort", "Colombo");
        aliases.put("colombo bastian mawatha", "Colombo");
        aliases.put("bastian mawatha", "Colombo");
        aliases.put("colombo town hall", "Colombo");
        aliases.put("town hall", "Colombo");
        aliases.put("gangarama", "Colombo");
        aliases.put("gangaramaya", "Colombo");
        aliases.put("kandy clock tower", "Kandy");
        aliases.put("kandy good shed", "Kandy");
        aliases.put("good shed", "Kandy");
        aliases.put("kandy bus stand", "Kandy");
        aliases.put("galle fort", "Galle");
        aliases.put("galle bus stand", "Galle");
        aliases.put("sri j'pura", "Kotte");
        aliases.put("sri j'pura hospital", "Kotte");
        aliases.put("sri jayawardenepura", "Kotte");
        aliases.put("sri jayawardhanapura", "Kotte");
        aliases.put("sri jayewardenepura", "Kotte");
        aliases.put("colpetty", "Kollupitiya");
        aliases.put("mt lavinia", "Mount Lavinia");
        aliases.put("ja-ela", "Ja Ela");
        aliases.put("cmb airport", "Katunayake Airport");
        aliases.put("bandaranaike international airport", "Katunayake Airport");
        // Expanded network: Pettah is now a canonical route city (Pettah-Jaffna/Vavuniya, 122/x)
        aliases.put("pettah", "Pettah");
        aliases.put("colombo pettah", "Pettah");
        aliases.put("fort", "Pettah");
        // New corridor cities and alternate spellings
        aliases.put("bibile", "Bibila");
        aliases.put("siyambalanduva", "Siyambalanduwa");
        aliases.put("embilipitya", "Embilipitiya");
        aliases.put("katunayake", "Katunayake Airport");
        aliases.put("katunayake international airport", "Katunayake Airport");
        aliases.put("colombo airport", "Katunayake Airport");
        aliases.put("vavunia", "Vavuniya");
        aliases.put("polonaruwa", "Polonnaruwa");
        aliases.put("wellimada", "Welimada");
        aliases.put("hambanota", "Hambantota");
        // Via / boarding-point cities users may type (not all are route endpoints)
        aliases.put("bandarawela", "Bandarawela");
        aliases.put("haputale", "Haputale");
        aliases.put("wellawaya", "Wellawaya");
        aliases.put("welawaya", "Wellawaya");
        aliases.put("mattala", "Mattala");
        aliases.put("hambantota", "Hambantota");
        aliases.put("gampola", "Gampola");
        aliases.put("dambulla", "Dambulla");
        return Map.copyOf(aliases);
    }

    private record Snapshot(Map<String, String> byLower, List<Map.Entry<String, String>> candidates) {
    }

    public record CityMatch(String city, int start) {
    }
}
