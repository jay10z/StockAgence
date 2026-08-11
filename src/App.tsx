import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import HomeRedirect from './pages/HomeRedirect';
import WarehouseDashboard from './pages/WarehouseDashboard';
import ProductsPage from './pages/ProductsPage';
import ProductFormPage from './pages/ProductFormPage';
import UpdateStockPage from './pages/UpdateStockPage';
import RequestsPage from './pages/RequestsPage';
import AgencyDashboard from './pages/AgencyDashboard';
import ActivityPage from './pages/ActivityPage';
import AgenciesPage from './pages/AgenciesPage';
import UsersPage from './pages/UsersPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
          <Route path="/" element={<HomeRedirect />} />

          <Route
            path="/entrepot"
            element={
              <ProtectedRoute roles={['owner', 'warehouse_manager']}>
                <WarehouseDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrepot/produits"
            element={
              <ProtectedRoute roles={['owner', 'warehouse_manager']}>
                <ProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrepot/produits/nouveau"
            element={
              <ProtectedRoute roles={['owner', 'warehouse_manager']}>
                <ProductFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrepot/produits/:id"
            element={
              <ProtectedRoute roles={['owner', 'warehouse_manager']}>
                <ProductFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrepot/stock"
            element={
              <ProtectedRoute roles={['owner', 'warehouse_manager']}>
                <UpdateStockPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrepot/demandes"
            element={
              <ProtectedRoute roles={['owner', 'warehouse_manager']}>
                <RequestsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrepot/activite"
            element={
              <ProtectedRoute roles={['owner', 'warehouse_manager']}>
                <ActivityPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrepot/agences"
            element={
              <ProtectedRoute roles={['owner']}>
                <AgenciesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/entrepot/utilisateurs"
            element={
              <ProtectedRoute roles={['owner']}>
                <UsersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/agence"
            element={
              <ProtectedRoute roles={['agency_employee', 'owner']}>
                <AgencyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agence/demandes"
            element={
              <ProtectedRoute roles={['agency_employee', 'owner']}>
                <RequestsPage agencyView />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
