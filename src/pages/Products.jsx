import { useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import Modal from '../components/Modal.jsx';
import { apiError, money } from '../utils/format';

const EMPTY = { code: '', name: '', category: '', cost_price: '', selling_price: '', stock: 0, is_active: true };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | objeto producto (id opcional)
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/products/', { params: { search: query || undefined } });
      setProducts(data.results ?? data);
      setError('');
    } catch (e) {
      setError(apiError(e));
    }
  }, [query]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api.get('/categories/').then((r) => setCategories(r.data.results ?? r.data)).catch(() => {});
  }, []);

  return (
    <section className="panel">
      <div className="row-between">
        <h1>Productos</h1>
        <button className="primary" onClick={() => setEditing({ ...EMPTY })}>Nuevo producto</button>
      </div>
      <input className="search" type="search" placeholder="Buscar por código o nombre" value={query} onChange={(e) => setQuery(e.target.value)} />
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th><th>Nombre</th><th>Categoría</th>
              <th className="num">Costo</th><th className="num">Precio</th><th className="num">Stock</th>
              <th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className={p.is_active ? '' : 'voided'}>
                <td className="mono">{p.code}</td>
                <td>{p.name}</td>
                <td>{p.category_name || 'Sin categoría'}</td>
                <td className="num mono">{money(p.cost_price)}</td>
                <td className="num mono">{money(p.selling_price)}</td>
                <td className={`num mono ${p.stock <= 5 ? 'low-text' : ''}`}>{p.stock}</td>
                <td><span className={`badge ${p.is_active ? 'ok' : 'bad'}`}>{p.is_active ? 'Activo' : 'Inactivo'}</span></td>
                <td className="actions"><button className="ghost" onClick={() => setEditing(p)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <p className="empty">No hay productos. Crea el primero con “Nuevo producto”.</p>}
      </div>

      {editing && (
        <ProductForm
          initial={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </section>
  );
}

function ProductForm({ initial, categories, onClose, onSaved }) {
  const [form, setForm] = useState({ ...initial, category: initial.category ?? '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isNew = !initial.id;

  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      code: form.code, name: form.name,
      category: form.category === '' ? null : Number(form.category),
      cost_price: form.cost_price, selling_price: form.selling_price,
      stock: Number(form.stock), is_active: form.is_active,
    };
    try {
      if (isNew) await api.post('/products/', payload);
      else await api.patch(`/products/${initial.id}/`, payload);
      onSaved();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isNew ? 'Nuevo producto' : 'Editar producto'} onClose={onClose}>
      <form className="modal-body" onSubmit={submit}>
        <label className="field"><span>Código de barras o SKU</span>
          <input value={form.code} onChange={set('code')} required autoFocus /></label>
        <label className="field"><span>Nombre</span>
          <input value={form.name} onChange={set('name')} required /></label>
        <label className="field"><span>Categoría</span>
          <select value={form.category} onChange={set('category')}>
            <option value="">Sin categoría</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></label>
        <div className="two">
          <label className="field"><span>Precio de costo</span>
            <input type="number" min="0" step="0.01" value={form.cost_price} onChange={set('cost_price')} required /></label>
          <label className="field"><span>Precio de venta</span>
            <input type="number" min="0" step="0.01" value={form.selling_price} onChange={set('selling_price')} required /></label>
        </div>
        <label className="field"><span>Stock</span>
          <input type="number" min="0" step="1" value={form.stock} onChange={set('stock')} required /></label>
        <label className="check"><input type="checkbox" checked={form.is_active} onChange={set('is_active')} /> Disponible para la venta</label>
        {error && <p className="alert" role="alert">{error}</p>}
        <div className="row-end">
          <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar producto'}</button>
        </div>
      </form>
    </Modal>
  );
}
