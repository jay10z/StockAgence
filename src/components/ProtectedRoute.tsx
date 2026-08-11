import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { UserRole } from '../lib/types';
import Loading from './Loading';

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, profile, loading, profileError, refreshProfile } = useAuth();

  if (loading && !profile) {
    return <Loading fullScreen message="Chargement..." />;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 gap-4">
        <p className="text-lg text-slate-700 font-semibold text-center">
          {profileError || 'Impossible de charger votre profil.'}
        </p>
        <button
          type="button"
          onClick={() => refreshProfile()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg px-6 py-3.5 rounded-xl"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (roles && !roles.includes(profile.role)) {
    if (profile.role === 'agency_employee') {
      return <Navigate to="/agence" replace />;
    }
    return <Navigate to="/entrepot" replace />;
  }

  return <>{children}</>;
}
