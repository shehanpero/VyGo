package com.vygo.repository;

import com.vygo.entity.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByGatewayTxnId(String gatewayTxnId);

    Page<Payment> findAllByOrderByIdDesc(Pageable pageable);

    Page<Payment> findByStatusOrderByIdDesc(Payment.PaymentStatus status, Pageable pageable);

    /**
     * Serializes gateway callbacks for the same transaction id. Two webhook
     * deliveries (or a double-click) for the same txn cannot both pass the
     * PENDING status check and double-confirm the booking.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.gatewayTxnId = :txnId")
    Optional<Payment> findByGatewayTxnIdForUpdate(@Param("txnId") String txnId);

    Optional<Payment> findFirstByBookingIdOrderByIdDesc(Long bookingId);

    List<Payment> findByBookingId(Long bookingId);
}
