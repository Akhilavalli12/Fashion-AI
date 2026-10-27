import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
export const Badge = ({ src }) => <span className={`src ${src}`}>{src === 'ai' ? 'AI-detected' : src === 'user' ? 'You' : 'Demo'}</span>;
export default function Wardrobe() {
  const [items, setItems] = useState(null);
  const [cat, setCat] = useState('All');
  const [sel, setSel] = useState(null);
  const [meta, setMeta] = useState(null);
  const [edit, setEdit] = useState(null);
  const load = () => api('/items').then(setItems);
  useEffect(() => { load(); api('/auth/meta').then(setMeta); }, []);
  const saveEdit = async () => { await api(`/items/${sel._id}`, { method: 'PUT', body: edit }); setEdit(null); setSel(null); load(); };
  if (!items) return <p className="center">Loading…</p>;
  const cats = ['All', ...new Set(items.map((i) => i.category))];
  const shown = items.filter((i) => cat === 'All' || i.category === cat);
  const remove = async (i) => { if (confirm(`Remove ${i.name}?`)) { await api(`/items/${i._id}`, { method: 'DELETE' }); setSel(null); load(); } };
  return (
    <div>
      <div className="row between"><h2>My wardrobe ({items.length})</h2><Link className="primary btn" to="/upload">+ Add item</Link></div>
      <div className="chips">{cats.map((c) => <button key={c} className={cat === c ? 'chip on' : 'chip'} onClick={() => setCat(c)}>{c}</button>)}</div>
      <div className="grid items">{shown.map((i) => (
        <figure key={i._id} className="card item" onClick={() => setSel(i)}>
          <img src={i.imageUrl} alt={i.name} /><figcaption><b>{i.name}</b><span className="muted">{i.subcategory} · {i.pattern} · worn {i.timesWorn}×</span></figcaption>
        </figure>))}</div>
      {!items.length && <p className="muted">Nothing here yet — upload your first photo.</p>}
      {sel && (
        <div className="modal" onClick={() => setSel(null)}><div className="card" onClick={(e) => e.stopPropagation()}>
          <img src={sel.imageUrl} alt="" />
          <h3>{sel.name}</h3>
          <table><tbody>{[['category', 'Category'], ['subcategory', 'Type'], ['dominantColor', 'Color'], ['pattern', 'Pattern'], ['style', 'Style'], ['formality', 'Formality']].map(([k, l]) => <tr key={k}><td>{l}</td><td>{sel[k]}</td><td><Badge src={sel.fieldSources?.[k] || 'user'} /></td></tr>)}</tbody></table>
          <p className="muted">Seasons: {sel.season.join(', ') || '—'} · Last worn: {sel.lastWorn ? new Date(sel.lastWorn).toLocaleDateString() : 'never'}</p>
          {sel.analysis?.source === 'ai' && <p className="muted">Detected via {sel.analysis.method}; confidence: {Object.entries(sel.analysis.confidenceLabel || {}).map(([k, v]) => `${k} ${v}`).join(', ')}</p>}
          {edit && meta && <div className="form">{[['name', null], ['category', meta.categories], ['subcategory', meta.subcategories[edit.category] || []], ['dominantColor', meta.colors.map((c) => c.name)], ['pattern', meta.patterns], ['style', meta.styles], ['formality', meta.formalities]].map(([k, opts]) => <label key={k}>{k}{opts ? <select value={edit[k] || ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })}>{!opts.includes(edit[k]) && <option>{edit[k]}</option>}{opts.map((o) => <option key={o}>{o}</option>)}</select> : <input value={edit[k] || ''} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} />}</label>)}<button className="primary" onClick={saveEdit}>Save changes</button></div>}
          <div className="row"><button onClick={() => remove(sel)} className="danger">Remove</button>{!edit && <button onClick={() => setEdit({ name: sel.name, category: sel.category, subcategory: sel.subcategory, dominantColor: sel.dominantColor, pattern: sel.pattern, style: sel.style, formality: sel.formality })}>Edit</button>}<button onClick={() => { setEdit(null); setSel(null); }}>Close</button></div>
        </div></div>)}
    </div>
  );
}
