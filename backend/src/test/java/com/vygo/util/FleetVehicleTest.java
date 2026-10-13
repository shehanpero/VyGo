package com.vygo.util;

import com.vygo.entity.Bus.BusType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for the {@link FleetVehicle} registry: allowed seat-count sets,
 * capacity validation/clamping and the permissive fallback for unknown/custom
 * models.
 */
class FleetVehicleTest {

    // ---- registry metadata ----

    @Test
    void expressVehicleAllowsOnly51To53() {
        FleetVehicle yutong = FleetVehicle.YUTONG_C12_PRO;
        assertEquals(Set.of(51, 52, 53), yutong.allowedCapacities());
        assertEquals(List.of(51, 52, 53), yutong.allowedCapacityList(), "allowed list must be sorted");
        assertEquals(53, yutong.nominalCapacity(), "Yutong C12 Pro seats 53 nominally");
        assertEquals("yutong_c12_pro", yutong.id(), "id must match the frontend fleetVariants id");
        assertEquals(ServiceClass.EXPRESS, yutong.serviceClass());
    }

    @Test
    void normalVehicleAllowsVikingSeatSet() {
        FleetVehicle viking = FleetVehicle.ASHOK_LEYLAND_VIKING;
        assertEquals(Set.of(42, 44, 49, 54, 58), viking.allowedCapacities());
        assertEquals(List.of(42, 44, 49, 54, 58), viking.allowedCapacityList());
        assertEquals(54, viking.nominalCapacity(), "Viking seats 54 nominally");
        assertEquals("ashok_leyland_viking", viking.id(), "id must match the frontend fleetVariants id");
        assertEquals(ServiceClass.NORMAL, viking.serviceClass());
    }

    @Test
    void fromModelMatchesDisplayNameCaseAndWhitespaceInsensitively() {
        assertEquals(Optional.of(FleetVehicle.YUTONG_C12_PRO), FleetVehicle.fromModel("Yutong C12 Pro"));
        assertEquals(Optional.of(FleetVehicle.YUTONG_C12_PRO), FleetVehicle.fromModel("yutong c12 pro"));
        assertEquals(Optional.of(FleetVehicle.YUTONG_C12_PRO), FleetVehicle.fromModel("  Yutong   C12  Pro "));
        assertEquals(Optional.of(FleetVehicle.ASHOK_LEYLAND_VIKING), FleetVehicle.fromModel("ASHOK LEYLAND VIKING"));
        assertEquals(Optional.of(FleetVehicle.ASHOK_LEYLAND_VIKING), FleetVehicle.fromModel("Ashok Leyland Viking"));
    }

    @Test
    void fromModelReturnsEmptyForUnknownOrBlankModels() {
        assertTrue(FleetVehicle.fromModel("Kia Granbird").isEmpty(), "custom models must stay unknown");
        assertTrue(FleetVehicle.fromModel("Ashok Leyland").isEmpty(),
                "'Ashok Leyland' alone is NOT the Viking and must not map");
        assertTrue(FleetVehicle.fromModel(null).isEmpty());
        assertTrue(FleetVehicle.fromModel("   ").isEmpty());
    }

    @Test
    void forServiceClassMapsToTheFleetVehicle() {
        assertEquals(Optional.of(FleetVehicle.YUTONG_C12_PRO), FleetVehicle.forServiceClass(ServiceClass.EXPRESS));
        assertEquals(Optional.of(FleetVehicle.ASHOK_LEYLAND_VIKING), FleetVehicle.forServiceClass(ServiceClass.NORMAL));
        assertTrue(FleetVehicle.forServiceClass(null).isEmpty());
    }

    // ---- capacity validation ----

    @Test
    void knownModelIsValidatedAgainstItsOwnAllowedSet() {
        // Yutong C12 Pro -> 51-53, regardless of the bus type field.
        assertTrue(FleetVehicle.capacityError("Yutong C12 Pro", BusType.AC, 52).isEmpty());
        assertTrue(FleetVehicle.capacityError("Yutong C12 Pro", BusType.AC, 53).isEmpty());
        assertTrue(FleetVehicle.capacityError("Yutong C12 Pro", BusType.AC, 45).isPresent());
        assertTrue(FleetVehicle.capacityError("Yutong C12 Pro", BusType.AC, 54).isPresent());

        // Ashok Leyland Viking -> 42/44/49/54/58.
        assertTrue(FleetVehicle.capacityError("Ashok Leyland Viking", BusType.NORMAL, 54).isEmpty());
        assertTrue(FleetVehicle.capacityError("Ashok Leyland Viking", BusType.NORMAL, 58).isEmpty());
        assertTrue(FleetVehicle.capacityError("Ashok Leyland Viking", BusType.NORMAL, 45).isPresent());
        assertTrue(FleetVehicle.capacityError("Ashok Leyland Viking", BusType.NORMAL, 52).isPresent());
    }

