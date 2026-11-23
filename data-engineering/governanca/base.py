"""
Base do motor de governança: contratos, datas de referência, grafo de linhagem, volumes e formatação.
"""
import json
import os
import random
import sys
from datetime import datetime, timedelta

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
sys.path.insert(0, os.path.join(RAIZ, "data-engineering", "catalog"))

import cenario  # noqa: E402
import schemas  # noqa: E402
import tabelas  # noqa: E402

SAIDA = os.path.join(RAIZ, "app", "public", "data", "governanca")
RESUMO_SIMULACAO = os.path.join(RAIZ, "data-engineering", "output", "resumo_simulacao.json")

# ---- Tempo -----------------------------------------------------------------------------------
AGORA = datetime.fromisoformat(cenario.DATA_REFERENCIA)
TZ = AGORA.tzinfo
HOJE = AGORA.date()
N_DIAS = 30
DIAS = [HOJE - timedelta(days=N_DIAS - 1 - i) for i in range(N_DIAS)]
IDX = {d.isoformat(): i for i, d in enumerate(DIAS)}
HORA_FOTO = AGORA.hour  # o farol é fotografado às 08:00 de cada dia

TABELAS = tabelas.TABELAS
POR_NOME = tabelas.POR_NOME
SCHEMAS = schemas.SCHEMAS
NOMES = [t["nome"] for t in TABELAS]
RELATORIOS = tabelas.RELATORIOS
PESO_CRITICIDADE = {"alta": 3, "media": 2, "baixa": 1}


def dt(dia, hora=0, minuto=0, segundo=0):
    return datetime(dia.year, dia.month, dia.day, hora, minuto, segundo, tzinfo=TZ)


def iso(d):
    return d.isoformat(timespec="seconds") if d else None


def idx(data_iso):
    """Índice do dia na janela; datas anteriores à janela viram 0 (problema já existia)."""
    if data_iso is None:
        return 0
    return IDX.get(data_iso, 0)


def rng(*chaves):
    return random.Random("|".join([str(cenario.SEED)] + [str(c) for c in chaves]))


# ---- Formatação brasileira ---------------------------------------------------------------------
def f_int(n):
    return f"{int(round(n)):,}".replace(",", ".")


def f_dec(x, casas=1):
    s = f"{x:,.{casas}f}"
    return s.replace(",", "§").replace(".", ",").replace("§", ".")


def f_dia(d):
    return f"{d.day:02d}/{d.month:02d}"


def f_dh(d):
    return f"{d.day:02d}/{d.month:02d} às {d.hour:02d}:{d.minute:02d}"


def f_horas(h):
    """Idade em linguagem natural."""
    if h < 1:
        return "menos de 1 hora"
    if h < 48:
        return f"{int(h)}h"
    return f"{int(h // 24)} dias"


# ---- Linhagem -----------------------------------------------------------------------------------
UP = {t["nome"]: list(t["upstreams"]) for t in TABELAS}
DOWN = {n: [] for n in NOMES}
for _n, _ups in UP.items():
    for _u in _ups:
        DOWN[_u].append(_n)


def _fecho(nome, grafo):
    visto, fila = [], list(grafo[nome])
    while fila:
        x = fila.pop(0)
        if x not in visto:
            visto.append(x)
            fila.extend(grafo[x])
    return visto


def montante(nome):
    """Todo o upstream (em largura, do mais próximo ao mais distante)."""
    return _fecho(nome, UP)


def jusante(nome):
    return _fecho(nome, DOWN)


RELATORIO_DO_MART = {r["mart"]: r for r in RELATORIOS}


def relatorios_a_jusante(nome):
    return [RELATORIO_DO_MART[x]["id"] for x in [nome] + jusante(nome) if x in RELATORIO_DO_MART]


