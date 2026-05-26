/* eslint-disable @typescript-eslint/no-explicit-any */
import type { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export type DocumentLabel = 'TAX INVOICE' | 'CREDIT NOTE' | 'DELIVERY CHALLAN';

export interface AddressBlock {
  name: string;
  addressLines: string[];
  phone?: string | null;
  gstin?: string | null;
  pan?: string | null;
  stateName?: string | null;
  stateCode?: string | null;
}

export interface InvoiceItem {
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  perUnit: string;
  discountPct?: number | null;
  amount: number;
}

export interface HsnSummaryRow {
  hsn: string;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate?: number;
  igstAmount?: number;
}

export interface EInvoiceBlock {
  irn: string;
  ackNo: string;
  ackDate: string;
  signedQrPayload: string;
}

export interface EWayBill {
  ewbNo: string;
  mode: string;
  generatedDate: string;
  validUpto: string;
  approxDistance: number;
  supplyType: string;
  transactionType: string;
  transporterName?: string | null;
  transporterId?: string | null;
  vehicleNo: string;
  dispatchFrom?: string | null;
  shipTo?: string | null;
}

export interface InvoiceRenderInput {
  documentLabel: DocumentLabel;
  seller: AddressBlock & { jurisdiction?: string | null };
  buyer: AddressBlock;
  consignee?: AddressBlock | null;
  meta: {
    invoiceNo: string;
    invoiceDate: string;
    deliveryNote?: string | null;
    referenceNoAndDate?: string | null;
    buyerOrderNo?: string | null;
    buyerOrderDate?: string | null;
    dispatchDocNo?: string | null;
    deliveryNoteDate?: string | null;
    dispatchedThrough?: string | null;
    destination?: string | null;
    paymentTerms?: string | null;
    otherReferences?: string | null;
    termsOfDelivery?: string | null;
  };
  items: InvoiceItem[];
  totalsLines: Array<{ label: string; ratePct?: number | null; amount: number; emphasised?: boolean }>;
  grandTotal: number;
  totalQuantityDisplay: string;
  amountInWords: string;
  taxAmountInWords: string;
  hsnSummary: HsnSummaryRow[];
  einvoice?: EInvoiceBlock | null;
  ewayBill?: EWayBill | null;
  filename?: string;
}

let jsPdfModulePromise: Promise<typeof import('jspdf')> | null = null;

const loadJsPdf = async () => {
  if (!jsPdfModulePromise) {
    jsPdfModulePromise = import('jspdf');
  }
  return (await jsPdfModulePromise).jsPDF;
};

// Page dims
const PAGE_W = 210;
const PAGE_H = 297;
const M = 8;
const CONTENT_W = PAGE_W - M * 2;

// Cell defaults
const PAD = 1.5;
const LINE = 3.3;

const fmtMoney = (v: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Centered baseline for single-line text inside a cell of height `h` and font size `pt`.
// jsPDF positions text by baseline, so we add ~font_size_mm * 0.35 for visual centering.
const centerY = (y: number, h: number, pt: number) => {
  const ptMm = (pt * 0.3528);
  return y + (h + ptMm) / 2 - 0.5;
};

const rect = (doc: jsPDF, x: number, y: number, w: number, h: number) => {
  doc.rect(x, y, w, h);
};

const setText = (doc: jsPDF, pt: number, bold = false) => {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(pt);
  doc.setTextColor(0, 0, 0);
};

// Aligns label / colon / value at fixed columns inside an address block.
const drawLabelValueRow = (
  doc: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  labelW: number,
  maxValueW: number,
  pt = 7.2,
) => {
  setText(doc, pt);
  doc.text(label, x, y);
  doc.text(':', x + labelW, y);
  const wrapped = doc.splitTextToSize(value, maxValueW);
  doc.text(wrapped, x + labelW + 2, y);
  return Array.isArray(wrapped) ? wrapped.length : 1;
};

const drawAddressBlock = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  labelHeading: string,
  block: AddressBlock,
) => {
  const innerX = x + PAD;
  const innerW = w - PAD * 2;
  let cy = y + 2.8;

  setText(doc, 6.5);
  doc.text(labelHeading, innerX, cy);
  cy += 3.2;

  setText(doc, 8, true);
  const nameWrapped = doc.splitTextToSize(block.name || '—', innerW);
  doc.text(nameWrapped, innerX, cy);
  cy += LINE * (Array.isArray(nameWrapped) ? nameWrapped.length : 1) + 0.5;

  setText(doc, 7.2);
  for (const line of block.addressLines) {
    const wrapped = doc.splitTextToSize(line, innerW);
    doc.text(wrapped, innerX, cy);
    cy += LINE * (Array.isArray(wrapped) ? wrapped.length : 1);
  }

  const labelW = 18;
  const valueMaxW = innerW - labelW - 2;
  if (block.gstin) {
    drawLabelValueRow(doc, innerX, cy, 'GSTIN/UIN', block.gstin, labelW, valueMaxW);
    cy += LINE;
  }
  if (block.pan) {
    drawLabelValueRow(doc, innerX, cy, 'PAN/IT No', block.pan, labelW, valueMaxW);
    cy += LINE;
  }
  if (block.stateName || block.stateCode) {
    const v = `${block.stateName ?? '—'}${block.stateCode ? `, Code : ${block.stateCode}` : ''}`;
    drawLabelValueRow(doc, innerX, cy, 'State Name', v, labelW, valueMaxW);
    cy += LINE;
  }
  if (block.phone) {
    drawLabelValueRow(doc, innerX, cy, 'Contact', block.phone, labelW, valueMaxW);
    cy += LINE;
  }
  return cy;
};

const drawMetaCell = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value?: string | null,
) => {
  rect(doc, x, y, w, h);
  setText(doc, 6.4);
  doc.text(label, x + PAD, y + 2.8);
  if (value) {
    setText(doc, 7.5, true);
    const wrapped = doc.splitTextToSize(value, w - PAD * 2);
    doc.text(wrapped, x + PAD, y + h - 1.6);
  }
};

