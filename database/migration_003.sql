-- Migration 003: per-admin notification read / dismissed state
-- Notifications are computed live from the DB, so we only persist the
-- read/dismissed state keyed by a stable notification key per admin.

CREATE TABLE IF NOT EXISTS notification_states (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id   BIGINT UNSIGNED NOT NULL,
    notif_key  VARCHAR(191) NOT NULL,
    status     ENUM('read','dismissed') NOT NULL DEFAULT 'read',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_admin_key (admin_id, notif_key),
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
