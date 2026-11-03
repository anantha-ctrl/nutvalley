<?php
/**
 * In-store Billing / POS.
 *   - config():   store header + tax/prefix defaults for the invoice
 *   - products(): live product search for the picker (name / id / sku)
 *   - index():    recent bills + counter KPIs (today / month)
 *   - create():   ring up a bill — inserts bill + items, decrements live stock,
 *                 records the sale, and (for a linked customer) awards loyalty
 *   - show():     one full bill + items, for reprint / invoice
 *   - void():     cancel a bill and restock everything on it
 *
 * All figures are recomputed server-side from live DB prices so a tampered
 * client can never change what is charged or what stock is deducted.
 */
class AdminBillingController
{
    /** GET /api/admin/billing/config — invoice header + billing defaults. */
    public function config(array $p): void
    {
        Auth::staff();
        Response::success([
            'store_name'    => Setting::get('store_name', 'NutValley'),
            'logo'          => Setting::get('store_logo', ''),
            'address'       => Setting::get('store_address', ''),
            'phone'         => Setting::get('store_contact_phone', ''),
            'email'         => Setting::get('store_contact_email', ''),
            'tax_pct'       => (float) Setting::get('billing_tax_pct', 0),
            'invoice_prefix'=> (string) Setting::get('billing_invoice_prefix', 'INV'),
            'footer_note'   => (string) Setting::get('billing_footer_note', ''),
        ]);
    }

