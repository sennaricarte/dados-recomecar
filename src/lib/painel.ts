/* Painel no layout da analista de dados: mesma navegação, filtro de ano, cartões e visuais SVG.
   Os números vêm do store (src/data/indicadores.json + edições locais), não de valores fixos. */
import { getCalc, getDados, onChange } from './store';
import { param } from './calc';

type Cfg = any;
const num = (v: number | null | undefined) => v ?? 0;
const WINE = '#7b2a35', YEL = '#f9b91b', GRY = 'var(--g)';
/** cor do texto sobre uma cor de fundo (o cinza muda de claro/escuro conforme o tema) */
const tx = (c: string) => (c === YEL ? '#222' : c === GRY ? 'var(--on-g)' : '#fff');

/** Teto "redondo" para o eixo, para que o gráfico acompanhe números editados. */
function teto(v: number) {
  const x = Math.max(v, 1) * 1.04, e = 10 ** Math.floor(Math.log10(x));
  const m = [1, 1.2, 1.4, 1.5, 1.6, 2, 2.4, 2.5, 3, 3.2, 4, 5, 6, 8, 10].find((c) => c * e >= x)!;
  return m * e;
}

/** Dica flutuante ao passar o mouse (ou tocar). `tp` fica dentro do .fig. */
function dica(el: HTMLElement, e: PointerEvent, html: string) {
  const tp = el.querySelector('.tip') as HTMLElement; if (!tp) return;
  const r = el.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  tp.innerHTML = html; tp.hidden = false;
  const w = tp.offsetWidth, h = tp.offsetHeight;
  tp.style.left = (x + 16 + w > r.width ? Math.max(4, x - 16 - w) : x + 16) + 'px';
  tp.style.top = Math.max(4, Math.min(y - h / 2, r.height - h - 4)) + 'px';
}
const esconder = (el: HTMLElement) => { const t = el.querySelector('.tip') as HTMLElement | null; if (t) t.hidden = true; };
const linha = (c: string, nome: string, v: string) => `<div class="tr"><i style="background:${c}"></i>${nome}: <b>${v}</b></div>`;

