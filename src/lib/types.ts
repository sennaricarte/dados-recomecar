export type Num = number | null;

export interface Parametro {
  chave: string;
  rotulo: string;
  valor: Num;
  unidade: string | null;
  nota: string | null;
}

export interface ItemLevantamento {
  id: string;
  grupo: string;
  dado: string;
  unidade: string;
  agregacao: string;
  valores: Num[]; // 7 anos: Até 2020 … 2026
  fonte: string | null;
  responsavel: string | null;
  status: string;
  definicao: string | null;
  obs: string | null;
  formulas?: Record<string, string>;
}

export interface MetaIndicador {
  codigo: string;
  tipo: 'Entrega' | 'Resultado' | 'Impacto';
  ods: string;
  nome: string;
  unidade: string;
  como: string;
}

export interface ItemBase {
  codigo: string;
  responsavel: string | null;
  status: string;
  atualizacao: string | null;
  usos: { site: string | null; relatorio: string | null; isps: string | null; governo: string | null };
}

export interface ItemConciliacao {
  n: number;
  numero: string;
  narrativa: { valor?: Num; param?: string };
  instrucoes: { valor?: Num; param?: string };
  calculado: { tipo: 'ind' | 'lev' | 'param'; ref: string; col: string | null };
  oficial: Num;
  decisao: string | null;
  obs: string | null;
}

export interface Dados {
  meta: { titulo: string; anos: string[]; parcial: string; geradoDe: string };
  leiaMe: { titulo: string; texto: string }[];
  parametros: Parametro[];
  listas: { statusLevantamento: string[]; statusValidacao: string[]; uso: string[] };
  levantamento: ItemLevantamento[];
  indicadores: MetaIndicador[];
  base: ItemBase[];
  conciliacao: ItemConciliacao[];
}

/** 7 anos + acumulado (índice 7) */
export type Serie = Num[];
export interface Calculo {
  lev: Record<string, Serie>;
  ind: Record<string, Serie>;
}
