import { EDITAVEL, exportarJSON, importarJSON, nEdicoes, onChange, restaurar, getDados, getCalc } from './store';
import { esc, formatar } from './format';

export function baixar(nome: string, conteudo: string, tipo = 'application/json') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nome });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCel = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function exportarCSV() {
  const d = getDados();
  const c = getCalc();
  const cab = ['Código', 'Tipo', 'ODS', 'Indicador', 'Unidade', ...d.meta.anos, 'Acumulado'];
  const linhas = d.indicadores.map((m) => [
    m.codigo, m.tipo, m.ods, m.nome, m.unidade,
    ...c.ind[m.codigo].map((v) => (v === null ? '' : String(v).replace('.', ','))),
  ]);
  // BOM para o Excel abrir acentos corretamente
  baixar('indicadores-recomecar.csv', '﻿' + [cab, ...linhas].map((l) => l.map((x) => csvCel(String(x))).join(';')).join('\n'), 'text/csv');
}

/** Barra de ferramentas global (ligada em Base.astro). */
export function iniciarBarra() {
  const badge = document.getElementById('badge-edicoes');
  const atualizar = () => {
    if (!badge) return;
    const n = nEdicoes();
    badge.textContent = n ? `${n} edição(ões) local(is)` : 'dados publicados';
    badge.dataset.sujo = n ? '1' : '0';
  };
  onChange(atualizar);
  atualizar();

  document.getElementById('btn-json')?.addEventListener('click', () => baixar('indicadores.json', exportarJSON()));
  document.getElementById('btn-csv')?.addEventListener('click', exportarCSV);
  const input = document.getElementById('arq-import') as HTMLInputElement | null;
  document.getElementById('btn-import')?.addEventListener('click', () => input?.click());
  input?.addEventListener('change', async () => {
    const f = input.files?.[0];
    if (!f) return;
    try {
      const n = importarJSON(await f.text());
      alert(`Importado: ${n} valor(es) diferem dos dados publicados.`);
    } catch (e) {
      alert('Não foi possível importar: ' + (e as Error).message);
    }
    input.value = '';
  });
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (nEdicoes() && confirm('Descartar todas as edições locais e voltar aos dados publicados?')) restaurar();
  });
  if (!EDITAVEL) document.querySelectorAll('[data-so-edicao]').forEach((el) => el.remove());
}

export { esc, formatar };

import { definir, foiEditado, valorAtual, valorBase } from './store';
import { deInput, paraInput } from './format';

/**
 * Liga <input|select|textarea data-key="..."> ao store.
 * data-unidade="%"  -> converte 75,9 <-> 0,759 ;  data-num  -> campo numérico.
 * Setas ↑/↓/Enter movem entre linhas na mesma coluna (data-col).
 */
export function vincular(raiz: HTMLElement) {
  const campos = () => Array.from(raiz.querySelectorAll<HTMLInputElement>('[data-key]'));

  const pintar = () => {
    for (const el of campos()) {
      const k = el.dataset.key!;
      const v = valorAtual(k);
      if (document.activeElement !== el) {
        el.value = el.dataset.num !== undefined ? paraInput(v as number | null, el.dataset.unidade ?? '') : ((v as string | null) ?? '');
      }
      el.classList.toggle('editado', foiEditado(k));
      if (foiEditado(k)) {
        const b = valorBase(k);
        el.title = `Valor publicado: ${b === null || b === undefined ? '(vazio)' : b}`;
      } else el.removeAttribute('title');
    }
  };

  raiz.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    const k = el?.dataset?.key;
    if (!k) return;
    if (el.dataset.num !== undefined) {
      const n = deInput(el.value, el.dataset.unidade ?? '');
      if (n === undefined) {
        el.classList.add('invalido');
        setTimeout(() => {
          el.classList.remove('invalido');
          el.value = paraInput(valorAtual(k) as number | null, el.dataset.unidade ?? '');
        }, 900);
        return;
      }
      definir(k, n);
    } else definir(k, el.value);
  });

  raiz.addEventListener('keydown', (e) => {
    const el = e.target as HTMLInputElement;
    if (!el?.dataset?.col || !['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
    if (el.tagName === 'TEXTAREA' && e.key === 'Enter') return;
    e.preventDefault();
    const mesmas = Array.from(raiz.querySelectorAll<HTMLInputElement>(`[data-col="${el.dataset.col}"]`));
    const i = mesmas.indexOf(el) + (e.key === 'ArrowUp' ? -1 : 1);
    mesmas[i]?.focus();
    mesmas[i]?.select?.();
  });

  onChange(pintar);
  pintar();
  return pintar;
}
