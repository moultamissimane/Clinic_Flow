import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutDashboard, LogOut, Menu, ShieldCheck, SquarePlus, UserCog, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const NAV = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/appointments', label: 'Rendez-vous', icon: CalendarDays },
  { to: '/users', label: 'Utilisateurs', icon: UserCog, adminOnly: true },
];

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">
            <SquarePlus size={22} />
          </span>
          <div>
            <div className="brand-name">ClinicFlow</div>
            <div className="brand-sub">Cabinet Médical</div>
          </div>
        </div>

        <nav className="nav" onClick={() => setOpen(false)}>
          {NAV.filter((n) => !n.adminOnly || isAdmin).map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="profile">
            <Avatar name={user.fullName} />
            <div className="profile-text">
              <div className="profile-name">{user.fullName}</div>
              <div className="profile-role">
                <ShieldCheck size={13} />
                {user.role === 'admin' ? 'Admin' : 'Staff'}
              </div>
            </div>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      </aside>
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}

      <div className="main">
        <button className="icon-btn mobile-menu" onClick={() => setOpen(true)} aria-label="Menu">
          <Menu size={20} />
        </button>
        <Outlet key={location.pathname} />
      </div>
    </div>
  );
}
