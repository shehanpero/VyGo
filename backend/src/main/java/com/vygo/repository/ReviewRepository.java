package com.vygo.repository;

import com.vygo.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByOperatorId(Long operatorId);

    java.util.Optional<Review> findByBookingId(Long bookingId);

    List<Review> findByOperatorIdOrderByCreatedAtDesc(Long operatorId);

    @Query("select avg(r.rating) from Review r where r.operator.id = :operatorId")
    Double averageRating(@Param("operatorId") Long operatorId);

    long countByOperatorId(Long operatorId);
}
