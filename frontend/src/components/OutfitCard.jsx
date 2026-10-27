import { useState } from 'react';
import { api } from '../api.js';
const LABELS = { harmony: 'Color harmony', formality: 'Occasion fit', weather: 'Weather fit', preference: 'Your taste', freshness: 'Freshness' };
export default function OutfitCard({ outfit: initial, onChange }) {
  const [o, setO] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const act = async (action) => {
    setBusy(true);
    try {
      const r = await api(`/outfits/${o._id}/feedback`, { method: 'POST', body: { action } });
      setO(r.outfit); onChange?.(r.outfit);
      setToast(r.learned ? 'Preference profile updated' : 'Already recorded'); setTimeout(() => setToast(''), 2000);
    } finally { setBusy(false); }
  };
  const s = o.status || {};
  return (
    <div className="card outfit">
      <div className="row between"><div><b>{o.score}</b><span className="muted">/100 match</span></div><span className="tag">{o.occasion}</span></div>
      <div className="thumbs">{o.items.map((i) => <figure key={i._id}><img src={i.imageUrl} alt={i.name} /><figcaption>{i.name}</figcaption></figure>)}</div>
      <details open><summary>Why this outfit?</summary>
        <ul className="reasons">{o.reasons?.map((r, k) => <li key={k}>{r}</li>)}</ul>
        {o.breakdown && <div className="bars">{Object.entries(o.breakdown).map(([k, v]) => <div key={k}><span>{LABELS[k]}</span><i><u style={{ width: `${v * 100}%` }} /></i></div>)}</div>}
      </details>
      <div className="actions">
        <button disabled={busy} className={s.liked ? 'on' : ''} onClick={() => act('like')}>❤️ Like</button>
        <button disabled={busy} className={s.disliked ? 'on bad' : ''} onClick={() => act('dislike')}>👎</button>
        <button disabled={busy} className={s.saved ? 'on' : ''} onClick={() => act(s.saved ? 'unsave' : 'save')}>⭐ {s.saved ? 'Saved' : 'Save'}</button>
        <button disabled={busy} onClick={() => act('worn')}>👗 Worn{o.wornDates?.length ? ` (${o.wornDates.length})` : ''}</button>
      </div>
      {toast && <p className="toast">{toast}</p>}
    </div>
  );
}
