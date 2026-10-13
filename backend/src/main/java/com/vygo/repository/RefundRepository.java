package com.vygo.repository;

import com.vygo.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RefundRepository extends JpaRepository<Refund, Long> {

    List<Refund> findByBookingId(Long bookingId);
}