    @Test
    void unknownModelFallsBackToServiceClassRange() {
        // Unknown model + EXPRESS bus type -> 51-53.
        assertTrue(FleetVehicle.capacityError("Kia Granbird", BusType.AC, 52).isEmpty());
        assertTrue(FleetVehicle.capacityError("Kia Granbird", BusType.AC, 45).isPresent(),
                "an unknown-model EXPRESS bus must still obey the 51-53 range");
        assertTrue(FleetVehicle.capacityError("TATA LP 909", BusType.LUXURY, 51).isEmpty());
        assertTrue(FleetVehicle.capacityError("Scania K410", BusType.SEMI_LUXURY, 53).isEmpty());

        // Unknown model + NORMAL bus type -> Viking set.
        assertTrue(FleetVehicle.capacityError("TATA Starbus", BusType.NORMAL, 58).isEmpty());
        assertTrue(FleetVehicle.capacityError("Custom Body", BusType.NORMAL, 44).isEmpty());
        assertTrue(FleetVehicle.capacityError("Custom Body", BusType.NORMAL, 45).isPresent());
    }

    @Test
    void nullModelUsesServiceClassDefault() {
        assertTrue(FleetVehicle.capacityError(null, BusType.AC, 52).isEmpty());
        assertTrue(FleetVehicle.capacityError(null, BusType.NORMAL, 54).isEmpty());
        assertTrue(FleetVehicle.capacityError(null, BusType.AC, 45).isPresent());
    }

    @Test
    void nullCapacityIsPermissive() {
        assertTrue(FleetVehicle.capacityError("Yutong C12 Pro", BusType.AC, null).isEmpty());
        assertTrue(FleetVehicle.capacityError(null, BusType.NORMAL, null).isEmpty());
    }

    @Test
    void errorMessageNamesTheVehicleAndAllowedSet() {
        Optional<String> error = FleetVehicle.capacityError("Yutong C12 Pro", BusType.AC, 45);
        assertTrue(error.isPresent());
        assertTrue(error.get().contains("Yutong C12 Pro"), "error must name the vehicle: " + error.get());
        assertTrue(error.get().contains("[51, 52, 53]"), "error must carry the allowed set: " + error.get());

        Optional<String> fallback = FleetVehicle.capacityError("Kia Granbird", BusType.AC, 45);
        assertTrue(fallback.isPresent());
        assertTrue(fallback.get().contains("EXPRESS service class"), "fallback error must name the class: " + fallback.get());
    }

    // ---- DTO helpers ----

    @Test
    void vehicleModelIdPrefersKnownModelThenServiceClass() {
        assertEquals("yutong_c12_pro", FleetVehicle.vehicleModelId("Yutong C12 Pro", ServiceClass.EXPRESS));
        assertEquals("ashok_leyland_viking", FleetVehicle.vehicleModelId("Ashok Leyland Viking", ServiceClass.NORMAL));
        // Unknown model -> service-class default.
        assertEquals("yutong_c12_pro", FleetVehicle.vehicleModelId("Kia Granbird", ServiceClass.EXPRESS));
        assertEquals("ashok_leyland_viking", FleetVehicle.vehicleModelId(null, ServiceClass.NORMAL));
        // No model and no service class -> null (defensive).
        assertEquals(null, FleetVehicle.vehicleModelId(null, null));
    }

    @Test
    void allowedCapacitiesPrefersKnownModelThenServiceClass() {
        assertEquals(List.of(51, 52, 53), FleetVehicle.allowedCapacities("Yutong C12 Pro", ServiceClass.EXPRESS));
        assertEquals(List.of(42, 44, 49, 54, 58),
                FleetVehicle.allowedCapacities("Ashok Leyland Viking", ServiceClass.NORMAL));
        assertEquals(List.of(51, 52, 53), FleetVehicle.allowedCapacities("Kia Granbird", ServiceClass.EXPRESS));
        assertEquals(List.of(42, 44, 49, 54, 58), FleetVehicle.allowedCapacities(null, ServiceClass.NORMAL));
        assertTrue(FleetVehicle.allowedCapacities(null, null).isEmpty());
    }
}
