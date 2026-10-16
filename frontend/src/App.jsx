import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MobileTabBar from './components/MobileTabBar';
import WhatsAppButton from './components/WhatsAppButton';
import CompareBar from './components/CompareBar';
import ProtectedRoute from './components/ProtectedRoute';
import { Spinner } from './components/ui';

// Customer pages (lazy-loaded for a smaller initial bundle)
const Landing = lazy(() => import('./landing/Landing'));
const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Cart = lazy(() => import('./pages/Cart'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Compare = lazy(() => import('./pages/Compare'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Orders = lazy(() => import('./pages/Orders'));
const OrderDetail = lazy(() => import('./pages/OrderDetail'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const VerifyOtp = lazy(() => import('./pages/auth/VerifyOtp'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const VerifyOrder = lazy(() => import('./pages/VerifyOrder'));
const About = lazy(() => import('./pages/static/About'));
const Contact = lazy(() => import('./pages/static/Contact'));
const Privacy = lazy(() => import('./pages/static/Privacy'));
const Terms = lazy(() => import('./pages/static/Terms'));
const Returns = lazy(() => import('./pages/static/Returns'));
const Shipping = lazy(() => import('./pages/static/Shipping'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Admin (split into its own chunks — Recharts only loads here)
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const Dashboard = lazy(() => import('./admin/Dashboard'));
const AdminProducts = lazy(() => import('./admin/AdminProducts'));
const AdminProductForm = lazy(() => import('./admin/AdminProductForm'));
const AdminCategories = lazy(() => import('./admin/AdminCategories'));
const AdminOrders = lazy(() => import('./admin/AdminOrders'));
const AdminBilling = lazy(() => import('./admin/AdminBilling'));
const AdminInvoices = lazy(() => import('./admin/AdminInvoices'));
const AdminStaff = lazy(() => import('./admin/AdminStaff'));
const CashierLayout = lazy(() => import('./admin/CashierLayout'));
const AdminCustomers = lazy(() => import('./admin/AdminCustomers'));
const AdminCoupons = lazy(() => import('./admin/AdminCoupons'));
const AdminInventory = lazy(() => import('./admin/AdminInventory'));
const AdminReports = lazy(() => import('./admin/AdminReports'));
const AdminBanners = lazy(() => import('./admin/AdminBanners'));
const AdminReviews = lazy(() => import('./admin/AdminReviews'));
const AdminReturns = lazy(() => import('./admin/AdminReturns'));
const AdminLoyalty = lazy(() => import('./admin/AdminLoyalty'));
const AdminMessages = lazy(() => import('./admin/AdminMessages'));
const AdminSettings = lazy(() => import('./admin/AdminSettings'));
const AdminAutomation = lazy(() => import('./admin/AdminAutomation'));

const AUTH_ROUTES = ['/login', '/register', '/verify-otp', '/forgot-password', '/reset-password'];

export default function App() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  // A cashier is locked to the billing counter: every other route (storefront,
  // admin, static pages) bounces to /cashier. Logging out clears `user`, which
  // removes the lock so the login/storefront flow works again.
  if (user?.role === 'cashier' && !pathname.startsWith('/cashier')) {
    return <Navigate to="/cashier" replace />;
  }

  // Admin + cashier both ship their own layout header — no storefront chrome.
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/cashier');
  // Auth pages are a full-screen split — no storefront chrome around them.
  const isAuth = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  // The landing page ships its own premium nav + footer — no shared chrome.
  const isLanding = pathname === '/';
  // Public invoice-verification page (scanned at delivery) renders its own chrome.
  const isVerify = pathname.startsWith('/verify-order');
  const bare = isAdmin || isAuth || isLanding || isVerify;

  return (
    <div className="flex min-h-screen flex-col">
      {!bare && <Navbar />}
      <main className="flex-1">
        <Suspense fallback={<Spinner className="min-h-[60vh]" />}>
        <Routes>
          {/* Customer */}
          <Route path="/" element={<Landing />} />
          <Route path="/home" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/category/:slug" element={<Shop />} />
          <Route path="/product/:slug" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/order-success/:id" element={<ProtectedRoute><OrderSuccess /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Public order verification (invoice QR scan) */}
          <Route path="/verify-order/:id" element={<VerifyOrder />} />

          {/* Static */}
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/shipping" element={<Shipping />} />

          {/* Cashier — billing counter only */}
          <Route path="/cashier" element={<ProtectedRoute roles={['cashier', 'admin']}><CashierLayout /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="billing" element={<AdminBilling />} />
            <Route path="invoices" element={<AdminInvoices />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="returns" element={<AdminReturns />} />
            <Route path="loyalty" element={<AdminLoyalty />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="cashiers" element={<AdminStaff />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="automation" element={<AdminAutomation />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>
      {!bare && <Footer />}
      {!bare && <MobileTabBar />}
      {!bare && <WhatsAppButton />}
      {!bare && <CompareBar />}
    </div>
  );
}