export function iniciarPainel() {
  const $ = (id: string) => document.getElementById(id)!;
  const Y = getDados().meta.anos;
  const N = Y.length, ULT = N - 1;

  let D: Record<string, number[]> = {};
  const montarD = () => {
    const { lev, ind } = getCalc();
    const l = (id: string) => lev[id].slice(0, N).map(num);
    const pct = (id: string) => lev[id].slice(0, N).map((v) => Math.round(num(v) * 1000) / 10);
    D = {
      cad: ind['ENT-14'].slice(0, N).map(num), egr: l('A01'), soc: l('A02'), dev: l('A03'), mat: l('B01'), con: l('B02'),
      clt: l('C01'), pj: l('C02'), emp: l('C03'), par: l('F02'), contr: l('C06'), hist: l('C08'),
      ree: l('A04'), fam: l('A05'), lid: l('A07'), hom: pct('G01'), pp: pct('G02'), fi: pct('G03'),
    };
    D.ren = D.clt.map((v, i) => v + D.pj[i] + D.emp[i]);
    D.out = D.pj.map((v, i) => v + D.emp[i]);
  };

  let P = 'all';
  const fmt = (n: number) => Math.round(n).toLocaleString('pt-BR');
  const pc = (v: number) => v.toFixed(1).replace('.', ',') + '%';
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const I = () => (P === 'all' ? null : +P);
  const val = (k: string) => (I() === null ? sum(D[k]) : D[k][I()!]);
  const last = (k: string) => D[k][I() === null ? ULT : I()!];
  const razao = (a: number, b: number) => (b ? pc((100 * a) / b) : '—');

  const pages: [string, string][] = [['geral', 'Visão geral'], ['trilha', 'Trilha do egresso'], ['qualif', 'Qualificação'], ['emprego', 'Empregabilidade'], ['empresas', 'Empresas'], ['perfil', 'Perfil dos egressos'], ['publico', 'Outros públicos atendidos'], ['reinc', 'Reincidência']];
  $('nav').innerHTML = pages.map(([id, t]) => `<a href="#${id}" data-id="${id}">${t}</a>`).join('');
  $('seg').innerHTML = ([['all', 'Todos']] as string[][]).concat(Y.map((y, i) => [String(i), i === 0 ? '≤ 2020' : i === ULT ? y + '*' : y]))
    .map(([v, t]) => `<button data-p="${v}" class="${v === 'all' ? 'all' : ''}" aria-pressed="${v === 'all'}">${t}</button>`).join('');

  const leg = (id: string, it: string[][]) => { $(id).innerHTML = it.map(([t, c]) => `<span><i style="background:${c}"></i>${t}</span>`).join(''); };
  leg('l1', [['Egressos cadastrados', WINE], ['Desenvolvidos', YEL]]);
  leg('l3', [['Egressos cadastrados', WINE], ['Socializados', YEL], ['Desenvolvidos', GRY]]);
  leg('l5', [['Matriculados', WINE], ['Concluídas', YEL]]);
  leg('l8', [['Empresas com parceria ativa no ano', WINE], ['Empresas que contrataram no ano', YEL], ['Total de empresas que já contrataram', GRY]]);
  leg('l11', [['Homens', WINE], ['Pretos e pardos', YEL], ['Ensino fundamental incompleto', GRY]]);
  leg('l9', [['Reeducandos', WINE], ['Familiares', YEL], ['Líderes formados', GRY]]);

  function dl(k: string) {
    const i = I(); if (i === null || i === 0 || i === ULT) return '';
    const a = D[k][i], b = D[k][i - 1]; if (!b) return '';
    const d = (100 * (a - b)) / b;
    return `<div class="d ${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲' : '▼'} ${pc(Math.abs(d))} vs ${Y[i - 1]}</div>`;
  }
  const card = (t: string, v: string, k?: string | null, nota?: string) => `<div class="card"><div class="t">${t}</div><div class="v">${v}</div>${k ? dl(k) : ''}${nota ? `<div class="n">${nota}</div>` : ''}</div>`;

  function cols(el: HTMLElement, o: Cfg) {
    return () => {
      const Wd = el.clientWidth, H = el.clientHeight; if (!Wd) return;
      const sh = Wd < 480, m = { l: sh ? 36 : 46, r: 8, t: 14, b: 26 }, gw = (Wd - m.l - m.r) / N;
      const X = (i: number) => m.l + gw * i + gw / 2, Yv = (v: number) => H - m.b - ((H - m.t - m.b) * v) / o.max;
      let s = '';
      for (let k = 0; k <= 4; k++) {
        const v = (o.max * k) / 4, y = Yv(v);
        s += `<line x1="${m.l}" x2="${Wd - m.r}" y1="${y}" y2="${y}" stroke="var(--line)"/><text x="${m.l - 6}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--mut)">${o.p ? Math.round(v) + '%' : fmt(v)}</text>`;
      }
      Y.forEach((t, i) => {
        const on = I() === null || I() === i, op = on ? 1 : 0.3;
        s += `<text x="${X(i)}" y="${H - m.b + 17}" text-anchor="middle" font-size="11" font-weight="${I() === i ? 800 : 500}" fill="var(--mut)">${sh ? t.replace('Até ', '≤') : t}${i === ULT ? '*' : ''}</text>`;
        if (o.bars) {
          const n = o.bars.length, bw = o.stack ? gw * 0.55 : Math.min(26, (gw * 0.78) / n); let acc = 0;
          o.bars.forEach(([a, c]: [number[], string, string], j: number) => {
            const h = ((H - m.t - m.b) * a[i]) / o.max;
            if (o.stack) { acc += h; if (h > 0) s += `<rect x="${X(i) - bw / 2}" y="${H - m.b - acc}" width="${bw}" height="${h}" fill="${c}" opacity="${op}"/>`; }
            else s += `<rect x="${X(i) - (bw * n + 3 * (n - 1)) / 2 + j * (bw + 3)}" y="${H - m.b - h}" width="${bw}" height="${h}" rx="2" fill="${c}" opacity="${op}"/>`;
          });
        }
      });
      (o.lines || []).forEach(([a, c, , soUlt]: [number[], string, string, boolean?]) => {
        s += `<polyline fill="none" stroke="${c}" stroke-width="3" points="${a.map((v, i) => X(i) + ',' + Yv(v)).join(' ')}"/>`;
        a.forEach((v, i) => {
          const on = I() === i; s += `<circle cx="${X(i)}" cy="${Yv(v)}" r="${on ? 6 : 4}" fill="${c}"/>`;
          if (on || (I() === null && !sh && o.lab && (!soUlt || i === N - 1))) s += `<text x="${X(i)}" y="${Yv(v) - 10}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--ink)">${o.p ? pc(v) : fmt(v)}</text>`;
        });
      });
      const band = `<rect class="band" y="${m.t}" height="${H - m.t - m.b}" width="${gw}" fill="var(--ink)" opacity=".07" visibility="hidden"/>`;
      el.innerHTML = `<svg>${band}${s}</svg><div class="tip" hidden></div>`;
      const bd = el.querySelector('.band')!, fmtv = (v: number) => (o.p ? pc(v) : fmt(v));
      const series: [number[], string, string][] = [...(o.bars || []), ...(o.lines || [])];
      const hide = () => { esconder(el); bd.setAttribute('visibility', 'hidden'); };
      const move = (e: PointerEvent) => {
        const x = e.clientX - el.getBoundingClientRect().left, i = Math.floor((x - m.l) / gw);
        if (i < 0 || i >= N) return hide();
        bd.setAttribute('x', String(m.l + gw * i)); bd.setAttribute('visibility', 'visible');
        let h = `<div class="th">${Y[i]}${i === ULT ? ' (parcial)' : ''}</div>` + series.map(([a, c, nm]) => linha(c, nm, fmtv(a[i]))).join('');
        if (o.stack) h += `<div class="tr tot">Total: <b>${fmt(series.reduce((t, [a]) => t + a[i], 0))}</b></div>`;
        dica(el, e, h);
      };
      el.onpointermove = move; el.onpointerdown = move; el.onpointerleave = hide;
    };
  }

  function donut(el: HTMLElement) {
    return () => {
      if (!el.clientWidth) return;
      const parts: [string, number, string][] = [['CLT', val('clt'), WINE], ['PJ/MEI/cooperado/freelancer', val('pj'), YEL], ['Empreendedores', val('emp'), GRY]], tot = sum(parts.map((p) => p[1]));
      const cx = 100, cy = 100, r = 96, ri = 58;
      let a0 = -Math.PI / 2, s = '';
      parts.forEach(([, v, c], pi) => {
        if (!v) return;
        const full = v >= tot, a1 = a0 + (2 * Math.PI * v) / tot - (full ? 1e-4 : 1e-6), lg = a1 - a0 > Math.PI ? 1 : 0, p = (a: number, q: number) => [cx + q * Math.cos(a), cy + q * Math.sin(a)];
        const [x1, y1] = p(a0, r), [x2, y2] = p(a1, r), [x3, y3] = p(a1, ri), [x4, y4] = p(a0, ri);
        s += `<path d="M${x1} ${y1}A${r} ${r} 0 ${lg} 1 ${x2} ${y2}L${x3} ${y3}A${ri} ${ri} 0 ${lg} 0 ${x4} ${y4}Z" fill="${c}" data-i="${pi}"/>`; a0 = a1 + 1e-6;
      });
      s += `<text x="${cx}" y="${cy + 2}" text-anchor="middle" font-size="26" font-weight="800" fill="var(--ink)">${fmt(tot)}</text><text x="${cx}" y="${cy + 20}" text-anchor="middle" font-size="10" fill="var(--mut)">pessoas</text>`;
      const leg = parts.map(([t, v, c]) => `<li><i style="background:${c}"></i><span>${t}</span><b>${tot ? pc((100 * v) / tot) : '—'}</b><small>${fmt(v)} pessoas</small></li>`).join('');
      el.innerHTML = `<div class="dn"><svg viewBox="0 0 200 200" role="img" aria-label="Geração de renda por vínculo">${s}</svg><ul class="dleg">${leg}</ul></div><div class="tip" hidden></div>`;
      const mv = (e: PointerEvent) => {
        const g = (e.target as Element).closest('[data-i]') as HTMLElement | null; if (!g) return esconder(el);
        const [t, v, c] = parts[+g.dataset.i!];
        dica(el, e, `<div class="th">${t}</div>` + linha(c, 'Pessoas', fmt(v)) + `<div class="tr">Participação: <b>${tot ? pc((100 * v) / tot) : '—'}</b></div>`);
      };
      el.onpointermove = mv; el.onpointerdown = mv; el.onpointerleave = () => esconder(el);
    };
  }

  function funnel(el: HTMLElement) {
    return () => {
      const Wd = el.clientWidth, H = el.clientHeight; if (!Wd) return;
      const st: [string, number, string][] = [['Egressos cadastrados', val('egr'), WINE], ['Socializados', val('soc'), '#a5525d'], ['Desenvolvidos', val('dev'), YEL], ['Geração de renda', val('ren'), GRY]];
      const mx = st[0][1] || 1, bh = (H - 20) / st.length - 10; let s = '';
      st.forEach(([t, v, c], j) => {
        const w = Math.max(150, ((Wd - 20) * v) / mx), x = (Wd - w) / 2, y = 10 + j * (bh + 10);
        s += `<rect x="${x}" y="${y}" width="${w}" height="${bh}" rx="6" fill="${c}" data-i="${j}"/><text x="${Wd / 2}" y="${y + bh / 2 - 2}" text-anchor="middle" font-size="12" fill="${tx(c)}">${t}</text><text x="${Wd / 2}" y="${y + bh / 2 + 15}" text-anchor="middle" font-size="15" font-weight="800" fill="${tx(c)}">${fmt(v)}</text>`;
      });
      el.innerHTML = `<svg>${s}</svg><div class="tip" hidden></div>`;
      const mv = (e: PointerEvent) => {
        const g = (e.target as Element).closest('[data-i]') as HTMLElement | null; if (!g) return esconder(el);
        const j = +g.dataset.i!, [t, v, c] = st[j], prev = j ? st[j - 1] : null;
        dica(el, e, `<div class="th">${t}</div>` + linha(c, 'Pessoas', fmt(v)) + (prev ? `<div class="tr">${razao(v, prev[1])} de ${prev[0].toLowerCase()}</div>` : '') + (j > 1 ? `<div class="tr">${razao(v, st[0][1])} de ${st[0][0].toLowerCase()}</div>` : ''));
      };
      el.onpointermove = mv; el.onpointerdown = mv; el.onpointerleave = () => esconder(el);
    };
  }

  const reinc = () => {
    const d = getDados(), c = getCalc();
    const nac = param(d, 'taxaNacional'), rec = c.ind['IMP-01'][N];
    return { nac: nac === null ? null : nac * 100, rec: rec === null ? null : rec * 100, acomp: num(c.lev['D01'][N]), reinc: num(c.lev['D02'][N]) };
  };

  function gauges(el: HTMLElement) {
    return () => {
      const Wd = el.clientWidth, H = el.clientHeight; if (!Wd) return;
      const R = reinc(), it: [string, number | null, string][] = [['Nacional (CNJ)', R.nac, GRY], ['Recomeçar', R.rec, YEL]], cw = Wd / 2; let s = '';
      it.forEach(([t, v0, c], j) => {
        const v = v0 ?? 0, cx = cw * j + cw / 2, cy = H * 0.72, r = Math.min(cw / 2 - 24, H * 0.6), a = Math.PI * (1 - v / 100), x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
        s += `<path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="var(--line)" stroke-width="18" stroke-linecap="round"/><path d="M${cx - r} ${cy}A${r} ${r} 0 0 1 ${x} ${y}" fill="none" stroke="${c}" stroke-width="18" stroke-linecap="round"/><text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="28" font-weight="800" fill="var(--ink)">${v0 === null ? '—' : pc(v)}</text><text x="${cx}" y="${cy + 26}" text-anchor="middle" font-size="13" fill="var(--mut)">${t}</text>`;
      });
      el.innerHTML = `<svg>${s}</svg><div class="tip" hidden></div>`;
      const mv = (e: PointerEvent) => {
        const x = e.clientX - el.getBoundingClientRect().left, [t, v0, c] = it[x < cw ? 0 : 1];
        dica(el, e, `<div class="th">${t}</div>` + linha(c, 'Taxa de reincidência', v0 === null ? '—' : pc(v0)) + (v0 === null ? '' : `<div class="tr">${v0.toFixed(0)} de cada 100 voltam ao sistema prisional</div>`));
      };
      el.onpointermove = mv; el.onpointerdown = mv; el.onpointerleave = () => esconder(el);
    };
  }

  const mx = (...a: number[][]) => teto(Math.max(...a.flat(), 0));
  const draws: Record<string, (() => void)[]> = {
    geral: [() => cols($('f1'), { max: mx(D.egr, D.dev), bars: [[D.egr, WINE, 'Egressos cadastrados'], [D.dev, YEL, 'Desenvolvidos']] })(), () => donut($('f2'))()],
    trilha: [() => cols($('f3'), { max: mx(D.egr, D.soc, D.dev), bars: [[D.egr, WINE, 'Egressos cadastrados'], [D.soc, YEL, 'Socializados'], [D.dev, GRY, 'Desenvolvidos']] })(), () => funnel($('f4'))()],
    qualif: [() => cols($('f5'), { max: mx(D.mat, D.con), bars: [[D.mat, WINE, 'Matriculados'], [D.con, YEL, 'Concluídas']] })()],
    emprego: [() => donut($('f6'))(), () => { const t = D.ren.map((v, i) => (D.dev[i] ? (100 * v) / D.dev[i] : 0)); cols($('f7'), { max: Math.max(20, Math.ceil((Math.max(...t, 1) * 1.05) / 20) * 20), p: 1, lab: 1, lines: [[t, WINE, 'Empregabilidade']] })(); }],
    empresas: [() => cols($('f8'), { max: mx(D.par, D.contr, D.hist), lab: 1, lines: [[D.par, WINE, 'Empresas com parceria ativa no ano'], [D.contr, YEL, 'Empresas que contrataram no ano'], [D.hist, GRY, 'Total de empresas que já contrataram', true]] })()],
    perfil: [() => cols($('f11'), { max: Math.max(20, Math.ceil((Math.max(...D.hom, ...D.pp, ...D.fi, 1) * 1.05) / 20) * 20), p: 1, lab: 1, lines: [[D.hom, WINE, 'Homens', true], [D.pp, YEL, 'Pretos e pardos', true], [D.fi, GRY, 'Ensino fundamental incompleto', true]] })()],
    publico: [() => cols($('f9'), { max: teto(Math.max(...D.ree.map((v, i) => v + D.fam[i] + D.lid[i]), 1)), stack: 1, bars: [[D.ree, WINE, 'Reeducandos'], [D.fam, YEL, 'Familiares'], [D.lid, GRY, 'Líderes formados']] })()],
    reinc: [() => gauges($('f10'))()],
  };

  function cards() {
    const y = I() === null ? Y[ULT] : Y[I()!];
    const emp = razao(val('ren'), val('dev'));
    const nEmp = 'Gerações de renda em relação aos egressos desenvolvidos';
    $('c-geral').innerHTML = card('Egressos cadastrados', fmt(val('egr')), 'egr') + card('Desenvolvidos', fmt(val('dev')), 'dev') + card('Qualificações concluídas', fmt(val('con')), 'con') + card('Geração de renda', fmt(val('ren')), 'ren') + card('Empregabilidade', emp, null, nEmp);
    $('c-trilha').innerHTML = card('Egressos cadastrados', fmt(val('egr')), 'egr') + card('Socializados', fmt(val('soc')), 'soc') + card('Desenvolvidos', fmt(val('dev')), 'dev') + card('Conversão cadastro → desenvolvido', razao(val('dev'), val('egr')), null, 'Egressos desenvolvidos ÷ egressos cadastrados');
    $('c-qualif').innerHTML = card('Matriculados', fmt(val('mat')), 'mat') + card('Concluídas', fmt(val('con')), 'con') + card('Taxa de conclusão', razao(val('con'), val('mat')));
    $('c-emprego').innerHTML = card('Geração de renda', fmt(val('ren')), 'ren') + card('CLT', fmt(val('clt')), 'clt') + card('Outros vínculos', fmt(val('out')), 'out') + card('Empregabilidade', emp, null, nEmp);
    const sp = (I() === null || I() === ULT) ? ' Em 2026, considera só São Paulo.' : '';
    $('c-empresas').innerHTML = card('Empresas com parceria ativa no ano · ' + y, fmt(last('par')), I() === null ? null : 'par', 'Contrataram no ano + as que ainda têm egressos trabalhando.' + sp)
      + card('Empresas que contrataram no ano · ' + y, fmt(last('contr')), I() === null ? null : 'contr', 'Pelo menos uma contratação no ano. Não é o total da história.')
      + card('Total de empresas que já contrataram · ' + y, fmt(last('hist')), I() === null ? null : 'hist', 'Desde 2020, cada empresa contada uma única vez.');
    const nPerfil = '% dos egressos cadastrados no ano';
    $('c-perfil').innerHTML = card('Homens · ' + y, pc(last('hom')), null, nPerfil) + card('Pretos e pardos · ' + y, pc(last('pp')), null, nPerfil) + card('Ensino fundamental incompleto · ' + y, pc(last('fi')), null, nPerfil);
    $('c-publico').innerHTML = card('Reeducandos', fmt(val('ree')), 'ree') + card('Familiares', fmt(val('fam')), 'fam') + card('Líderes formados', fmt(val('lid')), 'lid');
    const R = reinc();
    $('c-reinc').innerHTML = card('Egressos acompanhados', fmt(R.acomp)) + card('Reincidentes', fmt(R.reinc)) + card('Taxa Recomeçar', R.rec === null ? '—' : pc(R.rec)) + card('Taxa nacional (CNJ)', R.nac === null ? '—' : pc(R.nac));
  }

  let cur: (() => void)[] = [];
  const ro = new ResizeObserver(() => cur.forEach((f) => f()));
  function show() {
    montarD();
    const id = (location.hash || '#geral').slice(1), ok = pages.some((p) => p[0] === id) ? id : 'geral';
    document.querySelectorAll('section').forEach((s) => s.classList.toggle('on', s.id === ok));
    $('nav').querySelectorAll('a').forEach((a) => { if ((a as HTMLElement).dataset.id === ok) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    $('title').textContent = pages.find((p) => p[0] === ok)![1];
    $('foot').textContent = '2026 é período parcial.' + (ok === 'reinc' ? ' Reincidência: CNJ acompanha 4 a 5 anos; Recomeçar, até 12 meses.' : '');
    $('per').textContent = I() === null ? 'Todos os anos' : I() === 0 ? 'Até 2020' : Y[I()!] + (I() === ULT ? ' (parcial)' : '');
    cards(); ro.disconnect(); cur = draws[ok] || [];
    document.querySelectorAll('#' + ok + ' .fig').forEach((f) => ro.observe(f)); cur.forEach((f) => f());
  }
  $('seg').addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button'); if (!b) return;
    P = b.dataset.p!; $('seg').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); show();
  });
  window.addEventListener('hashchange', show);
  onChange(show);
  show();
}
