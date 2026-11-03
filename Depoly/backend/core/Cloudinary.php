<?php
/**
 * Cloudinary uploader using signed REST API (no SDK required).
 */
class Cloudinary
{
    /**
     * Upload a local file path or data URI to Cloudinary.
     * Returns ['url' => ..., 'public_id' => ...] or null on failure.
     */
    public static function upload(string $file, string $folder = 'NutValley'): ?array
    {
        $cloud  = env('CLOUDINARY_CLOUD_NAME');
        $key    = env('CLOUDINARY_API_KEY');
        $secret = env('CLOUDINARY_API_SECRET');
        if (!$cloud || !$key || !$secret) {
            return null;
        }

        $timestamp = time();
        $params = ['folder' => $folder, 'timestamp' => $timestamp];
        ksort($params);
        $toSign = urldecode(http_build_query($params));
        $signature = sha1($toSign . $secret);

        $post = [
            'file'      => self::resolveFile($file),
            'api_key'   => $key,
            'timestamp' => $timestamp,
            'folder'    => $folder,
            'signature' => $signature,
        ];

        $ch = curl_init("https://api.cloudinary.com/v1_1/$cloud/image/upload");
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $post,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
        ]);
        $res = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);
        $data = json_decode((string) $res, true);
        if (!isset($data['secure_url'])) {
            // Never fail silently — the caller falls back to storing the image inline.
            error_log('Cloudinary upload failed (' . $folder . '): ' . ($err ?: ($data['error']['message'] ?? substr((string) $res, 0, 200))));
            return null;
        }
        return ['url' => $data['secure_url'], 'public_id' => $data['public_id']];
    }

    public static function isConfigured(): bool
    {
        return (bool) (env('CLOUDINARY_CLOUD_NAME') && env('CLOUDINARY_API_KEY') && env('CLOUDINARY_API_SECRET'));
    }

    /**
     * Image value -> value to save. A data:image URI is uploaded to Cloudinary and its
     * secure URL returned; anything else (an http(s) link, '') is returned unchanged.
     * If the upload fails the data URI is returned so nothing is lost (stored inline).
     */
    public static function store(?string $value, string $folder): string
    {
        $value = trim((string) $value);
        if (!str_starts_with($value, 'data:image')) {
            return $value;
        }
        try {
            $up = self::upload($value, $folder);
            return $up['url'] ?? $value;
        } catch (\Throwable $e) {
            error_log('Cloudinary upload error (' . $folder . '): ' . $e->getMessage());
            return $value;
        }
    }

    private static function resolveFile(string $file): \CURLFile|string
    {
        // Accept a real uploaded tmp path or a data URI string.
        if (is_file($file)) {
            return new \CURLFile($file);
        }
        return $file; // base64 data URI
    }

    public static function destroy(string $publicId): bool
    {
        $cloud  = env('CLOUDINARY_CLOUD_NAME');
        $key    = env('CLOUDINARY_API_KEY');
        $secret = env('CLOUDINARY_API_SECRET');
        if (!$cloud || !$key || !$secret) {
            return false;
        }
        $timestamp = time();
        $signature = sha1("public_id=$publicId&timestamp=$timestamp" . $secret);
        $ch = curl_init("https://api.cloudinary.com/v1_1/$cloud/image/destroy");
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => compact('publicId') + [
                'public_id' => $publicId, 'api_key' => $key,
                'timestamp' => $timestamp, 'signature' => $signature,
            ],
            CURLOPT_RETURNTRANSFER => true,
        ]);
        $res = curl_exec($ch);
        curl_close($ch);
        return str_contains((string) $res, 'ok');
    }
}
