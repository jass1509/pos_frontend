import { Fragment, useCallback, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { PAYMENTS, apiError, dateTime, money } from '../utils/format';

export default function SalesHistory() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ results: [], next: null, previous: null, count: 0 });
  const [expanded, setExpanded] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/sales/', { params: { page } });
      setData(res.data);
      setError('');
    } catch (e) {
      setError(apiError(e));
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function voidSale(sale) {
    if (!window.confirm(`¿Anular la venta ${sale.invoice_number}? El stock se repondrá.`)) return;
    try {
      await api.post(`/sales/${sale.id}/void/`);
      await load();
    } catch (e) {
      setError(apiError(e));
    }
  }

  return (
    <section className="panel">
      <h1>Historial de ventas</h1>
      {error && <p className="alert" role="alert">{error}</p>}
      {data.results.length === 0 && !error ? (
        <p className="empty">Todavía no hay ventas registradas.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Factura</th><th>Fecha</th><th>Cajero</th><th>Pago</th>
                <th className="num">Total</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((s) => (
                <Fragment key={s.id}>
                  <tr className={s.status === 'VOIDED' ? 'voided' : ''}>
                    <td className="mono">{s.invoice_number}</td>
                    <td>{dateTime(s.created_at)}</td>
                    <td>{s.cashier}</td>
                    <td>{PAYMENTS[s.payment_method]}</td>
                    <td className="num mono">{money(s.total)}</td>
                    <td><span className={`badge ${s.status === 'VOIDED' ? 'bad' : 'ok'}`}>{s.status === 'VOIDED' ? 'Anulada' : 'Completada'}</span></td>
                    <td className="actions">
                      <button className="ghost" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                        {expanded === s.id ? 'Ocultar' : 'Ver detalle'}
                      </button>
                      {isAdmin && s.status === 'COMPLETED' && (
                        <button className="ghost danger" onClick={() => voidSale(s)}>Anular</button>
                      )}
                    </td>
                  </tr>
                  {expanded === s.id && (
                    <tr className="detail">
                      <td colSpan={7}>
                        <ul>
                          {s.items.map((i) => (
                            <li key={i.id} className="mono">
                              {i.quantity} × {i.product_name} a {money(i.unit_price)} = {money(i.subtotal)}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="row-end pager">
        <span className="muted">{data.count} ventas</span>
        <button className="ghost" disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>Anterior</button>
        <button className="ghost" disabled={!data.next} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
      </div>
    </section>
  );
}
