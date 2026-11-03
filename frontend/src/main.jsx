import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { CompareProvider } from './context/CompareContext';
import { StoreProvider } from './context/StoreContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <CompareProvider>
                <StoreProvider>
                <App />
                </StoreProvider>
                <Toaster
                  position="top-center"
                  toastOptions={{
                    style: { background: '#23602e', color: '#fff', border: '1px solid #c9971c44' },
                  }}
                />
              </CompareProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);

// Register the service worker (production builds only; avoids dev caching headaches).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    // Remove the legacy worker that returned `undefined` from failed fetches
    // (`Failed to convert value to Response`) before installing the fixed one.
    navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(
      registrations
        .filter((registration) => /\/2sw\.js(?:$|\?)/.test(registration.active?.scriptURL || registration.installing?.scriptURL || ''))
        .map((registration) => registration.unregister())
    )).then(() => navigator.serviceWorker.register('/sw.js')).catch(() => {});
  });
}
