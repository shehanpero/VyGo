package com.vygo.repository;

import com.vygo.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findAllByOrderByIdDesc(Pageable pageable);

    List<AuditLog> findByCreatedAtBetween(LocalDateTime from, LocalDateTime to);
}
