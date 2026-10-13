package com.vygo.service;

import com.vygo.entity.AuditLog;
import com.vygo.repository.AuditLogRepository;
import com.vygo.security.SecurityUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void record(String action, String entityType, String entityId, String details) {
        Long actorId = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof SecurityUser securityUser) {
            actorId = securityUser.userId();
        }
        String ip = "unknown";
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs
                && attrs.getRequest() != null) {
            Object ipAttr = attrs.getRequest().getAttribute("ip");
            if (ipAttr != null) {
                ip = ipAttr.toString();
            }
        }
        AuditLog entry = AuditLog.builder()
                .actorId(actorId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .ipAddress(ip)
                .createdAt(LocalDateTime.now())
                .build();
        auditLogRepository.save(entry);
        log.info("AUDIT actor={} action={} entity={}/{} details={} ip={}",
                actorId, action, entityType, entityId, details, ip);
    }
}
