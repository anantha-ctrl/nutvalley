<?php
/**
 * PDO database connection (singleton).
 */
class Database
{
    private static ?PDO $pdo = null;

    public static function conn(): PDO
    {
        if (self::$pdo === null) {
            $host = env('DB_HOST', '127.0.0.1');
            $port = env('DB_PORT', '3306');
            $name = env('DB_NAME', 'nutsvally_db');
            $user = env('DB_USER', 'root');
            $pass = env('DB_PASS', 'anantha');

            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];

            try {
                $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
                self::$pdo = new PDO($dsn, $user, $pass, $options);
                self::ensureSchema();
            } catch (PDOException $e) {
                // Fallback attempt: try empty password for local default root
                try {
                    $dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
                    self::$pdo = new PDO($dsn, $user, '', $options);
                    self::ensureSchema();
                } catch (PDOException $e2) {
                    // Fallback attempt: try cloudfashion database name
                    try {
                        $dsn = "mysql:host=$host;port=$port;dbname=cloudfashion;charset=utf8mb4";
                        self::$pdo = new PDO($dsn, $user, $pass, $options);
                        self::ensureSchema();
                    } catch (PDOException $e3) {
                        http_response_code(500);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Database connection failed: ' . (env('APP_ENV') === 'development' ? $e->getMessage() : 'Unable to connect to MySQL database'),
                        ]);
                        exit;
                    }
                }
            }
        }
        return self::$pdo;
    }

    private static function ensureSchema(): void
    {
        static $checked = false;
        if ($checked) return;
        $checked = true;

        // Each statement runs in its own try: an "already exists" error on one
        // ADD COLUMN must not stop the statements that follow it.
        foreach (self::SELF_HEAL as $sql) {
            try {
                self::$pdo->exec($sql);
            } catch (\Throwable $t) {
                // Table missing or change already applied — both are fine.
            }
        }
    }

    /**
     * Idempotent schema top-ups applied on first connection, so a deployment
     * that hasn't run the numbered migrations by hand still works.
     */
    private const SELF_HEAL = [
        "ALTER TABLE product_images MODIFY image_url MEDIUMTEXT NOT NULL",
        "ALTER TABLE categories MODIFY image_url MEDIUMTEXT NULL",
        "ALTER TABLE banners MODIFY image_url MEDIUMTEXT NOT NULL",
        "ALTER TABLE settings MODIFY value MEDIUMTEXT NOT NULL",
        "INSERT INTO settings (`key`,`value`) VALUES ('store_base_shipping','0') ON DUPLICATE KEY UPDATE `value`='0'",
        "ALTER TABLE products ADD COLUMN is_free_shipping TINYINT(1) NOT NULL DEFAULT 1",
        "ALTER TABLE products ADD COLUMN shipping_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00",

        // ---- migration 036: delivery partner / live shipment tracking ----
        "ALTER TABLE orders ADD COLUMN delivery_provider VARCHAR(30) NULL DEFAULT NULL",
        "ALTER TABLE orders ADD COLUMN shipment_id VARCHAR(80) NULL DEFAULT NULL",
        "ALTER TABLE orders ADD COLUMN shipment_order_id VARCHAR(80) NULL DEFAULT NULL",
        "ALTER TABLE orders ADD COLUMN awb_code VARCHAR(80) NULL DEFAULT NULL",
        "ALTER TABLE orders ADD COLUMN courier_name VARCHAR(120) NULL DEFAULT NULL",
        "ALTER TABLE orders ADD COLUMN shipment_status VARCHAR(60) NULL DEFAULT NULL",
        "ALTER TABLE orders ADD COLUMN shipment_eta DATE NULL DEFAULT NULL",
        "ALTER TABLE orders ADD COLUMN label_url VARCHAR(500) NULL DEFAULT NULL",
        "ALTER TABLE orders ADD COLUMN tracking_url VARCHAR(500) NULL DEFAULT NULL",
        "ALTER TABLE orders ADD COLUMN shipment_synced_at TIMESTAMP NULL DEFAULT NULL",
        "ALTER TABLE orders ADD INDEX idx_order_awb (awb_code)",
        "CREATE TABLE IF NOT EXISTS shipment_events (
            id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            order_id    BIGINT UNSIGNED NOT NULL,
            awb_code    VARCHAR(80)     NULL,
            status      VARCHAR(120)    NOT NULL,
            activity    VARCHAR(255)    NULL,
            location    VARCHAR(160)    NULL,
            event_at    DATETIME        NULL,
            fingerprint CHAR(40)        NOT NULL,
            created_at  TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_event (order_id, fingerprint),
            INDEX idx_se_order (order_id, event_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4",
        "INSERT IGNORE INTO settings (`key`,`value`) VALUES
            ('delivery_provider','none'),('delivery_api_key',''),('delivery_api_secret',''),
            ('delivery_email',''),('delivery_token',''),('delivery_token_expires','0'),
            ('delivery_pickup_location','Primary'),('delivery_pickup_pincode',''),
            ('delivery_auto_ship','0'),('delivery_default_weight','0.5'),
            ('delivery_default_length','15'),('delivery_default_breadth','12'),
            ('delivery_default_height','8'),('delivery_channel_id',''),('delivery_sandbox','0')",
    ];
}
