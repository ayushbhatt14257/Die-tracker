import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, ClipboardList, Factory, Settings, LogOut, Code2, PlusCircle, History } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['owner', 'admin'] },
  { to: '/create', icon: PlusCircle, label: 'Create Die', roles: ['designer', 'admin', 'owner'] },
  { to: '/my-queue', icon: ClipboardList, label: 'My Queue', roles: ['designer', 'programmer', 'vmc_operator', 'wirecut_operator', 'toolroom_head'] },
  { to: '/moulding', icon: Factory, label: 'Moulding', roles: ['owner', 'admin', 'toolroom_head', 'gr1_receiver'] },
  { to: '/history', icon: History, label: 'History', roles: ['owner', 'admin', 'designer', 'programmer', 'vmc_operator', 'wirecut_operator', 'toolroom_head', 'gr1_receiver'] },
  { to: '/admin', icon: Settings, label: 'Admin', roles: ['owner', 'admin'] },
];

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = navItems.filter(item => item.roles.includes(user?.role));
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-900 text-sm">Die Tracker</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {visibleItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-400 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-24 sm:pb-6">
        {children}
      </main>

      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
        <div className="flex">
          {visibleItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors
                ${isActive ? 'text-blue-600' : 'text-gray-400'}`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="leading-none">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
