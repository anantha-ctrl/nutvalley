<?php
/**
 * Admin management of cashier accounts (billing-counter staff).
 * A cashier can sign in and reach ONLY the billing screen.
 *   - index:   list cashiers + their bill/sales totals
 *   - store:   create a cashier login (name, email, password)
 *   - update:  block/unblock or reset password
 *   - destroy: remove a cashier (their past bills are kept)
 */
class AdminStaffController
{
    /** GET /api/admin/staff — all cashier accounts. */
    public function index(array $p): void
    {
        Auth::admin();
        $rows = db()->query(
            "SELECT u.id, u.name, u.email, u.status, u.created_at,
                    (SELECT COUNT(*) FROM bills b WHERE b.cashier_id=u.id)                          AS bills,
                    (SELECT COALESCE(SUM(total),0) FROM bills b WHERE b.cashier_id=u.id AND b.status='paid') AS sales
             FROM users u WHERE u.role='cashier' ORDER BY u.created_at DESC"
        )->fetchAll();
        foreach ($rows as &$r) {
            $r['bills'] = (int) $r['bills'];
            $r['sales'] = (float) $r['sales'];
        }
        Response::success($rows);
    }

    /** POST /api/admin/staff — create a cashier login. */
    public function store(array $p): void
    {
        Auth::admin();
        $b = Request::body();
        $name  = trim((string) ($b['name'] ?? ''));
        $email = strtolower(trim((string) ($b['email'] ?? '')));
        $pass  = (string) ($b['password'] ?? '');

        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 6) {
            Response::error('Name, a valid email and a 6+ character password are required.', 422);
        }
        $db = db();
        $ex = $db->prepare('SELECT id FROM users WHERE email=?');
        $ex->execute([$email]);
        if ($ex->fetch()) {
            Response::error('That email is already registered.', 409);
        }

        $db->prepare(
            "INSERT INTO users (name, email, password_hash, role, is_verified, referral_code)
             VALUES (?,?,?,'cashier',1,?)"
        )->execute([$name, $email, password_hash($pass, PASSWORD_BCRYPT), LoyaltyController::makeReferralCode($db)]);

        Response::success(['id' => (int) $db->lastInsertId()], 'Cashier account created', 201);
    }

    /** PUT /api/admin/staff/{id} — block/unblock or reset password. */
    public function update(array $p): void
    {
        Auth::admin();
        $id = (int) $p['id'];
        $b  = Request::body();
        $db = db();

        $u = $db->prepare("SELECT id FROM users WHERE id=? AND role='cashier'");
        $u->execute([$id]);
        if (!$u->fetch()) {
            Response::error('Cashier not found', 404);
        }

        if (isset($b['status']) && in_array($b['status'], ['active', 'blocked'], true)) {
            $db->prepare('UPDATE users SET status=? WHERE id=?')->execute([$b['status'], $id]);
        }
        if (!empty($b['password'])) {
            if (strlen((string) $b['password']) < 6) {
                Response::error('Password must be at least 6 characters.', 422);
            }
            $db->prepare('UPDATE users SET password_hash=? WHERE id=?')
               ->execute([password_hash((string) $b['password'], PASSWORD_BCRYPT), $id]);
        }
        Response::success(null, 'Cashier updated');
    }

    /** DELETE /api/admin/staff/{id} — remove a cashier (bills are kept). */
    public function destroy(array $p): void
    {
        Auth::admin();
        $st = db()->prepare("DELETE FROM users WHERE id=? AND role='cashier'");
        $st->execute([(int) $p['id']]);
        Response::success(null, $st->rowCount() ? 'Cashier removed' : 'Cashier not found');
    }
}
