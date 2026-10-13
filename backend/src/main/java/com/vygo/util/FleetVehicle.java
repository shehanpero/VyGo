package com.vygo.util;

import com.vygo.entity.Bus.BusType;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Fleet vehicle registry: the data-driven source of truth that maps a vehicle
 * model to its service class and the operator-configurable seat-count set.
 * <p>
 * A user cannot toggle this: the frontend renders whichever vehicle the server
 * assigns, and the {@code id()} value mirrors the frontend fleetVariants ids
 * ({@code yutong_c12_pro} | {@code ashok_leyland_viking}).
 * <ul>
 *   <li>{@link #YUTONG_C12_PRO} - Express coach (2+2 reclining): 51-53 seats,
 *       53 nominal (ZK6128H).</li>
 *   <li>{@link #ASHOK_LEYLAND_VIKING} - Normal bench bus (2+3 five-across):
 *       42 / 44 / 49 / 54 / 58 seats, 54 nominal (Sri Lankan build).</li>
 * </ul>
 * <p>
 * Capacity validation is data-driven: when the bus model maps to a known
 * vehicle the vehicle's allowed set wins; unknown/custom models fall back to
 * the service-class default set (see {@link ServiceClass#from(BusType)}), and
 * any capacity is accepted only when neither a model nor a service class
 * applies, so existing seed data and custom buses stay permissive.
 */
public enum FleetVehicle {

    /** Yutong C12 Pro (ZK6128H): 2+2 reclining coach, 51-53 seats (53 nominal). */
    YUTONG_C12_PRO("yutong_c12_pro", "Yutong C12 Pro", ServiceClass.EXPRESS,
            Set.of(51, 52, 53), 53),

    /** Ashok Leyland Viking (Sri Lankan build): 2+3 bench, 42/44/49/54/58 seats (54 nominal). */
    ASHOK_LEYLAND_VIKING("ashok_leyland_viking", "Ashok Leyland Viking", ServiceClass.NORMAL,
            Set.of(42, 44, 49, 54, 58), 54);

    private final String id;
    private final String displayName;
    private final ServiceClass serviceClass;
    private final Set<Integer> allowedCapacities;
    private final int nominalCapacity;

    FleetVehicle(String id, String displayName, ServiceClass serviceClass,
                 Set<Integer> allowedCapacities, int nominalCapacity) {
        this.id = id;
        this.displayName = displayName;
        this.serviceClass = serviceClass;
        this.allowedCapacities = allowedCapacities;
        this.nominalCapacity = nominalCapacity;
    }

    /** Frontend fleetVariants id, e.g. {@code yutong_c12_pro}. */
    public String id() {
        return id;
    }

    /** Operator-facing model label, e.g. {@code Yutong C12 Pro}. */
    public String displayName() {
        return displayName;
    }

    public ServiceClass serviceClass() {
        return serviceClass;
    }

    /** Allowed passenger-seat counts for this vehicle. */
    public Set<Integer> allowedCapacities() {
        return allowedCapacities;
    }

    /** Nominal (default) passenger-seat count for this vehicle. */
    public int nominalCapacity() {
        return nominalCapacity;
    }

    /** Allowed passenger-seat counts as a stable, sorted list (for DTO output). */
    public List<Integer> allowedCapacityList() {
        return allowedCapacities.stream().sorted().toList();
    }

    /**
     * Look up a vehicle by its operator-facing model string. Matching is
     * case/whitespace-insensitive so {@code "yutong  c12   pro"} still resolves.
     */
    public static Optional<FleetVehicle> fromModel(String model) {
        if (model == null || model.isBlank()) {
            return Optional.empty();
        }
        String normalized = normalize(model);
        for (FleetVehicle vehicle : values()) {
            if (normalize(vehicle.displayName).equals(normalized)) {
                return Optional.of(vehicle);
            }
        }
        return Optional.empty();
    }

    /** The fleet's default vehicle for a service class (EXPRESS -&gt; Yutong, NORMAL -&gt; Viking). */
    public static Optional<FleetVehicle> forServiceClass(ServiceClass serviceClass) {
        if (serviceClass == null) {
            return Optional.empty();
        }
        for (FleetVehicle vehicle : values()) {
            if (vehicle.serviceClass == serviceClass) {
                return Optional.of(vehicle);
            }
        }
        return Optional.empty();
    }

    /**
     * Resolve the frontend vehicle-model id for a bus: a known model wins,
     * otherwise the service-class default ({@code yutong_c12_pro} for EXPRESS,
     * {@code ashok_leyland_viking} for NORMAL).
     */
    public static String vehicleModelId(String model, ServiceClass serviceClass) {
        return fromModel(model)
                .or(() -> forServiceClass(serviceClass))
                .map(FleetVehicle::id)
                .orElse(null);
    }

    /**
     * Resolve the allowed seat-count list for a bus (model first, then the
     * service-class default). Empty only when no vehicle applies.
     */
    public static List<Integer> allowedCapacities(String model, ServiceClass serviceClass) {
        return fromModel(model)
                .or(() -> forServiceClass(serviceClass))
                .map(FleetVehicle::allowedCapacityList)
                .orElse(List.of());
    }

    /**
     * Validate an operator-supplied capacity. Returns a user-facing error when
     * the capacity is outside the allowed set (known model set first, then the
     * service-class default); empty means the capacity is acceptable.
     */
    public static Optional<String> capacityError(String model, BusType busType, Integer capacity) {
        if (capacity == null) {
            return Optional.empty(); // the API contract guards non-null (@Min(1)); stay permissive
        }
        ServiceClass serviceClass = ServiceClass.from(busType);
        Optional<FleetVehicle> byModel = fromModel(model);
        FleetVehicle vehicle = byModel.orElseGet(() -> forServiceClass(serviceClass).orElse(null));
        if (vehicle == null) {
            return Optional.empty(); // neither a known model nor a service class applies
        }
        if (!vehicle.allowedCapacities.contains(capacity)) {
            String scope = byModel.isPresent()
                    ? vehicle.displayName
                    : vehicle.serviceClass.name() + " service class";
            return Optional.of("Capacity " + capacity + " is not allowed for " + scope
                    + "; allowed seat counts: " + vehicle.allowedCapacityList());
        }
        return Optional.empty();
    }

    private static String normalize(String value) {
        return value.trim().toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
    }
}
