import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, ClipboardList, Factory, Settings, LogOut, Code2, PlusCircle, History, Bell, Trash2 } from 'lucide-react';
import { notificationAPI } from '../../api';
import { fmtDate } from '../../utils/helpers';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['owner', 'admin'] },
  { to: '/create', icon: PlusCircle, label: 'Create Die', roles: ['designer', 'admin', 'owner'] },
  { to: '/my-queue', icon: ClipboardList, label: 'My Queue', roles: ['designer', 'programmer', 'vmc_operator', 'wirecut_operator', 'toolroom_head'] },
  { to: '/moulding', icon: Factory, label: 'Moulding', roles: ['owner', 'admin', 'toolroom_head', 'gr1_receiver'] },
  { to: '/history', icon: History, label: 'History', roles: ['owner', 'admin', 'designer', 'programmer', 'vmc_operator', 'wirecut_operator', 'toolroom_head', 'gr1_receiver'] },
  { to: '/admin', icon: Settings, label: 'Admin', roles: ['owner', 'admin'] },
];

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationAPI.getAll();
      if (data.success) {
        setNotifications(data.data);
        setUnreadCount(data.meta?.unreadCount || 0);
      }
    } catch (err) { /* silent — non-critical */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open && unreadCount > 0) {
      try {
        await notificationAPI.markAllRead();
        setUnreadCount(0);
        setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
      } catch (err) { /* silent */ }
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen} className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors" title="Notifications">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
          </div>
          {notifications.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No notifications</p>
          ) : (
            notifications.map(n => (
              <div key={n._id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-start gap-2">
                  <Trash2 className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtDate(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = navItems.filter(item => item.roles.includes(user?.role));
  const showBell = user?.role === 'owner' || user?.role === 'admin';
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
            {showBell && <NotificationBell />}
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
