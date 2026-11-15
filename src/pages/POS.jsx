import { downloadReceipt, printReceipt } from '../utils/receipt';
import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import CloseShiftModal from '../components/CloseShiftModal.jsx';
import { selectItemCount, selectTotalCents, useCartStore } from '../store/cartStore';
import { useShiftStore } from '../store/shiftStore';
import { PAYMENTS, apiError, fromCents, money } from '../utils/format';

export default function POS() {
  const { shift, loaded, fetch, open } = useShiftStore();

  useEffect(() => {
    fetch().catch(() => {});
  }, [fetch]);

  if (!loaded) return <p className="boot">Cargando turno…</p>;
  if (!shift) return <OpenShift onOpen={open} />;
  return <Register />;
}

/* ---------- Apertura de turno ---------- */
function OpenShift({ onOpen }) {
  const [cash, setCash] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onOpen(cash);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel open-shift" onSubmit={submit}>
      <h1>Abrir turno</h1>
      <p className="muted">Cuenta el efectivo con el que empiezas e ingrésalo como fondo inicial.</p>
      <label className="field">
        <span>Fondo inicial</span>
        <input type="number" min="0" step="0.01" inputMode="decimal" required autoFocus value={cash} onChange={(e) => setCash(e.target.value)} />
      </label>
      {error && <p className="alert" role="alert">{error}</p>}
      <button className="primary" disabled={saving || cash === ''}>
        {saving ? 'Abriendo…' : 'Abrir turno'}
      </button>
    </form>
  );
}

/* ---------- Caja registradora ---------- */
function Register() {
  const lines = useCartStore((s) => s.lines);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const totalCents = useCartStore(selectTotalCents);
  const itemCount = useCartStore(selectItemCount);
  const { add, setQuantity, remove, setPaymentMethod, clear } = useCartStore.getState();
  const fetchShift = useShiftStore((s) => s.fetch);

  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState(null);
  const [lastSale, setLastSale] = useState(null);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef(null);

  const loadProducts = useCallback(async (q) => {
    const { data } = await api.get('/products/', { params: { search: q || undefined } });
    setProducts(data.results ?? data);
  }, []);

  // Búsqueda con pequeña espera para no consultar en cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      loadProducts(query).catch((e) => setMessage({ type: 'error', text: apiError(e) }));
    }, 250);
    return () => clearTimeout(t);
  }, [query, loadProducts]);

  function addProduct(product) {
    setLastSale(null);
    if (!add(product)) {
      setMessage({
        type: 'error',
        text: product.stock < 1
          ? `${product.name} está agotado.`
          : `No hay más stock de ${product.name} (quedan ${product.stock}).`,
      });
    } else {
      setMessage(null);
    }
  }

  // Enter = lectura de código de barras (búsqueda exacta)
  async function onScan(e) {
    if (e.key !== 'Enter') return;
    const code = query.trim();
    if (!code) return;
    try {
      const { data } = await api.get(`/products/by-code/${encodeURIComponent(code)}/`);
      addProduct(data);
      setQuery('');
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.status === 404 ? `No hay un producto con el código ${code}.` : apiError(err),
      });
    }
  }

  async function charge() {
    setSaving(true);
    setMessage(null);
    try {
      const { data } = await api.post('/sales/', {
        payment_method: paymentMethod,
        items: lines.map((l) => ({ product: l.product.id, quantity: l.quantity })),
      });
      setLastSale(data);
      clear();
      await Promise.all([loadProducts(query), fetchShift()]);
      inputRef.current?.focus();
    } catch (err) {
      setMessage({ type: 'error', text: apiError(err) });
      loadProducts(query).catch(() => {}); // refresca stock por si cambió
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pos">
      <section className="catalog" aria-label="Catálogo">
        <div className="catalog-bar">
          <input
            ref={inputRef}
            className="search"
            type="search"
            placeholder="Escanea un código o busca por nombre"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onScan}
            autoFocus
          />
          <button className="ghost" onClick={() => setClosing(true)} disabled={lines.length > 0}
            title={lines.length > 0 ? 'Termina o vacía la venta actual para cerrar caja' : ''}>
            Cerrar caja
          </button>
        </div>

        {message && <p className={message.type === 'error' ? 'alert' : 'notice'} role="alert">{message.text}</p>}
        {lastSale && (
  <div className="notice receipt-actions" role="status">
    <span>
      Venta {lastSale.invoice_number} cobrada por {money(lastSale.total)} en{' '}
      {PAYMENTS[lastSale.payment_method].toLowerCase()}.
    </span>
    <span className="receipt-buttons">
      <button className="ghost" onClick={() => printReceipt(lastSale)}>Imprimir comprobante</button>
      <button className="ghost" onClick={() => downloadReceipt(lastSale)}>Descargar PDF</button>
    </span>
  </div>
)}

        {products.length === 0 ? (
          <p className="empty">No hay productos que coincidan con “{query}”.</p>
        ) : (
          <ul className="grid">
            {products.map((p) => (
              <li key={p.id}>
                <button className="product" onClick={() => addProduct(p)} disabled={p.stock < 1}>
                  <span className="product-name">{p.name}</span>
                  <span className="product-code">{p.code}</span>
                  <span className="product-price">{money(p.selling_price)}</span>
                  <span className={p.stock < 1 ? 'stock out' : p.stock <= 5 ? 'stock low' : 'stock'}>
                    {p.stock < 1 ? 'Agotado' : `${p.stock} en stock`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <aside className="ticket" aria-label="Venta actual">
        <header className="ticket-head">
          <h2>Venta actual</h2>
          <span className="muted">{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</span>
        </header>

        {lines.length === 0 ? (
          <p className="empty">Escanea o toca un producto para empezar.</p>
        ) : (
          <ul className="lines">
            {lines.map(({ product, quantity }) => (
              <li key={product.id} className="line">
                <div className="line-main">
                  <span className="line-name">{product.name}</span>
                  <span className="mono">{money(Number(product.selling_price) * quantity)}</span>
                </div>
                <div className="line-sub">
                  <span className="mono muted">{quantity} × {money(product.selling_price)}</span>
                  <span className="qty">
                    <button aria-label={`Quitar una unidad de ${product.name}`} onClick={() => setQuantity(product.id, quantity - 1)}>−</button>
                    <button aria-label={`Agregar una unidad de ${product.name}`} onClick={() => addProduct(product)}>+</button>
                    <button className="remove" aria-label={`Quitar ${product.name}`} onClick={() => remove(product.id)}>Quitar</button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="ticket-foot">
          <div className="total">
            <span>Total</span>
            <strong className="mono">{money(fromCents(totalCents))}</strong>
          </div>

          <div className="segmented" role="radiogroup" aria-label="Método de pago">
            {Object.entries(PAYMENTS).map(([key, label]) => (
              <button
                key={key}
                role="radio"
                aria-checked={paymentMethod === key}
                className={paymentMethod === key ? 'on' : ''}
                onClick={() => setPaymentMethod(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <button className="charge" disabled={lines.length === 0 || saving} onClick={charge}>
            {saving ? 'Cobrando…' : `Cobrar ${money(fromCents(totalCents))}`}
          </button>
          {lines.length > 0 && (
            <button className="ghost wide" onClick={clear} disabled={saving}>Vaciar venta</button>
          )}
        </div>
      </aside>

      {closing && <CloseShiftModal onClose={() => setClosing(false)} />}
    </div>
  );
}