    /** GET /api/admin/billing/products?q= — active products for the picker. */
    public function products(array $p): void
    {
        Auth::staff();
        $q = trim((string) Request::query('q', ''));
        $db = db();

        // Skip inline base64 (data:) images in the picker so search-as-you-type
        // stays snappy — those are the exception; the UI falls back to an icon.
        $sql = "SELECT p.id, p.name, p.price, p.stock,
                       (SELECT sku FROM product_variants WHERE product_id=p.id AND sku IS NOT NULL LIMIT 1) AS sku,
                       (SELECT CASE WHEN image_url LIKE 'data:%' THEN NULL ELSE image_url END
                          FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
                FROM products p
                WHERE p.is_active=1";
        $args = [];
        if ($q !== '') {
            $sql .= " AND (p.name LIKE ? OR p.id=? OR EXISTS
                        (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.sku LIKE ?))";
            $args[] = "%$q%";
            $args[] = ctype_digit($q) ? (int) $q : 0;
            $args[] = "%$q%";
        }
        $sql .= ' ORDER BY p.sold_count DESC, p.name ASC LIMIT 24';

        $stmt = $db->prepare($sql);
        $stmt->execute($args);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$r) {
            $r['id']    = (int) $r['id'];
            $r['price'] = (float) $r['price'];
            $r['stock'] = (int) $r['stock'];
        }
        Response::success($rows);
    }

    /** GET /api/admin/billing/lookup?code= — resolve a scanned QR/barcode to one product. */
    public function lookup(array $p): void
    {
        Auth::staff();
        $code = trim((string) Request::query('code', ''));
        if ($code === '') {
            Response::error('No code scanned', 422);
        }
        // A QR may hold the storefront URL — pull the product slug off the end.
        if (preg_match('#^https?://#i', $code)) {
            $path = parse_url($code, PHP_URL_PATH) ?: '';
            $seg  = trim($path, '/');
            if ($seg !== '') {
                $code = basename($seg);
            }
        }

        $stmt = db()->prepare(
            "SELECT p.id, p.name, p.price, p.stock,
                    (SELECT sku FROM product_variants WHERE product_id=p.id AND sku IS NOT NULL LIMIT 1) AS sku,
                    (SELECT CASE WHEN image_url LIKE 'data:%' THEN NULL ELSE image_url END
                       FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC LIMIT 1) AS image
             FROM products p
             WHERE p.is_active=1
               AND (p.id=? OR p.slug=? OR EXISTS
                    (SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.sku=?))
             LIMIT 1"
        );
        $stmt->execute([ctype_digit($code) ? (int) $code : 0, $code, $code]);
        $prod = $stmt->fetch();
        if (!$prod) {
            Response::error('No product matches "' . $code . '"', 404);
        }
        $prod['id']    = (int) $prod['id'];
        $prod['price'] = (float) $prod['price'];
        $prod['stock'] = (int) $prod['stock'];
        Response::success($prod);
    }

    /** GET /api/admin/billing/customer-lookup?phone= — check if customer exists by phone. */
    public function customerLookup(array $p): void
    {
        Auth::staff();
        $phone = trim((string) Request::query('phone', ''));
        if ($phone === '') {
            Response::success(null);
            return;
        }
        $stmt = db()->prepare("SELECT id, name, email, phone FROM users WHERE phone=? AND role='customer' LIMIT 1");
        $stmt->execute([$phone]);
        $row = $stmt->fetch();
        Response::success($row ?: null);
    }

    /** GET /api/admin/billing — recent bills + counter KPIs. */
    public function index(array $p): void
    {
        Auth::staff();
        $db = db();

        $bills = $db->query(
            "SELECT b.id, b.bill_number, b.customer_name, b.customer_phone, b.total,
                    b.payment_method, b.status, b.created_at, u.name AS cashier,
                    (SELECT COALESCE(SUM(quantity),0) FROM bill_items WHERE bill_id=b.id) AS items
             FROM bills b LEFT JOIN users u ON u.id=b.cashier_id
             ORDER BY b.id DESC LIMIT 100"
        )->fetchAll();
        foreach ($bills as &$b) {
            $b['total'] = (float) $b['total'];
            $b['items'] = (int) $b['items'];
        }
        unset($b);

        $today = $db->query(
            "SELECT COALESCE(SUM(total),0) AS sales, COUNT(*) AS count
             FROM bills WHERE status='paid' AND DATE(created_at)=CURDATE()"
        )->fetch();
        $month = $db->query(
            "SELECT COALESCE(SUM(total),0) AS sales, COUNT(*) AS count
             FROM bills WHERE status='paid'
               AND YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())"
        )->fetch();

        Response::success([
            'bills' => $bills,
            'stats' => [
                'today_sales'  => (float) $today['sales'],
                'today_count'  => (int) $today['count'],
                'month_sales'  => (float) $month['sales'],
                'month_count'  => (int) $month['count'],
            ],
        ]);
    }

    /** POST /api/admin/billing — ring up a new bill. */
    public function create(array $p): void
    {
        $admin = Auth::staff();
        $body  = Request::body();
        $db    = db();

        $items = $body['items'] ?? [];
        if (!is_array($items) || count($items) === 0) {
            Response::error('Add at least one item to the bill.', 422);
        }

        // Resolve items against live DB prices/stock (source of truth).
        $resolved = [];
        $subtotal = 0.0;
        foreach ($items as $it) {
            $pid = (int) ($it['product_id'] ?? 0);
            $qty = max(1, (int) ($it['quantity'] ?? 1));
            $stmt = $db->prepare(
                "SELECT p.id, p.name, p.price, p.stock,
                        (SELECT sku FROM product_variants WHERE product_id=p.id AND sku IS NOT NULL LIMIT 1) AS sku
                 FROM products p WHERE p.id=? AND p.is_active=1"
            );
            $stmt->execute([$pid]);
            $prod = $stmt->fetch();
            if (!$prod) {
                Response::error('Product #' . $pid . ' is unavailable.', 422);
            }
            if ((int) $prod['stock'] < $qty) {
                Response::error('Only ' . (int) $prod['stock'] . ' left of "' . $prod['name'] . '".', 422);
            }
            $price = (float) $prod['price'];
            $line  = round($price * $qty, 2);
            $subtotal += $line;
            $resolved[] = [
                'product_id' => (int) $prod['id'],
                'name'       => $prod['name'],
                'sku'        => $prod['sku'],
                'price'      => $price,
                'quantity'   => $qty,
                'line_total' => $line,
            ];
        }
        $subtotal = round($subtotal, 2);

        // Order-level discount (flat rupees or percent).
        $discountType  = ($body['discount_type'] ?? 'flat') === 'percent' ? 'percent' : 'flat';
        $discountValue = max(0, (float) ($body['discount_value'] ?? 0));
        $discount = $discountType === 'percent'
            ? round($subtotal * min($discountValue, 100) / 100, 2)
            : min($discountValue, $subtotal);
        $discount = min($discount, $subtotal);

        $taxable   = max(0, $subtotal - $discount);
        $taxPct    = max(0, min(100, (float) ($body['tax_pct'] ?? Setting::get('billing_tax_pct', 0))));
        $taxAmount = round($taxable * $taxPct / 100, 2);
        $total     = round($taxable + $taxAmount, 2);

        $method = in_array($body['payment_method'] ?? 'cash', ['cash', 'card', 'upi', 'split'], true)
            ? $body['payment_method'] : 'cash';

        // Split payment: part cash + part card/UPI. The two portions must cover
        // the total; overpayment (in the cash portion) becomes change.
        $splitCash = 0.0;
        $splitDigital = 0.0;
        if ($method === 'split') {
            $splitCash    = max(0, round((float) ($body['split_cash'] ?? 0), 2));
            $splitDigital = max(0, round((float) ($body['split_digital'] ?? 0), 2));
            $paid = round($splitCash + $splitDigital, 2);
            if ($paid + 0.001 < $total) {
                Response::error('Split amounts (' . number_format($paid, 2) . ') do not cover the total (' . number_format($total, 2) . ').', 422);
            }
        } else {
            $paid = $method === 'cash' ? max(0, (float) ($body['paid'] ?? $total)) : $total;
        }
        $change = max(0, round($paid - $total, 2));

        // Optional customer link (registered user) — enables loyalty earn.
        $userId = null;
        $custName  = trim((string) ($body['customer_name'] ?? '')) ?: null;
        $custPhone = trim((string) ($body['customer_phone'] ?? '')) ?: null;
        $custEmail = trim((string) ($body['customer_email'] ?? '')) ?: null;

        if ($custPhone !== null || $custEmail !== null) {
            $user = null;
            if ($custPhone !== null) {
                $u = $db->prepare("SELECT id, name, email FROM users WHERE phone=? AND role='customer' LIMIT 1");
                $u->execute([$custPhone]);
                $user = $u->fetch();
            }
            if (!$user && $custEmail !== null) {
                $u = $db->prepare("SELECT id, name, email FROM users WHERE email=? AND role='customer' LIMIT 1");
                $u->execute([$custEmail]);
                $user = $u->fetch();
            }

            if (!$user) {
                // Determine email (must be unique)
                $email = $custEmail ?: ($custPhone ? ($custPhone . '@novoclothing.com') : ('customer_' . uniqid() . '@novoclothing.com'));
                $checkEmail = $db->prepare("SELECT id FROM users WHERE email=? LIMIT 1");
                $checkEmail->execute([$email]);
                if ($checkEmail->fetch()) {
                    $email = ($custPhone ?: uniqid()) . '_' . uniqid() . '@novoclothing.com';
                }

                $dummyHash = password_hash(uniqid(), PASSWORD_BCRYPT);
                $db->prepare("INSERT INTO users (name, email, phone, password_hash, role, is_verified) VALUES (?, ?, ?, ?, 'customer', 1)")
                   ->execute([$custName ?: 'Walk-in Customer', $email, $custPhone, $dummyHash]);
                $userId = (int) $db->lastInsertId();
            } else {
                $userId = (int) $user['id'];
                // Update missing/changed info on existing customer
                if ($custName && $user['name'] !== $custName) {
                    $db->prepare("UPDATE users SET name=? WHERE id=?")->execute([$custName, $userId]);
                }
                if ($custEmail && empty($user['email'])) {
                    $db->prepare("UPDATE users SET email=? WHERE id=?")->execute([$custEmail, $userId]);
                }
            }
        }

        $db->beginTransaction();
        try {
            // Insert with a temporary unique key, then update to sequential version using lastInsertId
            $tempBillNumber = 'TEMP_' . uniqid();
            $db->prepare(
                "INSERT INTO bills
                    (bill_number, cashier_id, user_id, customer_name, customer_phone,
                     subtotal, discount, discount_type, discount_value, tax_pct, tax_amount,
                     total, paid, change_due, split_cash, split_digital, payment_method, note, status)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'paid')"
            )->execute([
                $tempBillNumber, (int) $admin['sub'], $userId, $custName, $custPhone,
                $subtotal, $discount, $discountType, $discountValue, $taxPct, $taxAmount,
                $total, $paid, $change, $splitCash, $splitDigital, $method, trim((string) ($body['note'] ?? '')) ?: null,
            ]);
            $billId = (int) $db->lastInsertId();

            $prefix = preg_replace('/[^A-Za-z0-9]/', '', (string) Setting::get('billing_invoice_prefix', 'INV')) ?: 'INV';
            $stmtSeq = $db->prepare("SELECT bill_number FROM bills WHERE bill_number LIKE ? AND bill_number NOT LIKE 'TEMP_%' ORDER BY id DESC LIMIT 1 FOR UPDATE");
            $stmtSeq->execute([$prefix . '%']);
            $lastBill = $stmtSeq->fetchColumn();
            
            $nextSeq = 1;
            if ($lastBill) {
                $numericPart = preg_replace('/[^0-9]/', '', $lastBill);
                $nextSeq = ((int) $numericPart) + 1;
            }
            $billNumber = $prefix . str_pad($nextSeq, 5, '0', STR_PAD_LEFT);

            $db->prepare("UPDATE bills SET bill_number=? WHERE id=?")->execute([$billNumber, $billId]);

            $insItem = $db->prepare(
                'INSERT INTO bill_items (bill_id, product_id, product_name, sku, price, quantity, line_total)
                 VALUES (?,?,?,?,?,?,?)'
            );
            $decStock = $db->prepare('UPDATE products SET stock=GREATEST(stock-?,0), sold_count=sold_count+? WHERE id=?');
            foreach ($resolved as $r) {
                $insItem->execute([$billId, $r['product_id'], $r['name'], $r['sku'], $r['price'], $r['quantity'], $r['line_total']]);
                $decStock->execute([$r['quantity'], $r['quantity'], $r['product_id']]);
            }

            // Reward the counter sale into the loyalty programme when a customer is linked.
            if ($userId && class_exists('LoyaltyController')) {
                $pts = LoyaltyController::pointsFor($total);
                if ($pts > 0) {
                    LoyaltyController::award($db, $userId, $pts, 'earn', null, 'In-store bill ' . $billNumber);
                }
            }

            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            Response::error('Could not save the bill. ' . $e->getMessage(), 500);
        }

        Response::success($this->fetchBill($billId), 'Bill ' . $billNumber . ' saved', 201);
    }

    /** GET /api/admin/billing/{id} — full bill for invoice / reprint. */
    public function show(array $p): void
    {
        Auth::staff();
        $bill = $this->fetchBill((int) $p['id']);
        if (!$bill) {
            Response::error('Bill not found', 404);
        }
        Response::success($bill);
    }

    /** PUT /api/admin/billing/{id}/void — cancel + restock a bill. */
    public function void(array $p): void
    {
        Auth::staff();
        $db = db();
        $id = (int) $p['id'];

        $b = $db->prepare('SELECT id, bill_number, status FROM bills WHERE id=?');
        $b->execute([$id]);
        $bill = $b->fetch();
        if (!$bill) {
            Response::error('Bill not found', 404);
        }
        if ($bill['status'] === 'void') {
            Response::error('This bill is already voided.', 422);
        }

        $db->beginTransaction();
        try {
            $items = $db->prepare('SELECT product_id, quantity FROM bill_items WHERE bill_id=?');
            $items->execute([$id]);
            $restock = $db->prepare('UPDATE products SET stock=stock+?, sold_count=GREATEST(sold_count-?,0) WHERE id=?');
            foreach ($items->fetchAll() as $it) {
                if ($it['product_id']) {
                    $restock->execute([(int) $it['quantity'], (int) $it['quantity'], (int) $it['product_id']]);
                }
            }
            $db->prepare("UPDATE bills SET status='void' WHERE id=?")->execute([$id]);
            $db->commit();
        } catch (\Throwable $e) {
            $db->rollBack();
            Response::error('Could not void the bill.', 500);
        }

        Response::success($this->fetchBill($id), 'Bill ' . $bill['bill_number'] . ' voided & restocked');
    }

    /** Load one bill with its items and cashier name. */
    private function fetchBill(int $id): ?array
    {
        $db = db();
        $b = $db->prepare(
            'SELECT b.*, u.name AS cashier FROM bills b LEFT JOIN users u ON u.id=b.cashier_id WHERE b.id=?'
        );
        $b->execute([$id]);
        $bill = $b->fetch();
        if (!$bill) {
            return null;
        }
        foreach (['subtotal', 'discount', 'discount_value', 'tax_pct', 'tax_amount', 'total', 'paid', 'change_due', 'split_cash', 'split_digital'] as $k) {
            $bill[$k] = (float) $bill[$k];
        }
        $it = $db->prepare('SELECT product_name, sku, price, quantity, line_total FROM bill_items WHERE bill_id=?');
        $it->execute([$id]);
        $items = $it->fetchAll();
        foreach ($items as &$r) {
            $r['price']      = (float) $r['price'];
            $r['quantity']   = (int) $r['quantity'];
            $r['line_total'] = (float) $r['line_total'];
        }
        $bill['items'] = $items;
        return $bill;
    }
}
