<?php
/**
 * Authentication middleware.
 */
class Auth
{
    /** Returns the authenticated user payload or sends 401. */
    public static function user(): array
    {
        $token = Request::bearerToken();
        if (!$token) {
            self::logAuthFail('no_token', null);
            Response::error('Authentication required', 401);
        }
        $payload = Jwt::decode($token);
        if (!$payload) {
            self::logAuthFail('decode_failed', $token);
            Response::error('Invalid or expired token', 401);
        }
        return $payload;
    }

    /**
     * Diagnostic: record every 401 with enough context to tell apart the causes
     * of a "frequent logout" — missing header vs expired token vs bad signature.
     * Writes to backend/storage/auth.log. Safe to remove once diagnosed.
     */
    private static function logAuthFail(string $reason, ?string $token): void
    {
        $dir = __DIR__ . '/../storage';
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }
        $detail = '';
        if ($token) {
            $parts = explode('.', $token);
            if (count($parts) === 3) {
                $body = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
                if (is_array($body) && isset($body['exp'])) {
                    $delta = (int) $body['exp'] - time();
                    $detail = $delta < 0
                        ? " | EXPIRED {$delta}s ago (signature is fine; token simply aged out)"
                        : " | NOT expired (valid {$delta}s more) -> BAD SIGNATURE / wrong secret";
                    $detail .= ' sub=' . ($body['sub'] ?? '?');
                } else {
                    $detail = ' | payload unparseable';
                }
            } else {
                $detail = ' | malformed token (' . count($parts) . ' parts)';
            }
        }
        $line = '[' . date('Y-m-d H:i:s') . "] 401 $reason | "
            . ($_SERVER['REQUEST_METHOD'] ?? '?') . ' ' . ($_SERVER['REQUEST_URI'] ?? '?')
            . ' | tokenPresent=' . ($token ? 'yes' : 'NO')
            . $detail
            . ' | origin=' . ($_SERVER['HTTP_ORIGIN'] ?? '-') . "\n";
        @file_put_contents($dir . '/auth.log', $line, FILE_APPEND);
    }

    public static function id(): int
    {
        return (int) self::user()['sub'];
    }

    /** Requires the user to have the admin role. */
    public static function admin(): array
    {
        $user = self::user();
        // Read the current role from the database so a previously-issued JWT
        // does not keep an admin locked out after a role change.
        $currentRole = null;
        try {
            $stmt = db()->prepare('SELECT role FROM users WHERE id=? LIMIT 1');
            $stmt->execute([(int) ($user['sub'] ?? 0)]);
            $currentRole = $stmt->fetchColumn() ?: null;
        } catch (Throwable $e) {}
        $role = strtolower(trim((string) ($currentRole ?: ($user['role'] ?? ''))));
        if (!in_array($role, ['admin', 'super_admin', 'superadmin', 'administrator'], true)
            && !str_contains($role, 'admin')) {
            Response::error('Admin access required', 403);
        }
        $user['role'] = 'admin';
        return $user;
    }

    /** Requires billing-counter staff: an admin OR a cashier. */
    public static function staff(): array
    {
        $user = self::user();
        if (!in_array($user['role'] ?? '', ['admin', 'cashier'], true)) {
            Response::error('Staff access required', 403);
        }
        return $user;
    }

    /** Optional auth - returns user payload or null without erroring. */
    public static function optional(): ?array
    {
        $token = Request::bearerToken();
        if (!$token) {
            return null;
        }
        return Jwt::decode($token);
    }
}
