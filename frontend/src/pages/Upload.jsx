import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, uploadImage } from '../api.js';
import { Badge } from './Wardrobe.jsx';
const STEPS = ['Uploading image...', 'Analyzing clothing...', 'Detecting colors and attributes...', 'Building wardrobe item...'];
const FIELDS = [['category', 'Category'], ['subcategory', 'Type'], ['dominantColor', 'Color'], ['pattern', 'Pattern'], ['style', 'Style'], ['formality', 'Formality']];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pct = (c) => (c == null ? '' : ` ${Math.round(c * 100)}%`);

export default function Upload() {
  const nav = useNavigate();
  const [meta, setMeta] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [step, setStep] = useState(-1);
  const [res, setRes] = useState(null);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef();
  useEffect(() => { api('/auth/meta').then(setMeta); }, []);

  const pick = async (f) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { setErr('Please choose a JPG, JPEG, PNG or WEBP image.'); return; }
    setErr(''); setRes(null); setFile(f); setPreview(URL.createObjectURL(f)); setStep(0);
    try {
      const r = await uploadImage(f, { onUploaded: () => setStep(1) });
      setStep(2); await sleep(500); setStep(3); await sleep(400);
      const a = r.analysis;
      setRes(r);
      setForm({ name: '', category: a.ok ? a.category : 'Top', subcategory: a.ok ? a.subcategory : '', dominantColor: a.ok ? a.dominantColor : 'Black', pattern: a.ok ? a.pattern : 'Solid', style: a.ok ? a.style : 'Casual', formality: a.ok ? a.formality : 'Casual', season: a.ok ? a.season : [], price: '' });
      setStep(4);
    } catch (e) { setErr(e.message); setStep(-1); }
  };
  const a = res?.analysis;
  const src = (k) => (a?.ok && String(a[k]) === String(form[k]) ? 'ai' : 'user');
  const save = async () => {
    try { await api('/items', { method: 'POST', body: { ...form, price: form.price ? Number(form.price) : undefined, imageUrl: res.imageUrl, imageKey: res.imageKey, detected: a } }); nav('/wardrobe'); }
    catch (e) { setErr(e.message); }
  };
  const set = (k, v) => setForm({ ...form, [k]: v });
  if (!meta) return null;
  const options = { category: meta.categories, subcategory: meta.subcategories[form?.category] || [], dominantColor: meta.colors.map((c) => c.name), pattern: meta.patterns, style: meta.styles, formality: meta.formalities };
  return (
    <div>
      <h2>Add a clothing item</h2>
      <div className={`drop ${drag ? 'drag' : ''}`} onClick={() => input.current.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}>
        {preview ? <img src={preview} alt="preview" /> : <p>Drag & drop a photo here, or tap to choose<br /><small className="muted">JPG · PNG · WEBP — works with camera on mobile</small></p>}
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => pick(e.target.files[0])} />
      </div>
      {err && <p className="error">{err}</p>}
      {step >= 0 && step < 4 && <ol className="steps">{STEPS.map((s, i) => <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''}>{i < step ? '✓' : i === step ? '⏳' : '○'} {s}</li>)}</ol>}
      {step === 4 && form && (
        <div className="card">
          <h3>AI detection result</h3>
          {a.ok ? <p className="muted">Detected from your photo using <code>{a.method}</code>. These are estimates — please review and correct anything that's off.</p>
            : <p className="error">AI analysis couldn't confidently identify this item. Please fill in the details below — you can still save it.</p>}
          {a?.notes?.map((n) => <p key={n} className="muted">ℹ️ {n}</p>)}
          <div className="form">
            <label>Name (optional)<input value={form.name} placeholder={`${form.dominantColor} ${form.subcategory || form.category}`} onChange={(e) => set('name', e.target.value)} /></label>
            {FIELDS.map(([k, l]) => (
              <label key={k}>{l} <Badge src={src(k)} />
                {a?.ok && src(k) === 'ai' && a.confidenceLabel && ['category', 'subcategory'].includes(k) && <em> {a.confidenceLabel.category}{pct(a.confidence.category)}</em>}
                {a?.ok && src(k) === 'ai' && k === 'dominantColor' && <em> {a.confidenceLabel.color}{pct(a.confidence.color)}</em>}
                {a?.ok && src(k) === 'ai' && k === 'pattern' && <em> {a.confidenceLabel.pattern}{pct(a.confidence.pattern)}</em>}
                {k === 'subcategory' && (options.subcategory.includes(form.subcategory) || !form.subcategory) ? null : null}
                <select value={form[k]} onChange={(e) => set(k, e.target.value)}>{k === 'subcategory' && !options.subcategory.includes(form.subcategory) && <option>{form.subcategory}</option>}{options[k].map((o) => <option key={o}>{o}</option>)}</select>
              </label>))}
            <label>Seasons<div className="chips">{meta.seasons.map((s) => <button type="button" key={s} className={form.season.includes(s) ? 'chip on' : 'chip'} onClick={() => set('season', form.season.includes(s) ? form.season.filter((x) => x !== s) : [...form.season, s])}>{s}</button>)}</div></label>
            {a?.ok && a.secondaryColors?.length > 0 && <p className="muted">Secondary colors detected: {a.secondaryColors.join(', ')}</p>}
            <label>Price (optional, for cost-per-wear)<input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} /></label>
          </div>
          <button className="primary" onClick={save}>Save to wardrobe</button>
        </div>)}
    </div>
  );
}
