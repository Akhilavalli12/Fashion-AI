import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
export default function Login() {
  const { login } = useAuth();
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [demos, setDemos] = useState([]);
  useEffect(() => { api('/auth/demo-accounts').then(setDemos).catch(() => {}); }, []);
  const go = async (email, password) => { setErr(''); try { await login(email, password); } catch (e) { setErr(e.message); } };
  return (
    <div className="auth">
      <h1>StyleSense</h1><p className="muted">Your AI wardrobe & stylist</p>
      <form className="card" onSubmit={(e) => { e.preventDefault(); go(f.email, f.password); }}>
        <input placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input placeholder="Password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {err && <p className="error">{err}</p>}
        <button className="primary">Log in</button>
        <p className="muted">New here? <Link to="/register">Create an account</Link></p>
      </form>
      <div className="card"><h3>Try a demo account</h3><p className="muted">Real database accounts with different wardrobes and learned preferences. Password: Demo123!</p>
        {(demos.length ? demos : [{ email: 'minimalist@demo.com', demoLabel: 'Minimalist' }, { email: 'trendsetter@demo.com', demoLabel: 'Trend Explorer' }, { email: 'elegant@demo.com', demoLabel: 'Elegant / Traditional' }]).map((d) => (
          <button key={d.email} className="demo" onClick={() => go(d.email, 'Demo123!')}>Try {d.demoLabel} <small>{d.email}</small></button>))}
        {!demos.length && <p className="muted">If login fails, make sure the backend is running and seeded.</p>}
      </div>
    </div>
  );
}
