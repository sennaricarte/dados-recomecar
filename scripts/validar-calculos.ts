// Compara o motor de cálculo (src/lib/calc.ts) com os valores em cache da planilha original.
// Uso: npm test -- caminho/da/planilha.xlsx.cache.json  (gerado por scripts/cache_excel.py)
import { readFileSync } from 'node:fs';
import { calcular } from '../src/lib/calc.ts';

const dados = JSON.parse(readFileSync(new URL('../src/data/indicadores.json', import.meta.url), 'utf8'));
const cache = JSON.parse(readFileSync(process.argv[2] ?? '/tmp/cache_excel.json', 'utf8')) as Record<string, (number | null)[]>;
const calc = calcular(dados);
let ok = 0, falhas = 0;
for (const [cod, serie] of Object.entries(cache)) {
  serie.forEach((esperado, i) => {
    if (esperado === null) return;
    const got = calc.ind[cod]?.[i];
    if (got !== null && got !== undefined && Math.abs(got - esperado) < 1e-6) ok++;
    else { falhas++; console.log(`DIFERE ${cod}[${i}] excel=${esperado} ts=${got}`); }
  });
}
console.log(`${ok} células conferem, ${falhas} divergem`);
process.exit(falhas ? 1 : 0);
