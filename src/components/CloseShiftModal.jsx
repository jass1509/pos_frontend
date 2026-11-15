import { useEffect, useState } from 'react';
import api from '../api/client';
import Modal from './Modal.jsx';
import { useShiftStore } from '../store/shiftStore';
import { PAYMENTS, apiError, money } from '../utils/format';

export default function CloseShiftModal({ onClose }) {
  const { summary, fetch } = useShiftStore();
  const clearShift = useShiftStore((s) => s.clear);
  const [counted, setCounted] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch().catch((e) => setError(apiError(e)));
  }, [fetch]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/shifts/close/', { final_cash_real: counted });
      setResult(data.summary);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    clearShift();
    onClose();
  }

  // Paso 2: resultado del cierre
  if (result) {
    const diff = Number(result.difference);
    return (
      <Modal title="Caja cerrada" onClose={finish}>
        <div className="modal-body">
          <Totals summary={result} />
          <dl className="kv">
            <div><dt>Efectivo contado</dt><dd>{money(result.final_cash_real)}</dd></div>
            <div className={diff === 0 ? 'ok' : 'bad'}>
              <dt>Diferencia</dt>
              <dd>
                {diff === 0 ? 'Cuadra exacto' : `${diff > 0 ? 'Sobran' : 'Faltan'} ${money(Math.abs(diff))}`}
              </dd>
            </div>
          </dl>
          <button className="primary" onClick={finish}>Listo</button>
        </div>
      </Modal>
    );
  }

  // Paso 1: resumen y conteo
  return (
    <Modal title="Cerrar caja" onClose={onClose}>
      <form className="modal-body" onSubmit={submit}>
        {summary ? <Totals summary={summary} /> : <p>Calculando totales…</p>}
        <label className="field">
          <span>Efectivo contado en caja</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            required
            autoFocus
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
          />
        </label>
        {error && <p className="alert" role="alert">{error}</p>}
        <p className="hint">Al cerrar, el turno no puede reabrirse.</p>
        <div className="row-end">
          <button type="button" className="ghost" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={saving || counted === ''}>
            {saving ? 'Cerrando…' : 'Cerrar caja'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Totals({ summary }) {
  return (
    <dl className="kv">
      {Object.entries(PAYMENTS).map(([key, label]) => (
        <div key={key}>
          <dt>Ventas en {label.toLowerCase()}</dt>
          <dd>{money(summary.totals_by_method[key])}</dd>
        </div>
      ))}
      <div className="strong"><dt>Total vendido ({summary.sales_count} ventas)</dt><dd>{money(summary.total_sold)}</dd></div>
      <div><dt>Fondo inicial</dt><dd>{money(summary.initial_cash)}</dd></div>
      <div className="strong"><dt>Efectivo esperado</dt><dd>{money(summary.expected_cash)}</dd></div>
    </dl>
  );
}
