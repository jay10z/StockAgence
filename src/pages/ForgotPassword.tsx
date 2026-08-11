import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Warehouse } from 'lucide-react';
import supabase from '../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) {
      setError('Entrez votre adresse e-mail.');
      return;
    }
    setSubmitting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (resetError) {
        setError(resetError.message || 'Impossible d\'envoyer l\'e-mail.');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Une erreur est survenue. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-700 to-emerald-900 flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg mb-3">
            <Warehouse className="w-8 h-8 text-emerald-700" />
          </div>
          <h1 className="text-2xl font-bold text-white">Mot de passe oublié</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5">
          {success ? (
            <div className="space-y-4 text-center">
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-4 rounded-xl text-base font-medium">
                Si un compte existe pour <strong>{email}</strong>, un e-mail de réinitialisation a été envoyé.
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-emerald-700 font-bold text-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-slate-600 text-base text-center">
                Entrez votre e-mail. Nous vous enverrons un lien pour créer un nouveau mot de passe.
              </p>

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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-lg px-4 py-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 focus:outline-none"
                  placeholder="vous@exemple.cm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xl font-bold py-4 rounded-xl"
              >
                {submitting ? 'Envoi...' : 'Envoyer le lien'}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-slate-600 font-semibold text-base"
              >
                <ArrowLeft className="w-5 h-5" />
                Retour
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
