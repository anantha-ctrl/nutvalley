<?php
/**
 * Front controller / router for the Novo Clothing API.
 */
require_once __DIR__ . '/bootstrap.php';

// ---- CORS ----
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
// X-HTTP-Method-Override must be listed: the frontend sets it on every
// PUT/PATCH/DELETE, and a header missing here fails CORS preflight outright
// (net::ERR_FAILED), which the client's 405-to-POST fallback cannot recover from
// because a blocked request has no status code to react to.
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-HTTP-Method-Override, X-Requested-With');
header('Access-Control-Max-Age: 86400');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
if (Request::method() === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Lightweight router supporting {param} placeholders.
 */
class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, $handler): void
    {
        $this->routes[] = compact('method', 'pattern', 'handler');
    }

    public function get(string $p, $h): void    { $this->add('GET', $p, $h); }
    public function post(string $p, $h): void   { $this->add('POST', $p, $h); }
    public function put(string $p, $h): void    { $this->add('PUT', $p, $h); }
    public function patch(string $p, $h): void  { $this->add('PATCH', $p, $h); }
    public function delete(string $p, $h): void { $this->add('DELETE', $p, $h); }

    public function dispatch(string $method, string $uri): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) {
                continue;
            }
            $regex = '#^' . preg_replace('#\{([a-zA-Z_]+)\}#', '(?P<$1>[^/]+)', $route['pattern']) . '$#';
            if (preg_match($regex, $uri, $matches)) {
                $params = array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY);
                if (is_callable($route['handler'])) {
                    $route['handler']($params);
                } else {
                    [$class, $action] = explode('@', $route['handler']);
                    (new $class())->$action($params);
                }
                return;
            }
        }
        Response::error('Route not found: ' . $method . ' ' . $uri, 404);
    }
}

// Resolve the path relative to the /backend mount point.
// The base is derived from SCRIPT_NAME so it works under any folder/alias
// (e.g. /Beadsboutique/backend, /CloudFashion/backend) with no code change.
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
if ($base !== '' && str_starts_with($uri, $base)) {
    $uri = substr($uri, strlen($base));
}
$uri = '/' . trim($uri, '/');
$uri = $uri === '/index.php' ? '/' : $uri;

$router = new Router();
require_once __DIR__ . '/routes.php';
$router->dispatch(Request::method(), $uri);
