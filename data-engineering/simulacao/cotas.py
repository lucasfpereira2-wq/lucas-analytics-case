"""Simulação em nível de cota: vendedores, estoque inicial, vendas diárias e cadeia de Markov mensal de atraso."""
from __future__ import annotations

from types import SimpleNamespace

import numpy as np

from .comum import (CANAIS_VENDA, DIAS_NO_MES, DOM, DOW, FERIADO, INI_MES, MES_DO_DIA, MESES, ND, NM, P_UF, REG_DA_UF,
                    REGIONAIS, UFS, cenario)

N_ESTOQUE = 38_500            # cotas ativas já envelhecidas em 30/11/2024
VENDAS_MES = 2_385            # nível médio mensal (calibrado para ~56 mil em 24 meses)
ROLL_BASE = 0.0366            # prob. mensal Em dia -> 1–30 (calibrada para over30 ~6,8%)

SAZ_MES = {1: 0.82, 2: 0.93, 3: 1.14, 4: 1.00, 5: 1.02, 6: 0.97, 7: 0.96, 8: 1.02, 9: 1.02, 10: 1.10, 11: 1.12, 12: 0.95}
PART_CANAL = np.array([0.30, 0.36, 0.18, 0.16])                      # Loja, Representante, Digital, Parceiro
MIX_SEG_CANAL = np.array([                                           # colunas: Imóvel, Auto, Pesada, Serviços
    [0.32, 0.50, 0.07, 0.11],
    [0.36, 0.40, 0.16, 0.08],
    [0.20, 0.54, 0.02, 0.24],
    [0.25, 0.56, 0.08, 0.11],
])
FATOR_PESADA_REG = np.array([0.8, 1.0, 1.2, 1.8, 0.9])               # agro puxa Pesada no Centro-Oeste
TICKET = np.array([285_000, 69_000, 235_000, 18_000])                # crédito médio por segmento
SIGMA_TICKET = np.array([0.45, 0.35, 0.40, 0.40])
TAXA_ADM = np.array([0.20, 0.16, 0.17, 0.22])
PRAZOS = [([120, 150, 180, 200, 220], [0.10, 0.20, 0.35, 0.25, 0.10]),
          ([48, 60, 72, 84], [0.15, 0.30, 0.35, 0.20]),
          ([84, 100, 120], [0.30, 0.45, 0.25]),
          ([36, 40, 48], [0.45, 0.25, 0.30])]
VENCIMENTOS = np.array([5, 10, 15, 20, 25])
P_VENC = [0.15, 0.30, 0.25, 0.20, 0.10]
RISCO_SEG = np.array([0.78, 1.15, 0.88, 1.55])
RISCO_CANAL = np.array([0.88, 0.98, 1.38, 1.10])
MOTIVOS_CANC = ["Desistência", "Inadimplência", "Arrependimento em 7 dias", "Dificuldade financeira",
                "Insatisfação com contemplação"]

# transições mensais por faixa de origem: [cura total, melhora 1 faixa, permanece, rola, cancela]
TRANS = np.array([
    [0.000, 0.000, 0.0000, ROLL_BASE, 0.0020],   # Em dia (permanece = resto)
    [0.560, 0.000, 0.100, 0.335, 0.005],         # 1–30
    [0.240, 0.100, 0.080, 0.565, 0.015],         # 31–60
    [0.110, 0.050, 0.060, 0.720, 0.060],         # 61–90
    [0.035, 0.015, 0.030, 0.720, 0.200],         # 90+
])

NOMES = ["Ana", "Bruno", "Carla", "Daniel", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João",
         "Karina", "Leonardo", "Mariana", "Nathan", "Olívia", "Paulo", "Queila", "Rodrigo", "Sabrina", "Tiago",
         "Úrsula", "Vinícius", "Wesley", "Yasmin", "Alessandra", "Caio", "Débora", "Emanuel", "Fabiana", "Gustavo",
         "Helena", "Igor", "Juliana", "Kleber", "Larissa", "Marcelo", "Natália", "Otávio", "Priscila", "Renato"]
