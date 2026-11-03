<?php
/**
 * API route map.  $router is provided by index.php.
 * @var Router $router
 */

// Health check
$router->get('/', fn() => Response::success(['name' => 'Novo Clothing API', 'version' => '1.0']));

// ---- Auth ----
$router->post('/api/auth/register',        'AuthController@register');
$router->post('/api/auth/verify-otp',      'AuthController@verifyOtp');
$router->post('/api/auth/resend-otp',      'AuthController@resendOtp');
$router->post('/api/auth/login',           'AuthController@login');
$router->post('/api/auth/google',          'AuthController@googleLogin');
$router->post('/api/auth/logout',          'AuthController@logout');
$router->post('/api/auth/forgot-password', 'AuthController@forgotPassword');
$router->post('/api/auth/reset-password',  'AuthController@resetPassword');
$router->get('/api/auth/me',               'AuthController@me');

// ---- Profile ----
$router->put('/api/profile',           'AuthController@updateProfile');
$router->post('/api/profile',          'AuthController@updateProfile');
$router->put('/api/profile/password',  'AuthController@changePassword');
$router->post('/api/profile/password', 'AuthController@changePassword');

// ---- Categories ----
$router->get('/api/categories',              'CategoryController@index');
$router->get('/api/categories/{slug}/thumb', 'MiscController@categoryImage'); // public image passthrough
$router->get('/api/categories/{slug}',       'CategoryController@show');

// ---- Products ----
$router->get('/api/products',                 'ProductController@index');
$router->get('/api/products/featured',        'ProductController@featured');
$router->get('/api/products/trending',        'ProductController@trending');
$router->get('/api/products/new-arrivals',    'ProductController@newArrivals');
$router->get('/api/products/best-sellers',    'ProductController@bestSellers');
$router->get('/api/products/filters',         'ProductController@filters');
$router->get('/api/products/{id}/thumb',      'MiscController@productImage'); // public image passthrough
$router->get('/api/products/{slug}',          'ProductController@show');
$router->get('/api/products/{slug}/related',  'ProductController@related');
$router->get('/share/product/{slug}',         'ProductController@share'); // OG preview page for shared links
$router->get('/api/products/{slug}/frequently-bought', 'ProductController@frequentlyBought');

// ---- Reviews ----
$router->get('/api/products/{id}/reviews', 'ReviewController@index');
$router->post('/api/products/{id}/reviews','ReviewController@store');

// ---- Wishlist ----
$router->get('/api/wishlist',                  'WishlistController@index');
$router->post('/api/wishlist',                 'WishlistController@store');
$router->delete('/api/wishlist/{id}',          'WishlistController@destroy');
$router->delete('/api/wishlist/{id}/delete',   'WishlistController@destroy');
$router->post('/api/wishlist/{id}/delete',     'WishlistController@destroy');

// ---- Cart ----
$router->get('/api/cart',                      'CartController@index');
$router->post('/api/cart',                     'CartController@store');
$router->put('/api/cart/{id}',                 'CartController@update');
$router->post('/api/cart/{id}',                'CartController@update');
$router->delete('/api/cart/{id}',              'CartController@destroy');
$router->delete('/api/cart/{id}/delete',       'CartController@destroy');
$router->post('/api/cart/{id}/delete',         'CartController@destroy');
$router->delete('/api/cart',                   'CartController@clear');
$router->post('/api/cart/clear',               'CartController@clear');

// ---- Addresses ----
$router->get('/api/addresses',                'AddressController@index');
$router->post('/api/addresses',               'AddressController@store');
$router->put('/api/addresses/{id}',           'AddressController@update');
$router->post('/api/addresses/{id}',          'AddressController@update');
$router->delete('/api/addresses/{id}',        'AddressController@destroy');
$router->delete('/api/addresses/{id}/delete', 'AddressController@destroy');
$router->post('/api/addresses/{id}/delete',   'AddressController@destroy');

// ---- Coupons ----
$router->post('/api/coupons/apply', 'CouponController@apply');

// ---- Checkout / Payment ----
$router->post('/api/checkout/quote',        'CheckoutController@quote'); // live totals + allowed methods
$router->post('/api/checkout/create-order', 'CheckoutController@createOrder');
$router->post('/api/checkout/verify',       'CheckoutController@verify');

// ---- Orders ----
$router->get('/api/shipping-info',       'OrderController@shippingInfo');
$router->get('/api/shipping-check',      'OrderController@shippingCheck'); // live pincode serviceability + ETA
$router->get('/api/orders/{id}/track',   'OrderController@track');         // live courier scans (customer)
$router->get('/api/orders/verify/{id}',  'OrderController@verifyPublic'); // public — invoice QR scan
$router->get('/api/orders',              'OrderController@index');
$router->get('/api/orders/{id}',         'OrderController@show');
$router->post('/api/orders/cod',         'OrderController@placeCod');
$router->post('/api/orders/upi',         'OrderController@placeUpi');
$router->put('/api/orders/{id}/cancel',  'OrderController@cancel');
$router->post('/api/orders/{id}/reorder','OrderController@reorder');
$router->post('/api/orders/{id}/return', 'ReturnController@request');
$router->get('/api/loyalty',             'LoyaltyController@index');

