<?php
/**
 * Authentication & profile.
 */
class AuthController
{
    /**
     * POST /api/auth/google — sign in / sign up with a Google access token.
     * The frontend obtains the token via Google Identity Services; here we
     * validate it really belongs to OUR app, fetch the verified profile, then
     * find-or-create the user and issue our own JWT.
     */
    public function googleLogin(array $p): void
    {
        $clientId = env('GOOGLE_CLIENT_ID');
        if (!$clientId) {
            Response::error('Google sign-in is not configured on the server.', 503);
        }
        $token = trim((string) (Request::body()['access_token'] ?? ''));
        if ($token === '') {
            Response::error('Missing Google token', 422);
        }

        // 1) Validate the token and confirm it was issued for THIS client.
        $info = self::httpJson('https://oauth2.googleapis.com/tokeninfo?access_token=' . urlencode($token));
        $aud = $info['aud'] ?? $info['azp'] ?? null;
        if (!$info || $aud !== $clientId) {
            Response::error('Invalid or mismatched Google token', 401);
        }

        // 2) Fetch the verified profile.
        $profile = self::httpJson('https://www.googleapis.com/oauth2/v3/userinfo', $token);
        $email = $profile['email'] ?? ($info['email'] ?? null);
        if (!$email) {
            Response::error('Google account did not return an email', 422);
        }
        $name    = $profile['name'] ?? explode('@', $email)[0];
        $picture = $profile['picture'] ?? null;

        // 3) Find or create the user (Google accounts are pre-verified).
        $db = db();
        $u = $db->prepare('SELECT * FROM users WHERE email=?');
        $u->execute([$email]);
        $user = $u->fetch();

        if (!$user) {
            $db->prepare('INSERT INTO users (name, email, password_hash, is_verified, avatar_url, referral_code) VALUES (?,?,?,?,?,?)')
               ->execute([
                   $name, $email,
                   password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT), // unusable random password
                   1, $picture, LoyaltyController::makeReferralCode($db),
               ]);
            $u->execute([$email]);
            $user = $u->fetch();
        } elseif ((int) $user['is_verified'] === 0) {
            $db->prepare('UPDATE users SET is_verified=1 WHERE id=?')->execute([$user['id']]);
            $user['is_verified'] = 1;
        }

        if (($user['status'] ?? '') === 'blocked') {
            Response::error('Your account has been blocked', 403);
        }

