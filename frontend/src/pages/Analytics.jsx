import { useEffect, useState } from 'react';
import { api } from '../api.js';
const Bar = ({ label, n, max, color }) => <div className="hbar"><span>{label}</span><i><u style={{ width: `${(n / max) * 100}%`, background: color || 'var(--accent)' }} /></i><b>{n}</b></div>;
export default function Analytics() {
  const [d, setD] = useState(null);
  useEffect(() => { api('/analytics').then(setD); }, []);
  if (!d) return <p className="center">Loading…</p>;
  const s = d.sustainability, o = d.outfitStats;
  const maxC = Math.max(1, ...d.byColor.map((c) => c.n));
  return (
    <div>
      <h2>Wardrobe analytics</h2>
      <div className="stats">{[['Items', d.totals.items], ['Total wears', d.totals.totalWears], ['Avg wears / item', d.totals.avgWears], ['Utilization (30d)', `${s.utilization30}%`], ['Never worn', s.neverWornCount]].map(([k, v]) => <div key={k} className="card stat"><b>{v}</b><span>{k}</span></div>)}</div>
      <div className="grid2">
        <div className="card"><h3>Colors</h3>{d.byColor.map((c) => <Bar key={c.name} label={c.name} n={c.n} max={maxC} color={c.hex} />)}</div>
        <div className="card"><h3>Categories</h3>{Object.entries(d.byCategory).map(([k, v]) => <Bar key={k} label={k} n={v} max={Math.max(...Object.values(d.byCategory))} />)}<h3>Styles</h3>{Object.entries(d.byStyle).map(([k, v]) => <Bar key={k} label={k} n={v} max={Math.max(...Object.values(d.byStyle))} />)}</div>
      </div>
      <div className="grid2">
        <div className="card"><h3>Most worn</h3>{d.mostWorn.length ? d.mostWorn.map((i) => <p key={i._id}>{i.name} <b>{i.timesWorn}×</b></p>) : <p className="muted">Mark outfits as worn to see this.</p>}</div>
        <div className="card"><h3>Outfit feedback</h3><p>Generated {o.generated} · Liked {o.liked} · Disliked {o.disliked} · Saved {o.saved} · Worn {o.worn}</p></div>
      </div>
      <div className="card"><h3>♻️ Sustainability</h3>
        <p>You've re-worn pieces <b>{s.rewears}</b> times beyond their first wear. {s.utilization90}% of your wardrobe was worn in the last 90 days.</p>
        {d.sustainability.neverWornCount > 0 && <details><summary>{s.neverWornCount} items never worn — try building outfits around them</summary><p>{d.neverWorn.map((i) => i.name).join(', ')}</p></details>}
        <h4>Lowest footprint per wear</h4>{s.perItem.map((i) => <p key={i._id}>{i.name}: {i.footprintPerWear} kg CO₂e/wear{i.costPerWear ? ` · ₹${i.costPerWear}/wear` : ''}</p>)}
        <p className="muted">{s.note}</p></div>
    </div>
  );
}
