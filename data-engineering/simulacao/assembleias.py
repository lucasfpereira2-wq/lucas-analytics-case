"""Relatório de Assembleias e Contemplações: grupos, contemplações, lances e liberação de crédito (sem anomalias)."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .comum import (DIM_DATA, DIM_MES, DIM_REG, DIM_SEG, DIAS, DOW, MES_DO_DIA, MESES, ND, NM, REGIONAIS, SEGMENTOS, UTIL,
                    aloca, cenario, cubo, denso, med, relatorio)
from .cotas import PRAZOS, TICKET, estado_no_dia

MODALIDADES = ["Sorteio", "Lance livre", "Lance fixo", "Lance embutido"]
TAM_GRUPO = np.array([260, 230, 150, 200])            # participantes médios por grupo
LANCE_LIVRE = np.array([41.0, 33.0, 36.0, 27.0])      # lance vencedor médio (% do crédito)
LAG_LIB = np.array([68, 26, 41, 12])                  # dias médios entre contemplação e liberação
P_LIB = np.array([0.80, 0.90, 0.86, 0.93])


def gerar(rng, c):
    # ------------------------------------------------------------ ocupação mensal (coerente com a carteira simulada)
    ocup = np.zeros((NM, 4, 5), dtype=np.int64)
    for m in range(NM):
        s = estado_no_dia(c, ND - 1)[0] if m == NM - 1 else c.S[m + 1]     # novembro/2026: posição de 16/11
        at = (s >= 0) & (s <= 4)
        ocup[m] = np.bincount(c.seg[at] * 5 + c.reg[at], minlength=20).reshape(4, 5)

    # ------------------------------------------------------------ grupos
    alvo_g = cenario.ALVOS["grupos_ativos"]
    bruto = ocup[-1] / TAM_GRUPO[:, None]
    g_fim = np.maximum(2, np.rint(bruto * alvo_g / bruto.sum())).astype(int)
    grupos = []
    ativos = np.zeros((NM, 4, 5), dtype=np.int64)
    capac = np.zeros((NM, 4, 5), dtype=np.int64)
    num = 1000
    for s in range(4):
        for r in range(5):
            g = g_fim[s, r]
            rel_oc = ocup[:, s, r] / ocup[:, s, r].max()
            g_m = np.maximum.accumulate(np.clip(np.ceil(g * rel_oc ** 0.85), 1, g)).astype(int)
            g_m[-1] = g
            tam = rng.uniform(0.75, 1.25, g)
            ini_idx = np.array([int(np.argmax(g_m > k)) for k in range(g)])            # mês em que o grupo passa a existir
            cap_m = np.array([tam[ini_idx <= m].sum() for m in range(NM)])
            escala = (ocup[:, s, r] / cap_m).max() / rng.uniform(0.90, 0.955)          # ocupação máxima entre 90% e 95,5%
            part = np.maximum(20, np.rint(tam * escala / 5) * 5).astype(int)
            cap_m = np.array([part[ini_idx <= m].sum() for m in range(NM)])
            ativos[:, s, r] = g_m
            capac[:, s, r] = np.maximum(cap_m, ocup[:, s, r])
            ocup_g = np.minimum(aloca(np.array(int(ocup[-1, s, r])), part * rng.uniform(0.85, 1.15, g)), part)
            for k in range(g):
                num += int(rng.integers(1, 6))
                if ini_idx[k] == 0:
                    inicio = pd.Period("2024-11") - int(rng.integers(0, 54))
                else:
                    inicio = pd.Period(MESES[ini_idx[k]])
                prazo = int(rng.choice(PRAZOS[s][0], p=PRAZOS[s][1]))
                meses_vida = (pd.Period(MESES[-1]) - inicio).n + 1
                contempl = int(min(part[k] * 0.7, rng.poisson(meses_vida * (1.0 + part[k] / 110))))
                grupos.append({"grupo": f"G-{num}", "segmento": SEGMENTOS[s], "regional": REGIONAIS[r], "prazo_meses": prazo,
                               "participantes": int(part[k]), "ocupacao_pct": round(float(ocup_g[k]) / float(part[k]) * 100, 1),
                               "lance_medio_pct": round(float(LANCE_LIVRE[s] * rng.uniform(0.82, 1.18)), 1),
                               "contemplados": contempl, "inicio": str(inicio)})
    dias_assembleia = np.zeros((NM, 4, 5), dtype=np.int64)

    # ------------------------------------------------------------ contemplações (eventos individuais)
    # dias de assembleia: dias úteis entre os dias 8 e 26 de cada mês
    eventos = []
    for m in range(NM):
        dd = np.where((MES_DO_DIA == m) & UTIL & (DIAS.day >= 8) & (DIAS.day <= 26))[0]
        mes_cheio = np.where((MES_DO_DIA == m))[0]
        n_dias_cheio = 13 if len(mes_cheio) < 28 else len(dd)             # novembro/2026 parcial
        frac = len(dd) / n_dias_cheio if n_dias_cheio else 0
        for s in range(4):
            for r in range(5):
                g = ativos[m, s, r]
                real = int(rng.binomial(g, min(1.0, frac))) if frac < 1 else int(g)
                dias_assembleia[m, s, r] = real
                if real == 0 or len(dd) == 0:
                    continue
                n_mod = [real, rng.poisson(real * 1.05), rng.poisson(real * 0.45), rng.poisson(real * 0.38)]
                for mod, q in enumerate(n_mod):
                    if q == 0:
                        continue
                    eventos.append(pd.DataFrame({"data": rng.choice(dd, size=q), "segmento": s, "regional": r, "modalidade": mod}))
    ev = pd.concat(eventos, ignore_index=True)
    n = len(ev)
    seg = ev["segmento"].to_numpy()
    mod = ev["modalidade"].to_numpy()
    ev["contemplacoes"] = 1
    ev["credito_contemplado"] = np.rint(TICKET[seg] * np.exp(0.35 * rng.standard_normal(n) - 0.06) / 1000) * 1000
    livre = np.clip(LANCE_LIVRE[seg] + 7.5 * rng.standard_normal(n), 12, 75)
    fixo = rng.choice([25.0, 30.0], size=n, p=[0.6, 0.4])
    embut = np.clip(22 + 4 * rng.standard_normal(n), 10, 30)
    pct = np.select([mod == 1, mod == 2, mod == 3], [livre, fixo, embut], 0.0)
    ev["soma_lance_pct"] = np.rint(pct * 100)                              # centésimos de ponto percentual
    cb_cont = cubo("contemplacoes", "Contemplações por dia de assembleia e modalidade. Lance médio (%) = soma_lance_pct / "
                   "contemplações / 100 (apenas modalidades de lance).",
                   ev, [DIM_DATA, DIM_SEG, DIM_REG, ("modalidade", "Modalidade", MODALIDADES)],
                   [med("contemplacoes", "Contemplações"), med("credito_contemplado", "Crédito contemplado", "brl"),
                    med("soma_lance_pct", "Soma dos lances vencedores (centésimos de p.p.)", "dec")])

    # ------------------------------------------------------------ lances [mes, segmento, regional]
    lance = ev[ev["modalidade"] > 0]
    venc = np.zeros((NM, 4, 5), dtype=np.int64)
    soma_v = np.zeros((NM, 4, 5))
    idx = (MES_DO_DIA[lance["data"].to_numpy()], lance["segmento"].to_numpy(), lance["regional"].to_numpy())
    np.add.at(venc, idx, 1)
    np.add.at(soma_v, idx, lance["soma_lance_pct"].to_numpy())
    ofert = venc + rng.poisson(venc * rng.uniform(9, 15, venc.shape))
    media_v = np.divide(soma_v, venc, out=np.zeros_like(soma_v), where=venc > 0)
    soma_o = soma_v + np.rint((ofert - venc) * media_v * rng.uniform(0.60, 0.72, venc.shape))
    cb_lances = cubo("lances", "Lances ofertados e vencedores por mês. Lance médio (%) = soma / quantidade / 100.",
                     denso(["mes", "segmento", "regional"], lances_ofertados=ofert, lances_vencedores=venc,
                           soma_lance_pct_ofertado=soma_o, soma_lance_pct_vencedor=soma_v),
                     [DIM_MES, DIM_SEG, DIM_REG],
                     [med("lances_ofertados", "Lances ofertados"), med("lances_vencedores", "Lances vencedores"),
                      med("soma_lance_pct_ofertado", "Soma dos lances ofertados (centésimos de p.p.)", "dec"),
                      med("soma_lance_pct_vencedor", "Soma dos lances vencedores (centésimos de p.p.)", "dec")])

    # ------------------------------------------------------------ liberação de crédito [data, segmento, regional]
    # inclui contemplações anteriores ao histórico (reamostradas dos 4 primeiros meses) para não começar vazia
    antes = ev[MES_DO_DIA[ev["data"].to_numpy()] < 4].copy()
    antes["data"] = antes["data"] - 121
    todos = pd.concat([antes, ev], ignore_index=True)
    nt = len(todos)
    st = todos["segmento"].to_numpy()
    libera = rng.random(nt) < P_LIB[st]
    lag = np.maximum(3, np.rint(rng.gamma(4.0, LAG_LIB[st] / 4.0))).astype(int)
    d_lib = todos["data"].to_numpy() + lag
    d_lib = d_lib + np.where(DOW[np.clip(d_lib, 0, ND - 1)] == 5, 2, np.where(DOW[np.clip(d_lib, 0, ND - 1)] == 6, 1, 0))
    ok = libera & (d_lib >= 0) & (d_lib <= ND - 1)
    lib = pd.DataFrame({"data": d_lib[ok], "segmento": st[ok], "regional": todos["regional"].to_numpy()[ok],
                        "creditos_liberados": 1, "valor_liberado": todos["credito_contemplado"].to_numpy()[ok],
                        "soma_dias_ate_liberacao": (d_lib - todos["data"].to_numpy())[ok]})
    cb_lib = cubo("liberacao", "Créditos liberados aos contemplados. Prazo médio (dias) = soma_dias_ate_liberacao / creditos_liberados.",
                  lib, [DIM_DATA, DIM_SEG, DIM_REG],
                  [med("creditos_liberados", "Créditos liberados"), med("valor_liberado", "Valor liberado", "brl"),
                   med("soma_dias_ate_liberacao", "Soma dos dias até a liberação", "int")])

    # ------------------------------------------------------------ grupos [mes, segmento, regional]
    cb_grupos = cubo("grupos", "Posição mensal dos grupos: estoque de grupos, capacidade e ocupação; assembleias realizadas no mês.",
                     denso(["mes", "segmento", "regional"], grupos_ativos=ativos, cotas_capacidade=capac, cotas_ocupadas=ocup,
                           cotas_disponiveis=capac - ocup, assembleias_realizadas=dias_assembleia),
                     [DIM_MES, DIM_SEG, DIM_REG],
                     [med("grupos_ativos", "Grupos ativos", "int", "estoque"), med("cotas_capacidade", "Capacidade de cotas", "int", "estoque"),
                      med("cotas_ocupadas", "Cotas ocupadas", "int", "estoque"), med("cotas_disponiveis", "Cotas disponíveis", "int", "estoque"),
                      med("assembleias_realizadas", "Assembleias realizadas", "int", "fluxo")])

    # amostra de ~150 grupos para a tabela do relatório (maiores de cada segmento/regional primeiro)
    ordem = rng.permutation(len(grupos))[:150]
    amostra = sorted((grupos[i] for i in ordem), key=lambda g: g["grupo"])
    extras = {"grupos": amostra, "total_grupos": len(grupos),
              "cenario": {"nota": "Relatório sem anomalias: todas as tabelas de origem estão no SLA e com testes OK."}}
    info = {"grupos_ativos": int(ativos[-1].sum()), "contemplacoes_total": int(n),
            "ocupacao_pct": round(float(ocup[-1].sum()) / float(capac[-1].sum()) * 100, 1)}
    vol = {"grupos": len(grupos), "assembleias": int(dias_assembleia.sum()), "contemplacoes": int(n),
           "sorteios": int((mod == 0).sum()), "lances_ofertados": int(ofert.sum()), "liberacoes": int(ok.sum())}
    return relatorio("assembleias", [cb_cont, cb_lances, cb_lib, cb_grupos], extras), info, vol
