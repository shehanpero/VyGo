package com.vygo.repository;

import com.vygo.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findByOperatorIdOrderByExpenseDateDescIdDesc(Long operatorId);

    List<Expense> findByOperatorIdAndExpenseDateBetweenOrderByExpenseDateDescIdDesc(Long operatorId,
                                                                                    LocalDate from,
                                                                                    LocalDate to);

    List<Expense> findByOperatorIdAndBusIdOrderByExpenseDateDescIdDesc(Long operatorId, Long busId);
}
