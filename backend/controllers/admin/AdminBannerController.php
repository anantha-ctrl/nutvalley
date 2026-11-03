<?php
class AdminBannerController
{
    public function index(array $p): void
    {
        Auth::admin();
        Response::success(db()->query('SELECT * FROM banners ORDER BY sort_order, id')->fetchAll());
    }

    public function store(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $v = Validator::make($data, ['title' => 'required|min:2', 'image_url' => 'required']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $url = $data['image_url'];
        if (str_starts_with($url, 'data:image')) {
            $up = Cloudinary::upload($url, 'nutsvally/banners');
            if ($up) { $url = $up['url']; }
        }
        db()->prepare(
            'INSERT INTO banners (title, subtitle, cta_label, cta_link, image_url, sort_order, is_active)
             VALUES (?,?,?,?,?,?,?)'
        )->execute([
            $data['title'], $data['subtitle'] ?? null, $data['cta_label'] ?? null,
            $data['cta_link'] ?? null, $url, (int) ($data['sort_order'] ?? 0),
            isset($data['is_active']) ? (int) $data['is_active'] : 1,
        ]);
        Response::success(['id' => (int) db()->lastInsertId()], 'Banner created', 201);
    }

    public function update(array $p): void
    {
        Auth::admin();
        $data = Request::body();
        $url = $data['image_url'] ?? '';
        if (str_starts_with($url, 'data:image')) {
            $up = Cloudinary::upload($url, 'nutsvally/banners');
            if ($up) { $url = $up['url']; }
        }
        db()->prepare(
            'UPDATE banners SET title=?, subtitle=?, cta_label=?, cta_link=?, image_url=?, sort_order=?, is_active=? WHERE id=?'
        )->execute([
            $data['title'], $data['subtitle'] ?? null, $data['cta_label'] ?? null,
            $data['cta_link'] ?? null, $url, (int) ($data['sort_order'] ?? 0),
            isset($data['is_active']) ? (int) $data['is_active'] : 1, (int) $p['id'],
        ]);
        Response::success(null, 'Banner updated');
    }

    public function destroy(array $p): void
    {
        Auth::admin();
        db()->prepare('DELETE FROM banners WHERE id=?')->execute([(int) $p['id']]);
        Response::success(null, 'Banner deleted');
    }
}
