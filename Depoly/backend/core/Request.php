<?php
/**
 * Request helper - parses JSON body, query params, headers.
 */
class Request
{
    private static ?array $bodyCache = null;

    public static function body(): array
    {
        if (self::$bodyCache !== null) {
            return self::$bodyCache;
        }
        $raw = file_get_contents('php://input');
        $json = json_decode($raw, true);
        self::$bodyCache = is_array($json) ? $json : $_POST;
        return self::$bodyCache;
    }

    public static function input(string $key, $default = null)
    {
        $body = self::body();
        return $body[$key] ?? $default;
    }

    public static function query(string $key, $default = null)
    {
        return $_GET[$key] ?? $default;
    }

    public static function method(): string
    {
        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        if ($method === 'POST') {
            $override = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']
                ?? $_SERVER['HTTP_X_METHOD_OVERRIDE']
                ?? self::body()['_method']
                ?? null;
            if ($override && in_array(strtoupper((string) $override), ['PUT', 'PATCH', 'DELETE'], true)) {
                return strtoupper((string) $override);
            }
        }
        return strtoupper($method);
    }

    public static function bearerToken(): ?string
    {
        $headers = function_exists('getallheaders') ? getallheaders() : [];
        $auth = $headers['Authorization']
            ?? $headers['authorization']
            ?? $_SERVER['HTTP_AUTHORIZATION']
            ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']  // set by the .htaccess rewrite
            ?? '';
        if (preg_match('/Bearer\s+(.+)/i', $auth, $m)) {
            return trim($m[1]);
        }
        return null;
    }
}