// ---- Cron (token-protected, public) ----
$router->get('/api/cron/run',            'CronController@run');

// ---- Misc ----
$router->post('/api/newsletter',         'MiscController@newsletter');
$router->post('/api/contact',            'MiscController@contact');
$router->get('/api/store-info',          'MiscController@storeInfo');
$router->get('/api/payment-info',        'MiscController@paymentInfo');
$router->get('/api/landing',             'MiscController@landing');
$router->get('/api/recently-viewed',     'MiscController@recentlyViewed');
$router->post('/api/recently-viewed',    'MiscController@trackView');
$router->get('/api/offers',              'MiscController@offers');
$router->get('/api/banners/{id}/image',  'MiscController@bannerImage');
$router->get('/api/banners',             'MiscController@banners');
$router->post('/api/notify-stock',       'MiscController@notifyStock');

// ======================= ADMIN =======================
$router->get('/api/admin/dashboard',          'AdminDashboardController@stats');
$router->get('/api/admin/notifications',          'AdminDashboardController@notifications');
$router->post('/api/admin/notifications/state',   'AdminDashboardController@setNotificationState');
$router->post('/api/admin/notifications/read-all','AdminDashboardController@markAllRead');
$router->get('/api/admin/reports/sales',      'AdminReportController@sales');
$router->get('/api/admin/reports/products',   'AdminReportController@products');
$router->get('/api/admin/reports/customers',  'AdminReportController@customers');

$router->get('/api/admin/categories',                'AdminCategoryController@index');
$router->post('/api/admin/categories',               'AdminCategoryController@store');
$router->put('/api/admin/categories/{id}',           'AdminCategoryController@update');
$router->post('/api/admin/categories/{id}',          'AdminCategoryController@update');
$router->delete('/api/admin/categories/{id}',        'AdminCategoryController@destroy');
$router->delete('/api/admin/categories/{id}/delete', 'AdminCategoryController@destroy');
$router->post('/api/admin/categories/{id}/delete',   'AdminCategoryController@destroy');

$router->get('/api/admin/products',                  'AdminProductController@index');
$router->post('/api/admin/products',                 'AdminProductController@store');
$router->post('/api/admin/products/bulk',            'AdminProductController@bulk');
$router->post('/api/admin/products/import',          'AdminProductController@import');
$router->get('/api/admin/products/{id}',             'AdminProductController@show');
$router->put('/api/admin/products/{id}',             'AdminProductController@update');
$router->post('/api/admin/products/{id}',            'AdminProductController@update');
$router->delete('/api/admin/products/{id}',          'AdminProductController@destroy');
$router->delete('/api/admin/products/{id}/delete',   'AdminProductController@destroy');
$router->post('/api/admin/products/{id}/delete',     'AdminProductController@destroy');
$router->post('/api/admin/products/{id}/images',     'AdminProductController@uploadImages');
$router->get('/api/admin/inventory/low-stock',       'AdminProductController@lowStock');
$router->get('/api/admin/inventory',                 'AdminProductController@inventory');
$router->put('/api/admin/inventory/{id}',            'AdminProductController@updateStock');
$router->post('/api/admin/inventory/{id}',           'AdminProductController@updateStock');

$router->get('/api/admin/orders',              'AdminOrderController@index');
$router->put('/api/admin/orders/{id}/status',  'AdminOrderController@updateStatus');
$router->post('/api/admin/orders/{id}/status/undo', 'AdminOrderController@undoStatus');
$router->post('/api/admin/orders/{id}/status/redo', 'AdminOrderController@redoStatus');
$router->get('/api/admin/orders/{id}/payment', 'AdminOrderController@paymentProof');
$router->put('/api/admin/orders/{id}/payment', 'AdminOrderController@reviewPayment');

// ---- Delivery partner (courier API) ----
$router->get('/api/admin/delivery/config',         'AdminDeliveryController@config');
$router->put('/api/admin/delivery/config',         'AdminDeliveryController@saveConfig');
$router->post('/api/admin/delivery/config',        'AdminDeliveryController@saveConfig');
$router->post('/api/admin/delivery/test',          'AdminDeliveryController@test');
$router->get('/api/admin/delivery/serviceability', 'AdminDeliveryController@serviceability');
$router->get('/api/admin/delivery/shipments',      'AdminDeliveryController@shipments');
$router->post('/api/admin/delivery/sync',          'AdminDeliveryController@sync');
$router->get('/api/admin/delivery/export',         'AdminDeliveryController@export');
$router->post('/api/admin/orders/{id}/ship',        'AdminDeliveryController@ship');
$router->post('/api/admin/orders/{id}/ship/cancel', 'AdminDeliveryController@cancel');
$router->get('/api/admin/orders/{id}/track',        'AdminDeliveryController@track');

