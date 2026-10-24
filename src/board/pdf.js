import { jsPDF } from 'jspdf';
import { DESK, dshort, rs, titleCase, todayIST } from '../lib/format.js';
import { PLAN_H, PLAN_W, asset, costLines } from './plan.js';

function imgData(src) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      c.getContext('2d').drawImage(im, 0, 0);
      res(c.toDataURL('image/jpeg', 0.88));
    };
    im.onerror = () => res(null);
    im.src = src;
  });
}

function header(doc, title, w) {
  doc.setFillColor(23, 17, 13); doc.rect(0, 0, w, 26, 'F');
  doc.setTextColor(214, 178, 112); doc.setFont('times', 'normal'); doc.setFontSize(16); doc.text('ANANDAM VILLAS', 14, 12);
  doc.setFontSize(9); doc.setTextColor(243, 234, 217); doc.setFont('helvetica', 'normal');
  doc.text('by KGR Fortune  ·  Sales mandate: Milke Khareedo  ·  Technology: Leadnest', 14, 19);
  doc.setTextColor(214, 178, 112); doc.text(title.toUpperCase(), w - 14, 12, { align: 'right' });
}

export function costSheetPdf(v, settings) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = 210; let y = 40;
  const c = costLines(v, settings);
  header(doc, 'Cost sheet', w);
  doc.setTextColor(30, 24, 20); doc.setFont('times', 'normal'); doc.setFontSize(30); doc.text(`Villa ${v.no}`, 14, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(110, 100, 90);
  doc.text(`${titleCase(v.facing)} facing  ·  Plot ${v.plot} sq yd  ·  Built-up ${v.sft.toLocaleString('en-IN')} sft  ·  Phase 1`, 14, y + 14);
  y += 28;
  c.lines.forEach((l) => {
    doc.setTextColor(30, 24, 20); doc.setFontSize(11); doc.text(l.label, 14, y); doc.text(rs(l.amt), w - 14, y, { align: 'right' });
    if (l.sub) { doc.setFontSize(8.5); doc.setTextColor(130, 120, 110); doc.text(l.sub.replace(/₹/g, 'Rs. '), 14, y + 5); }
    y += 12; doc.setLineWidth(0.1); doc.setDrawColor(220, 210, 190); doc.line(14, y - 5, w - 14, y - 5);
  });
  doc.setDrawColor(169, 129, 63); doc.setLineWidth(0.5); doc.line(14, y - 3, w - 14, y - 3);
  doc.setFontSize(12); doc.setTextColor(30, 24, 20); doc.text('TOTAL', 14, y + 5);
  doc.setFont('times', 'bold'); doc.setFontSize(16); doc.text(rs(c.total), w - 14, y + 5, { align: 'right' });
  y += 18; doc.setFont('helvetica', 'normal');
  if (settings.note) { const nl = doc.splitTextToSize(settings.note, w - 28); doc.setFontSize(10); doc.setTextColor(60, 50, 40); doc.text(nl, 14, y); y += 8 + 6 * nl.length; }
  doc.setFontSize(8.5); doc.setTextColor(130, 120, 110);
  doc.text(doc.splitTextToSize(`Indicative cost as of ${dshort(todayIST())}. Final cost sheet, taxes and payment schedule are confirmed by the sales desk at booking. Partner desk: ${DESK}`, w - 28), 14, y);
  doc.save(`Anandam-Villa-${v.no}-cost-sheet.pdf`);
}

export async function partnerPackPdf(villas, statusOf, holdOf) {
  const [A, B, L] = await Promise.all([imgData(asset('elevation-a.jpg')), imgData(asset('elevation-b.jpg')), imgData(asset('layout.jpg'))]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const w = 297; const h = 210;
  doc.setFillColor(23, 17, 13); doc.rect(0, 0, w, h, 'F');
  if (A) doc.addImage(A, 'JPEG', w - 150, 0, 150, 120);
  doc.setFillColor(23, 17, 13); doc.rect(0, 120, w, 90, 'F');
  doc.setTextColor(214, 178, 112); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text('PHASE 1 LAUNCH  ·  CHANNEL PARTNER PACK', 16, 40);
  doc.setTextColor(243, 234, 217); doc.setFont('times', 'normal'); doc.setFontSize(40); doc.text('ANANDAM', 16, 62); doc.text('VILLAS', 16, 80);
  doc.setFont('times', 'italic'); doc.setFontSize(18); doc.setTextColor(214, 178, 112); doc.text('by KGR Fortune', 16, 94);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(179, 164, 143);
  doc.text('Sales mandate: Milke Khareedo  ·  Technology partner: Leadnest', 16, 150);
  doc.text(`Partner desk: ${DESK}`, 16, 158); doc.text('Live availability: milkekhareedo.in/partners/inventory', 16, 166);
  [[A, 'Elevation A'], [B, 'Elevation B']].forEach(([img, label]) => {
    if (!img) return;
    doc.addPage(); doc.setFillColor(23, 17, 13); doc.rect(0, 0, w, h, 'F');
    doc.addImage(img, 'JPEG', (w - 220) / 2, 14, 220, 175.5);
    doc.setTextColor(214, 178, 112); doc.setFontSize(9); doc.text(`${label.toUpperCase()}  ·  ARTIST'S IMPRESSION`, (w - 220) / 2, 198);
  });
  if (L) { doc.addPage(); header(doc, 'Master layout', w); const lw = ((h - 36) * PLAN_W) / PLAN_H; doc.addImage(L, 'JPEG', (w - lw) / 2, 30, lw, h - 36); }
  doc.addPage(); header(doc, `Phase 1 availability · ${dshort(todayIST())}`, w);
  const base = [14, 42, 72, 108, 146]; let cols = base.slice(); let y = 38; let col = 0;
  const th = () => { doc.setFontSize(8); doc.setTextColor(130, 120, 110); ['VILLA', 'FACING', 'PLOT (SQ YD)', 'BUILT-UP (SFT)', 'STATUS'].forEach((t, i) => doc.text(t, cols[i], y)); y += 6; };
  th();
  villas.filter((v) => statusOf(v) !== 'booked').forEach((v) => {
    if (y > 196) { col += 1; y = 38; if (col > 1) { doc.addPage(); header(doc, 'Phase 1 availability', w); col = 0; } cols = base.map((x) => x + col * 142); th(); }
    doc.setFontSize(10); doc.setTextColor(30, 24, 20);
    doc.text(String(v.no), cols[0], y); doc.text(titleCase(v.facing), cols[1], y); doc.text(String(v.plot), cols[2], y); doc.text(v.sft.toLocaleString('en-IN'), cols[3], y);
    const hu = holdOf(v);
    doc.text(statusOf(v) === 'hold' ? `On hold${hu ? ' till ' + dshort(hu) : ''}` : 'Available', cols[4], y);
    y += 6.2;
  });
  doc.save('Anandam-Villas-Phase-1-partner-pack.pdf');
}
