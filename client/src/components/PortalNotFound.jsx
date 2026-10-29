import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PortalNotFound() {
  const { user } = useAuth();
  return <section className="text-white space-y-3 py-12 text-center">
    <h1 className="text-2xl font-bold">Page not found</h1>
    <p className="text-white/50">Choose a page from the navigation or return to your dashboard.</p>
    <Link className="inline-block text-gold underline" to={`/${user.role}/dashboard`}>Open dashboard</Link>
  </section>;
}