// Unified invoices — online orders + counter bills in one view
$router->get('/api/admin/invoices',                         'AdminInvoiceController@index');
$router->get('/api/admin/invoices/order/{id}',              'AdminInvoiceController@order');
$router->delete('/api/admin/invoices/{source}/{id}',        'AdminInvoiceController@destroy');
$router->delete('/api/admin/invoices/{source}/{id}/delete', 'AdminInvoiceController@destroy');
$router->post('/api/admin/invoices/{source}/{id}/delete',   'AdminInvoiceController@destroy');

$router->get('/api/admin/customers',          'AdminCustomerController@index');
$router->get('/api/admin/customers/{id}',     'AdminCustomerController@show');

$router->get('/api/admin/banners',                'AdminBannerController@index');
$router->post('/api/admin/banners',               'AdminBannerController@store');
$router->put('/api/admin/banners/{id}',           'AdminBannerController@update');
$router->post('/api/admin/banners/{id}',          'AdminBannerController@update');
$router->delete('/api/admin/banners/{id}',        'AdminBannerController@destroy');
$router->delete('/api/admin/banners/{id}/delete', 'AdminBannerController@destroy');
$router->post('/api/admin/banners/{id}/delete',   'AdminBannerController@destroy');

$router->get('/api/admin/coupons',                'AdminCouponController@index');
$router->post('/api/admin/coupons',               'AdminCouponController@store');
$router->put('/api/admin/coupons/{id}',           'AdminCouponController@update');
$router->post('/api/admin/coupons/{id}',          'AdminCouponController@update');
$router->delete('/api/admin/coupons/{id}',        'AdminCouponController@destroy');
$router->delete('/api/admin/coupons/{id}/delete', 'AdminCouponController@destroy');
$router->post('/api/admin/coupons/{id}/delete',   'AdminCouponController@destroy');

$router->get('/api/admin/reviews',                'AdminReviewController@index');
$router->put('/api/admin/reviews/{id}',           'AdminReviewController@update');
$router->post('/api/admin/reviews/{id}',          'AdminReviewController@update');
$router->delete('/api/admin/reviews/{id}',        'AdminReviewController@destroy');
$router->delete('/api/admin/reviews/{id}/delete', 'AdminReviewController@destroy');
$router->post('/api/admin/reviews/{id}/delete',   'AdminReviewController@destroy');

$router->get('/api/admin/returns',            'AdminReturnController@index');
$router->put('/api/admin/returns/{id}',       'AdminReturnController@update');
$router->post('/api/admin/returns/{id}',      'AdminReturnController@update');

$router->get('/api/admin/loyalty',             'AdminLoyaltyController@index');
$router->put('/api/admin/loyalty/settings',    'AdminLoyaltyController@saveSettings');
$router->post('/api/admin/loyalty/settings',   'AdminLoyaltyController@saveSettings');
$router->get('/api/admin/loyalty/{id}',        'AdminLoyaltyController@show');
$router->post('/api/admin/loyalty/{id}/adjust','AdminLoyaltyController@adjust');

// ---- Billing / POS (literal routes before {id}) ----
$router->get('/api/admin/billing/config',      'AdminBillingController@config');
$router->get('/api/admin/billing/lookup',      'AdminBillingController@lookup');
$router->get('/api/admin/billing/customer-lookup', 'AdminBillingController@customerLookup');
$router->get('/api/admin/billing/products',    'AdminBillingController@products');
$router->get('/api/admin/billing',             'AdminBillingController@index');
$router->post('/api/admin/billing',            'AdminBillingController@create');
$router->put('/api/admin/billing/{id}/void',   'AdminBillingController@void');
$router->get('/api/admin/billing/{id}',        'AdminBillingController@show');

$router->get('/api/admin/messages',                'AdminContactController@index');
$router->put('/api/admin/messages/{id}',           'AdminContactController@update');
$router->post('/api/admin/messages/{id}',          'AdminContactController@update');
$router->delete('/api/admin/messages/{id}',        'AdminContactController@destroy');
$router->delete('/api/admin/messages/{id}/delete', 'AdminContactController@destroy');
$router->post('/api/admin/messages/{id}/delete',   'AdminContactController@destroy');

// ---- Cashier / staff accounts ----
$router->get('/api/admin/staff',                'AdminStaffController@index');
$router->post('/api/admin/staff',               'AdminStaffController@store');
$router->put('/api/admin/staff/{id}',           'AdminStaffController@update');
$router->post('/api/admin/staff/{id}',          'AdminStaffController@update');
$router->delete('/api/admin/staff/{id}',        'AdminStaffController@destroy');
$router->delete('/api/admin/staff/{id}/delete', 'AdminStaffController@destroy');
$router->post('/api/admin/staff/{id}/delete',   'AdminStaffController@destroy');

$router->get('/api/admin/settings',           'AdminSettingsController@index');
$router->put('/api/admin/settings',           'AdminSettingsController@update');
$router->post('/api/admin/settings',          'AdminSettingsController@update');

// ---- Mail Automation ----
$router->get('/api/admin/automation',         'AdminAutomationController@index');
$router->put('/api/admin/automation',         'AdminAutomationController@save');
$router->post('/api/admin/automation/run',    'AdminAutomationController@run');
