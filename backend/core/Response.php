<?php
/**
 * JSON response helper.
 */
class Response
{
    /** Callbacks to run after the response has been delivered. */
    private static array $deferred = [];

    /**
     * Queue work to run once the client has its response and the connection is
     * closed. Used for notification email: SMTP can take many seconds, and the
     * browser client gives up at 8s, so mailing inline would report failures for
     * actions that actually succeeded (and would slow checkout for the customer).
     */
    public static function defer(callable $fn): void
    {
        self::$deferred[] = $fn;
    }

    public static function json($data, int $code = 200): void
    {
        $body = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        header('Content-Length: ' . strlen($body));
        echo $body;

        self::runDeferred();
        exit;
    }

    /** Close the connection, then drain the deferred queue. */
    private static function runDeferred(): void
    {
        if (!self::$deferred) {
            return;
        }
        ignore_user_abort(true);
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();   // php-fpm
        } else {
            @flush();                    // mod_php
        }
        $jobs = self::$deferred;
        self::$deferred = [];
        foreach ($jobs as $fn) {
            try {
                $fn();
            } catch (\Throwable $e) {
                // The client already has its response; this work is best-effort.
            }
        }
    }

    public static function success($data = null, string $message = 'OK', int $code = 200): void
    {
        self::json(['success' => true, 'message' => $message, 'data' => $data], $code);
    }

    /**
     * Send the JSON response, close the connection, then run $after.
     *
     * For work the caller must not wait on — notification email, in particular.
     * SMTP here can block for up to 20s while the browser client gives up at 8s,
     * which would report a failure for an action that actually succeeded.
     */
    public static function successThen($data, string $message, callable $after): void
    {
        self::defer($after);
        self::success($data, $message);
    }

    public static function error(string $message = 'Error', int $code = 400, $errors = null): void
    {
        $body = ['success' => false, 'message' => $message];
        if ($errors !== null) {
            $body['errors'] = $errors;
        }
        self::json($body, $code);
    }
}
