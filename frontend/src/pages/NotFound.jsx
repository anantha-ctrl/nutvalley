import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-8xl font-bold text-gold">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-gray-400">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-gold mt-8">Back to Home</Link>
    </div>
  );
}
