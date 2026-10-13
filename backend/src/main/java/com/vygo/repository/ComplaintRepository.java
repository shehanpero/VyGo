package com.vygo.repository;

import com.vygo.entity.Complaint;
import com.vygo.entity.Complaint.ComplaintStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findAllByOrderByIdDesc();

    List<Complaint> findByStatusOrderByIdDesc(ComplaintStatus status);

    Optional<Complaint> findById(Long id);
}
