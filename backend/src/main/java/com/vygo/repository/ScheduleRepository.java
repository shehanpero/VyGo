package com.vygo.repository;

import com.vygo.entity.Schedule;
import com.vygo.entity.Schedule.ScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleRepository extends JpaRepository<Schedule, Long> {

    List<Schedule> findByRouteIdAndStatus(Long routeId, ScheduleStatus status);

    List<Schedule> findByOperatorId(Long operatorId);

    List<Schedule> findByOperatorIdAndStatus(Long operatorId, ScheduleStatus status);

    List<Schedule> findByBusId(Long busId);

    List<Schedule> findByRouteId(Long routeId);
}
