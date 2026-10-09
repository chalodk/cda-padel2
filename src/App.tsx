import { useState, useEffect } from 'react';
import { Trophy, Settings } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AdminLogin } from '@/components/AdminLogin';
import { AdminDashboard } from '@/components/AdminDashboard';
import { PublicView } from '@/components/PublicView';

type Route = 'public' | 'admin';

function getRouteFromHash(): Route {
  return window.location.hash === '#/admin' ? 'admin' : 'public';
}

function AppContent() {
  const { user, loading } = useAuth();
  const [route, setRoute] = useState<Route>(getRouteFromHash());

  useEffect(() => {
    const onHash = () => setRoute(getRouteFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const goTo = (r: Route) => {
    window.location.hash = r === 'admin' ? '#/admin' : '#/';
    setRoute(r);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (route === 'admin') {
    if (!user) return <AdminLogin />;
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Public header */}
      <header className="bg-gradient-to-r from-brand-800 via-brand-700 to-brand-600 sticky top-0 z-30 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-white text-lg leading-tight">Liga de Pádel</h1>
              <p className="text-xs text-brand-100 leading-tight">Tabla de posiciones y fixture</p>
            </div>
          </div>
          <button
            onClick={() => goTo('admin')}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all backdrop-blur-sm"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>
      </header>

      <PublicView />

      <footer className="border-t border-ink-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-ink-400">
          Liga de Pádel · Sistema de gestión de ligas
        </div>
      </footer>

      {/* Floating admin link for mobile */}
      {route === 'public' && (
        <button
          onClick={() => goTo('admin')}
          className="fixed bottom-4 right-4 sm:hidden w-12 h-12 rounded-full bg-brand-600 text-white shadow-lg flex items-center justify-center"
        >
          <Settings className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
