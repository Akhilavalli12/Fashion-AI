import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Wardrobe from './pages/Wardrobe.jsx';
import Upload from './pages/Upload.jsx';
import Outfits from './pages/Outfits.jsx';
import Stylist from './pages/Stylist.jsx';
import Analytics from './pages/Analytics.jsx';

function Shell({ children }) {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <header className="nav">
        <b className="brand">StyleSense</b>
        <nav>
          {[['/', 'Home'], ['/wardrobe', 'Wardrobe'], ['/upload', 'Add item'], ['/outfits', 'Outfits'], ['/stylist', 'AI Stylist'], ['/analytics', 'Analytics']].map(([to, l]) => <NavLink key={to} to={to} end={to === '/'}>{l}</NavLink>)}
        </nav>
        <span className="who">{user.name}{user.demoLabel ? ` · ${user.demoLabel}` : ''} <button className="link" onClick={logout}>Log out</button></span>
      </header>
      <main>{children}</main>
    </div>
  );
}
export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading…</p>;
  if (!user) return <Routes><Route path="/register" element={<Register />} /><Route path="*" element={<Login />} /></Routes>;
  return (
    <Shell><Routes>
      <Route path="/" element={<Dashboard />} /><Route path="/wardrobe" element={<Wardrobe />} /><Route path="/upload" element={<Upload />} />
      <Route path="/outfits" element={<Outfits />} /><Route path="/stylist" element={<Stylist />} /><Route path="/analytics" element={<Analytics />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes></Shell>
  );
}
