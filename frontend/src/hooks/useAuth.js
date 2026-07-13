import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/** Access the authenticated user and auth actions (login/register/logout). */
export default function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
