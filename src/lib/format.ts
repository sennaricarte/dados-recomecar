import type { Num } from './types';

const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const dec1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dec2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const ehPercentual = (u: string | null) => u === '%' || u === 'p.p.';

export function formatar(v: Num | undefined, unidade: string | null = ''): string {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  switch (unidade) {
    case '%':
      return `${dec1.format(v * 100)}%`;
    case 'p.p.':
      return `${dec1.format(v * 100)} p.p.`;
    case 'R$':
    case 'R$/ano':
    case 'R$/mês':
      return brl.format(v);
    case 'R$ por R$ 1':
      return `R$ ${dec1.format(v)}`;
    case 'nota 1–5':
    case 'variação (pontos)':
      return dec2.format(v);
    default:
      return Number.isInteger(v) ? int.format(v) : dec2.format(v);
  }
}

/** Compacto para cartões e eixos (13,3 mil). */
export function compacto(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${dec1.format(v / 1_000_000)} mi`;
  if (a >= 10_000) return `${dec1.format(v / 1_000)} mil`;
  return int.format(v);
}

/** Valor mostrado dentro de um <input>: percentuais aparecem como 75,9 (e guardam 0,759). */
export function paraInput(v: Num, unidade: string | null): string {
  if (v === null || v === undefined) return '';
  const x = ehPercentual(unidade) ? Math.round(v * 100_000) / 1000 : v;
  return String(x).replace('.', ',');
}

export function deInput(txt: string, unidade: string | null): Num {
  const t = txt.trim().replace(/\s/g, '').replace('R$', '').replace('%', '');
  if (t === '') return null;
  // 1.234,56 -> 1234.56 ; 1234,56 -> 1234.56 ; 12.5 -> 12.5
  const norm = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  const n = Number(norm);
  if (!Number.isFinite(n)) return undefined as unknown as Num;
  return ehPercentual(unidade) ? Math.round(n * 1000) / 100_000 : n;
}

export const esc = (s: string | null | undefined) =>
  (s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
