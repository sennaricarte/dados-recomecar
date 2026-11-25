#!/usr/bin/env python3
"""Converte a planilha Base_Indicadores_Recomecar.xlsx em src/data/indicadores.json.

Uso:  python3 scripts/xlsx_para_json.py caminho/da/planilha.xlsx

Só os dados de entrada (células amarelas) e os textos entram no JSON.
Os indicadores são recalculados no navegador por src/lib/calc.ts.
"""
import json
import re
import sys
import warnings
from pathlib import Path

import openpyxl

warnings.filterwarnings("ignore")

origem = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("Base_Indicadores_Recomecar.xlsx")
destino = Path(__file__).resolve().parent.parent / "src" / "data" / "indicadores.json"

wb = openpyxl.load_workbook(origem)

ARITMETICA = re.compile(r"^=[\d+\-*/().\s]+$")


def valor(cel):
    """Número, texto ou None. Fórmulas puramente aritméticas (=137+12) são avaliadas."""
    if cel is None:
        return None, None
    if isinstance(cel, str) and cel.startswith("="):
        if ARITMETICA.match(cel):
            return eval(cel[1:], {"__builtins__": {}}), cel[1:]  # noqa: S307 (regex acima restringe)
        return None, cel
    return cel, None


def texto(cel):
    return None if cel is None else str(cel).strip()


# ---------- LEIA-ME ----------
leia = []
for r in wb["LEIA-ME"].iter_rows(min_row=3, max_row=8, values_only=True):
    if r[0] and r[1]:
        leia.append({"titulo": texto(r[0]), "texto": texto(r[1])})

# ---------- Parâmetros ----------
wp = wb["Parametros"]
chaves = ["taxaNacional", "reincidenciaRecomecar", "janelaMeses", "custoAnual", "anosEvitados", "anoCorrente"]
parametros = []
for i, chave in enumerate(chaves):
    r = 5 + i
    parametros.append(
        {
            "chave": chave,
            "rotulo": texto(wp.cell(r, 1).value),
            "valor": wp.cell(r, 2).value,
            "unidade": texto(wp.cell(r, 3).value),
            "nota": texto(wp.cell(r, 4).value),
        }
    )

listas = {
    "statusLevantamento": [],
    "statusValidacao": [],
    "uso": [],
}
for r in range(13, 40):
    for col, k in ((1, "statusLevantamento"), (2, "statusValidacao"), (3, "uso")):
        v = wp.cell(r, col).value
        if v and v not in ("Status do levantamento", "Status de validação", "Uso") and "Listas usadas" not in str(v):
            listas[k].append(str(v))

# ---------- 1_Levantamento ----------
wl = wb["1_Levantamento"]
anos = [str(wl.cell(4, c).value) for c in range(5, 12)]
levantamento = []
grupo = None
for r in range(5, wl.max_row + 1):
    a, b = wl.cell(r, 1).value, wl.cell(r, 2).value
    if a and not b:
        grupo = texto(a)
        continue
    if not a:
        continue
    valores, formulas = [], {}
    for i, c in enumerate(range(5, 12)):
        v, f = valor(wl.cell(r, c).value)
        valores.append(v)
        if f:
            formulas[str(i)] = f
    item = {
        "id": texto(a),
        "grupo": grupo,
        "dado": texto(b),
        "unidade": texto(wl.cell(r, 3).value),
        "agregacao": texto(wl.cell(r, 4).value),
        "valores": valores,
        "fonte": texto(wl.cell(r, 13).value),
        "responsavel": texto(wl.cell(r, 14).value),
        "status": texto(wl.cell(r, 15).value) or "A levantar",
        "definicao": texto(wl.cell(r, 16).value),
        "obs": texto(wl.cell(r, 17).value),
    }
    if formulas:
        item["formulas"] = formulas
    levantamento.append(item)