        Response::success($this->authPayload($user), 'Signed in with Google');
    }

    /** GET JSON over HTTPS (optionally with a bearer token). Returns null on failure. */
    private static function httpJson(string $url, ?string $bearer = null): ?array
    {
        $ch = curl_init($url);
        $headers = [];
        if ($bearer) {
            $headers[] = 'Authorization: Bearer ' . $bearer;
        }
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => env('APP_ENV') !== 'development',
            CURLOPT_SSL_VERIFYHOST => env('APP_ENV') !== 'development' ? 2 : 0,
            CURLOPT_HTTPHEADER     => $headers,
        ]);
        $res  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        // Fallback retry with verify peer disabled if local SSL bundle is missing
        if ((!$res || $code !== 200) && curl_errno($ch)) {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            $res  = curl_exec($ch);
            $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        }
        curl_close($ch);
        if ($code !== 200 || !$res) {
            return null;
        }
        $json = json_decode($res, true);
        return is_array($json) ? $json : null;
    }

    public function register(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, [
            'name'     => 'required|min:2|max:120',
            'email'    => 'required|email',
            'password' => 'required|min:6|confirmed',
            'phone'    => 'required',
        ]);
        // Normalise to a 10-digit Indian mobile (accepts spaces, dashes, +91 / 0 prefix).
        $phone = preg_replace('/\D+/', '', (string) ($data['phone'] ?? ''));
        $phone = preg_replace('/^(91|0)(?=\d{10}$)/', '', $phone);
        if (!$v->fails() && !preg_match('/^[6-9]\d{9}$/', $phone)) {
            Response::error('Validation failed', 422, ['phone' => ['Enter a valid 10-digit mobile number']]);
        }
        $data['phone'] = $phone;
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }

        $db = db();
        $exists = $db->prepare('SELECT id, is_verified FROM users WHERE email = ?');
        $exists->execute([$data['email']]);
        if ($row = $exists->fetch()) {
            if ((int) $row['is_verified'] === 1) {
                Response::error('Email already registered', 409);
            }
            $userId = (int) $row['id'];
            $db->prepare('UPDATE users SET name=?, phone=?, password_hash=? WHERE id=?')
               ->execute([$data['name'], $data['phone'], password_hash($data['password'], PASSWORD_BCRYPT), $userId]);
        } else {
            $stmt = $db->prepare('INSERT INTO users (name, email, phone, password_hash, referral_code) VALUES (?,?,?,?,?)');
            $stmt->execute([
                $data['name'], $data['email'], $data['phone'],
                password_hash($data['password'], PASSWORD_BCRYPT),
                LoyaltyController::makeReferralCode($db),
            ]);
            $userId = (int) $db->lastInsertId();
        }

        $this->issueOtp($userId, $data['name'], $data['email']);
        Response::success(['email' => $data['email']], 'Registered. OTP sent to email.', 201);
    }

    public function verifyOtp(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, ['email' => 'required|email', 'otp' => 'required']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }

        $db = db();
        $user = $this->userByEmail($data['email']);
        if (!$user) {
            Response::error('User not found', 404);
        }
        $stmt = $db->prepare(
            "SELECT * FROM auth_tokens WHERE user_id=? AND type='email_otp' AND used=0
             AND expires_at > NOW() ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute([$user['id']]);
        $token = $stmt->fetch();
        if (!$token || !hash_equals($token['token'], (string) $data['otp'])) {
            Response::error('Invalid or expired OTP', 400);
        }

        $db->prepare('UPDATE auth_tokens SET used=1 WHERE id=?')->execute([$token['id']]);
        $db->prepare('UPDATE users SET is_verified=1 WHERE id=?')->execute([$user['id']]);

        Response::success($this->authPayload($user), 'Email verified successfully');
    }

    public function resendOtp(array $p): void
    {
        $email = Request::input('email');
        $user = $this->userByEmail($email);
        if (!$user) {
            Response::error('User not found', 404);
        }
        $this->issueOtp((int) $user['id'], $user['name'], $user['email']);
        Response::success(null, 'OTP resent');
    }

    public function login(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, ['email' => 'required|email', 'password' => 'required']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }

        $user = $this->userByEmail($data['email']);
        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            Response::error('Invalid credentials', 401);
        }
        if ($user['status'] === 'blocked') {
            Response::error('Your account has been blocked', 403);
        }
        if ((int) $user['is_verified'] === 0) {
            $this->issueOtp((int) $user['id'], $user['name'], $user['email']);
            Response::error('Please verify your email. A new OTP has been sent.', 403, ['needs_verification' => true]);
        }

        Response::success($this->authPayload($user), 'Login successful');
    }

    public function logout(array $p): void
    {
        // Stateless JWT - client simply discards the token.
        Response::success(null, 'Logged out');
    }

    public function forgotPassword(array $p): void
    {
        $email = Request::input('email');
        $user = $this->userByEmail($email);
        // Always respond success to avoid user enumeration.
        if ($user) {
            $token = bin2hex(random_bytes(24));
            db()->prepare(
                "INSERT INTO auth_tokens (user_id, token, type, expires_at)
                 VALUES (?,?,'password_reset', DATE_ADD(NOW(), INTERVAL 30 MINUTE))"
            )->execute([$user['id'], $token]);
            $link = rtrim(env('FRONTEND_URL'), '/') . "/reset-password?token=$token&email=" . urlencode($email);
            Mailer::send($email, 'Reset your ' . Mailer::brand() . ' password', Mailer::resetTemplate($user['name'], $link));
        }
        Response::success(null, 'If the email exists, a reset link has been sent.');
    }

    public function resetPassword(array $p): void
    {
        $data = Request::body();
        $v = Validator::make($data, [
            'email'    => 'required|email',
            'token'    => 'required',
            'password' => 'required|min:6|confirmed',
        ]);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        $db = db();
        $user = $this->userByEmail($data['email']);
        if (!$user) {
            Response::error('Invalid reset request', 400);
        }
        $stmt = $db->prepare(
            "SELECT * FROM auth_tokens WHERE user_id=? AND token=? AND type='password_reset'
             AND used=0 AND expires_at > NOW() LIMIT 1"
        );
        $stmt->execute([$user['id'], $data['token']]);
        $token = $stmt->fetch();
        if (!$token) {
            Response::error('Invalid or expired reset token', 400);
        }
        $db->prepare('UPDATE users SET password_hash=? WHERE id=?')
           ->execute([password_hash($data['password'], PASSWORD_BCRYPT), $user['id']]);
        $db->prepare('UPDATE auth_tokens SET used=1 WHERE id=?')->execute([$token['id']]);
        Response::success(null, 'Password reset successful');
    }

    public function me(array $p): void
    {
        $id = Auth::id();
        $stmt = db()->prepare('SELECT id, name, email, phone, role, avatar_url, created_at FROM users WHERE id=?');
        $stmt->execute([$id]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::error('User not found', 404);
        }
        // Sliding session: hand back a fresh token so an active user's 7-day
        // window keeps rolling forward — they're never silently logged out
        // mid-use. The client swaps this in for the one it sent.
        $user['token'] = Jwt::encode(['sub' => (int) $user['id'], 'role' => $user['role'], 'name' => $user['name']]);
        Response::success($user);
    }

    public function updateProfile(array $p): void
    {
        $id = Auth::id();
        $data = Request::body();
        $v = Validator::make($data, ['name' => 'required|min:2|max:120']);
        if ($v->fails()) {
            Response::error('Validation failed', 422, $v->errors());
        }
        db()->prepare('UPDATE users SET name=?, phone=? WHERE id=?')
            ->execute([$data['name'], $data['phone'] ?? null, $id]);

        // Profile photo: "avatar" = data:image… (new upload), http(s) URL (keep), or "" (remove).
        // Omitted entirely -> photo left unchanged.
        if (array_key_exists('avatar', $data)) {
            $avatar = trim((string) $data['avatar']);
            if ($avatar === '') {
                $avatar = null;
            } elseif (str_starts_with($avatar, 'data:image/')) {
                if (strlen($avatar) > 3 * 1024 * 1024) {
                    Response::error('Profile photo is too large — please use an image under 2 MB.', 422);
                }
                try {
                    $up = Cloudinary::upload($avatar, 'nutsvally/avatars');
                    if ($up && !empty($up['url'])) {
                        $avatar = $up['url'];
                    }
                } catch (\Throwable $e) {
                    // Cloudinary unavailable — keep the (already resized) data URI inline.
                }
            } elseif (!preg_match('#^https?://#i', $avatar)) {
                Response::error('Invalid profile photo', 422);
            }
            db()->prepare('UPDATE users SET avatar_url=? WHERE id=?')->execute([$avatar, $id]);
        }
        $this->me($p);
    }

    public function changePassword(array $p): void
    {
        $id = Auth::id();
        $data = Request::body();
        $v = Validator::make($data, [
            'current_password' => 'required',
            'password'         => 'required|min:6|confirmed',
        ]);
        if ($v->fails()) {
            $firstError = 'Validation failed';
            foreach ($v->errors() as $errs) {
                if (!empty($errs[0])) { $firstError = $errs[0]; break; }
            }
            Response::error($firstError, 422, $v->errors());
        }
        $stmt = db()->prepare('SELECT password_hash FROM users WHERE id=?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row || !password_verify($data['current_password'], $row['password_hash'])) {
            Response::error('Current password is incorrect', 400);
        }
        db()->prepare('UPDATE users SET password_hash=? WHERE id=?')
            ->execute([password_hash($data['password'], PASSWORD_BCRYPT), $id]);
        Response::success(null, 'Password changed successfully');
    }

    // ---------- helpers ----------

    private function issueOtp(int $userId, string $name, string $email): void
    {
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        db()->prepare(
            "INSERT INTO auth_tokens (user_id, token, type, expires_at)
             VALUES (?,?,'email_otp', DATE_ADD(NOW(), INTERVAL 10 MINUTE))"
        )->execute([$userId, $otp]);
        Mailer::send($email, 'Your ' . Mailer::brand() . ' verification code', Mailer::otpTemplate($name, $otp));
    }

    private function userByEmail(?string $email): ?array
    {
        if (!$email) {
            return null;
        }
        $stmt = db()->prepare('SELECT * FROM users WHERE email=?');
        $stmt->execute([$email]);
        return $stmt->fetch() ?: null;
    }

    private function authPayload(array $user): array
    {
        $token = Jwt::encode(['sub' => (int) $user['id'], 'role' => $user['role'], 'name' => $user['name']]);
        return [
            'token' => $token,
            'user'  => [
                'id'    => (int) $user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role'],
                'phone' => $user['phone'],
                'avatar_url' => $user['avatar_url'] ?? null,
            ],
        ];
    }
}
