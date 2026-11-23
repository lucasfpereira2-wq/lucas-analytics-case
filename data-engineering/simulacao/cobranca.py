"""Relatórios de Cobrança: carteira por faixa, roll rate, recebimento, recuperação e safra x MOB."""
from __future__ import annotations

import numpy as np
import pandas as pd

from .comum import (CANAIS_COB, DATAS, DIM_CANAL, DIM_DATA, DIM_MES, DIM_REG, DIM_SEG, DIM_UF, DIAS_NO_MES, DOM, DOW,
                    FAIXAS, FERIADO, INI_MES, MES_DO_DIA, MESES, ND, NM, UFS, aloca, cenario, cubo, denso, med,
                    relatorio)
from .cotas import estado_no_dia

NUF = len(UFS)


def _prox_util(d):
    """Empurra sábados e domingos para a segunda-feira seguinte (liquidação bancária)."""
    d = np.asarray(d)
    dow = DOW[np.clip(d, 0, ND - 1)]
    return d + np.where(dow == 5, 2, np.where(dow == 6, 1, 0))


def gerar_carteira(rng, c):
    # ------------------------------------------------------------ carteira (estoque em datas de fotografia)
    fotos = sorted({d for d in range(ND) if DOW[d] == 6 or DOM[d] == DIAS_NO_MES[MES_DO_DIA[d]] or d >= ND - 35})
    blocos = []
    ult = None
    for d in fotos:
        s, n, p = estado_no_dia(c, d)
        at = (s >= 0) & (s <= 4)
        chave = (c.seg[at] * NUF + c.uf[at]) * 5 + s[at]
        tam = 4 * NUF * 5
        saldo = c.parcela[at] * (c.prazo[at] - p[at])
        atraso = c.parcela[at] * n[at]
        blocos.append(pd.DataFrame({
            "data": d, "chave": np.arange(tam),
            "cotas": np.bincount(chave, minlength=tam),
            "saldo_devedor": np.bincount(chave, weights=saldo, minlength=tam),
            "valor_em_atraso": np.bincount(chave, weights=atraso, minlength=tam)}))
        if d == ND - 1:
            ult = dict(cotas_ativas=int(at.sum()), saldo=float(saldo.sum()), over30=int((s[at] >= 2).sum()),
                       over30_saldo=float(saldo[s[at] >= 2].sum()), em_atraso=float(atraso.sum()),
                       por_seg_reg=np.bincount(c.seg[at] * 5 + c.reg[at], minlength=20).reshape(4, 5))
    df = pd.concat(blocos, ignore_index=True)
    df["segmento"] = df["chave"] // (NUF * 5)
    df["uf"] = (df["chave"] // 5) % NUF
    df["faixa"] = df["chave"] % 5
    cb_cart = cubo("carteira", "Fotografia da carteira ativa por faixa de atraso (domingos, fins de mês e últimos 35 dias).",
                   df, [DIM_DATA, DIM_SEG, DIM_UF, ("faixa", "Faixa de atraso", FAIXAS)],
                   [med("cotas", "Cotas ativas", "int", "estoque"), med("saldo_devedor", "Saldo devedor", "brl", "estoque"),
                    med("valor_em_atraso", "Valor em atraso", "brl", "estoque")])

    # ------------------------------------------------------------ roll rate (fins de mês consecutivos)
    blocos = []
    for m in range(NM - 1):                                            # novembro/2026 é parcial: fica de fora
        o, dst = c.S[m].astype(int), c.S[m + 1].astype(int)
        ok = (o >= 0) & (o <= 4) & (dst <= 5)
        blocos.append(pd.DataFrame({"mes": m, "segmento": c.seg[ok], "regional": c.reg[ok], "faixa_origem": o[ok],
                                    "faixa_destino": dst[ok], "cotas": 1,
                                    "saldo": c.parcela[ok] * (c.prazo[ok] - c.P[m][ok])}))
    cb_roll = cubo("roll_rate", "Transição de faixa entre fins de mês consecutivos (mês = mês de destino; cotas quitadas "
                   "no mês ficam de fora; novembro/2026 parcial não entra).",
                   pd.concat(blocos, ignore_index=True),
                   [DIM_MES, DIM_SEG, DIM_REG, ("faixa_origem", "Faixa de origem", FAIXAS),
                    ("faixa_destino", "Faixa de destino", FAIXAS + ["Cancelada"])],
                   [med("cotas", "Cotas"), med("saldo", "Saldo devedor na origem", "brl")])

    # ------------------------------------------------------------ recebimento [data, segmento, regional]
    prev = np.zeros((ND + 40, 4, 5))
    rec = np.zeros((ND + 40, 4, 5))
    qtd = np.zeros((ND + 40, 4, 5), dtype=np.int64)
    total_parc_emit = 0
    total_parc_pagas = 0
    for m in range(NM):
        s_ant = c.S[m]
        ativo = (s_ant >= 0) & (s_ant <= 4)
        venc = INI_MES[m] + c.venc - 1
        canc_m = c.S[m + 1] == 5
        devido = ativo & ~(canc_m & (c.dia_canc < venc))
        d_prev = _prox_util(venc)
        ok = devido & (d_prev <= ND - 1)
        np.add.at(prev, (d_prev[ok], c.seg[ok], c.reg[ok]), c.parcela[ok])
        total_parc_emit += int(ok.sum())
        k = (c.P[m + 1].astype(int) - c.P[m].astype(int))
        paga = ativo & (k > 0)
        em_dia = c.N[m] == 0
        desloc = np.where(em_dia, rng.choice(np.arange(-6, 4), size=c.n, p=[0.02, 0.03, 0.04, 0.06, 0.09, 0.14, 0.42, 0.10, 0.06, 0.04]),
                          rng.integers(0, 13, c.n))
        d_pag = _prox_util(np.maximum(venc + desloc, 0))
        ok = paga & (d_pag <= ND - 1) & (venc <= ND - 1)
        np.add.at(rec, (d_pag[ok], c.seg[ok], c.reg[ok]), (k * c.parcela)[ok])
        np.add.at(qtd, (d_pag[ok], c.seg[ok], c.reg[ok]), k[ok])
        total_parc_pagas += int(k[ok].sum())
        nova = c.mes_venda == m                                         # adesão: 1ª parcela paga no ato da venda
        np.add.at(prev, (c.dia_venda[nova], c.seg[nova], c.reg[nova]), c.parcela[nova])
        np.add.at(rec, (c.dia_venda[nova], c.seg[nova], c.reg[nova]), c.parcela[nova])
        np.add.at(qtd, (c.dia_venda[nova], c.seg[nova], c.reg[nova]), 1)
        total_parc_emit += int(nova.sum())
        total_parc_pagas += int(nova.sum())
    prev, rec, qtd = np.rint(prev[:ND]), np.rint(rec[:ND]), qtd[:ND]
    # parcelas duplicadas no lote de 16/11 (INC-2031)
    dup_q = np.zeros_like(qtd)
    dup_v = np.zeros_like(rec)
    u = ND - 1
    correto = float(rec[u].sum())
    alvo_dup = int(round(correto * cenario.RECEBIMENTO_SUPERESTIMADO_PCT / 100))
    ticket = np.divide(rec[u], qtd[u], out=np.zeros((4, 5)), where=qtd[u] > 0)
    # o lote reprocessado pesa mais (ou menos) nos tíquetes menores: escolhe a inclinação que fecha quantidade x valor
    melhor = None
    for b in np.linspace(-3, 3, 121):
        cand = aloca(np.array(cenario.PARCELAS_DUPLICADAS), (qtd[u] * np.exp(-b * ticket / ticket[qtd[u] > 0].mean())).reshape(-1)).reshape(4, 5)
        cand = np.minimum(cand, qtd[u])
        erro = abs(float((cand * ticket).sum()) - alvo_dup)
        if cand.sum() == cenario.PARCELAS_DUPLICADAS and (melhor is None or erro < melhor[0]):
            melhor = (erro, cand)
    dup_q[u] = melhor[1]
    dup_v[u] = aloca(np.array(alvo_dup), (dup_q[u] * ticket).reshape(-1)).reshape(4, 5)
    reportado = rec + dup_v
    cb_rec = cubo("recebimento", "Recebimento diário. `valor_recebido` é o valor como reportado (inclui duplicatas); "
                  "`valor_recebido_dup` e `parcelas_dup` isolam a parte duplicada (corrigido = reportado − dup).",
                  denso(["data", "segmento", "regional"], valor_previsto=prev, valor_recebido=reportado,
                        valor_recebido_dup=dup_v, parcelas_pagas=qtd + dup_q, parcelas_dup=dup_q),
                  [DIM_DATA, DIM_SEG, DIM_REG],
                  [med("valor_previsto", "Valor previsto", "brl"), med("valor_recebido", "Valor recebido (reportado)", "brl"),
                   med("valor_recebido_dup", "Valor recebido em duplicidade", "brl"),
                   med("parcelas_pagas", "Parcelas pagas (reportado)"), med("parcelas_dup", "Parcelas duplicadas")])

    # ------------------------------------------------------------ recuperação [data, segmento, regional, canal_cobranca]
    alvo_faixa = [(1, 4), (1, 2), (2, 3), (4, 4), (3, 4)]               # faixas atacadas por canal
    taxa_acion = np.array([0.20, 0.10, 0.085, 0.05, 0.012])
    tx_contato = np.array([0.38, 0.55, 0.31, 0.22, 0.15])
    tx_acordo = np.array([0.05, 0.11, 0.19, 0.14, 0.30])
    tx_cumpr = np.array([0.70, 0.74, 0.68, 0.55, 0.62])
    f_dia = np.array([1.10, 1.05, 1.00, 1.00, 0.95, 0.30, 0.0])[DOW]
    f_dia = np.where(FERIADO, 0.0, f_dia)
    so_digital = np.array([1, 1, 0, 0, 0])                              # sábado: apenas canais digitais
    base = np.zeros((NM, 4, 5, 5))
    vmed = np.zeros((NM, 4, 5, 5))
    for m in range(NM):
        s, n = c.S[m].astype(int), c.N[m].astype(int)
        for k, (a, b) in enumerate(alvo_faixa):
            ok = (s >= a) & (s <= b)
            cnt = np.bincount(c.seg[ok] * 5 + c.reg[ok], minlength=20).reshape(4, 5)
            val = np.bincount(c.seg[ok] * 5 + c.reg[ok], weights=(c.parcela * n)[ok], minlength=20).reshape(4, 5)
            base[m, :, :, k] = cnt
            vmed[m, :, :, k] = np.divide(val, cnt, out=np.zeros((4, 5)), where=cnt > 0)
    lam = base[MES_DO_DIA] * taxa_acion * f_dia[:, None, None, None]
    lam = np.where((DOW == 5)[:, None, None, None], lam * so_digital, lam)
    acion = rng.poisson(lam)
    contatos = rng.binomial(acion, np.broadcast_to(tx_contato, acion.shape))
    acordos = rng.binomial(contatos, np.broadcast_to(tx_acordo, acion.shape))
    v_acordo = np.rint(acordos * vmed[MES_DO_DIA] * rng.uniform(0.85, 1.10, acion.shape))
    cumpr = rng.binomial(acordos, np.broadcast_to(tx_cumpr, acion.shape))
    v_recup = np.rint(np.divide(v_acordo * cumpr, acordos, out=np.zeros(acion.shape), where=acordos > 0) * 0.97)
    cb_recup = cubo("recuperacao", "Esteira de recuperação por canal de cobrança: acionamentos, contatos, acordos e valores.",
                    denso(["data", "segmento", "regional", "canal_cobranca"], acionamentos=acion, contatos_efetivos=contatos,
                          acordos_firmados=acordos, valor_acordado=v_acordo, acordos_cumpridos=cumpr, valor_recuperado=v_recup),
                    [DIM_DATA, DIM_SEG, DIM_REG, ("canal_cobranca", "Canal de cobrança", CANAIS_COB)],
                    [med("acionamentos", "Acionamentos"), med("contatos_efetivos", "Contatos efetivos"),
                     med("acordos_firmados", "Acordos firmados"), med("valor_acordado", "Valor acordado", "brl"),
                     med("acordos_cumpridos", "Acordos cumpridos"), med("valor_recuperado", "Valor recuperado", "brl")])

    rep_u = float(reportado[u].sum())
    info = {
        "parcelas_dup": int(dup_q.sum()),
        "valor_recebido_16nov": int(rep_u),
        "valor_recebido_corrigido_16nov": int(correto),
        "valor_recebido_dup_16nov": int(dup_v.sum()),
        "pct_superestimacao": round(float(dup_v.sum()) / correto * 100, 3),
        "parcelas_pagas_16nov": int(qtd[u].sum() + dup_q[u].sum()),
        "cotas_ativas": ult["cotas_ativas"],
        "carteira_saldo": int(round(ult["saldo"])),
        "valor_em_atraso": int(round(ult["em_atraso"])),
        "over30_pct": round(ult["over30"] / ult["cotas_ativas"] * 100, 2),
        "over30_pct_saldo": round(ult["over30_saldo"] / ult["saldo"] * 100, 2),
        "fotografias_carteira": len(fotos),
    }
    extras = {"cenario": {
        "incidente": "INC-2031",
        "nota": "O lote de 16/11/2026 foi gravado duas vezes: 312 parcelas duplicadas inflam o recebimento do dia em ~1,8%.",
        "parcelas_dup": info["parcelas_dup"], "valor_recebido_16nov": info["valor_recebido_16nov"],
        "valor_recebido_dup_16nov": info["valor_recebido_dup_16nov"], "pct_superestimacao": info["pct_superestimacao"],
        "cotas_fk_orfa": cenario.COTAS_FK_ORFA},
        "datas_fotografia": [DATAS[d] for d in fotos]}
    rel = relatorio("cobranca-carteira", [cb_cart, cb_roll, cb_rec, cb_recup], extras)
    vol = {"parcelas_emitidas": total_parc_emit, "parcelas_pagas": total_parc_pagas, "acionamentos": int(acion.sum()),
           "acordos": int(acordos.sum()), "ativas_seg_reg": ult["por_seg_reg"]}
    return rel, info, vol


def gerar_safra(rng, c):
    vend = c.dia_venda >= 0
    s_fim, _, _ = estado_no_dia(c, ND - 1)
    blocos = []
    for safra in range(NM):
        cot = vend & (c.mes_venda == safra)
        chave = (c.seg[cot] * 5 + c.reg[cot]) * 4 + c.canal[cot]
        base = np.bincount(chave, minlength=80)
        cred = np.bincount(chave, weights=c.credito[cot], minlength=80)
        for mob in range(NM - safra):
            m = safra + mob
            s = (s_fim if m == NM - 1 else c.S[m + 1])[cot].astype(int)
            f = lambda cond: np.bincount(chave[cond], minlength=80)  # noqa: E731
            blocos.append(pd.DataFrame({
                "safra": safra, "mob": mob, "chave": np.arange(80), "cotas_base": base,
                "cotas_ativas": f((s >= 0) & (s <= 4)), "over30": f((s >= 2) & (s <= 4)), "over60": f((s >= 3) & (s <= 4)),
                "over90": f(s == 4), "cancelados_acum": f(s == 5), "credito_base": cred}))
    df = pd.concat(blocos, ignore_index=True)
    df["segmento"] = df["chave"] // 20
    df["regional"] = (df["chave"] // 4) % 5
    df["canal"] = df["chave"] % 4
    cb = cubo("safra_mob", "Safra de venda x meses desde a venda (MOB). `cotas_base` e `credito_base` repetem-se em cada MOB; "
              "triangular: cada safra só tem os MOBs já observados (o último usa a posição de 16/11/2026).",
              df, [("safra", "Safra (mês da venda)", MESES), ("mob", "MOB (meses desde a venda)", [str(i) for i in range(NM)]),
                   DIM_SEG, DIM_REG, DIM_CANAL],
              [med("cotas_base", "Cotas vendidas na safra", "int", "estoque"), med("cotas_ativas", "Cotas ativas", "int", "estoque"),
               med("over30", "Cotas com atraso acima de 30 dias", "int", "estoque"),
               med("over60", "Cotas com atraso acima de 60 dias", "int", "estoque"),
               med("over90", "Cotas com atraso acima de 90 dias", "int", "estoque"),
               med("cancelados_acum", "Cancelamentos acumulados", "int", "estoque"),
               med("credito_base", "Crédito vendido na safra", "brl", "estoque")])
    extras = {"cenario": {
        "incidentes": ["INC-2024", "INC-2031"],
        "nota": "147 cotas com `id_grupo` inexistente ficam fora das análises por grupo e safra; o efeito das parcelas "
                "duplicadas nas curvas é marginal (abaixo de 0,1 p.p.).",
        "cotas_fk_orfa": cenario.COTAS_FK_ORFA},
        "safras_destaque": MESES[1:7]}
    return relatorio("cobranca-safra", [cb], extras), {"cotas_base_total": int(vend.sum())}
