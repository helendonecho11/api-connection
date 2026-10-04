import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, apiError, clearTokens, storeTokens } from './api';
import './style.css';

const emptyProduct = { product_name: '', description: '', price: '', quantity: '' };

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/api/auth/login', { username, password });
      storeTokens(data.tokens);
      localStorage.setItem('user', JSON.stringify(data.user ?? {}));
      onLogin(data.user ?? {});
    } catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  }
  return <main className="login-shell">
    <div className="login-art"><div className="brand-mark">f.</div><div><p className="eyebrow">YOUR INVENTORY, IN GOOD ORDER</p><h1>A clearer view<br />of what you have.</h1><p className="art-copy">Keep products organized, stock visible, and the details close at hand.</p></div><div className="art-bottom"><span>PRODUCT MANAGEMENT</span><span>01 — 06</span></div></div>
    <section className="login-panel"><div className="login-form-wrap"><div className="mobile-mark">f.</div><p className="eyebrow">WELCOME BACK</p><h2>Sign in to Fieldnote</h2><p className="muted">Use your account to manage your product catalog.</p>
      <form onSubmit={submit} className="stack-form">
        <label>Username<input autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your username" required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required /></label>
        {error && <div className="notice error" role="alert">{error}</div>}
        <button className="button primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <span>↗</span></button>
      </form><p className="login-foot">PRODUCT MANAGEMENT SYSTEM <span>•</span> LAB EXERCISE 06</p>
    </div></section>
  </main>;
}

function ProductDialog({ product, onClose, onSave }) {
  const [form, setForm] = useState(product ?? emptyProduct);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const body = { ...form, price: Number(form.price), quantity: Number(form.quantity) };
    try {
      if (product) await api.put(`/api/products/${product.id}`, body);
      else await api.post('/api/products', body);
      onSave();
    } catch (err) { setError(apiError(err)); } finally { setBusy(false); }
  }
  return <div className="scrim" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
    <div className="dialog-head"><div><p className="eyebrow">CATALOG ENTRY</p><h2 id="dialog-title">{product ? 'Edit product' : 'Add a product'}</h2></div><button className="icon-button" aria-label="Close" onClick={onClose}>×</button></div>
    <form onSubmit={submit} className="stack-form">
      <label>Product name<input maxLength="100" value={form.product_name ?? ''} onChange={e => update('product_name', e.target.value)} placeholder="e.g. Ceramic pour-over" required /></label>
      <label>Description <span className="optional">OPTIONAL</span><textarea rows="3" value={form.description ?? ''} onChange={e => update('description', e.target.value)} placeholder="A few details about this product" /></label>
      <div className="form-row"><label>Price<input type="number" min="0" step="0.01" value={form.price ?? ''} onChange={e => update('price', e.target.value)} placeholder="0.00" required /></label><label>Quantity<input type="number" min="0" step="1" value={form.quantity ?? ''} onChange={e => update('quantity', e.target.value)} placeholder="0" required /></label></div>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="dialog-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? 'Saving…' : product ? 'Save changes' : 'Add product'} <span>↗</span></button></div>
    </form>
  </section></div>;
}

