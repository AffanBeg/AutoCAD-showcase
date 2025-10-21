import { useCallback } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

export const AppLayout = () => {
  const { user, loading, signInWithGoogle, signOut } = useAuth();

  const handleSignIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Failed to start sign-in flow', error);
      alert('Unable to start Google sign-in. Check console for details.');
    }
  }, [signInWithGoogle]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out', error);
      alert('Unable to sign out. Check console for details.');
    }
  }, [signOut]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">
          <Link to="/">CAD Showcase</Link>
        </div>
        <nav className="nav-links">
          <Link to="/create">Create</Link>
        </nav>
        <div className="auth-controls">
          {loading ? (
            <span className="muted">Loading...</span>
          ) : user ? (
            <>
              <span className="user-email">{user.email}</span>
              <button type="button" onClick={handleSignOut} className="secondary-button">
                Sign out
              </button>
            </>
          ) : (
            <button type="button" onClick={handleSignIn} className="secondary-button">
              Sign in with Google
            </button>
          )}
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>CAD Showcase Platform - work in progress</span>
      </footer>
    </div>
  );
};
