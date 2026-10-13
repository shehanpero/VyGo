package com.vygo.repository;

import com.vygo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByMobile(String mobile);

    boolean existsByMobile(String mobile);

    boolean existsByEmail(String email);

    @Query("SELECT u FROM User u WHERE u.email = :email OR u.mobile = :mobile")
    Optional<User> findByEmailOrMobile(@Param("email") String email, @Param("mobile") String mobile);

    List<User> findByOwnerIdOrderByIdAsc(Long ownerId);
}