SOBRENOMES = ["Almeida", "Barbosa", "Cardoso", "Dias", "Esteves", "Ferreira", "Gomes", "Henriques", "Ibrahim",
              "Jesus", "Lacerda", "Machado", "Nascimento", "Oliveira", "Pacheco", "Queiroz", "Ribeiro", "Santana",
              "Teixeira", "Uchôa", "Vasconcelos", "Xavier", "Zanetti", "Araújo", "Batista", "Campos", "Duarte",
              "Fonseca", "Guimarães", "Lopes", "Moraes", "Neves", "Pires", "Rezende", "Siqueira", "Toledo",
              "Viana", "Brandão", "Coelho", "Moura"]


def _vendedores(rng):
    n = cenario.ALVOS["vendedores"]
    qtd = np.maximum(2, np.rint(P_UF * n)).astype(int)
    qtd[0] += n - qtd.sum()                                            # ajuste em SP
    uf = np.repeat(np.arange(len(UFS)), qtd)
    canal = rng.choice(4, size=n, p=[0.30, 0.34, 0.16, 0.20])
    peso = np.minimum(rng.pareto(1.9, n), 4.0) + 0.30                                   # produtividade desigual (Pareto)
    for _ in range(40):                                                # IPF: marginais de UF e de canal
        peso *= (P_UF / np.bincount(uf, weights=peso, minlength=len(UFS)))[uf]
        peso *= (PART_CANAL / np.bincount(canal, weights=peso, minlength=4))[canal]
    peso /= peso.sum()
    combos = rng.choice(len(NOMES) * len(SOBRENOMES), size=n, replace=False)
    nomes = [f"{NOMES[c // len(SOBRENOMES)]} {SOBRENOMES[c % len(SOBRENOMES)]}" for c in combos]
    reg = REG_DA_UF[uf]
    equipe = []
    cont = {}
    for i in range(n):
        k = (reg[i], canal[i])
        cont[k] = cont.get(k, 0) + 1
        equipe.append(f"{CANAIS_VENDA[canal[i]]} · {REGIONAIS[reg[i]]} {((cont[k] - 1) // 9) + 1:02d}")
    return SimpleNamespace(n=n, uf=uf, canal=canal, reg=reg, peso=peso, nomes=nomes, equipe=equipe,
                           ids=[f"V{i + 1:03d}" for i in range(n)])


def _atributos(rng, seg, n):
    """Crédito, prazo, parcela e dia de vencimento para um vetor de segmentos."""
    sig = SIGMA_TICKET[seg]
    credito = np.exp(np.log(TICKET[seg]) - sig ** 2 / 2 + sig * rng.standard_normal(n))
    passo = np.where(seg == 3, 500, 1000)
    credito = np.maximum(np.rint(credito / passo) * passo, np.where(seg == 3, 6_000, 25_000)).astype(np.int64)
    prazo = np.zeros(n, dtype=np.int16)
    for s, (vals, ps) in enumerate(PRAZOS):
        m = seg == s
        prazo[m] = rng.choice(vals, size=int(m.sum()), p=ps)
    parcela = np.round(credito * (1 + TAXA_ADM[seg]) / prazo, 2)
    venc = rng.choice(VENCIMENTOS, size=n, p=P_VENC)
    return credito, prazo, parcela, venc


def _segmento(rng, canal, reg):
    p = MIX_SEG_CANAL[canal].copy()
    p[:, 2] *= FATOR_PESADA_REG[reg]
    p /= p.sum(1, keepdims=True)
    u = rng.random(len(canal))
    return (u[:, None] > np.cumsum(p, axis=1)).sum(1).clip(0, 3)