# ---- Volumes -----------------------------------------------------------------------------------
# nome: (linhas totais, linhas esperadas por carga em dia de fator 1,0, sazonalidade semanal?)
# carga None = recarga completa (a carga traz a tabela inteira).
VOLUMES_PADRAO = {
    "stg_crm_clientes": (418_000, 1_650, True),
    "stg_crm_propostas": (603_000, cenario.PROPOSTAS_MEDIA / 1.18, True),
    "stg_crm_funil_eventos": (3_940_000, 5_800, True),
    "stg_erp_contratos": (131_400, 96, True),
    "stg_erp_cotas": (131_400, None, False),
    "stg_erp_parcelas": (2_412_000, 9_600, True),
    "stg_erp_assembleias": (10_150, 18, True),
    "stg_erp_lances": (296_000, 420, True),
    "stg_banco_retorno_cnab": (1_985_000, 3_650, True),
    "stg_banco_boletos_registrados": (2_230_000, 3_900, True),
    "stg_telefonia_cdr": (2_870_000, 4_300, True),
    "stg_whatsapp_conversas": (1_920_000, 132, False),
    "stg_helpdesk_tickets": (1_480_000, 96, False),
    "stg_pesquisas_respostas": (512_000, 760, True),
    "dim_cliente": (421_300, None, False),
    "dim_cliente_pf": (384_900, None, False),
    "dim_cliente_pj": (36_400, None, False),
    "dim_endereco": (455_200, None, False),
    "dim_contato": (702_800, None, False),
    "fato_consentimento_lgpd": (1_164_000, 2_400, True),
    "fato_atualizacao_cadastral": (893_000, 1_250, True),
    "dim_segmento": (4, None, False),
    "dim_plano": (86, None, False),
    "dim_bem_referencia": (298, None, False),
    "dim_tabela_taxa": (540, None, False),
    "fato_reajuste_bem": (6_850, 298, False),
    "dim_grupo": (624, None, False),
    "dim_cota": (131_400, None, False),
    "fato_cota_movimentacao": (498_000, 640, True),
    "fato_transferencia_cota": (9_240, 14, True),
    "fato_cancelamento_cota": (41_800, 62, True),
    "fato_reativacao_cota": (5_930, 9, True),
    "fato_posicao_grupo_mensal": (14_400, 410, False),
    "fato_lead": (1_870_000, 2_750, True),
    "fato_proposta": (601_500, cenario.PROPOSTAS_MEDIA / 1.18, True),
    "fato_contrato_venda": (131_300, 96, True),
    "fato_funil_crm": (3_120_000, 4_900, True),
    "dim_vendedor": (486, None, False),
    "dim_equipe_comercial": (42, None, False),
    "fato_meta_comercial": (1_920, 80, False),
    "dim_canal_venda": (4, None, False),
    "dim_parceiro": (218, None, False),
    "fato_comissao": (388_000, 510, True),
    "fato_parcelas": (2_412_000 + cenario.PARCELAS_DUPLICADAS, 9_600, True),
    "fato_pagamento": (1_962_000, 3_650, True),
    "fato_boleto": (2_228_000, 3_900, True),
    "fato_acordo": (38_400, 58, True),
    "fato_renegociacao": (12_700, 19, True),
    "dim_regua_cobranca": (14, None, False),
    "fato_acao_cobranca": (2_640_000, 5_100, True),
    "dim_assessoria_cobranca": (9, None, False),
    "fato_fundo_comum": (2_050_000, 3_800, True),
    "fato_fundo_reserva": (1_968_000, 3_650, True),
    "fato_inadimplencia_diaria": (57_300_000, 78_200, False),
    "fato_assembleia": (10_150, 18, True),
    "fato_lance": (296_000, 420, True),
    "fato_sorteio": (10_150, 18, True),
    "fato_contemplacao": (27_600, 46, True),
    "fato_liberacao_credito": (24_900, 41, True),
    "fato_garantia": (21_700, 36, True),
    "fato_chamada": (2_868_000, 4_300, True),
    "fato_chamadas_legacy": (4_150_000, 1_150, False),
    "fato_conversa_whatsapp": (1_874_000, 127, False),
    "fato_ticket": (1_476_000, 96, False),
    "fato_interacao_digital": (5_310_000, 340, False),
    "dim_motivo_contato": (148, None, False),
    "fato_pesquisa_nps": (289_000, 430, True),
    "fato_pesquisa_csat": (214_000, 320, True),
    "dim_agente": (412, None, False),
    "dim_fila_atendimento": (18, None, False),
    "dim_filial": (64, None, False),
    "dim_regional": (5, None, False),
    "dim_calendario": (1_461, None, False),
    "dim_colaborador": (1_284, None, False),
    "mart_vendas_comercial": (1_240_000, 1_720, False),
    "mart_cobranca_carteira": (73_000, 100, False),
    "mart_cobranca_safra_mob": (4_800, None, False),
    "mart_atendimento": (512_000, 740, False),
    "mart_assembleias_contemplacoes": (9_840, 410, False),
    "mart_executivo_kpis": (27_700, 38, False),
}
assert set(VOLUMES_PADRAO) == set(NOMES)

# Volumes cuja carga esperada é fixada pelo cenário (não escalam com a simulação)
_CARGA_FIXA = {"stg_crm_propostas", "fato_proposta"}

# Sazonalidade semanal por dia da semana do DADO (a carga do dia D traz o movimento de D-1)
FATOR_SEMANA = [1.18, 1.07, 1.02, 1.00, 0.96, 0.42, 0.20]


def carregar_resumo():
    if os.path.exists(RESUMO_SIMULACAO):
        try:
            with open(RESUMO_SIMULACAO, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return {}
    return {}


RESUMO = carregar_resumo()


def _volumes():
    vols = {}
    sim = RESUMO.get("volumes") if isinstance(RESUMO.get("volumes"), dict) else {}
    for nome, (total, carga, sazonal) in VOLUMES_PADRAO.items():
        v = sim.get(nome)
        if isinstance(v, dict):
            v = v.get("linhas") or v.get("total")
        if isinstance(v, (int, float)) and v > 0:
            novo = int(v)
            if carga is not None and nome not in _CARGA_FIXA:
                carga = max(1.0, carga * novo / total)
            total = novo
        vols[nome] = {"total": int(total), "carga": carga, "sazonal": sazonal}
    return vols


VOLUMES = _volumes()
ORIGEM_VOLUMES = "simulação" if isinstance(RESUMO.get("volumes"), dict) else "padrão"


def gravar(caminho_rel, obj):
    caminho = os.path.join(SAIDA, caminho_rel)
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write("\n")
