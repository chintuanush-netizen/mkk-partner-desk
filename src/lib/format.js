export const DESK = '+91 73308 04558';
export const DESK_WA = '917330804558';
export const PROJECT = 'KGR Fortune Anandam Villas';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dfmt(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}
export function dshort(iso) {
  const p = iso.slice(0, 10).split('-');
  return `${Number(p[2])} ${MON[Number(p[1]) - 1]}`;
}
export function dtfmt(ts) {
  const d = new Date(ts);
  const h = d.getHours();
  return `${d.getDate()} ${MON[d.getMonth()]}, ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
export function todayIST() {
  return new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
}
export const leadCode = (id) => 'KGR-' + String(id).padStart(4, '0');
export const memberNo = (n) => (n ? 'Partner #' + String(n).padStart(3, '0') : '');
export const shortNo = (n) => (n ? '#' + String(n).padStart(3, '0') : '');
export function phoneFmt(l) {
  const p = l.client_phone;
  return `${l.client_cc} ${l.client_cc === '+91' && p.length === 10 ? p.slice(0, 5) + ' ' + p.slice(5) : p}`;
}
export const rupees = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export const rs = (n) => 'Rs. ' + Math.round(n).toLocaleString('en-IN');
export const crore = (n) => (n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : '₹' + (n / 1e5).toFixed(1) + ' L');
export const titleCase = (s) => s.charAt(0) + s.slice(1).toLowerCase();

export function errMsg(e) {
  const m = (e && (e.message || e.error_description)) || 'Something went wrong. Try again.';
  if (/Failed to fetch/i.test(m)) return 'No connection. Check your internet and try again.';
  return m;
}