function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const expired = () => setUser(null);
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoading(true); setError('');
    api.get('/api/products').then(({ data }) => { if (active) setProducts(data.data ?? []); })
      .catch(err => { if (active) setError(apiError(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, refreshKey]);

  const filtered = useMemo(() => products.filter(p => `${p.product_name} ${p.description ?? ''}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const notify = message => { setDialog(null); setSuccess(message); setError(''); setRefreshKey(k => k + 1); window.setTimeout(() => setSuccess(''), 3200); };

  async function remove(product) {
    if (!window.confirm(`Delete “${product.product_name}”? This action cannot be undone.`)) return;
    setError(''); setSuccess('');
    try { await api.delete(`/api/products/${product.id}`); notify('Product deleted successfully.'); }
    catch (err) { setError(apiError(err)); }
  }
  async function logout() {
    const refresh = localStorage.getItem('refresh_token');
    try { if (refresh) await api.post('/api/auth/logout', { refresh_token: refresh }); } catch { /* Local session still ends if the server is unavailable. */ }
    clearTokens(); setUser(null); setProducts([]);
  }

  if (!user) return <Login onLogin={setUser} />;
  return <div className="app-shell">
    <header className="topbar"><a className="wordmark" href="#top"><span className="brand-mark small">f.</span><span>fieldnote<span className="wordmark-dot">.</span></span></a><div className="topbar-right"><span className="user-chip"><span className="user-avatar">{(user.username || 'U').slice(0, 1).toUpperCase()}</span><span>{user.username || 'Account'}</span></span><button className="logout-button" onClick={logout}>Log out <span>↗</span></button></div></header>
    <main className="content" id="top"><section className="page-intro"><div><p className="eyebrow">INVENTORY / OVERVIEW</p><h1>Your products<span className="title-period">.</span></h1><p className="muted">A tidy catalog, all in one place.</p></div><button className="button primary add-button" onClick={() => setDialog({ mode: 'add' })}><span className="plus">＋</span> Add product</button></section>
      <section className="summary-row"><div className="summary-label"><span className="summary-icon">▦</span><div><p className="eyebrow">CATALOG SIZE</p><strong>{products.length.toString().padStart(2, '0')} <span>products</span></strong></div></div><div className="summary-note"><span className="status-dot" /> All inventory in one view</div></section>
      <section className="catalog"><div className="catalog-toolbar"><div><p className="eyebrow">THE CATALOG</p><h2>Product list <span className="count">{products.length}</span></h2></div><label className="search-box"><span>⌕</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…" aria-label="Search products" /><kbd>⌘ K</kbd></label></div>
        {error && <div className="notice error" role="alert">{error}</div>}{success && <div className="notice success" role="status">{success}</div>}
        {loading ? <div className="empty-state"><div className="spinner"/><p>Loading your catalog…</p></div> : filtered.length ? <div className="table-wrap"><table><thead><tr><th>PRODUCT</th><th>DESCRIPTION</th><th>PRICE</th><th>IN STOCK</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.map((p, i) => <tr key={p.id}><td><div className="product-cell"><span className={`product-thumb tint-${i % 5}`}>{(p.product_name || '?').slice(0, 1).toUpperCase()}</span><div><strong>{p.product_name}</strong><small>SKU—{String(p.id).padStart(4, '0')}</small></div></div></td><td className="description-cell">{p.description || <span className="faint">No description</span>}</td><td className="price-cell">₱{Number(p.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td><td><span className={`stock-pill ${Number(p.quantity) === 0 ? 'out' : ''}`}><i />{Number(p.quantity) === 0 ? 'Out of stock' : `${p.quantity} units`}</span></td><td><div className="row-actions"><button onClick={() => setDialog({ mode: 'edit', product: p })}>Edit</button><button className="delete-action" onClick={() => remove(p)}>Delete</button></div></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-icon">＋</div><h3>{query ? 'No matching products' : 'Your catalog is ready'}</h3><p>{query ? 'Try another search term.' : 'Add your first product to get started.'}</p>{!query && <button className="button secondary" onClick={() => setDialog({ mode: 'add' })}>Add your first product</button>}</div>}
        <footer className="catalog-foot"><span>SHOWING <b>{filtered.length}</b> OF <b>{products.length}</b> PRODUCTS</span><span>FIELDNOTE INVENTORY <i>✳</i></span></footer>
      </section><p className="page-foot">A little more order, every day. <span>✳</span></p>
    </main>
    {dialog && <ProductDialog product={dialog.product} onClose={() => setDialog(null)} onSave={() => notify(dialog.mode === 'edit' ? 'Product updated successfully.' : 'Product added successfully.')} />}
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
