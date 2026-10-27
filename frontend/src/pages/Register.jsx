import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
export default function Register() {
  const { register } = useAuth();
  const [meta, setMeta] = useState(null);
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [p, setP] = useState({ styles: [], colorGroups: [], dislikedColors: [], formalityPref: 'Smart Casual', patternTolerance: 'medium', city: '' });
  const [err, setErr] = useState('');
  useEffect(() => { api('/auth/meta').then(setMeta); }, []);
  const submit = async (e) => { e.preventDefault(); setErr(''); try { await register({ ...f, profile: { ...p, city: p.city || undefined } }); } catch (x) { setErr(x.message); } };
  if (!meta) return null;
  const Chips = ({ list, sel, on }) => <div className="chips">{list.map((v) => <button type="button" key={v} className={sel.includes(v) ? 'chip on' : 'chip'} onClick={() => on(toggle(sel, v))}>{v}</button>)}</div>;
  return (
    <div className="auth"><h1>Create account</h1>
      <form className="card" onSubmit={submit}>
        <input placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input placeholder="Password (6+ chars)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <h3>Your fashion profile</h3>
        <label>Styles you like</label><Chips list={meta.styles} sel={p.styles} on={(v) => setP({ ...p, styles: v })} />
        <label>Color families</label><Chips list={meta.colorGroups} sel={p.colorGroups} on={(v) => setP({ ...p, colorGroups: v })} />
        <label>Colors you dislike</label><Chips list={meta.colors.map((c) => c.name)} sel={p.dislikedColors} on={(v) => setP({ ...p, dislikedColors: v })} />
        <label>Usual formality</label><select value={p.formalityPref} onChange={(e) => setP({ ...p, formalityPref: e.target.value })}>{meta.formalities.map((x) => <option key={x}>{x}</option>)}</select>
        <label>Tolerance for loud patterns</label><select value={p.patternTolerance} onChange={(e) => setP({ ...p, patternTolerance: e.target.value })}><option>low</option><option>medium</option><option>high</option></select>
        <input placeholder="City (for weather)" value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} />
        {err && <p className="error">{err}</p>}
        <button className="primary">Register</button><p className="muted"><Link to="/">Back to login</Link></p>
      </form></div>
  );
}
