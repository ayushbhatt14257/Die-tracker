import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateDie from './pages/CreateDie';
import MyQueue from './pages/MyQueue';
import Moulding from './pages/Moulding';
import Admin from './pages/Admin';

// Redirect unauthorized roles to their correct home page
const getHomeForRole = (role) => {
  if (role === 'owner' || role === 'admin') return '/dashboard';
  if (role === 'gr1_receiver') return '/moulding';
  return '/my-queue';
};

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getHomeForRole(user.role)} replace />;
  }
  return <Layout>{children}</Layout>;
};

const DefaultRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getHomeForRole(user.role)} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<DefaultRedirect />} />
    <Route path="/dashboard" element={
      <ProtectedRoute roles={['owner', 'admin']}><Dashboard /></ProtectedRoute>
    } />
    <Route path="/create" element={
      <ProtectedRoute roles={['designer', 'admin', 'owner']}><CreateDie /></ProtectedRoute>
    } />
    <Route path="/my-queue" element={
      <ProtectedRoute roles={['designer', 'programmer', 'vmc_operator', 'wirecut_operator', 'toolroom_head']}><MyQueue /></ProtectedRoute>
    } />
    <Route path="/moulding" element={
      <ProtectedRoute roles={['owner', 'admin', 'toolroom_head', 'gr1_receiver']}><Moulding /></ProtectedRoute>
    } />
    <Route path="/admin" element={
      <ProtectedRoute roles={['owner', 'admin']}><Admin /></ProtectedRoute>
    } />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { borderRadius: '12px', fontSize: '13px', fontWeight: '500' } }} />
      <AppRoutes />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
