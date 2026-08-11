import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Warehouse, Eye, EyeOff } from 'lucide-react';
import supabase from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Loading from '../components/Loading';

export default function Login() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading && !submitting) return <Loading fullScreen />;

  if (user && profile) {
    if (profile.role === 'agency_employee') return <Navigate to="/agence" replace />;
    return <Navigate to="/entrepot" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Entrez votre e-mail et votre mot de passe.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError || !data.user) {
        setError('E-mail ou mot de passe incorrect.');
        return;
      }

      // Load profile immediately (direct Supabase) so redirect is instant
      await refreshProfile();

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileRow?.role === 'agency_employee') {
        navigate('/agence', { replace: true });
      } else {
        navigate('/entrepot', { replace: true });
      }
    } catch {
      setError('Impossible de se connecter. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-700 to-emerald-900 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white shadow-lg mb-4">
            <Warehouse className="w-10 h-10 text-emerald-700" />
          </div>
          <h1 className="text-3xl font-bold text-white">StockAgence</h1>
          <p className="text-emerald-100 text-lg mt-2">Stock entrepôt en temps réel</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5"
        >
          <h2 className="text-2xl font-bold text-slate-800 text-center">Connexion</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-base font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
              placeholder="vous@exemple.cm"
            />
          </div>

          <div>
            <label className="block text-base font-semibold text-slate-700 mb-2" htmlFor="password">
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-lg px-4 py-4 pr-14 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-500"
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
              </button>
            </div>
          </div>

          <div className="text-right">
            <Link to="/mot-de-passe-oublie" className="text-emerald-700 font-semibold text-base">
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white text-xl font-bold py-4 rounded-xl shadow-md"
          >
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-sm text-slate-500 text-center mb-2 font-medium">Comptes démo</p>
            <div className="space-y-1 text-sm text-slate-600 text-center">
              <p>Propriétaire : owner@stockagence.cm</p>
              <p>Entrepôt : entrepot@stockagence.cm</p>
              <p>Agence : agence@stockagence.cm</p>
              <p>Mot de passe : password123</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
