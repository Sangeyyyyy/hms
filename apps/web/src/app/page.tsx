import { redirect } from 'next/navigation';

/**
 * Root page redirects to login.
 * Authenticated users will be redirected to /dashboard by middleware.
 */
export default function HomePage() {
  redirect('/login');
}
