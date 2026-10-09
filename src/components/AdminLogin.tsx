import { useState } from 'react';
import { Trophy, Lock, Mail, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export function AdminLogin() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fn = mode === 'signin' ? signIn : signUp;
    const { error: err } = await fn(email, password);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-950 via-ink-900 to-ink-950">
      <div className="w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 shadow-lg mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-white">Liga de Pádel</h1>
          <p className="text-sm text-ink-300 mt-1">Panel de Administración</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex gap-1 mb-6 p-1 bg-ink-100 rounded-lg">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signin' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Ingresar
            </button>
            
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="admin@liga.com"
                />
              </div>
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 animate-fade-in">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Procesando...' : mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-xs text-ink-400 text-center mt-6">
            {mode === 'signin'
              ? 'Solo administradores tienen acceso al panel.'
              : 'Crea una cuenta de administrador para empezar a gestionar ligas.'}
          </p>
        </div>
      </div>
    </div>
  );
}
