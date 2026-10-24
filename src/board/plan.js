// Villa centres on the master layout image (1380 × 1152 px), checked against the plan.
export const PLAN_W = 1380;
export const PLAN_H = 1152;
export const PT = {
  15: [176, 629], 17: [176, 678], 26: [215, 825], 27: [215, 801], 33: [215, 654], 35: [215, 604], 45: [274, 825], 46: [274, 850],
  59: [280, 542], 87: [411, 604], 116: [120, 376], 140: [215, 178], 141: [274, 178], 142: [274, 202], 143: [274, 227], 145: [274, 276],
  146: [274, 301], 152: [312, 276], 173: [472, 178], 174: [472, 201], 186: [511, 422], 194: [511, 227], 195: [511, 201], 198: [704, 289],
  208: [751, 276], 211: [801, 340], 226: [879, 439], 236: [983, 428], 237: [978, 452], 240: [958, 524], 242: [947, 570], 244: [990, 557],
  245: [995, 534], 246: [1001, 511], 248: [1014, 462], 252: [1039, 366], 254: [1090, 413], 256: [1077, 460], 260: [1054, 554],
};

export const LABEL = { available: 'Available', hold: 'On hold', booked: 'Booked' };
export const asset = (name) => `${import.meta.env.BASE_URL}assets/${name}`;

export function costLines(v, st) {
  const rate = Number(st.rate) || 0;
  const base = rate * v.sft;
  const lines = [{ label: 'Base price', sub: `${v.sft.toLocaleString('en-IN')} sft × ₹${rate.toLocaleString('en-IN')} per sft`, amt: base }];
  (st.charges || []).forEach((c) => {
    const a = Number(c.amount) || 0;
    const amt = c.kind === 'persft' ? a * v.sft : c.kind === 'pct' ? (base * a) / 100 : a;
    const sub = c.kind === 'persft' ? `${v.sft.toLocaleString('en-IN')} sft × ₹${a.toLocaleString('en-IN')}` : c.kind === 'pct' ? `${a}% of base price` : '';
    lines.push({ label: c.label || 'Charge', sub, amt });
  });
  return { lines, total: lines.reduce((t, l) => t + l.amt, 0) };
}
