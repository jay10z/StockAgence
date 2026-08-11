import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Package,
  LayoutDashboard,
  ClipboardList,
  History,
  LogOut,
  Search,
  Warehouse,
  Building2,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const warehouseLinks = [
  { to: '/entrepot/demandes', label: 'Demandes', icon: ClipboardList },
  { to: '/entrepot', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/entrepot/produits', label: 'Produits', icon: Package },
  { to: '/entrepot/activite', label: 'Activité', icon: History },
];

const ownerExtraLinks = [
  { to: '/entrepot/agences', label: 'Agences', icon: Building2 },
  { to: '/entrepot/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/agence', label: 'Vue agence', icon: Search },
];

const agencyLinks = [
  { to: '/agence', label: 'Rechercher', icon: Search },
  { to: '/agence/demandes', label: 'Mes demandes', icon: ClipboardList },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAgency = profile?.role === 'agency_employee';
  const isOwner = profile?.role === 'owner';

  const links = isAgency
    ? agencyLinks
    : isOwner
      ? [...warehouseLinks, ...ownerExtraLinks]
      : warehouseLinks;

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const roleLabel =
    profile?.role === 'owner'
      ? 'Propriétaire'
      : profile?.role === 'warehouse_manager'
        ? 'Responsable entrepôt'
        : 'Employé agence';

  const isActive = (to: string) => {
    if (to === '/entrepot' || to === '/agence') {
      return location.pathname === to;
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-emerald-700 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-white/15 p-2 rounded-xl shrink-0">
              <Warehouse className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight truncate">StockAgence</h1>
              <p className="text-emerald-100 text-sm truncate">
                {profile?.full_name} · {roleLabel}
                {profile?.agency_name ? ` · ${profile.agency_name}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/15 hover:bg-white/25 active:bg-white/30 px-4 py-3 rounded-xl text-base font-semibold shrink-0"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
        <nav className="border-t border-emerald-600/50 overflow-x-auto">
          <div className="max-w-5xl mx-auto px-2 flex gap-1 min-w-max">
            {links.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-4 py-3.5 text-base font-semibold whitespace-nowrap border-b-4 transition-colors ${
                    active
                      ? 'border-white text-white'
                      : 'border-transparent text-emerald-100 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 pb-24">{children}</main>
    </div>
  );
}
