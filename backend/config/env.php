<?php
/**
 * Minimal .env loader (no Composer required).
 *
 * IMPORTANT — why this app keeps its own store instead of getenv()/putenv():
 * Under Apache mod_php (and php-fpm), worker processes are reused across many
 * requests AND across DIFFERENT apps on the same server. putenv() persists in
 * the worker process. The old loader only set a key when getenv($key) === false,
 * so if another app on the same Apache had already putenv()'d a key (e.g.
 * JWT_SECRET) into the worker, THIS app would treat it as "already set", skip
 * its own value, and then sign/verify JWTs with a FOREIGN secret. Result:
 * intermittent "BAD SIGNATURE" 401s and seemingly random logouts, depending on
 * which worker happened to serve the request.
 *
 * Keeping values in a private static store (and never reading them back through
 * the shared process environment) isolates this app completely.
 */

/** Private per-process config store, returned by reference so callers can fill it. */
function &env_store(): array
{
    static $store = [];
    return $store;
}

function load_env(string $path): void
{
    if (!is_file($path)) {
        return;
    }
    $store = &env_store();
    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
        $key = trim($key);
        $value = trim($value);
        // Strip surrounding quotes
        if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'")) {
            $value = substr($value, 1, -1);
        }
        if ($key !== '') {
            // Always take THIS app's .env value (overwrite), so a polluted worker
            // can never make us use another app's config. We deliberately do NOT
            // putenv() — that would leak our secrets into other apps' workers too.
            $store[$key] = $value;
            $_ENV[$key] = $value; // harmless local convenience; not used for lookups
        }
    }
}

function env(string $key, $default = null)
{
    $store = &env_store();
    if (array_key_exists($key, $store)) {
        return $store[$key];
    }
    // Fall back to the real process env only for keys our .env doesn't define
    // (e.g. genuine server-provided variables). Our .env always wins above.
    $val = getenv($key);
    return $val === false ? $default : $val;
}
