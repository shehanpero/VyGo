package com.vygo.repository;

import com.vygo.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByIdDesc(Long userId);

    Optional<Notification> findByUserIdAndId(Long userId, Long id);
}