def simular(rng) -> SimpleNamespace:
    vend = _vendedores(rng)

    # ---------------------------------------------------------------- vendas diárias
    tend = np.linspace(0.93, 1.07, NM)
    saz = np.array([SAZ_MES[int(m[5:7])] for m in MESES])
    alvo_mes = VENDAS_MES * tend * saz
    peso_dia = np.array([1.08, 1.00, 1.00, 1.02, 1.10, 0.42, 0.10])[DOW].astype(float)
    peso_dia[FERIADO] = 0.12
    fim_mes = (DIAS_NO_MES[MES_DO_DIA] - DOM) < 6                       # esforço de fechamento de mês
    peso_dia[fim_mes] *= 1.22
    lam = np.zeros(ND)
    for m in range(NM):
        d = np.where(MES_DO_DIA == m)[0]
        # novembro/2026 é parcial: o peso total considera o mês cheio (dias úteis restantes ~ média)
        total_peso = peso_dia[d].sum() * (DIAS_NO_MES[m] / len(d)) if len(d) < DIAS_NO_MES[m] else peso_dia[d].sum()
        lam[d] = alvo_mes[m] * peso_dia[d] / total_peso
    n_dia = rng.poisson(lam)
    nv = int(n_dia.sum())
    dia_v = np.repeat(np.arange(ND), n_dia)
    vdd_v = rng.choice(vend.n, size=nv, p=vend.peso)
    uf_v, canal_v, reg_v = vend.uf[vdd_v], vend.canal[vdd_v], vend.reg[vdd_v]
    seg_v = _segmento(rng, canal_v, reg_v)

    # ---------------------------------------------------------------- estoque inicial
    n0 = N_ESTOQUE
    uf_0 = rng.choice(len(UFS), size=n0, p=P_UF)
    reg_0 = REG_DA_UF[uf_0]
    canal_0 = rng.choice(4, size=n0, p=[0.34, 0.40, 0.10, 0.16])
    seg_0 = _segmento(rng, canal_0, reg_0)

    n = n0 + nv
    seg = np.concatenate([seg_0, seg_v])
    uf = np.concatenate([uf_0, uf_v])
    reg = REG_DA_UF[uf]
    canal = np.concatenate([canal_0, canal_v])
    vdd = np.concatenate([np.full(n0, -1), vdd_v])
    dia_venda = np.concatenate([np.full(n0, -1), dia_v])               # -1 = antes do histórico
    mes_venda = np.where(dia_venda >= 0, MES_DO_DIA[np.maximum(dia_venda, 0)], -1)
    credito, prazo, parcela, venc = _atributos(rng, seg, n)

    safra_ruim = (mes_venda >= 1) & (mes_venda <= 6)                    # safras de jan a jun/2025
    risco = RISCO_SEG[seg] * RISCO_CANAL[canal] * np.where(safra_ruim, 1.28, 1.0)
    risco = risco * np.exp(0.45 * rng.standard_normal(n) - 0.45 ** 2 / 2)

    # estado: -1 ainda não vendida | 0..4 faixa | 5 cancelada | 6 encerrada (quitada)
    S = np.full((NM + 1, n), -1, dtype=np.int8)
    N = np.zeros((NM + 1, n), dtype=np.int16)                           # parcelas em atraso
    P = np.zeros((NM + 1, n), dtype=np.int16)                           # parcelas pagas
    idade = 1 + np.floor((prazo[:n0] - 2) * rng.beta(1.1, 2.0, n0)).astype(int)
    s0 = rng.choice(5, size=n0, p=[0.885, 0.048, 0.022, 0.013, 0.032])
    n_ini = np.where(s0 == 4, 4 + rng.geometric(0.3, n0) - 1, s0)
    S[0, :n0] = s0
    N[0, :n0] = n_ini
    P[0, :n0] = np.clip(idade - n_ini, 1, prazo[:n0] - 1)

    dia_canc = np.full(n, 10 ** 6)
    motivo = np.full(n, -1, dtype=np.int8)
    arrep = (dia_venda >= 0) & (rng.random(n) < 0.012)
    d_arr = np.minimum(dia_venda + rng.integers(1, 8, n),
                       INI_MES[np.maximum(mes_venda, 0)] + DIAS_NO_MES[np.maximum(mes_venda, 0)] - 1)
    arrep &= d_arr <= ND - 1
    dia_canc[arrep] = d_arr[arrep]
    motivo[arrep] = 2

    for m in range(NM):
        s_ant, n_ant, p_ant = S[m], N[m].astype(int), P[m].astype(int)
        ativo = (s_ant >= 0) & (s_ant <= 4)
        f = np.minimum(n_ant, 4)
        pr = TRANS[f].copy()                                            # [n, 5]
        pr[:, 3] = np.where(f == 0, pr[:, 3] * risco, np.minimum(0.93, pr[:, 3] * risco ** 0.3))
        pr[:, 4] *= np.where(f == 0, 0.7 + 0.3 * risco, 1.0)
        sobra = np.clip(1 - pr[:, 3] - pr[:, 4], 0, 1)
        cura = pr[:, :3].sum(1)
        esc = np.divide(sobra, cura, out=np.zeros(n), where=cura > 0)
        pr[:, :3] *= esc[:, None]
        pr[f == 0, 2] = sobra[f == 0]
        res = (rng.random(n)[:, None] > np.cumsum(pr, axis=1)).sum(1).clip(0, 4)   # 0 cura 1 melhora 2 fica 3 rola 4 cancela
        d_c = INI_MES[m] + rng.integers(0, DIAS_NO_MES[m], n)           # dia do cancelamento dentro do mês
        cancela = ativo & (res == 4) & (d_c <= ND - 1)
        congela = ativo & (res == 4) & ~cancela                         # cancelaria depois de 16/11: ainda não ocorreu
        n_novo = np.select([res == 0, res == 1, res == 2, res == 3], [0, np.where(f == 4, 3, n_ant - 1), n_ant, n_ant + 1], n_ant)
        pagas = np.where(res <= 3, 1 + n_ant - n_novo, 0)
        p_novo = p_ant + pagas
        n_novo = np.minimum(n_novo, np.maximum(prazo - np.minimum(p_novo, prazo), 0))   # atraso nunca excede o que falta pagar
        encerra = ativo & (res <= 3) & (p_novo >= prazo)
        s_novo = np.minimum(n_novo, 4)
        s_novo = np.where(encerra, 6, s_novo)
        n_novo = np.where(encerra, 0, n_novo)
        s_novo = np.where(cancela, 5, s_novo)
        mant = ~ativo | congela
        S[m + 1] = np.where(mant, s_ant, s_novo)
        N[m + 1] = np.where(mant | cancela, n_ant, n_novo)
        P[m + 1] = np.where(mant | cancela, p_ant, np.minimum(p_novo, prazo))
        dia_canc[cancela] = d_c[cancela]
        # motivo: atraso longo -> inadimplência; demais -> desistência / dificuldade / insatisfação
        u = rng.random(n)
        mot = np.where(f >= 3, 1, np.where(f >= 1, np.where(u < 0.7, 3, 0), np.select([u < 0.55, u < 0.80], [0, 3], 4)))
        motivo[cancela] = mot[cancela]
        # vendas do mês entram Em dia com a 1ª parcela (adesão) paga
        novo = mes_venda == m
        S[m + 1, novo] = 0
        N[m + 1, novo] = 0
        P[m + 1, novo] = 1
        arr_m = novo & arrep
        S[m + 1, arr_m] = 5

    return SimpleNamespace(
        n=n, n0=n0, nv=nv, seg=seg, uf=uf, reg=reg, canal=canal, vdd=vdd, dia_venda=dia_venda, mes_venda=mes_venda,
        credito=credito, prazo=prazo.astype(int), parcela=parcela, venc=venc, risco=risco, S=S, N=N, P=P,
        dia_canc=dia_canc, motivo=motivo, vend=vend, n_dia=n_dia,
    )


def estado_no_dia(c, d: int):
    """Estado efetivo (faixa, parcelas em atraso, parcelas pagas) de cada cota no dia `d` (índice)."""
    m = MES_DO_DIA[d]
    vend_m = c.mes_venda == m
    canc_m = (c.S[m + 1] == 5) & (c.S[m] != 5)
    usa_novo = np.where(canc_m, d >= c.dia_canc, (DOM[d] >= c.venc) | vend_m)
    s = np.where(usa_novo, c.S[m + 1], c.S[m]).astype(int)
    n = np.where(usa_novo, c.N[m + 1], c.N[m]).astype(int)
    p = np.where(usa_novo, c.P[m + 1], c.P[m]).astype(int)
    antes_canc = vend_m & canc_m & ~usa_novo                             # arrependimento ainda não efetivado
    s = np.where(antes_canc, 0, s)
    p = np.where(antes_canc, 1, p)
    nao_existe = vend_m & (d < c.dia_venda)
    s = np.where(nao_existe, -1, s)
    return s, n, p
