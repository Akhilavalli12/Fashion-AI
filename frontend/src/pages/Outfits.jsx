import { useEffect, useState } from 'react';
import { api } from '../api.js';
import OutfitCard from '../components/OutfitCard.jsx';
export default function Outfits() {
  const [meta, setMeta] = useState(null);
  const [occ, setOcc] = useState([]);
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ occasion: 'casual', city: '', avoid: [], must: '' });
  const [res, setRes] = useState(null);
  const [tab, setTab] = useState('generate');
  const [hist, setHist] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { api('/auth/meta').then(setMeta); api('/outfits/occasions').then(setOcc); api('/items').then(setItems); }, []);
  useEffect(() => { if (tab !== 'generate') api(`/outfits?filter=${tab}`).then(setHist); }, [tab]);
  const gen = async () => {
    setBusy(true); setErr('');
    try { setRes(await api('/outfits/generate', { method: 'POST', body: { occasion: f.occasion, city: f.city || undefined, avoidColors: f.avoid, mustInclude: f.must ? [f.must] : [], count: 3 } })); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  if (!meta) return null;
  return (
    <div>
      <h2>Outfits</h2>
      <div className="chips">{[['generate', 'Generate'], ['saved', 'Saved'], ['worn', 'Wear history'], ['liked', 'Liked']].map(([k, l]) => <button key={k} className={tab === k ? 'chip on' : 'chip'} onClick={() => setTab(k)}>{l}</button>)}</div>
      {tab === 'generate' ? (<>
        <div className="card form">
          <label>Occasion<select value={f.occasion} onChange={(e) => setF({ ...f, occasion: e.target.value })}>{occ.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}</select></label>
          <label>City (blank = profile city)<input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
          <label>Build around (optional)<select value={f.must} onChange={(e) => setF({ ...f, must: e.target.value })}><option value="">— anything —</option>{items.map((i) => <option key={i._id} value={i._id}>{i.name}</option>)}</select></label>
          <label>Avoid colors<div className="chips">{meta.colors.map((c) => <button type="button" key={c.name} className={f.avoid.includes(c.name) ? 'chip bad' : 'chip'} onClick={() => setF({ ...f, avoid: f.avoid.includes(c.name) ? f.avoid.filter((x) => x !== c.name) : [...f.avoid, c.name] })}><i className="dot" style={{ background: c.hex }} />{c.name}</button>)}</div></label>
          <button className="primary" disabled={busy} onClick={gen}>{busy ? 'Thinking…' : 'Generate outfits'}</button>
        </div>
        {err && <p className="error">{err}</p>}
        {res && <p className="muted">Weather used: {res.weather.city} {res.weather.tempC}°C, {res.weather.condition} ({res.weather.source})</p>}
        {res && !res.outfits.length && <p className="muted">No outfit satisfies those constraints with your current wardrobe. Try relaxing one.</p>}
        <div className="grid">{res?.outfits.map((o) => <OutfitCard key={o._id} outfit={o} />)}</div>
      </>) : <div className="grid">{hist.length ? hist.map((o) => <OutfitCard key={o._id} outfit={o} />) : <p className="muted">Nothing here yet.</p>}</div>}
    </div>
  );
}
