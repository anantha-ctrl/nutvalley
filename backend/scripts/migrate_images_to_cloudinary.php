<?php
/**
 * One-off / re-runnable: move every image still stored inline in the database
 * (base64 "data:image/…" values) to Cloudinary and replace it with the URL.
 *
 *   d:\xampp\php\php.exe backend\scripts\migrate_images_to_cloudinary.php
 *
 * Safe to run again — rows already holding a URL are skipped. A row whose
 * upload fails is left untouched (and reported), so nothing is ever lost.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../bootstrap.php';

if (!Cloudinary::isConfigured()) {
    fwrite(STDERR, "Cloudinary is not configured — set CLOUDINARY_* in backend/.env first.\n");
    exit(1);
}

$db = db();
// table, primary key, image column, Cloudinary folder, optional extra WHERE
$targets = [
    ['categories',     'id',  'image_url',          'beadsboutique/categories', ''],
    ['banners',        'id',  'image_url',          'beadsboutique/banners',    ''],
    ['product_images', 'id',  'image_url',          'beadsboutique/products',   ''],
    ['users',          'id',  'avatar_url',         'beadsboutique/avatars',    ''],
    ['settings',       'key', 'value',              'beadsboutique/branding',   ''],
    ['orders',         'id',  'payment_screenshot', 'beadsboutique/payments',   ''],
];

$moved = $failed = 0;
foreach ($targets as [$table, $pk, $col, $folder, $where]) {
    try {
        $rows = $db->query("SELECT `$pk` AS pk, `$col` AS img FROM `$table` WHERE `$col` LIKE 'data:image%' $where")->fetchAll();
    } catch (Throwable $e) {
        echo "- $table: skipped ({$e->getMessage()})\n";
        continue;
    }
    if (!$rows) {
        echo "- $table: nothing to move\n";
        continue;
    }
    $upd = $db->prepare("UPDATE `$table` SET `$col` = ? WHERE `$pk` = ?");
    foreach ($rows as $r) {
        $kb = round(strlen($r['img']) / 1024);
        $up = Cloudinary::upload($r['img'], $folder);
        if ($up && !empty($up['url'])) {
            $upd->execute([$up['url'], $r['pk']]);
            if ($table === 'product_images') {
                try { $db->prepare('UPDATE product_images SET public_id=? WHERE id=?')->execute([$up['public_id'], $r['pk']]); } catch (Throwable $e) {}
            }
            $moved++;
            echo "✓ $table #{$r['pk']} ({$kb} KB) -> {$up['url']}\n";
        } else {
            $failed++;
            echo "✗ $table #{$r['pk']} ({$kb} KB) upload failed — left as is\n";
        }
    }
}
echo "\nDone: $moved moved to Cloudinary, $failed failed.\n";
exit($failed ? 1 : 0);