# ---------- 2_Indicadores (metadados; a conta fica em calc.ts) ----------
wi = wb["2_Indicadores"]
indicadores = []
tipo = None
for r in range(5, wi.max_row + 1):
    a, d = wi.cell(r, 1).value, wi.cell(r, 4).value
    if a and not d:
        s = str(a)
        tipo = "Entrega" if s.startswith("ENTREGAS") else "Resultado" if s.startswith("RESULTADOS") else "Impacto"
        continue
    if a and re.match(r"^(ENT|RES|IMP)-\d+$", str(a)):
        indicadores.append(
            {
                "codigo": texto(a),
                "tipo": tipo,
                "ods": texto(wi.cell(r, 3).value),
                "nome": texto(d),
                "unidade": texto(wi.cell(r, 13).value),
                "como": texto(wi.cell(r, 14).value),
            }
        )

# ---------- 3_Base_Unica ----------
wbu = wb["3_Base_Unica"]
base = []
for r in range(5, wbu.max_row + 1):
    cod = wbu.cell(r, 1).value
    if not cod or not re.match(r"^(ENT|RES|IMP)-\d+$", str(cod)):
        continue
    base.append(
        {
            "codigo": texto(cod),
            "responsavel": texto(wbu.cell(r, 10).value),
            "status": texto(wbu.cell(r, 11).value) or "Rascunho",
            "atualizacao": texto(wbu.cell(r, 12).value),
            "usos": {
                "site": texto(wbu.cell(r, 13).value),
                "relatorio": texto(wbu.cell(r, 14).value),
                "isps": texto(wbu.cell(r, 15).value),
                "governo": texto(wbu.cell(r, 16).value),
            },
        }
    )

# ---------- 4_Conciliacao ----------
wc = wb["4_Conciliacao"]
# de onde vem o "calculado pela base" de cada linha (ordem da aba)
calculado = [
    ("ind", "ENT-01", "acum"),
    ("ind", "ENT-03", "acum"),
    ("ind", "ENT-05", "acum"),
    ("ind", "ENT-06", "acum"),
    ("ind", "RES-01", "acum"),
    ("ind", "ENT-07", "acum"),
    ("lev", "A07", "acum"),
    ("ind", "IMP-01", "acum"),
    ("param", "taxaNacional", None),
    ("ind", "IMP-06", "2024"),
    ("ind", "IMP-05", "2024"),
    ("lev", "G01", "acum"),
    ("lev", "G02", "acum"),
    ("lev", "G03", "acum"),
    ("lev", "F02", "acum"),
    ("lev", "F03", "acum"),
    ("lev", "B08", "acum"),
    ("lev", "F05", "acum"),
]


def num_ou_param(cel):
    if cel is None:
        return {"valor": None}
    if isinstance(cel, str) and cel.startswith("=Parametros!"):
        return {"param": "taxaNacional" if cel.endswith("B5") else "reincidenciaRecomecar"}
    try:
        return {"valor": float(cel)}
    except (TypeError, ValueError):
        return {"valor": None}


conciliacao = []
for i, r in enumerate(range(5, 5 + len(calculado))):
    tp, ref, col = calculado[i]
    narr, instr = num_ou_param(wc.cell(r, 3).value), num_ou_param(wc.cell(r, 4).value)
    conciliacao.append(
        {
            "n": i + 1,
            "numero": texto(wc.cell(r, 2).value),
            "narrativa": narr,
            "instrucoes": instr,
            "calculado": {"tipo": tp, "ref": ref, "col": col},
            "oficial": wc.cell(r, 8).value,
            "decisao": texto(wc.cell(r, 9).value),
            "obs": texto(wc.cell(r, 10).value),
        }
    )

dados = {
    "meta": {
        "titulo": "Indicadores do Instituto Recomeçar",
        "anos": anos,
        "parcial": "2026",
        "geradoDe": origem.name,
    },
    "leiaMe": leia,
    "parametros": parametros,
    "listas": listas,
    "levantamento": levantamento,
    "indicadores": indicadores,
    "base": base,
    "conciliacao": conciliacao,
}

destino.parent.mkdir(parents=True, exist_ok=True)
destino.write_text(json.dumps(dados, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"OK: {destino}  ({len(levantamento)} dados, {len(indicadores)} indicadores, {len(conciliacao)} conciliações)")
