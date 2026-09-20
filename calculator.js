import { atomicWeight } from './elements.js';
export function number(text) {
  const value = String(text).trim().replace(/,/g, '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) return NaN;
  return Number(value);
}
export function calculate(state) {
  const fail = error => ({error, masses: [], total: null});
  if (!state.components.length) return fail('「行を追加」から元素を追加してください。');
  const mass = number(state.fixedMassText);
  if (!Number.isFinite(mass) || mass <= 0) return fail('基準質量に0より大きい数値を入力してください。');
  const ref = state.components.find(c => c.id === state.fixedId);
  if (!ref || !atomicWeight[ref.element]) return fail('基準元素を選択してください。');
  const rRef = number(ref.ratioText);
  if (!Number.isFinite(rRef) || rRef <= 0) return fail('基準元素のモル比に0より大きい数値を入力してください。');
  const masses = [];
  for (const c of state.components) {
    const r = number(c.ratioText);
    if (!Number.isFinite(r) || r < 0 || !atomicWeight[c.element]) return fail('各元素のモル比に0以上の数値を入力してください。');
    const m = (r / rRef) * (mass / atomicWeight[ref.element]) * atomicWeight[c.element];
    if (!Number.isFinite(m) || (r > 0 && m === 0)) return fail('数値が計算可能な範囲を超えています。');
    masses.push(m);
  }
  const total = masses.reduce((a,b) => a+b, 0);
  if (!Number.isFinite(total)) return fail('合計が計算可能な範囲を超えています。');
  return {error: '', masses, total};
}
export function removeComponent(state, id) {
  const components = state.components.filter(c => c.id !== id);
  return {...state, components, fixedId: components.some(c => c.id === state.fixedId) ? state.fixedId : (components[0]?.id ?? '')};
}
export const formatMass = value => value == null ? '—' : `${value.toFixed(5)} g`;
