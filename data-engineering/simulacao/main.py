"""Ponto de entrada da simulação de negócio: gera meta.json, os 5 relatórios (cubos) e o resumo da simulação."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import numpy as np

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    __package__ = "simulacao"

from . import assembleias, atendimento, cobranca, cotas, vendas  # noqa: E402
from .comum import (CANAIS_ATEND, CANAIS_COB, CANAIS_VENDA, DIR_DADOS, DIR_OUT, DIR_REL, FAIXAS, ND, NM, NOMES_UF, P_REG,  # noqa: E402
                    P_UF, REG_DA_UF, REGIONAIS, SEGMENTOS, UFS, cenario, grava_json, tabelas)


def _meta():
    return {
        "data_referencia": cenario.DATA_REFERENCIA,
        "inicio_historico": cenario.INICIO_HISTORICO,
        "fim_historico": cenario.FIM_HISTORICO,
        "seed": cenario.SEED,
        "segmentos": SEGMENTOS,
        "canais_venda": CANAIS_VENDA,
        "canais_atendimento": CANAIS_ATEND,
        "canais_cobranca": CANAIS_COB,
        "faixas_atraso": FAIXAS,
        "regionais": [{"nome": r, "ufs": ufs} for r, ufs in cenario.REGIONAIS.items()],
        "ufs": [{"sigla": u, "nome": NOMES_UF[u], "regional": REGIONAIS[REG_DA_UF[i]]} for i, u in enumerate(UFS)],
        "pesos_uf": {u: round(float(P_UF[i] / P_REG[REG_DA_UF[i]]), 6) for i, u in enumerate(UFS)},
        "pesos_regional": {r: round(float(P_REG[i]), 6) for i, r in enumerate(REGIONAIS)},
        "relatorios": tabelas.RELATORIOS,
    }


def _volumes(c, rels, v_vend, v_cob, v_at, v_as):
    """Linhas plausíveis para as 80 tabelas, derivadas dos volumes simulados."""
    n = lambda rel, cb: rels[rel]["cubos"][cb]["n"]  # noqa: E731
    hist_parc = int((c.P[0, :c.n0].astype(int) + c.N[0, :c.n0]).sum())           # parcelas do estoque anteriores ao histórico
    hist_pagas = int(c.P[0, :c.n0].astype(int).sum())
    emit = v_cob["parcelas_emitidas"] + hist_parc
    pagas = v_cob["parcelas_pagas"] + hist_pagas
    clientes = int(c.n * 0.86)
    prospects = int(v_vend["leads"] * 0.22)
    voz, wpp, chat, mail, app = (int(x) for x in v_at["canal"])
    digital = chat + mail + app
    nps = v_at["nps_true"] + v_at["nps_dup"]
    equipes = len({e for e in c.vend.equipe})
    grupo_meses = int(sum(rels["assembleias"]["cubos"]["grupos"]["colunas"]["grupos_ativos"]))
    vol = {
        "stg_crm_clientes": clientes + prospects, "stg_crm_propostas": v_vend["propostas"],
        "stg_crm_funil_eventos": v_vend["leads"] + v_vend["propostas"] + v_vend["aprovadas"] + v_vend["contratos"],
        "stg_erp_contratos": c.n, "stg_erp_cotas": c.n, "stg_erp_parcelas": emit, "stg_erp_assembleias": v_as["assembleias"],
        "stg_erp_lances": v_as["lances_ofertados"], "stg_banco_retorno_cnab": pagas,
        "stg_banco_boletos_registrados": v_cob["parcelas_emitidas"], "stg_telefonia_cdr": voz,
        "stg_whatsapp_conversas": int(wpp * 1.004), "stg_helpdesk_tickets": digital,
        "stg_pesquisas_respostas": nps + v_at["csat"],
        "dim_cliente": clientes + prospects, "dim_cliente_pf": int((clientes + prospects) * 0.93),
        "dim_cliente_pj": (clientes + prospects) - int((clientes + prospects) * 0.93),
        "dim_endereco": int((clientes + prospects) * 1.08), "dim_contato": int((clientes + prospects) * 1.9),
        "fato_consentimento_lgpd": int((clientes + prospects) * 1.55), "fato_atualizacao_cadastral": int(clientes * 0.62),
        "dim_segmento": 4, "dim_plano": 46, "dim_bem_referencia": 128, "dim_tabela_taxa": 64, "fato_reajuste_bem": 128 * NM,
        "dim_grupo": v_as["grupos"], "dim_cota": c.n,
        "fato_cota_movimentacao": c.n + v_vend["cancelamentos"] + v_as["contemplacoes"] + int((c.S[-1] == 6).sum()),
        "fato_transferencia_cota": int(c.n * 0.011), "fato_cancelamento_cota": v_vend["cancelamentos"],
        "fato_reativacao_cota": int(v_vend["cancelamentos"] * 0.06), "fato_posicao_grupo_mensal": grupo_meses,
        "fato_lead": v_vend["leads"], "fato_proposta": v_vend["propostas"], "fato_contrato_venda": c.n,
        "fato_funil_crm": n("vendas", "funil") * 4, "dim_vendedor": c.vend.n, "dim_equipe_comercial": equipes,
        "fato_meta_comercial": n("vendas", "metas"), "dim_canal_venda": 4, "dim_parceiro": 212, "fato_comissao": c.nv,
        "fato_parcelas": emit + cenario.PARCELAS_DUPLICADAS, "fato_pagamento": pagas, "fato_boleto": v_cob["parcelas_emitidas"],
        "fato_acordo": v_cob["acordos"], "fato_renegociacao": int(v_cob["acordos"] * 0.34), "dim_regua_cobranca": 18,
        "fato_acao_cobranca": v_cob["acionamentos"], "dim_assessoria_cobranca": 7,
        "fato_fundo_comum": grupo_meses * 21, "fato_fundo_reserva": grupo_meses * 21,
        "fato_inadimplencia_diaria": ND * len(SEGMENTOS) * len(UFS) * len(FAIXAS),
        "fato_assembleia": v_as["assembleias"], "fato_lance": v_as["lances_ofertados"], "fato_sorteio": v_as["sorteios"],
        "fato_contemplacao": v_as["contemplacoes"], "fato_liberacao_credito": v_as["liberacoes"],
        "fato_garantia": int(v_as["liberacoes"] * 0.58),
        "fato_chamada": voz, "fato_chamadas_legacy": 1_912_540, "fato_conversa_whatsapp": wpp,
        "fato_ticket": int(digital * 0.46), "fato_interacao_digital": digital, "dim_motivo_contato": 42,
        "fato_pesquisa_nps": nps, "fato_pesquisa_csat": v_at["csat"], "dim_agente": 312, "dim_fila_atendimento": 14,
        "dim_filial": 86, "dim_regional": len(REGIONAIS), "dim_calendario": 4018, "dim_colaborador": 1243,
        "mart_vendas_comercial": n("vendas", "vendas") + n("vendas", "funil") + n("vendas", "metas") + n("vendas", "cancelamentos"),
        "mart_cobranca_carteira": sum(cb["n"] for cb in rels["cobranca-carteira"]["cubos"].values()),
        "mart_cobranca_safra_mob": n("cobranca-safra", "safra_mob"),
        "mart_atendimento": sum(cb["n"] for cb in rels["atendimento"]["cubos"].values()),
        "mart_assembleias_contemplacoes": sum(cb["n"] for cb in rels["assembleias"]["cubos"].values()),
        "mart_executivo_kpis": ND * 28,
    }
    nomes = [t["nome"] for t in tabelas.TABELAS]
    faltam = [t for t in nomes if t not in vol]
    sobram = [t for t in vol if t not in nomes]
    assert not faltam and not sobram, (faltam, sobram)
    return {t: int(vol[t]) for t in nomes}


def executar(verbose=True):
    t0 = time.time()
    rng = np.random.default_rng(cenario.SEED)
    c = cotas.simular(rng)
    rel_v, info_v, vol_v = vendas.gerar(rng, c)
    rel_c, info_c, vol_c = cobranca.gerar_carteira(rng, c)
    rel_s, info_s = cobranca.gerar_safra(rng, c)
    rel_a, info_a, vol_a = atendimento.gerar(rng, info_c["cotas_ativas"])
    rel_as, info_as, vol_as = assembleias.gerar(rng, c)
    rels = {"vendas": rel_v, "cobranca-carteira": rel_c, "cobranca-safra": rel_s, "atendimento": rel_a, "assembleias": rel_as}

    tamanhos = {"meta.json": grava_json(DIR_DADOS / "meta.json", _meta())}
    for rid, rel in rels.items():
        tamanhos[f"relatorios/{rid}.json"] = grava_json(DIR_REL / f"{rid}.json", rel)

    vendida = c.dia_venda >= 0
    resumo = {
        "gerado_em": cenario.DATA_REFERENCIA,
        "seed": cenario.SEED,
        "volumes": _volumes(c, rels, vol_v, vol_c, vol_a, vol_as),
        "cenario": {
            "nps_reportado_out": info_a["nps_reportado_out"], "nps_corrigido_out": info_a["nps_corrigido_out"],
            "nps_reportado_out_exato": info_a["nps_reportado_out_exato"], "nps_corrigido_out_exato": info_a["nps_corrigido_out_exato"],
            "nps_reportado_nov": info_a["nps_reportado_nov"], "nps_corrigido_nov": info_a["nps_corrigido_nov"],
            "nps_corrigido_serie_mensal": info_a["nps_corrigido_serie_mensal"],
            "respostas_nps_dup_total": info_a["respostas_nps_dup_total"], "respostas_nps_dup_out": info_a["respostas_nps_dup_out"],
            "respostas_nps_out_reportadas": info_a["respostas_nps_out_reportadas"],
            "respostas_nps_dup_app_promotores": info_a["respostas_nps_dup_app_promotores"],
            "pesquisas_dup_pct_30d": round(vol_a["nps_dup_30d"] / (vol_a["nps_30d"] + vol_a["csat_30d"]) * 100, 2),
            "parcelas_dup": info_c["parcelas_dup"], "valor_recebido_16nov": info_c["valor_recebido_16nov"],
            "valor_recebido_corrigido_16nov": info_c["valor_recebido_corrigido_16nov"],
            "valor_recebido_dup_16nov": info_c["valor_recebido_dup_16nov"], "pct_superestimacao": info_c["pct_superestimacao"],
            "parcelas_pagas_16nov": info_c["parcelas_pagas_16nov"],
            "propostas_16nov": info_v["propostas_16nov"], "propostas_media_segundas": info_v["propostas_media_segundas"],
            "propostas_queda_pct": round((1 - info_v["propostas_16nov"] / info_v["propostas_media_segundas"]) * 100, 1),
            "leads_16nov": info_v["leads_16nov"], "contratos_16nov": info_v["contratos_16nov"],
            "voz_dias_ausentes": info_a["voz_dias_ausentes"],
            "voz_contatos_nao_carregados_estimado": info_a["voz_contatos_nao_carregados_estimado"],
            "contatos_dia_util_medio": info_a["contatos_dia_util_medio"],
            "cotas_ativas": info_c["cotas_ativas"], "carteira_saldo": info_c["carteira_saldo"],
            "valor_em_atraso": info_c["valor_em_atraso"], "over30_pct": info_c["over30_pct"],
            "over30_pct_saldo": info_c["over30_pct_saldo"],
            "cotas_vendidas_24m": int(vendida.sum()), "credito_vendido_24m": int(c.credito[vendida].sum()),
            "vendas_mes_media": int(round(vendida.sum() / (ND / 30.44))),
            "ticket_medio_credito": int(round(c.credito[vendida].mean())),
            "cotas_canceladas_24m": vol_v["cancelamentos"], "vendedores": c.vend.n,
            "grupos_ativos": info_as["grupos_ativos"], "ocupacao_grupos_pct": info_as["ocupacao_pct"],
            "contemplacoes_24m": info_as["contemplacoes_total"],
            "cotas_fk_orfa": cenario.COTAS_FK_ORFA,
        },
        "arquivos_bytes": tamanhos,
    }
    grava_json(DIR_OUT / "resumo_simulacao.json", resumo)
    if verbose:
        print(f"Simulação concluída em {time.time() - t0:.1f}s")
        for k, v in tamanhos.items():
            print(f"  {k:38s} {v / 1024:9.1f} KB")
        for rid, rel in rels.items():
            print(f"  {rid}: " + ", ".join(f"{k}={cb['n']}" for k, cb in rel["cubos"].items()))
        for k in ["cotas_ativas", "over30_pct", "cotas_vendidas_24m", "ticket_medio_credito", "nps_reportado_out_exato",
                  "nps_corrigido_out_exato", "parcelas_dup", "pct_superestimacao", "propostas_16nov", "propostas_media_segundas",
                  "contatos_dia_util_medio", "grupos_ativos", "respostas_nps_dup_total", "pesquisas_dup_pct_30d"]:
            print(f"  {k}: {resumo['cenario'][k]}")
    return resumo


if __name__ == "__main__":
    executar()