const renderQrIfPresent = async (
  doc: jsPDF,
  payload: string,
  x: number,
  y: number,
  size: number,
) => {
  try {
    const dataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 0, width: 300 });
    doc.addImage(dataUrl, 'PNG', x, y, size, size);
  } catch {
    rect(doc, x, y, size, size);
  }
};

const drawInvoicePage = async (doc: jsPDF, input: InvoiceRenderInput, yStart: number): Promise<number> => {
  let y = yStart;

  // Top strip — IRN/Ack + QR (only when e-invoice present)
  if (input.einvoice) {
    const stripH = 24;
    const irnLabelX = M;
    const irnLabelW = 16;
    const irnValueX = irnLabelX + irnLabelW + 2;
    const irnValueMaxW = PAGE_W - M - 30 - irnValueX;
    setText(doc, 7.5);
    doc.text('IRN', irnLabelX, y + 3);
    doc.text(':', irnLabelX + irnLabelW, y + 3);
    const irnLines = doc.splitTextToSize(input.einvoice.irn, irnValueMaxW);
    doc.text(irnLines, irnValueX, y + 3);
    const irnRowH = LINE * (Array.isArray(irnLines) ? irnLines.length : 1);
    doc.text('Ack No.', irnLabelX, y + 3 + irnRowH + 2);
    doc.text(':', irnLabelX + irnLabelW, y + 3 + irnRowH + 2);
    doc.text(input.einvoice.ackNo, irnValueX, y + 3 + irnRowH + 2);
    doc.text('Ack Date', irnLabelX, y + 3 + irnRowH + 2 + LINE + 1);
    doc.text(':', irnLabelX + irnLabelW, y + 3 + irnRowH + 2 + LINE + 1);
    doc.text(input.einvoice.ackDate, irnValueX, y + 3 + irnRowH + 2 + LINE + 1);
    // QR + "e-Invoice" caption (right)
    await renderQrIfPresent(doc, input.einvoice.signedQrPayload, PAGE_W - M - 22, y, 22);
    setText(doc, 8, true);
    doc.text('e-Invoice', PAGE_W - M, y + 24 + 3, { align: 'right' });
    y += stripH + 4;
  }

  // Title
  setText(doc, 11, true);
  doc.text(input.documentLabel, PAGE_W / 2, y + 3, { align: 'center' });
  y += 6;

  // Seller block + metadata grid
  const sellerW = 110;
  const metaW = CONTENT_W - sellerW;
  const sellerH = 42;
  const rowH = sellerH / 6;

  rect(doc, M, y, sellerW, sellerH);
  // Seller content
  {
    let cy = y + 4;
    setText(doc, 8.5, true);
    doc.text(input.seller.name, M + PAD, cy);
    cy += 4;
    setText(doc, 7.2);
    for (const line of input.seller.addressLines) {
      const wrapped = doc.splitTextToSize(line, sellerW - PAD * 2);
      doc.text(wrapped, M + PAD, cy);
      cy += LINE * (Array.isArray(wrapped) ? wrapped.length : 1);
    }
    if (input.seller.phone) {
      doc.text(input.seller.phone, M + PAD, cy);
      cy += LINE;
    }
    if (input.seller.pan) {
      doc.text(`PAN NO ${input.seller.pan}`, M + PAD, cy);
      cy += LINE;
    }
    if (input.seller.gstin) {
      doc.text(`GSTIN/UIN: ${input.seller.gstin}`, M + PAD, cy);
      cy += LINE;
    }
    if (input.seller.stateName || input.seller.stateCode) {
      doc.text(
        `State Name : ${input.seller.stateName ?? '—'}${input.seller.stateCode ? `, Code : ${input.seller.stateCode}` : ''}`,
        M + PAD,
        cy,
      );
    }
  }

  // Meta grid
  const metaX = M + sellerW;
  const hasEwb = !!input.ewayBill;
  const metaColW = metaW / 2;
  const metaCol3a = metaW * 0.4;
  const metaCol3b = metaW * 0.3;
  const metaCol3c = metaW * 0.3;
  // Row 1
  if (hasEwb) {
    drawMetaCell(doc, metaX, y, metaCol3a, rowH, 'Invoice No.', input.meta.invoiceNo);
    drawMetaCell(doc, metaX + metaCol3a, y, metaCol3b, rowH, 'e-Way Bill No.', input.ewayBill?.ewbNo);
    drawMetaCell(doc, metaX + metaCol3a + metaCol3b, y, metaCol3c, rowH, 'Dated', input.meta.invoiceDate);
  } else {
    drawMetaCell(doc, metaX, y, metaColW, rowH, 'Invoice No.', input.meta.invoiceNo);
    drawMetaCell(doc, metaX + metaColW, y, metaColW, rowH, 'Dated', input.meta.invoiceDate);
  }
  const metaRows: Array<[string, string | null | undefined, string, string | null | undefined]> = [
    ['Delivery Note', input.meta.deliveryNote, 'Mode/Terms of Payment', input.meta.paymentTerms],
    ['Reference No. & Date.', input.meta.referenceNoAndDate, 'Other References', input.meta.otherReferences],
    ["Buyer's Order No.", input.meta.buyerOrderNo, 'Dated', input.meta.buyerOrderDate],
    ['Dispatch Doc No.', input.meta.dispatchDocNo, 'Delivery Note Date', input.meta.deliveryNoteDate],
    ['Dispatched through', input.meta.dispatchedThrough, 'Destination', input.meta.destination],
  ];
  metaRows.forEach(([lLabel, lVal, rLabel, rVal], i) => {
    const ry = y + rowH * (i + 1);
    drawMetaCell(doc, metaX, ry, metaColW, rowH, lLabel, lVal);
    drawMetaCell(doc, metaX + metaColW, ry, metaColW, rowH, rLabel, rVal);
  });

  y += sellerH;

  // Terms of Delivery (full-width row beneath seller+meta)
  const termsH = 7;
  rect(doc, M, y, CONTENT_W, termsH);
  setText(doc, 6.4);
  doc.text('Terms of Delivery', M + PAD, y + 2.8);
  if (input.meta.termsOfDelivery) {
    setText(doc, 7.5, true);
    doc.text(input.meta.termsOfDelivery, M + PAD, y + termsH - 1.6);
  }
  y += termsH;

  // Address blocks: Consignee + Buyer
  const consigneeBlock = input.consignee ?? input.buyer;
  const addrH = 30;
  rect(doc, M, y, CONTENT_W / 2, addrH);
  rect(doc, M + CONTENT_W / 2, y, CONTENT_W / 2, addrH);
  drawAddressBlock(doc, M, y, CONTENT_W / 2, 'Consignee (Ship to)', consigneeBlock);
  drawAddressBlock(doc, M + CONTENT_W / 2, y, CONTENT_W / 2, 'Buyer (Bill to)', input.buyer);
  y += addrH;

  // Items table
  const showDisc = input.items.some(it => (it.discountPct ?? 0) > 0);
  const cols = showDisc
    ? ['Sl No.', 'Description of Goods', 'HSN/SAC', 'Quantity', 'Rate', 'per', 'Disc. %', 'Amount']
    : ['Sl No.', 'Description of Goods', 'HSN/SAC', 'Quantity', 'Rate', 'per', 'Amount'];
  // Re-balanced widths (sum = CONTENT_W = 194)
  const colWidths = showDisc
    ? [10, 70, 22, 20, 22, 8, 14, 28]
    : [10, 82, 24, 22, 24, 10, 22];
  const colAligns: ('left' | 'right' | 'center')[] = showDisc
    ? ['center', 'left', 'center', 'right', 'right', 'center', 'right', 'right']
    : ['center', 'left', 'center', 'right', 'right', 'center', 'right'];

  const headerH = 7;
  let cx = M;
  cols.forEach((label, i) => {
    rect(doc, cx, y, colWidths[i], headerH);
    setText(doc, 7.2, true);
    const align = colAligns[i];
    const tx = align === 'right' ? cx + colWidths[i] - PAD : align === 'center' ? cx + colWidths[i] / 2 : cx + PAD;
    doc.text(label, tx, centerY(y, headerH, 7.2), { align });
    cx += colWidths[i];
  });
  y += headerH;

  const rowHItem = 5.5;
  input.items.forEach((it, idx) => {
    cx = M;
    const cellsBase = [
      `${idx + 1}`,
      it.description,
      it.hsn,
      `${it.quantity}${it.unit ? ' ' + it.unit : ''}`,
      fmtMoney(it.rate),
      it.perUnit,
    ];
    const cells = showDisc
      ? [...cellsBase, (it.discountPct ?? 0).toFixed(2) + ' %', fmtMoney(it.amount)]
      : [...cellsBase, fmtMoney(it.amount)];

    cells.forEach((val, i) => {
      rect(doc, cx, y, colWidths[i], rowHItem);
      setText(doc, 7.2);
      const align = colAligns[i];
      const tx = align === 'right' ? cx + colWidths[i] - PAD : align === 'center' ? cx + colWidths[i] / 2 : cx + PAD;
      const wrapped = doc.splitTextToSize(val, colWidths[i] - PAD * 2);
      doc.text(wrapped, tx, centerY(y, rowHItem, 7.2), { align });
      cx += colWidths[i];
    });
    y += rowHItem;
  });

  // Sub-total row (above tax lines) — only amount filled, other cells empty bordered
  const subtotal = input.items.reduce((s, it) => s + it.amount, 0);
  const lastColX = M + CONTENT_W - colWidths[colWidths.length - 1];
  const lastColW = colWidths[colWidths.length - 1];

  rect(doc, M, y, CONTENT_W, rowHItem);
  setText(doc, 7.2, true);
  doc.text(fmtMoney(subtotal), lastColX + lastColW - PAD, centerY(y, rowHItem, 7.2), { align: 'right' });
  y += rowHItem;

  // Tax / round-off rows — italic label centered horizontally on description column, rate cell, amount cell
  const descStart = M + colWidths[0];
  const rateColX = M + colWidths.slice(0, showDisc ? 4 : 4).reduce((a, b) => a + b, 0);
  const perColX = rateColX + colWidths[showDisc ? 4 : 4];
  const taxRowH = 5;
  input.totalsLines.forEach((tl) => {
    rect(doc, M, y, CONTENT_W, taxRowH);
    setText(doc, 7.2, true);
    // Italic-ish: bold label right-aligned in description column area
    doc.text(tl.label, descStart + colWidths[1] + colWidths[2] - PAD - 2, centerY(y, taxRowH, 7.2), { align: 'right' });
    if (tl.ratePct != null) {
      setText(doc, 7.2);
      doc.text(`${tl.ratePct} %`, perColX + (showDisc ? colWidths[5] / 2 : colWidths[5] / 2), centerY(y, taxRowH, 7.2), { align: 'center' });
    }
    setText(doc, 7.2, true);
    doc.text(fmtMoney(tl.amount), lastColX + lastColW - PAD, centerY(y, taxRowH, 7.2), { align: 'right' });
    y += taxRowH;
  });

  // Grand total row
  const grandH = 7;
  rect(doc, M, y, CONTENT_W, grandH);
  setText(doc, 8.5, true);
  doc.text('Total', M + PAD, centerY(y, grandH, 8.5));
  // Total qty positioned in Quantity column center
  const qtyColX = M + colWidths[0] + colWidths[1] + colWidths[2];
  const qtyColW = colWidths[3];
  doc.text(input.totalQuantityDisplay, qtyColX + qtyColW - PAD, centerY(y, grandH, 8.5), { align: 'right' });
  doc.text(`Rs ${fmtMoney(input.grandTotal)}`, lastColX + lastColW - PAD, centerY(y, grandH, 8.5), { align: 'right' });
  y += grandH;

  // Amount in words
  const wordsH = 8;
  rect(doc, M, y, CONTENT_W, wordsH);
  setText(doc, 6.4);
  doc.text('Amount Chargeable (in words)', M + PAD, y + 2.8);
  doc.text('E. & O.E', M + CONTENT_W - PAD, y + 2.8, { align: 'right' });
  setText(doc, 8, true);
  doc.text(`INR ${input.amountInWords} Only`, M + PAD, y + wordsH - 1.8);
  y += wordsH;

  // HSN summary table
  const sumHeaderH = 6;
  const sumRowH = 5;
  const sumCols = ['HSN/SAC', 'Taxable Value', 'Central Tax', 'Central Tax', 'State Tax', 'State Tax', 'Total Tax Amount'];
  const sumSubLabels = ['', '', 'Rate', 'Amount', 'Rate', 'Amount', ''];
  // Final layout: 7 cols, but Central Tax shares header with two sub-cols (Rate, Amount). Same for State Tax.
  // Simplify: single header row with each effective sub-column labelled.
  const sumColLabels = ['HSN/SAC', 'Taxable Value', 'CGST Rate', 'CGST Amount', 'SGST/UTGST Rate', 'SGST/UTGST Amount', 'Total Tax Amount'];
  // Suppress unused warnings:
  void sumCols; void sumSubLabels;
  const sumColW = [
    CONTENT_W * 0.18,
    CONTENT_W * 0.15,
    CONTENT_W * 0.10,
    CONTENT_W * 0.14,
    CONTENT_W * 0.11,
    CONTENT_W * 0.16,
    CONTENT_W - CONTENT_W * (0.18 + 0.15 + 0.10 + 0.14 + 0.11 + 0.16),
  ];
  cx = M;
  sumColLabels.forEach((label, i) => {
    rect(doc, cx, y, sumColW[i], sumHeaderH);
    setText(doc, 6.5, true);
    const wrapped = doc.splitTextToSize(label, sumColW[i] - PAD * 2);
    doc.text(wrapped, cx + sumColW[i] / 2, centerY(y, sumHeaderH, 6.5), { align: 'center' });
    cx += sumColW[i];
  });
  y += sumHeaderH;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalTax = 0;
  input.hsnSummary.forEach(row => {
    cx = M;
    const totalLineTax = row.cgstAmount + row.sgstAmount + (row.igstAmount ?? 0);
    const cells = [
      row.hsn,
      fmtMoney(row.taxableValue),
      `${row.cgstRate}%`,
      fmtMoney(row.cgstAmount),
      `${row.sgstRate}%`,
      fmtMoney(row.sgstAmount),
      fmtMoney(totalLineTax),
    ];
    totalTaxable += row.taxableValue;
    totalCgst += row.cgstAmount;
    totalSgst += row.sgstAmount;
    totalTax += totalLineTax;
    cells.forEach((val, i) => {
      rect(doc, cx, y, sumColW[i], sumRowH);
      setText(doc, 6.8);
      const isLeftCol = i === 0;
      const isRateCol = i === 2 || i === 4;
      const align: 'left' | 'right' | 'center' = isLeftCol ? 'left' : isRateCol ? 'center' : 'right';
      const tx = align === 'left' ? cx + PAD : align === 'center' ? cx + sumColW[i] / 2 : cx + sumColW[i] - PAD;
      doc.text(val, tx, centerY(y, sumRowH, 6.8), { align });
      cx += sumColW[i];
    });
    y += sumRowH;
  });
  // Total row
  cx = M;
  const totalRowCells = ['Total', fmtMoney(totalTaxable), '', fmtMoney(totalCgst), '', fmtMoney(totalSgst), fmtMoney(totalTax)];
  totalRowCells.forEach((val, i) => {
    rect(doc, cx, y, sumColW[i], sumRowH);
    setText(doc, 7, true);
    const isLeftCol = i === 0;
    const isRateCol = i === 2 || i === 4;
    const align: 'left' | 'right' | 'center' = isLeftCol ? 'left' : isRateCol ? 'center' : 'right';
    const tx = align === 'left' ? cx + PAD : align === 'center' ? cx + sumColW[i] / 2 : cx + sumColW[i] - PAD;
    doc.text(val, tx, centerY(y, sumRowH, 7), { align });
    cx += sumColW[i];
  });
  y += sumRowH;

  // Tax amount in words
  const taxWordsH = 6;
  rect(doc, M, y, CONTENT_W, taxWordsH);
  setText(doc, 7, true);
  doc.text(`Tax Amount (in words) : ${input.taxAmountInWords}`, M + PAD, centerY(y, taxWordsH, 7));
  y += taxWordsH;

  // Company's PAN
  if (input.seller.pan) {
    const panRowH = 5.5;
    rect(doc, M, y, CONTENT_W, panRowH);
    setText(doc, 7, true);
    doc.text(`Company's PAN : ${input.seller.pan}`, M + PAD, centerY(y, panRowH, 7));
    y += panRowH;
  }

  // Declaration + signature
  const declH = 22;
  rect(doc, M, y, CONTENT_W / 2, declH);
  rect(doc, M + CONTENT_W / 2, y, CONTENT_W / 2, declH);
  setText(doc, 6.4);
  doc.text('Declaration', M + PAD, y + 3);
  setText(doc, 7);
  doc.text(
    doc.splitTextToSize(
      'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
      CONTENT_W / 2 - PAD * 2,
    ),
    M + PAD,
    y + 6.5,
  );
  setText(doc, 7.5, true);
  doc.text(`for ${input.seller.name}`, M + CONTENT_W / 2 + PAD, y + 4);
  setText(doc, 7);
  doc.text('Authorised Signatory', M + CONTENT_W - PAD, y + declH - 2, { align: 'right' });
  y += declH;

  // Footer
  if (input.seller.jurisdiction) {
    setText(doc, 7);
    doc.text(`SUBJECT TO ${input.seller.jurisdiction.toUpperCase()} JURISDICTION`, PAGE_W / 2, y + 4, { align: 'center' });
    y += 5;
  }
  setText(doc, 6.5);
  doc.text('This is a Computer Generated Invoice', PAGE_W / 2, y + 4, { align: 'center' });
  y += 5;

  return y;
};

