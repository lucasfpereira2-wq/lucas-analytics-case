"""Relatório de Vendas / Comercial: vendas, cancelamentos, funil, metas e cadastro de vendedores."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .comum import (DATAS, DIM_CANAL, DIM_DATA, DIM_MES, DIM_REG, DIM_SEG, DIM_UF, DIAS_NO_MES, DOW, FERIADO,
                    MES_DO_DIA, ND, NM, cenario, cubo, denso, med, relatorio)
from .cotas import MOTIVOS_CANC, SAZ_MES


def gerar(rng, c):
    v = c.vend
    vendida = c.dia_venda >= 0

    # ------------------------------------------------------------ vendas
    df_v = pd.DataFrame({"data": c.dia_venda[vendida], "segmento": c.seg[vendida], "uf": c.uf[vendida],
                         "canal": c.canal[vendida], "vendedor": c.vdd[vendida],
                         "cotas_vendidas": 1, "credito_vendido": c.credito[vendida]})
    cb_vendas = cubo("vendas", "Vendas efetivadas (contratos de adesão) por dia, segmento, UF, canal e vendedor.",
                     df_v, [DIM_DATA, DIM_SEG, DIM_UF, DIM_CANAL, ("vendedor", "Vendedor", v.ids)],
                     [med("cotas_vendidas", "Cotas vendidas"), med("credito_vendido", "Crédito vendido", "brl")])

    # ------------------------------------------------------------ cancelamentos (pela data do cancelamento)
    canc = c.dia_canc <= ND - 1
    df_c = pd.DataFrame({"data": c.dia_canc[canc], "segmento": c.seg[canc], "uf": c.uf[canc], "canal": c.canal[canc],
                         "motivo": c.motivo[canc], "cotas_canceladas": 1, "credito_cancelado": c.credito[canc]})
    cb_canc = cubo("cancelamentos", "Cancelamentos de cotas pela data do cancelamento, com motivo declarado.",
                   df_c, [DIM_DATA, DIM_SEG, DIM_UF, DIM_CANAL, ("motivo", "Motivo do cancelamento", MOTIVOS_CANC)],
                   [med("cotas_canceladas", "Cotas canceladas"), med("credito_cancelado", "Crédito cancelado", "brl")])

    # ------------------------------------------------------------ funil [data, segmento, regional, canal]
    contratos = np.zeros((ND, 4, 5, 4), dtype=np.int64)
    np.add.at(contratos, (c.dia_venda[vendida], c.seg[vendida], c.reg[vendida], c.canal[vendida]), 1)
    credito_real = np.zeros((ND, 4, 5, 4))
    np.add.at(credito_real, (c.dia_venda[vendida], c.seg[vendida], c.reg[vendida], c.canal[vendida]), c.credito[vendida])
    part = contratos.sum(0).reshape(-1).astype(float) + 1.0            # participação suavizada de cada célula
    part /= part.sum()
    nivel = np.linspace(0.93, 1.07, NM)[MES_DO_DIA] * np.array([SAZ_MES[int(d[5:7])] for d in DATAS])
    f_dow = np.array([1.13, 1.00, 0.99, 1.00, 1.03, 0.36, 0.09])[DOW]
    f_dow = np.where(FERIADO, 0.80 * f_dow, f_dow)                     # o CRM segue captando em feriados (queda leve)
    prop_esp = 1000.0 * nivel * f_dow * np.exp(0.035 * rng.standard_normal(ND))
    seg8 = [d for d in range(ND - 1) if DOW[d] == 0 and d >= ND - 1 - 56]      # 8 segundas anteriores a 16/11
    prop_esp *= cenario.PROPOSTAS_MEDIA / prop_esp[seg8].mean()
    prop_dia = np.rint(prop_esp).astype(np.int64)
    prop_dia[ND - 1] = cenario.PROPOSTAS_D1                            # carga parcial do CRM em 16/11
    leads_dia = rng.poisson(prop_esp * 4.4)                             # leads seguem normais (inclusive em 16/11)
    propostas = rng.multinomial(prop_dia, part).reshape(ND, 4, 5, 4)
    leads = rng.multinomial(leads_dia, part).reshape(ND, 4, 5, 4)
    tx_aprov = np.array([0.42, 0.47, 0.40, 0.52])[None, :, None, None] * np.array([1.0, 1.02, 0.90, 0.97])[None, None, None, :]
    aprovadas = rng.binomial(propostas, np.broadcast_to(tx_aprov, propostas.shape))
    cb_funil = cubo("funil", "Funil comercial diário: leads, propostas, propostas aprovadas e contratos.",
                    denso(["data", "segmento", "regional", "canal"], leads=leads, propostas=propostas,
                          propostas_aprovadas=aprovadas, contratos=contratos),
                    [DIM_DATA, DIM_SEG, DIM_REG, DIM_CANAL],
                    [med("leads", "Leads"), med("propostas", "Propostas"), med("propostas_aprovadas", "Propostas aprovadas"),
                     med("contratos", "Contratos")])

    # ------------------------------------------------------------ metas [mes, segmento, regional, canal]
    real_mes = np.zeros((NM, 4, 5, 4))
    cred_mes = np.zeros((NM, 4, 5, 4))
    np.add.at(real_mes, MES_DO_DIA, contratos)
    np.add.at(cred_mes, MES_DO_DIA, credito_real)
    # atingimento por mês e regional entre ~88% e ~108%
    ating = (0.98 + 0.05 * np.sin(np.arange(NM) / 1.7 + 0.5)[:, None] + rng.uniform(-0.015, 0.015, (NM, 1))
             + 0.032 * np.sin(np.arange(NM)[:, None] / 2.9 + np.arange(5)[None, :] * 1.7) + rng.uniform(-0.015, 0.015, (NM, 5)))
    ating = np.clip(ating, 0.885, 1.078)
    dias_obs = np.bincount(MES_DO_DIA, minlength=NM)
    frac_mes = dias_obs / DIAS_NO_MES                                   # novembro/2026 é parcial (16 de 30 dias)
    part_cotas = real_mes.sum(0) / real_mes.sum(0).sum((0, 2), keepdims=True)          # (seg, canal) dentro da regional
    part_cred = cred_mes.sum(0) / cred_mes.sum(0).sum((0, 2), keepdims=True)
    tot_c = real_mes.sum((1, 3)) / ating / frac_mes[:, None]                            # meta do mês cheio
    tot_v = cred_mes.sum((1, 3)) / ating / frac_mes[:, None]
    meta_cotas = tot_c[:, None, :, None] * part_cotas[None]
    meta_cred = np.rint(tot_v[:, None, :, None] * part_cred[None] / 1000) * 1000
    cb_metas = cubo("metas", "Metas comerciais mensais (mês cheio) por segmento, regional e canal.",
                    denso(["mes", "segmento", "regional", "canal"], meta_cotas=meta_cotas, meta_credito=meta_cred),
                    [DIM_MES, DIM_SEG, DIM_REG, DIM_CANAL],
                    [med("meta_cotas", "Meta de cotas"), med("meta_credito", "Meta de crédito", "brl")])

    # ------------------------------------------------------------ cadastro de vendedores
    cred_vdd = np.bincount(c.vdd[vendida], weights=c.credito[vendida], minlength=v.n)
    meses_eq = ND / 30.44
    from .comum import CANAIS_VENDA, REGIONAIS, UFS
    vendedores = [{"id": v.ids[i], "nome": v.nomes[i], "equipe": v.equipe[i], "regional": REGIONAIS[v.reg[i]],
                   "uf": UFS[v.uf[i]], "canal": CANAIS_VENDA[v.canal[i]],
                   "meta_mensal_credito": int(max(100_000, round(cred_vdd[i] / meses_eq * 1.03 / 10_000) * 10_000))}
                  for i in range(v.n)]

    seg8_real = [int(propostas[d].sum()) for d in seg8]
    info = {
        "propostas_16nov": int(propostas[ND - 1].sum()),
        "propostas_media_segundas": round(float(np.mean(seg8_real)), 1),
        "propostas_segundas_8sem": seg8_real,
        "leads_16nov": int(leads[ND - 1].sum()),
        "contratos_16nov": int(contratos[ND - 1].sum()),
        "atingimento_min": round(float(ating.min()), 3), "atingimento_max": round(float(ating.max()), 3),
        "fracao_mes_parcial": round(float(frac_mes[-1]), 4),
    }
    extras = {
        "vendedores": vendedores,
        "cenario": {
            "incidente": "INC-2033",
            "nota": "Em 16/11/2026 a carga do CRM trouxe 412 propostas contra a média de 1.148 das segundas-feiras; "
                    "leads e contratos do dia estão completos.",
            "propostas_16nov": info["propostas_16nov"], "propostas_media_segundas": info["propostas_media_segundas"],
        },
        "notas": {"metas": "Meta de novembro/2026 refere-se ao mês cheio; o realizado vai até 16/11.",
                  "fracao_mes_parcial": info["fracao_mes_parcial"]},
    }
    rel = relatorio("vendas", [cb_vendas, cb_canc, cb_funil, cb_metas], extras)
    vol = {"leads": int(leads.sum()), "propostas": int(propostas.sum()), "aprovadas": int(aprovadas.sum()),
           "contratos": int(contratos.sum()), "cancelamentos": int(canc.sum())}
    return rel, info, vol
