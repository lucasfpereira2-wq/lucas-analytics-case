"""Utilidades comuns da simulação: calendário, dimensões, alocação inteira e montagem de cubos."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]          # data-engineering/
REPO = RAIZ.parent
sys.path.insert(0, str(RAIZ))
from catalog import cenario, tabelas  # noqa: E402

DIR_DADOS = REPO / "app" / "public" / "data"
DIR_REL = DIR_DADOS / "relatorios"
DIR_OUT = RAIZ / "output"

# ---------------------------------------------------------------- calendário
DIAS = pd.date_range(cenario.INICIO_HISTORICO, cenario.FIM_HISTORICO, freq="D")
ND = len(DIAS)
DATAS = DIAS.strftime("%Y-%m-%d").tolist()
MESES = [str(p) for p in pd.period_range(cenario.INICIO_HISTORICO[:7], cenario.FIM_HISTORICO[:7], freq="M")]
NM = len(MESES)
MES_DO_DIA = ((DIAS.year - DIAS[0].year) * 12 + DIAS.month - DIAS[0].month).values.astype(int)
DOW = DIAS.dayofweek.values.astype(int)             # 0 = segunda
DOM = DIAS.day.values.astype(int)
INI_MES = np.array([int(np.argmax(MES_DO_DIA == m)) for m in range(NM)])
DIAS_NO_MES = np.array([pd.Period(m).days_in_month for m in MESES])
FERIADOS = {
    "2024-12-25", "2025-01-01", "2025-03-03", "2025-03-04", "2025-04-18", "2025-04-21", "2025-05-01",
    "2025-06-19", "2025-09-07", "2025-10-12", "2025-11-02", "2025-11-15", "2025-11-20", "2025-12-25",
    "2026-01-01", "2026-02-16", "2026-02-17", "2026-04-03", "2026-04-21", "2026-05-01", "2026-06-04",
    "2026-09-07", "2026-10-12", "2026-11-02", "2026-11-15",
}
FERIADO = np.array([d in FERIADOS for d in DATAS])
UTIL = (DOW < 5) & ~FERIADO
DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

# ---------------------------------------------------------------- dimensões
SEGMENTOS = cenario.SEGMENTOS
CANAIS_VENDA = cenario.CANAIS_VENDA
CANAIS_ATEND = cenario.CANAIS_ATENDIMENTO
CANAIS_COB = cenario.CANAIS_COBRANCA
FAIXAS = cenario.FAIXAS_ATRASO
REGIONAIS = list(cenario.REGIONAIS.keys())
UFS = [uf for ufs in cenario.REGIONAIS.values() for uf in ufs]
REG_DA_UF = np.array([r for r, ufs in enumerate(cenario.REGIONAIS.values()) for _ in ufs])
NOMES_UF = {
    "SP": "São Paulo", "MG": "Minas Gerais", "RJ": "Rio de Janeiro", "ES": "Espírito Santo", "PR": "Paraná",
    "SC": "Santa Catarina", "RS": "Rio Grande do Sul", "GO": "Goiás", "MT": "Mato Grosso",
    "MS": "Mato Grosso do Sul", "DF": "Distrito Federal", "BA": "Bahia", "PE": "Pernambuco", "CE": "Ceará",
    "MA": "Maranhão", "RN": "Rio Grande do Norte", "PB": "Paraíba", "AL": "Alagoas", "SE": "Sergipe",
    "PI": "Piauí", "PA": "Pará", "AM": "Amazonas", "TO": "Tocantins", "RO": "Rondônia", "AC": "Acre",
    "AP": "Amapá", "RR": "Roraima",
}
# participação de cada UF no negócio (soma 100)
PART_UF = {
    "SP": 28.0, "MG": 9.5, "RJ": 7.5, "ES": 2.0, "PR": 7.0, "SC": 5.0, "RS": 6.5, "GO": 4.5, "MT": 3.2,
    "MS": 2.0, "DF": 2.3, "BA": 4.5, "PE": 3.2, "CE": 3.0, "MA": 1.6, "RN": 1.2, "PB": 1.2, "AL": 0.9,
    "SE": 0.8, "PI": 0.9, "PA": 2.2, "AM": 1.2, "TO": 0.6, "RO": 0.6, "AC": 0.2, "AP": 0.2, "RR": 0.2,
}
P_UF = np.array([PART_UF[u] for u in UFS]) / 100.0
P_REG = np.bincount(REG_DA_UF, weights=P_UF, minlength=len(REGIONAIS))

DIM_SEG = ("segmento", "Segmento", SEGMENTOS)
DIM_UF = ("uf", "UF", UFS)
DIM_REG = ("regional", "Regional", REGIONAIS)
DIM_CANAL = ("canal", "Canal de venda", CANAIS_VENDA)
DIM_DATA = ("data", "Data", DATAS)
DIM_MES = ("mes", "Mês", MESES)
DIM_CANAL_AT = ("canal_atendimento", "Canal de atendimento", CANAIS_ATEND)


# ---------------------------------------------------------------- helpers
def aloca(total, pesos):
    """Distribui inteiros `total` (shape S) proporcionalmente a `pesos` (shape S+(k,)), método dos maiores restos."""
    total = np.asarray(total, dtype=np.int64)
    pesos = np.asarray(pesos, dtype=float)
    s = pesos.sum(-1, keepdims=True)
    frac = np.divide(pesos, s, out=np.zeros_like(pesos), where=s > 0)
    bruto = frac * total[..., None]
    base = np.floor(bruto + 1e-9).astype(np.int64)
    resto = total - base.sum(-1)
    ordem = np.argsort(-(bruto - base), axis=-1, kind="stable")
    rank = np.argsort(ordem, axis=-1, kind="stable")
    return base + (rank < resto[..., None])


def denso(dims: list[str], **medidas) -> pd.DataFrame:
    """Converte arrays densos (mesmo shape, um eixo por dimensão) em DataFrame longo com índices de dimensão."""
    shape = next(iter(medidas.values())).shape
    assert len(shape) == len(dims), (shape, dims)
    idx = np.indices(shape).reshape(len(dims), -1)
    df = pd.DataFrame({d: idx[i] for i, d in enumerate(dims)})
    for nome, arr in medidas.items():
        assert arr.shape == shape, (nome, arr.shape, shape)
        df[nome] = np.asarray(arr).reshape(-1)
    return df


def med(nome, rotulo, formato="int", tipo="fluxo"):
    return {"nome": nome, "rotulo": rotulo, "formato": formato, "tipo": tipo}


def cubo(id_: str, descricao: str, df: pd.DataFrame, dims: list[tuple], medidas: list[dict]) -> dict:
    """Monta o cubo colunar (contrato cubo.ts): agrega, arredonda, descarta linhas zeradas e ordena."""
    nd = [d[0] for d in dims]
    nm = [m["nome"] for m in medidas]
    g = df.groupby(nd, sort=True, as_index=False)[nm].sum()
    for m in nm:
        g[m] = np.rint(g[m].to_numpy(dtype=float)).astype(np.int64)
    g = g[(g[nm] != 0).any(axis=1)]
    colunas = {c: g[c].astype(np.int64).tolist() for c in nd + nm}
    return {
        "id": id_,
        "descricao": descricao,
        "dims": [{"nome": n, "rotulo": r, "valores": list(v)} for n, r, v in dims],
        "medidas": medidas,
        "n": int(len(g)),
        "colunas": colunas,
    }


def grava_json(caminho: Path, obj) -> int:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    txt = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    caminho.write_text(txt, encoding="utf-8")
    return len(txt.encode("utf-8"))


def relatorio(id_: str, cubos: list[dict], extras: dict) -> dict:
    return {
        "relatorio": id_,
        "gerado_em": cenario.DATA_REFERENCIA,
        "cubos": {c["id"]: c for c in cubos},
        "extras": extras,
    }
