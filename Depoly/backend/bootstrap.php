<?php
/**
 * Application bootstrap - loads env, config, core classes, and a PSR-style autoloader
 * for controllers.
 */
error_reporting(E_ALL);
ini_set('display_errors', '0'); // JSON API - never leak HTML errors

// Keep PHP aligned with the local (IST) clock so date-based logic matches MySQL.
date_default_timezone_set('Asia/Kolkata');

define('BASE_PATH', __DIR__);

require_once BASE_PATH . '/config/env.php';
load_env(BASE_PATH . '/.env');

// Core helpers
foreach (['Response', 'Request', 'Jwt', 'Validator', 'Auth', 'Mailer', 'Cloudinary', 'Razorpay', 'Setting', 'Pdf', 'Delivery', 'Automation'] as $core) {
    require_once BASE_PATH . "/core/$core.php";
}
require_once BASE_PATH . '/config/database.php';

// Autoload controllers (root + admin subfolder)
spl_autoload_register(function (string $class): void {
    foreach (['/controllers/', '/controllers/admin/'] as $dir) {
        $path = BASE_PATH . $dir . $class . '.php';
        if (is_file($path)) {
            require_once $path;
            return;
        }
    }
});

// Convert PHP errors to JSON so the API stays consistent
set_exception_handler(function (\Throwable $e): void {
    if (env('APP_ENV') === 'development') {
        Response::error('Server error: ' . $e->getMessage(), 500);
    }
    Response::error('Internal server error', 500);
});

function db(): PDO
{
    return Database::conn();
}
