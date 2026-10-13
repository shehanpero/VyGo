package com.vygo.service;

import com.vygo.entity.Route;
import com.vygo.repository.RouteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CityGazetteerTest {

    private CityGazetteer gazetteer;

    @BeforeEach
    void setUp() {
        RouteRepository routeRepository = mock(RouteRepository.class);
        when(routeRepository.findAll()).thenReturn(List.of(
                route("Colombo", "Kandy"),
                route("Colombo", "Galle"),
                route("Makumbura", "Matara"),
                route("Kadawatha", "Galle"),
                route("Kaduwela", "Matara"),
                route("Colombo", "Nuwara Eliya"),
                route("Katunayake Airport", "Colombo"),
                route("Mount Lavinia", "Kottawa"),
                route("Borella", "Kotte"),
                route("ja ela", "Bambalapitiya"),
                route("Colombo", "Negombo"),
                route("Colombo", "Jaffna"),
                route("Kollupitiya", "Kaduwela"),
                route("Arugam Bay", "Ampara"),
                route("Panadura", "Ratnapura")));
        gazetteer = new CityGazetteer(routeRepository);
    }

    @Test
    void normalizesKnownCitiesCaseInsensitiveAndTrimmed() {
        assertEquals("Colombo", gazetteer.normalize("colombo").orElseThrow());
        assertEquals("Colombo", gazetteer.normalize("  Colombo  ").orElseThrow());
        assertEquals("Kandy", gazetteer.normalize("KANDY").orElseThrow());
        assertEquals("Matara", gazetteer.normalize("matara").orElseThrow());
    }

    @Test
    void normalizesAliasesToCanonical() {
        assertEquals("Kandy", gazetteer.normalize("kandy clock tower").orElseThrow());
        assertEquals("Kandy", gazetteer.normalize("kandy good shed").orElseThrow());
        assertEquals("Colombo", gazetteer.normalize("colombo fort").orElseThrow());
        assertEquals("Colombo", gazetteer.normalize("colombo bastian mawatha").orElseThrow());
        assertEquals("Galle", gazetteer.normalize("galle fort").orElseThrow());
        assertEquals("Makumbura", gazetteer.normalize("makumbara").orElseThrow());
        assertEquals("Makumbura", gazetteer.normalize("makumbura").orElseThrow());
        assertEquals("Colombo", gazetteer.normalize("town hall").orElseThrow());
        assertEquals("Kotte", gazetteer.normalize("sri j'pura hospital").orElseThrow());
    }

    @Test
    void normalizesMultiWordCitiesWithTitleCase() {
        assertEquals("Nuwara Eliya", gazetteer.normalize("nuwara eliya").orElseThrow());
        assertEquals("Katunayake Airport", gazetteer.normalize("katunayake airport").orElseThrow());
        assertEquals("Mount Lavinia", gazetteer.normalize("mt lavinia").orElseThrow());
        assertEquals("Ja Ela", gazetteer.normalize("ja ela").orElseThrow());
        assertEquals("Arugam Bay", gazetteer.normalize("arugam bay").orElseThrow());
    }

    @Test
    void normalizesExpandedNetworkAliases() {
        assertEquals("Pettah", gazetteer.normalize("pettah").orElseThrow());
        assertEquals("Pettah", gazetteer.normalize("colombo pettah").orElseThrow());
        assertEquals("Pettah", gazetteer.normalize("fort").orElseThrow());
        assertEquals("Bibila", gazetteer.normalize("bibile").orElseThrow());
        assertEquals("Siyambalanduwa", gazetteer.normalize("siyambalanduva").orElseThrow());
        assertEquals("Embilipitiya", gazetteer.normalize("embilipitya").orElseThrow());
        assertEquals("Katunayake Airport", gazetteer.normalize("katunayake").orElseThrow());
        assertEquals("Katunayake Airport", gazetteer.normalize("katunayake international airport").orElseThrow());
        assertEquals("Katunayake Airport", gazetteer.normalize("colombo airport").orElseThrow());
        assertEquals("Vavuniya", gazetteer.normalize("vavunia").orElseThrow());
        assertEquals("Polonnaruwa", gazetteer.normalize("polonaruwa").orElseThrow());
        assertEquals("Welimada", gazetteer.normalize("wellimada").orElseThrow());
        assertEquals("Hambantota", gazetteer.normalize("hambanota").orElseThrow());
        assertEquals("Bandarawela", gazetteer.normalize("bandarawela").orElseThrow());
        assertEquals("Haputale", gazetteer.normalize("haputale").orElseThrow());
        assertEquals("Wellawaya", gazetteer.normalize("wellawaya").orElseThrow());
        assertEquals("Wellawaya", gazetteer.normalize("welawaya").orElseThrow());
        assertEquals("Mattala", gazetteer.normalize("mattala").orElseThrow());
        assertEquals("Gampola", gazetteer.normalize("gampola").orElseThrow());
        assertEquals("Dambulla", gazetteer.normalize("dambulla").orElseThrow());
    }

    @Test
    void findCitiesRecognizesExpandedNetworkAliases() {
        assertEquals(List.of("Pettah", "Jaffna"), gazetteer.findCities("bus from pettah to jaffna"));
        assertEquals(List.of("Katunayake Airport", "Colombo"), gazetteer.findCities("katunayake to colombo"));
        assertEquals(List.of("Pettah", "Kandy"), gazetteer.findCities("colombo pettah to kandy"));
    }

    @Test
    void unknownCityReturnsEmpty() {
        assertTrue(gazetteer.normalize("unknown city").isEmpty());
        assertTrue(gazetteer.normalize("colom").isEmpty());
    }

    @Test
    void nullOrBlankReturnsEmpty() {
        assertTrue(gazetteer.normalize(null).isEmpty());
        assertTrue(gazetteer.normalize("").isEmpty());
        assertTrue(gazetteer.normalize("   ").isEmpty());
    }

    @Test
    void findCitiesMatchesLongestFirstInOrder() {
        assertEquals(List.of("Colombo", "Kandy"), gazetteer.findCities("bus from colombo to kandy"));
        assertEquals(List.of("Colombo", "Nuwara Eliya"), gazetteer.findCities("colombo to nuwara eliya"));
        assertEquals(List.of("Nuwara Eliya", "Colombo"), gazetteer.findCities("nuwara eliya to colombo"));
        assertEquals(List.of("Makumbura", "Matara"), gazetteer.findCities("makumbara to matara"));
    }

    @Test
    void findCitiesAliasConsumesWholePhraseWithoutOverlap() {
        assertEquals(List.of("Kandy", "Galle"), gazetteer.findCities("kandy clock tower to galle"));
        assertEquals(List.of("Colombo", "Galle"), gazetteer.findCities("colombo fort to galle fort"));
        assertEquals(List.of("Kandy"), gazetteer.findCities("i want the kandy good shed"));
    }

    @Test
    void findCitiesDoesNotMatchInsideLargerWord() {
        assertTrue(gazetteer.findCities("colombokandy").isEmpty());
        assertTrue(gazetteer.findCities("kandyland").isEmpty());
    }

    @Test
    void findCitiesNullOrBlankReturnsEmptyList() {
        assertTrue(gazetteer.findCities(null).isEmpty());
        assertTrue(gazetteer.findCities("").isEmpty());
        assertTrue(gazetteer.findCities("   ").isEmpty());
    }

    @Test
    void containsAnyCityIsTrueWhenAnyCanonicalMatches() {
        assertTrue(gazetteer.containsAnyCity("going to kandy today"));
        assertTrue(gazetteer.containsAnyCity("i need a bus from makumbara to matara"));
        assertTrue(gazetteer.containsAnyCity("hello nuwara eliya please"));
    }

    @Test
    void containsAnyCityIsFalseForUnknownOrBlank() {
        assertFalse(gazetteer.containsAnyCity("nothing to see here"));
        assertFalse(gazetteer.containsAnyCity("book a refund"));
        assertFalse(gazetteer.containsAnyCity(null));
        assertFalse(gazetteer.containsAnyCity("  "));
    }

    private static Route route(String from, String to) {
        return Route.builder().fromCity(from).toCity(to).build();
    }
}
