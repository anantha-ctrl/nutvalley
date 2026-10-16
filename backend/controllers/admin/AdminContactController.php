<?php
/** Admin inbox for Contact Us submissions. */
class AdminContactController
{
    /** GET /api/admin/messages — newest first, with an unread count. */
    public function index(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            'SELECT id, name, email, subject, message, is_read, created_at
             FROM contact_messages ORDER BY created_at DESC'
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['is_read'] = (int) $r['is_read'];
        }
        unset($r);
        $unread = (int) db()->query('SELECT COUNT(*) FROM contact_messages WHERE is_read = 0')->fetchColumn();
        Response::success(['messages' => $rows, 'unread' => $unread]);
    }

    /** PUT /api/admin/messages/{id} — mark read / unread. */
    public function update(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $body = Request::body();
        $read = isset($body['is_read']) ? (int) (bool) $body['is_read'] : 1;
        $db = db();
        $stmt = $db->prepare('UPDATE contact_messages SET is_read=? WHERE id=?');
        $stmt->execute([$read, $id]);
        Response::success(['is_read' => $read], $read ? 'Marked as read' : 'Marked as unread');
    }

    /** DELETE /api/admin/messages/{id}. */
    public function destroy(array $p): void
    {
        Auth::admin();
        db()->prepare('DELETE FROM contact_messages WHERE id=?')->execute([(int) $p['id']]);
        Response::success(null, 'Message deleted');
    }
}