const drawEWayBillPage = async (doc: jsPDF, input: InvoiceRenderInput) => {
  if (!input.ewayBill) return;
  doc.addPage();
  let y = M;
  setText(doc, 11, true);
  doc.text('e-Way Bill', PAGE_W / 2, y + 3, { align: 'center' });
  doc.text('e-Way Bill', PAGE_W - M, y + 3, { align: 'right' });
  y += 8;

  // Header info + QR
  setText(doc, 7.5);
  const labelW = 22;
  const valueX = M + labelW + 2;
  const lbl = (label: string, val: string | null | undefined, ry: number) => {
    doc.text(label, M, ry);
    doc.text(':', M + labelW, ry);
    if (val) doc.text(val, valueX, ry);
  };
  lbl('Doc No.', `Tax Invoice - ${input.meta.invoiceNo}`, y);
  lbl('Date', input.meta.invoiceDate, y + 4);
  if (input.einvoice) {
    lbl('IRN', input.einvoice.irn, y + 9);
    lbl('Ack No.', input.einvoice.ackNo, y + 13);
    lbl('Ack Date', input.einvoice.ackDate, y + 17);
    await renderQrIfPresent(doc, input.einvoice.signedQrPayload, PAGE_W - M - 22, y, 22);
  }
  y += 22;

  const section = (title: string) => {
    rect(doc, M, y, CONTENT_W, 5.5);
    setText(doc, 7.5, true);
    doc.text(title, M + PAD, centerY(y, 5.5, 7.5));
    y += 5.5;
  };

  // Section 1 — e-Way Bill Details (3 columns)
  section('1. e-Way Bill Details');
  const dH = 18;
  rect(doc, M, y, CONTENT_W, dH);
  setText(doc, 7);
  const colA = M + PAD;
  const colB = M + CONTENT_W * 0.4;
  const colC = M + CONTENT_W * 0.72;
  const rowY = [y + 4, y + 9, y + 14];
  const detailLabel = (label: string, value: string | null | undefined, x: number, ry: number) => {
    doc.text(label, x, ry);
    doc.text(':', x + 30, ry);
    if (value) {
      setText(doc, 7, true);
      doc.text(value, x + 32, ry);
      setText(doc, 7);
    }
  };
  detailLabel('e-Way Bill No.', input.ewayBill.ewbNo, colA, rowY[0]);
  detailLabel('Mode', input.ewayBill.mode, colB, rowY[0]);
  detailLabel('Generated Date', input.ewayBill.generatedDate, colC, rowY[0]);
  detailLabel('Generated By', input.seller.gstin, colA, rowY[1]);
  detailLabel('Approx Distance', `${input.ewayBill.approxDistance} KM`, colB, rowY[1]);
  detailLabel('Valid Upto', input.ewayBill.validUpto, colC, rowY[1]);
  detailLabel('Supply Type', input.ewayBill.supplyType, colA, rowY[2]);
  detailLabel('Transaction Type', input.ewayBill.transactionType, colB, rowY[2]);
  y += dH;

  // Section 2 — Address Details (From / To)
  section('2. Address Details');
  const aH = 30;
  rect(doc, M, y, CONTENT_W / 2, aH);
  rect(doc, M + CONTENT_W / 2, y, CONTENT_W / 2, aH);
  setText(doc, 7.5, true);
  doc.text('From', M + PAD, y + 4);
  doc.text('To', M + CONTENT_W / 2 + PAD, y + 4);
  setText(doc, 7);
  doc.text(input.seller.name, M + PAD, y + 8.5);
  if (input.seller.gstin) doc.text(`GSTIN : ${input.seller.gstin}`, M + PAD, y + 12);
  doc.text(input.seller.stateName ?? '', M + PAD, y + 15.5);
  setText(doc, 7, true);
  doc.text('Dispatch From', M + PAD, y + 20);
  setText(doc, 6.6);
  const dfWrap = doc.splitTextToSize(input.ewayBill.dispatchFrom ?? input.seller.addressLines.join(', '), CONTENT_W / 2 - PAD * 2);
  doc.text(dfWrap, M + PAD, y + 23.5);
  doc.text(input.buyer.name, M + CONTENT_W / 2 + PAD, y + 8.5);
  setText(doc, 7);
  if (input.buyer.gstin) doc.text(`GSTIN : ${input.buyer.gstin}`, M + CONTENT_W / 2 + PAD, y + 12);
  doc.text(input.buyer.stateName ?? '', M + CONTENT_W / 2 + PAD, y + 15.5);
  setText(doc, 7, true);
  doc.text('Ship To', M + CONTENT_W / 2 + PAD, y + 20);
  setText(doc, 6.6);
  const stWrap = doc.splitTextToSize(input.ewayBill.shipTo ?? input.buyer.addressLines.join(', '), CONTENT_W / 2 - PAD * 2);
  doc.text(stWrap, M + CONTENT_W / 2 + PAD, y + 23.5);
  y += aH;

  // Section 3 — Goods Details
  section('3. Goods Details');
  const gHeaderH = 6;
  const gColW = [
    CONTENT_W * 0.12,
    CONTENT_W * 0.5,
    CONTENT_W * 0.12,
    CONTENT_W * 0.16,
    CONTENT_W * 0.10,
  ];
  const gHeaders = ['HSN Code', 'Product Name & Desc', 'Quantity', 'Taxable Amt', 'Tax Rate (C+S)'];
  let cx2 = M;
  gHeaders.forEach((h, i) => {
    rect(doc, cx2, y, gColW[i], gHeaderH);
    setText(doc, 6.8, true);
    const align: 'left' | 'right' | 'center' = i >= 2 ? 'right' : 'left';
    const tx = align === 'right' ? cx2 + gColW[i] - PAD : cx2 + PAD;
    doc.text(h, tx, centerY(y, gHeaderH, 6.8), { align });
    cx2 += gColW[i];
  });
  y += gHeaderH;

  const gRowH = 5.5;
  input.items.forEach(it => {
    cx2 = M;
    const cells = [
      it.hsn,
      it.description,
      `${it.quantity} ${it.unit}`,
      fmtMoney(it.amount),
      '9+9',
    ];
    cells.forEach((v, i) => {
      rect(doc, cx2, y, gColW[i], gRowH);
      setText(doc, 6.8);
      const align: 'left' | 'right' | 'center' = i >= 2 ? 'right' : 'left';
      const tx = align === 'right' ? cx2 + gColW[i] - PAD : cx2 + PAD;
      const wrapped = doc.splitTextToSize(v, gColW[i] - PAD * 2);
      doc.text(wrapped, tx, centerY(y, gRowH, 6.8), { align });
      cx2 += gColW[i];
    });
    y += gRowH;
  });

  // Section 4 — Transportation Details
  section('4. Transportation Details');
  const tH = 10;
  rect(doc, M, y, CONTENT_W, tH);
  setText(doc, 7);
  doc.text('Transporter ID', M + PAD, y + 4);
  doc.text(':', M + PAD + 28, y + 4);
  if (input.ewayBill.transporterId) doc.text(input.ewayBill.transporterId, M + PAD + 30, y + 4);
  doc.text('Doc No.', PAGE_W - M - 50, y + 4);
  doc.text(':', PAGE_W - M - 50 + 14, y + 4);
  doc.text('Name', M + PAD, y + 8);
  doc.text(':', M + PAD + 28, y + 8);
  if (input.ewayBill.transporterName) {
    setText(doc, 7, true);
    doc.text(input.ewayBill.transporterName, M + PAD + 30, y + 8);
    setText(doc, 7);
  }
  doc.text('Date', PAGE_W - M - 50, y + 8);
  doc.text(':', PAGE_W - M - 50 + 14, y + 8);
  y += tH;

  // Section 5 — Vehicle Details
  section('5. Vehicle Details');
  const vH = 7;
  rect(doc, M, y, CONTENT_W, vH);
  setText(doc, 7);
  doc.text('Vehicle No.', M + PAD, y + 4.2);
  doc.text(':', M + PAD + 22, y + 4.2);
  if (input.ewayBill.vehicleNo) {
    setText(doc, 7, true);
    doc.text(input.ewayBill.vehicleNo, M + PAD + 24, y + 4.2);
    setText(doc, 7);
  }
  doc.text('From', M + CONTENT_W * 0.45, y + 4.2);
  doc.text(':', M + CONTENT_W * 0.45 + 14, y + 4.2);
  if (input.ewayBill.dispatchFrom) {
    const fromLabel = (input.ewayBill.dispatchFrom.split(',')[0] || '').trim();
    doc.text(fromLabel, M + CONTENT_W * 0.45 + 16, y + 4.2);
  }
  doc.text('CEWB No.', M + CONTENT_W * 0.78, y + 4.2);
  doc.text(':', M + CONTENT_W * 0.78 + 18, y + 4.2);
};

export const renderTaxInvoicePdf = async (input: InvoiceRenderInput): Promise<void> => {
  const JsPDF = await loadJsPdf();
  const doc = new JsPDF({ unit: 'mm', format: 'a4' });
  doc.setLineWidth(0.2);
  doc.setDrawColor(0, 0, 0);

  await drawInvoicePage(doc, input, M);
  await drawEWayBillPage(doc, input);

  doc.save(input.filename ?? `${input.meta.invoiceNo}.pdf`);
};
