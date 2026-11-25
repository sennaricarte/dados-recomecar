import baseJson from '../data/indicadores.json';
import { calcular } from './calc';
import type { Calculo, Dados, Num } from './types';

export const BASE = baseJson as unknown as Dados;
export const EDITAVEL = import.meta.env.PUBLIC_EDITAVEL !== 'false';
const CHAVE = 'recomecar-indicadores:v1';

type Valor = Num | string;
type Overrides = Record<string, Valor>;

const CAMPOS_LEV = ['fonte', 'responsavel', 'status', 'definicao', 'obs'] as const;
const CAMPOS_BASE = ['responsavel', 'status', 'atualizacao'] as const;
const USOS = ['site', 'relatorio', 'isps', 'governo'] as const;
const CAMPOS_CONC = ['oficial', 'decisao', 'obs'] as const;

/** Achata todos os campos editáveis em chaves "tipo:id:campo". */
export function achatar(d: Dados): Overrides {
  const o: Overrides = {};
  for (const it of d.levantamento) {
    it.valores.forEach((v, i) => (o[`v:${it.id}:${i}`] = v ?? null));
    for (const c of CAMPOS_LEV) o[`l:${it.id}:${c}`] = it[c] ?? null;
  }
  for (const p of d.parametros) o[`p:${p.chave}`] = p.valor ?? null;
  for (const b of d.base) {
    for (const c of CAMPOS_BASE) o[`b:${b.codigo}:${c}`] = b[c] ?? null;
    for (const u of USOS) o[`b:${b.codigo}:uso:${u}`] = b.usos[u] ?? null;
  }
  for (const c of d.conciliacao) for (const k of CAMPOS_CONC) o[`c:${c.n}:${k}`] = c[k] ?? null;
  return o;
}

function escrever(d: Dados, chave: string, valor: Valor) {
  const [t, a, b, c] = chave.split(':');
  if (t === 'v') d.levantamento.find((x) => x.id === a)!.valores[Number(b)] = valor as Num;
  else if (t === 'l') (d.levantamento.find((x) => x.id === a) as any)[b] = valor;
  else if (t === 'p') d.parametros.find((x) => x.chave === a)!.valor = valor as Num;
  else if (t === 'b') {
    const it = d.base.find((x) => x.codigo === a)!;
    if (b === 'uso') (it.usos as any)[c] = valor;
    else (it as any)[b] = valor;
  } else if (t === 'c') (d.conciliacao.find((x) => x.n === Number(a)) as any)[b] = valor;
}

const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const baseFlat = achatar(BASE);

export function aplicar(overrides: Overrides): Dados {
  const d = clone(BASE);
  for (const [k, v] of Object.entries(overrides)) if (k in baseFlat) escrever(d, k, v);
  return d;
}

function ler(): Overrides {
  if (!EDITAVEL) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Overrides;
    // descarta o que já foi incorporado ao JSON publicado
    return Object.fromEntries(Object.entries(raw).filter(([k, v]) => k in baseFlat && v !== baseFlat[k]));
  } catch {
    return {};
  }
}

let overrides: Overrides = ler();
let dados: Dados = aplicar(overrides);
let calc: Calculo = calcular(dados);
let flat: Overrides = achatar(dados);
const ouvintes = new Set<() => void>();

function recalcular() {
  dados = aplicar(overrides);
  calc = calcular(dados);
  flat = achatar(dados);
  ouvintes.forEach((f) => f());
}
function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(overrides));
  } catch {
    /* modo privado / cota: segue em memória */
  }
}

export const getDados = () => dados;
export const getCalc = () => calc;
export const nEdicoes = () => Object.keys(overrides).length;
export const foiEditado = (chave: string) => chave in overrides;
export const valorAtual = (chave: string) => flat[chave];
export const valorBase = (chave: string) => baseFlat[chave];
export const onChange = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};

export function definir(chave: string, valor: Valor) {
  if (!EDITAVEL) return;
  const v = valor === '' ? null : valor;
  if (v === baseFlat[chave]) delete overrides[chave];
  else overrides[chave] = v;
  salvar();
  recalcular();
}

export function restaurar(chave?: string) {
  if (chave) delete overrides[chave];
  else overrides = {};
  salvar();
  recalcular();
}

export function exportarJSON(): string {
  return JSON.stringify(dados, null, 1);
}

export function importarJSON(texto: string): number {
  const novo = JSON.parse(texto) as Dados;
  if (!Array.isArray(novo.levantamento) || !Array.isArray(novo.parametros)) throw new Error('Arquivo fora do formato esperado.');
  const flat = achatar(novo);
  const o: Overrides = {};
  for (const [k, v] of Object.entries(flat)) if (k in baseFlat && v !== baseFlat[k]) o[k] = v;
  overrides = o;
  salvar();
  recalcular();
  return Object.keys(o).length;
}

window.addEventListener?.('storage', (e) => {
  if (e.key === CHAVE) {
    overrides = ler();
    recalcular();
  }
});
