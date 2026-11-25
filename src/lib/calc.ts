import type { Calculo, Dados, ItemLevantamento, Num, Serie } from './types';

export const ACUM = 7;

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function acumular(item: ItemLevantamento): Num {
  const v = item.valores.filter(isNum);
  if (item.agregacao === 'Soma') return v.length ? v.reduce((a, b) => a + b, 0) : null;
  if (item.agregacao === 'Último valor') return v.length ? v[v.length - 1] : null;
  return null; // "—": a planilha não calcula acumulado
}

const somaOpc = (xs: Num[]): Num => {
  const v = xs.filter(isNum);
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
};
const dividir = (a: Num, b: Num): Num => (isNum(a) && isNum(b) && b !== 0 ? a / b : null);
const subtrair = (a: Num, b: Num): Num => (isNum(a) && isNum(b) ? a - b : null);

export function param(d: Dados, chave: string): Num {
  const v = d.parametros.find((p) => p.chave === chave)?.valor;
  return isNum(v) ? v : null;
}

/** Réplica das fórmulas das abas 1_Levantamento (coluna Acumulado) e 2_Indicadores. */
export function calcular(d: Dados): Calculo {
  const lev: Record<string, Serie> = {};
  for (const it of d.levantamento) lev[it.id] = [...it.valores.map((v) => (isNum(v) ? v : null)), acumular(it)];

  const taxa = param(d, 'taxaNacional');
  const custo = param(d, 'custoAnual');
  const anos = param(d, 'anosEvitados');

  const ind: Record<string, Serie> = {};
  const colunas = d.meta.anos.length + 1;
  const L = (id: string, c: number): Num => lev[id]?.[c] ?? null;

  for (const m of d.indicadores) ind[m.codigo] = new Array(colunas).fill(null);
  const set = (cod: string, c: number, v: Num) => {
    ind[cod][c] = v;
  };

  for (let c = 0; c < colunas; c++) {
    set('ENT-01', c, L('A01', c));
    set('ENT-02', c, L('A02', c));
    set('ENT-03', c, L('A03', c));
    set('ENT-04', c, somaOpc([L('A04', c), L('A05', c), L('A06', c), L('A07', c)]));
    set('ENT-05', c, L('B01', c));
    set('ENT-06', c, L('B02', c));
    set('ENT-07', c, L('B03', c));
    set('ENT-08', c, L('B05', c));
    set('ENT-09', c, L('B06', c));
    set('ENT-10', c, L('B07', c));
    set('ENT-11', c, L('B08', c));
    set('ENT-12', c, L('F01', c));
    set('ENT-13', c, L('C06', c));

    set('RES-01', c, somaOpc([L('C01', c), L('C02', c), L('C03', c)]));
    set('RES-02', c, dividir(ind['RES-01'][c], ind['ENT-03'][c]));
    const g = dividir(L('C05', c), L('C04', c));
    set('RES-03', c, isNum(g) ? g - 1 : null);
    set('RES-04', c, subtrair(L('E03', c), L('E02', c)));
    set('RES-05', c, subtrair(L('E05', c), L('E04', c)));
    set('RES-06', c, subtrair(L('E07', c), L('E06', c)));

    set('IMP-01', c, dividir(L('D02', c), L('D01', c)));
    set('IMP-02', c, isNum(taxa) ? subtrair(taxa, ind['IMP-01'][c]) : null);
    set('IMP-03', c, subtrair(L('D01', c), L('D02', c)));
    const d01 = L('D01', c);
    set('IMP-04', c, isNum(d01) && isNum(taxa) ? subtrair(d01 * taxa, L('D02', c)) : null);
    const i4 = ind['IMP-04'][c];
    set('IMP-05', c, isNum(i4) && isNum(custo) && isNum(anos) ? i4 * custo * anos : null);
    set('IMP-06', c, dividir(ind['IMP-05'][c], L('F04', c)));
  }
  return { lev, ind };
}

/** Valor "calculado pela base" de uma linha da conciliação. */
export function valorConciliacao(d: Dados, calc: Calculo, ref: { tipo: string; ref: string; col: string | null }): Num {
  if (ref.tipo === 'param') return param(d, ref.ref);
  const serie = (ref.tipo === 'ind' ? calc.ind : calc.lev)[ref.ref];
  if (!serie) return null;
  const idx = ref.col === 'acum' ? ACUM : d.meta.anos.findIndex((a) => a === ref.col);
  return idx >= 0 ? serie[idx] : null;
}

export function valorRef(d: Dados, r: { valor?: Num; param?: string }): Num {
  if (r.param) return param(d, r.param);
  return r.valor ?? null;
}
