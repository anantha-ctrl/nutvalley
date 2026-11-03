<?php
/**
 * Tiny key/value settings accessor backed by the `settings` table.
 * Used for store-wide, admin-editable configuration (contact details, etc.).
 */
class Setting
{
    private static function ensureTable(): void
    {
        static $done = false;
        if ($done) return;
        try {
            db()->exec("
                CREATE TABLE IF NOT EXISTS settings (
                    `key` VARCHAR(191) PRIMARY KEY,
                    `value` MEDIUMTEXT NOT NULL,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            ");
            $done = true;
        } catch (\Throwable $e) {}
    }

    /** Read a single setting, or $default if absent. */
    public static function get(string $key, $default = null)
    {
        self::ensureTable();
        try {
            $s = db()->prepare('SELECT `value` FROM settings WHERE `key`=?');
            $s->execute([$key]);
            $v = $s->fetchColumn();
            return $v === false ? $default : $v;
        } catch (\Throwable $e) {
            return $default;
        }
    }

    /** Read all settings whose key starts with $prefix as [key => value]. */
    public static function many(string $prefix): array
    {
        self::ensureTable();
        try {
            return db()->query(
                "SELECT `key`,`value` FROM settings WHERE `key` LIKE " . db()->quote($prefix . '%')
            )->fetchAll(PDO::FETCH_KEY_PAIR);
        } catch (\Throwable $e) {
            return [];
        }
    }

    /** Upsert a setting. */
    public static function set(string $key, string $value): void
    {
        self::ensureTable();
        try {
            db()->prepare(
                'INSERT INTO settings (`key`,`value`) VALUES (?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)'
            )->execute([$key, $value]);
        } catch (\Throwable $e) {}
    }
}
