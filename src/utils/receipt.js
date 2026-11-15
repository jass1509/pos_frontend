import { jsPDF } from 'jspdf';
import { PAYMENTS, dateTime, money } from './format';

// Datos que aparecen en el encabezado del comprobante. Cámbialos por los de tu negocio.
const BUSINESS = {
  name: 'Mi Negocio',
  taxId: 'RUC 00000000000',
  address: 'Av. Principal 123, Lima',
  footer: '¡Gracias por su compra!',
};

const WIDTH = 80; // mm, ancho típico de impresora térmica
const MARGIN = 5;
const CONTENT = WIDTH - MARGIN * 2;

/**
 * Dibuja el comprobante y devuelve la altura final usada.
 * Se llama dos veces: una para medir el alto y otra para generar el PDF real.
 */
function render(doc, sale) {
  let y = 8;

  const lineHeight = (size) => size * 0.45;

  const text = (value, { size = 9, bold = false, align = 'left' } = {}) => {
    doc.setFont('courier', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const x = align === 'center' ? WIDTH / 2 : MARGIN;
    doc.splitTextToSize(String(value), CONTENT).forEach((line) => {
      doc.text(line, x, y, { align });
      y += lineHeight(size);
    });
  };

  // Texto a la izquierda y monto a la derecha en la misma línea
  const row = (left, right, { size = 9, bold = false } = {}) => {
    doc.setFont('courier', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(left, MARGIN, y);
    doc.text(right, WIDTH - MARGIN, y, { align: 'right' });
    y += lineHeight(size);
  };

  const divider = () => {
    doc.setLineDashPattern([0.8, 0.8], 0);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 1.5, WIDTH - MARGIN, y - 1.5);
    doc.setLineDashPattern([], 0);
    y += 1.5;
  };

  text(BUSINESS.name, { size: 12, bold: true, align: 'center' });
  text(BUSINESS.taxId, { align: 'center' });
  text(BUSINESS.address, { size: 8, align: 'center' });
  y += 2;
  divider();

  text(`Comprobante ${sale.invoice_number}`, { bold: true });
  text(`Fecha: ${dateTime(sale.created_at)}`, { size: 8 });
  text(`Cajero: ${sale.cashier}`, { size: 8 });
  if (sale.status === 'VOIDED') {
    y += 1;
    text('*** VENTA ANULADA ***', { bold: true, align: 'center' });
  }
  y += 1;
  divider();

  sale.items.forEach((item) => {
    text(item.product_name, { bold: true });
    row(`${item.quantity} x ${money(item.unit_price)}`, money(item.subtotal), { size: 8 });
    y += 1;
  });

  divider();
  row('TOTAL', money(sale.total), { size: 11, bold: true });
  row('Pago', PAYMENTS[sale.payment_method] ?? sale.payment_method, { size: 8 });
  y += 2;
  divider();
  y += 1;
  text(BUSINESS.footer, { size: 8, align: 'center' });

  return y;
}

function buildPdf(sale) {
  // 1) Medimos el alto con un documento temporal alto
  const measure = new jsPDF({ unit: 'mm', format: [WIDTH, 600] });
  const height = render(measure, sale) + MARGIN;
  // 2) Generamos el PDF real con el alto exacto
  const doc = new jsPDF({ unit: 'mm', format: [WIDTH, Math.max(height, 60)] });
  render(doc, sale);
  return doc;
}

/** Descarga el comprobante como archivo PDF. */
export function downloadReceipt(sale) {
  buildPdf(sale).save(`${sale.invoice_number}.pdf`);
}

/** Abre el PDF en una pestaña nueva y lanza el diálogo de impresión. */
export function printReceipt(sale) {
  const doc = buildPdf(sale);
  doc.autoPrint();
  const win = window.open(doc.output('bloburl'), '_blank');
  // Si el navegador bloquea la ventana emergente, descargamos el archivo.
  if (!win) doc.save(`${sale.invoice_number}.pdf`);
}