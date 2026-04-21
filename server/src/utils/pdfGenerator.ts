import PDFDocument from 'pdfkit';
import type { InvoiceDetailRow } from '../models/invoice.model';
import type { UserRow } from '../types';

const MARGIN = 50;
const PAGE_W = 595.28; // A4 width in points
const CONTENT_W = PAGE_W - MARGIN * 2;
const RIGHT = PAGE_W - MARGIN;

// Column x positions (left edge) and widths for the line-items table
const COL = {
  num:    { x: MARGIN,       w: 20  },
  desc:   { x: MARGIN + 25,  w: 235 },
  qty:    { x: MARGIN + 320, w: 40  },
  rate:   { x: MARGIN + 368, w: 72  },
  amount: { x: MARGIN + 445, w: 100 },
} as const;

function money(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

function fmtDate(dateStr: string | Date): string {
  const s = dateStr instanceof Date ? dateStr.toISOString() : String(dateStr);
  const [y, m, d] = s.split('T')[0].split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function hLine(doc: PDFKit.PDFDocument, y: number, color = '#e5e7eb', width = 1): void {
  doc.save().moveTo(MARGIN, y).lineTo(RIGHT, y)
     .strokeColor(color).lineWidth(width).stroke().restore();
}

export function generateInvoicePdf(invoice: InvoiceDetailRow, user: UserRow): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const currency = user.currency || 'USD';
    const bizName = user.business_name || user.email;

    // ── TOP HEADER: business (left) + INVOICE label (right) ───────────────
    let y = MARGIN;

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#111827').text(bizName, MARGIN, y);
    y += 26;

    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    if (user.business_email) { doc.text(user.business_email, MARGIN, y); y += 13; }
    if (user.business_phone) { doc.text(user.business_phone, MARGIN, y); y += 13; }
    if (user.business_address) { doc.text(user.business_address, MARGIN, y); y += 13; }

    // Right column — drawn at fixed coords relative to page top
    const rightTop = MARGIN;
    doc.fontSize(26).font('Helvetica-Bold').fillColor('#1f2937')
       .text('INVOICE', MARGIN, rightTop, { align: 'right', width: CONTENT_W });
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#4f46e5')
       .text(invoice.invoice_number, MARGIN, rightTop + 36, { align: 'right', width: CONTENT_W });

    const statusLabel = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280')
       .text(`Status: ${statusLabel}`,  MARGIN, rightTop + 58, { align: 'right', width: CONTENT_W })
       .text(`Issued: ${fmtDate(invoice.issue_date)}`, MARGIN, rightTop + 71, { align: 'right', width: CONTENT_W })
       .text(`Due:    ${fmtDate(invoice.due_date)}`,   MARGIN, rightTop + 84, { align: 'right', width: CONTENT_W });

    // Divider below header
    y = Math.max(y, rightTop + 104) + 12;
    hLine(doc, y);

    // ── BILL TO ──────────────────────────────────────────────────────────
    y += 18;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#9ca3af')
       .text('BILL TO', MARGIN, y, { characterSpacing: 1.5 });
    y += 14;

    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827')
       .text(invoice.client_name, MARGIN, y, { lineBreak: false });
    y += 14;

    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    if (invoice.client_email)   { doc.text(invoice.client_email,   MARGIN, y, { lineBreak: false }); y += 12; }
    if (invoice.client_phone)   { doc.text(invoice.client_phone,   MARGIN, y, { lineBreak: false }); y += 12; }
    if (invoice.client_address) { doc.text(invoice.client_address, MARGIN, y, { lineBreak: false }); y += 12; }
    const cityCountry = [invoice.client_city, invoice.client_country].filter(Boolean).join(', ');
    if (cityCountry) { doc.text(cityCountry, MARGIN, y, { lineBreak: false }); y += 12; }

    // ── LINE ITEMS TABLE ──────────────────────────────────────────────────
    y += 22;
    hLine(doc, y);
    y += 10;

    // Table header row
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#9ca3af');
    doc.text('#',           COL.num.x,    y, { width: COL.num.w,    lineBreak: false, characterSpacing: 1 });
    doc.text('DESCRIPTION', COL.desc.x,   y, { width: COL.desc.w,   lineBreak: false, characterSpacing: 1 });
    doc.text('QTY',         COL.qty.x,    y, { width: COL.qty.w,    lineBreak: false, align: 'right', characterSpacing: 1 });
    doc.text('RATE',        COL.rate.x,   y, { width: COL.rate.w,   lineBreak: false, align: 'right', characterSpacing: 1 });
    doc.text('AMOUNT',      COL.amount.x, y, { width: COL.amount.w, lineBreak: false, align: 'right', characterSpacing: 1 });
    y += 16;
    hLine(doc, y);
    y += 10;

    // Table rows
    for (let i = 0; i < invoice.items.length; i++) {
      const item = invoice.items[i]!;
      const maxDescLen = 52;
      const desc = item.description.length > maxDescLen
        ? item.description.slice(0, maxDescLen - 1) + '…'
        : item.description;

      doc.fontSize(9).font('Helvetica').fillColor('#374151');
      doc.text(String(i + 1), COL.num.x,    y, { width: COL.num.w,    lineBreak: false });
      doc.text(desc,          COL.desc.x,   y, { width: COL.desc.w,   lineBreak: false });
      doc.text(String(item.quantity), COL.qty.x, y, { width: COL.qty.w, lineBreak: false, align: 'right' });
      doc.text(money(item.rate, currency),             COL.rate.x,   y, { width: COL.rate.w,   lineBreak: false, align: 'right' });
      doc.font('Helvetica-Bold')
         .text(money(item.quantity * item.rate, currency), COL.amount.x, y, { width: COL.amount.w, lineBreak: false, align: 'right' });

      y += 22;

      // Light separator between rows (not after last)
      if (i < invoice.items.length - 1) {
        doc.save().moveTo(COL.desc.x, y - 5).lineTo(RIGHT, y - 5)
           .strokeColor('#f3f4f6').lineWidth(0.5).stroke().restore();
      }
    }

    hLine(doc, y + 4);
    y += 20;

    // ── TOTALS ─────────────────────────────────────────────────────────────
    const labelX = MARGIN + 320;
    const valueW = RIGHT - labelX;

    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    doc.text('Subtotal', labelX, y, { lineBreak: false });
    doc.text(money(invoice.subtotal, currency), labelX, y, { width: valueW, align: 'right', lineBreak: false });
    y += 16;

    if (invoice.tax_amount > 0) {
      doc.text(`Tax (${invoice.tax_rate}%)`, labelX, y, { lineBreak: false });
      doc.text(money(invoice.tax_amount, currency), labelX, y, { width: valueW, align: 'right', lineBreak: false });
      y += 16;
    }

    if (invoice.discount_amount > 0) {
      doc.fillColor('#dc2626')
         .text('Discount', labelX, y, { lineBreak: false })
         .text(`-${money(invoice.discount_amount, currency)}`, labelX, y, { width: valueW, align: 'right', lineBreak: false });
      y += 16;
      doc.fillColor('#6b7280');
    }

    hLine(doc, y, '#d1d5db');
    y += 10;

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827');
    doc.text('Total', labelX, y, { lineBreak: false });
    doc.text(money(invoice.total, currency), labelX, y, { width: valueW, align: 'right', lineBreak: false });

    // ── NOTES ──────────────────────────────────────────────────────────────
    if (invoice.notes) {
      y += 36;
      hLine(doc, y);
      y += 14;
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#9ca3af')
         .text('NOTES / TERMS', MARGIN, y, { characterSpacing: 1.5 });
      y += 14;
      doc.fontSize(9).font('Helvetica').fillColor('#374151')
         .text(invoice.notes, MARGIN, y, { width: CONTENT_W });
    }

    doc.end();
  });
}
