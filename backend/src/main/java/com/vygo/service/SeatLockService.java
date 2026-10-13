package com.vygo.service;

import com.vygo.config.AppProperties;
import com.vygo.dto.booking.ConflictDetail;
import com.vygo.dto.booking.LockSeatsRequest;
import com.vygo.dto.booking.LockSeatsResponse;
import com.vygo.dto.booking.SuggestedSeat;
import com.vygo.entity.BoardingPoint;
import com.vygo.entity.SeatInventory;
import com.vygo.entity.SeatInventory.SeatStatus;
import com.vygo.entity.Trip;
import com.vygo.exception.BadRequestException;
import com.vygo.exception.ForbiddenException;
import com.vygo.exception.NotFoundException;
import com.vygo.exception.SeatLockExpiredException;
import com.vygo.exception.SeatUnavailableException;
import com.vygo.repository.BoardingPointRepository;
import com.vygo.repository.SeatInventoryRepository;
import com.vygo.repository.TripRepository;
import com.vygo.util.ServiceClass;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class SeatLockService {

    public record SeatLock(String token, Long userId, Long tripId, Set<String> seats,
                           LocalDateTime expiresAt, BigDecimal totalFare) {
    }

    private final ConcurrentHashMap<String, SeatLock> locks = new ConcurrentHashMap<>();

    private final TripRepository tripRepository;
    private final SeatInventoryRepository seatInventoryRepository;
    private final BoardingPointRepository boardingPointRepository;
    private final TripService tripService;
    private final AppProperties appProperties;

    @PersistenceContext
    private EntityManager entityManager;

    public SeatLockService(TripRepository tripRepository,
                           SeatInventoryRepository seatInventoryRepository,
                           BoardingPointRepository boardingPointRepository,
                           TripService tripService,
                           AppProperties appProperties) {
        this.tripRepository = tripRepository;
        this.seatInventoryRepository = seatInventoryRepository;
        this.boardingPointRepository = boardingPointRepository;
        this.tripService = tripService;
        this.appProperties = appProperties;
    }

    /**
     * Atomically acquires a hold on the requested seats.
     * <p>
     * The acquisition is serialized by {@link SeatInventoryRepository#lockSeatsForUpdate}
     * (SELECT ... FOR UPDATE) so two concurrent callers cannot both see the same
     * seat as AVAILABLE: the loser of the row-lock re-reads the committed row,
     * sees LOCKED/BOOKED, and fails with a structured {@code SeatUnavailableException}.
     */
    @Transactional
    public LockSeatsResponse lock(Long userId, LockSeatsRequest req) {
        Trip trip = tripRepository.findById(req.tripId())
                .orElseThrow(() -> new NotFoundException("Trip not found"));
        tripService.materializeSeats(trip);
        tripService.releaseExpiredLocks(trip.getId());
        validateBoardingPoints(trip, req.boardingPointId(), req.dropoffPointId());

        List<SeatInventory> rows = seatInventoryRepository.lockSeatsForUpdate(
                req.tripId(), new HashSet<>(req.seatNumbers()));
        // The rows may already sit in the first-level cache (releaseExpiredLocks
        // loads the whole seat list). For the loser of a concurrent double-lock
        // race, the SELECT ... FOR UPDATE has blocked until the winner commits,
        // but Hibernate would hand back the stale cached AVAILABLE instance and
        // mask the committed LOCKED state. Refresh forces a re-read of the row
        // under the acquired DB lock so the status check below is authoritative.
        for (SeatInventory row : rows) {
            entityManager.refresh(row);
        }
        Map<String, SeatInventory> byNumber = rows.stream()
                .collect(Collectors.toMap(SeatInventory::getSeatNumber, Function.identity()));

        for (String seatNumber : req.seatNumbers()) {
            if (!byNumber.containsKey(seatNumber)) {
                throw new BadRequestException("Seat not found: " + seatNumber);
            }
        }

        // Collect ALL seats that are no longer available, not just the first,
        // so the 409 carries every conflicting seat plus alternatives.
        List<String> conflicting = req.seatNumbers().stream()
                .filter(n -> byNumber.get(n).getStatus() != SeatStatus.AVAILABLE)
                .sorted()
                .toList();
        if (!conflicting.isEmpty()) {
            List<SuggestedSeat> alternatives = findAlternatives(trip, req.seatNumbers(), conflicting);
            ConflictDetail detail = new ConflictDetail("SEAT_UNAVAILABLE",
                    "Some selected seats are no longer available", conflicting, alternatives);
            throw new SeatUnavailableException(
                    "Seat " + conflicting.get(0) + " is no longer available", detail);
        }

        BigDecimal totalFare = BigDecimal.ZERO;
        Set<String> lockedSeats = new LinkedHashSet<>();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(appProperties.getSeatLockTtlMinutes());
        for (String seatNumber : req.seatNumbers()) {
            SeatInventory seat = byNumber.get(seatNumber);
            seat.setStatus(SeatStatus.LOCKED);
            seat.setLockOwner(userId);
            seat.setLockExpiresAt(expiresAt);
            lockedSeats.add(seatNumber);
            totalFare = totalFare.add(seat.getPrice());
        }
        seatInventoryRepository.saveAll(rows);

        String token = UUID.randomUUID().toString();
        locks.put(token, new SeatLock(token, userId, trip.getId(), lockedSeats, expiresAt,
                totalFare.setScale(2, RoundingMode.HALF_UP)));
        return new LockSeatsResponse(token, lockedSeats.stream().sorted().toList(),
                com.vygo.util.IsoTime.instant(expiresAt), totalFare.setScale(2, RoundingMode.HALF_UP));
    }

    /**
     * Redeems a lock token exactly once.
     * <p>
     * Ownership is validated BEFORE the token is removed so one user cannot burn
     * another user's token; expiry raises a typed 409 (SEAT_LOCK_EXPIRED) instead
     * of a generic 400; the final {@code remove(token, lock)} is atomic so a
     * double-submitted confirm can only win once.
     */
    public SeatLock consume(String token, Long userId) {
        SeatLock lock = locks.get(token);
        if (lock == null) {
            throw new BadRequestException("Lock token is invalid");
        }
        if (!lock.userId().equals(userId)) {
            throw new ForbiddenException("Lock does not belong to this user");
        }
        if (lock.expiresAt().isBefore(LocalDateTime.now())) {
            locks.remove(token, lock);
            ConflictDetail detail = new ConflictDetail("SEAT_LOCK_EXPIRED",
                    "Seat lock has expired", lock.seats().stream().sorted().toList(), List.of());
            throw new SeatLockExpiredException("Seat lock has expired", detail);
        }
        if (!locks.remove(token, lock)) {
            throw new BadRequestException("Lock token is invalid");
        }
        return lock;
    }

    // ---- alternatives ----

    private record Layout(int perRow, int left) {
    }

    private Layout layoutFor(Trip trip) {
        ServiceClass serviceClass = ServiceClass.from(trip.getSchedule().getBus().getBusType());
        return new Layout(serviceClass.seatsPerRow(), serviceClass.leftSeats());
    }

    private int rowOf(Layout layout, String seatNumber) {
        return (Integer.parseInt(seatNumber) - 1) / layout.perRow() + 1; // 1-based row
    }

    private int colOf(Layout layout, String seatNumber) {
        return (Integer.parseInt(seatNumber) - 1) % layout.perRow();
    }

    private String sideOf(Layout layout, String seatNumber) {
        return colOf(layout, seatNumber) < layout.left() ? "LEFT" : "RIGHT";
    }

    /**
     * Finds up to 2 nearest available alternatives per conflicting seat.
     * Priority: same row + same side, then same row, then nearest row
     * (tie-broken by column distance, then seat number). Seats the user already
     * asked for are never suggested, and overall output is deduplicated/bounded.
     */
    private List<SuggestedSeat> findAlternatives(Trip trip, List<String> requestedSeats,
                                                 List<String> conflictingSeats) {
        Layout layout = layoutFor(trip);
        List<SeatInventory> all = seatInventoryRepository.findByTripIdOrderBySeatNumberAsc(trip.getId());
        Set<String> requested = new HashSet<>(requestedSeats);
        Set<String> chosen = new HashSet<>(conflictingSeats);

        List<SuggestedSeat> alternatives = new ArrayList<>();
        for (String conflicting : conflictingSeats) {
            List<SuggestedSeat> forSeat = all.stream()
                    .filter(s -> s.getStatus() == SeatStatus.AVAILABLE)
                    .filter(s -> !requested.contains(s.getSeatNumber()))
                    .filter(s -> !chosen.contains(s.getSeatNumber()))
                    .sorted(Comparator
                            .comparingInt((SeatInventory s) -> tier(layout, s.getSeatNumber(), conflicting))
                            .thenComparingInt(s -> Math.abs(rowOf(layout, s.getSeatNumber()) - rowOf(layout, conflicting)))
                            .thenComparingInt(s -> Math.abs(colOf(layout, s.getSeatNumber()) - colOf(layout, conflicting)))
                            .thenComparing(SeatInventory::getSeatNumber))
                    .limit(2)
                    .map(s -> new SuggestedSeat(s.getSeatNumber(),
                            rowOf(layout, s.getSeatNumber()),
                            sideOf(layout, s.getSeatNumber()),
                            s.getPrice()))
                    .toList();
            for (SuggestedSeat seat : forSeat) {
                if (alternatives.size() >= 4) {
                    return alternatives;
                }
                alternatives.add(seat);
                chosen.add(seat.seatNumber());
            }
        }
        return alternatives;
    }

    private int tier(Layout layout, String candidate, String conflict) {
        boolean sameRow = rowOf(layout, candidate) == rowOf(layout, conflict);
        boolean sameSide = sideOf(layout, candidate).equals(sideOf(layout, conflict));
        if (sameRow && sameSide) {
            return 0;
        }
        if (sameRow) {
            return 1;
        }
        return 2;
    }

    private void validateBoardingPoints(Trip trip, Long boardingPointId, Long dropoffPointId) {
        List<BoardingPoint> points = boardingPointRepository.findByRouteIdOrderBySequenceAsc(
                trip.getSchedule().getRoute().getId());
        boolean boardingOk = points.stream().anyMatch(p -> p.getId().equals(boardingPointId));
        boolean dropoffOk = points.stream().anyMatch(p -> p.getId().equals(dropoffPointId));
        if (!boardingOk) {
            throw new BadRequestException("Invalid boarding point");
        }
        if (!dropoffOk) {
            throw new BadRequestException("Invalid drop-off point");
        }
    }
}
