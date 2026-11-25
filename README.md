# Painel de indicadores — Instituto Recomeçar

Site **estático** (Astro 7, sem banco de dados) com painel estilo Power BI sobre a planilha `Base_Indicadores_Recomecar.xlsx`.

## Rodar
```bash
npm install
npm run dev      # desenvolvimento
npm run build    # gera ./dist (estático, pronto para Vercel/Netlify/qualquer hospedagem)
```

## Como funciona
- `src/data/indicadores.json` — dados de origem (levantamento, parâmetros, base única, conciliação), gerados da planilha.
- `src/lib/calc.ts` — réplica das fórmulas das abas 2_Indicadores / Acumulado (calculado no navegador).
- `src/lib/store.ts` — edições manuais ficam no `localStorage` como diferenças sobre o JSON publicado.
- Páginas: Painel (`/`), Levantamento (`/dados`), Indicadores, Base única, Conciliação, Parâmetros, Sobre.

## Editar e publicar números
1. Edite nas telas amarelas (Levantamento, Parâmetros, Base única, Conciliação).
2. **Exportar JSON** (topo) → substitua `src/data/indicadores.json` → commit → deploy.
3. Versão pública somente leitura: `PUBLIC_EDITAVEL=false npm run build`.

## Reimportar uma planilha nova
```bash
npm run importar -- caminho/Base_Indicadores_Recomecar.xlsx   # requer python3 + openpyxl
```

## Teste de cálculo
`scripts/validar-calculos.ts` compara o motor TS com os valores calculados da planilha.
