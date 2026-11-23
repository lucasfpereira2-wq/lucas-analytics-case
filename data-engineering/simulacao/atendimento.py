"""Relatório de Atendimento: contatos, motivos, perfil horário, NPS (com duplicidade), CSAT e motivos de detração."""
from __future__ import annotations

import numpy as np

from .comum import (CANAIS_ATEND, DATAS, DIAS_SEMANA, DIM_CANAL_AT, DIM_DATA, DIM_MES, DIM_SEG, DOM, DOW, FERIADO,
                    MES_DO_DIA, MESES, ND, NM, UTIL, aloca, cenario, cubo, denso, med, relatorio)

MOTIVOS = ["2ª via de boleto", "Dúvida sobre contemplação", "Oferta de lance", "Negociação de parcelas", "Cancelamento",
           "Atualização cadastral", "Transferência de cota", "Liberação de crédito", "Reclamação", "Informações do grupo"]
MOTIVOS_DETRACAO = ["Demora na contemplação", "Atendimento demorado", "Falta de clareza nas taxas",
                    "Dificuldade com boletos", "Cobrança indevida", "Problemas no app"]
MIX_MOTIVO = np.array([0.22, 0.13, 0.08, 0.12, 0.05, 0.08, 0.03, 0.07, 0.06, 0.16])
# ajuste do mix por canal (Voz, WhatsApp, Chat, E-mail, App)
AJ_CANAL = np.array([
    [0.80, 1.00, 0.90, 1.35, 1.50, 0.90, 1.20, 1.20, 1.40, 0.85],
    [1.15, 1.00, 0.95, 1.05, 0.80, 1.00, 0.90, 0.90, 0.80, 1.10],
    [1.00, 1.05, 1.00, 0.90, 0.90, 1.10, 1.00, 1.00, 1.00, 1.05],
    [0.60, 0.90, 0.60, 0.80, 1.40, 1.40, 1.60, 1.50, 1.80, 0.80],
    [1.45, 1.10, 1.60, 0.60, 0.40, 1.00, 0.50, 0.70, 0.50, 1.30],
])
# ajuste do mix por segmento (Imóvel, Auto, Pesada, Serviços)
AJ_SEG = np.array([
    [0.90, 1.15, 1.20, 0.90, 0.80, 1.00, 1.10, 1.50, 1.00, 1.00],
    [1.05, 1.00, 1.00, 1.05, 1.00, 1.00, 1.00, 0.90, 1.00, 1.00],
    [0.90, 1.00, 1.20, 0.90, 0.80, 1.00, 1.20, 1.30, 0.90, 1.00],
    [1.15, 0.70, 0.50, 1.25, 1.60, 1.00, 0.70, 0.60, 1.20, 0.95],
])
TMA_CANAL = np.array([380, 540, 460, 720, 240])
TMA_MOTIVO = np.array([0.62, 1.05, 1.10, 1.45, 1.50, 0.80, 1.35, 1.40, 1.70, 0.75])
TME_CANAL = np.array([58, 150, 80, 900, 25])
FCR_MOTIVO = np.array([0.92, 0.78, 0.74, 0.58, 0.52, 0.85, 0.49, 0.45, 0.41, 0.88])
FCR_CANAL = np.array([0.00, 0.01, 0.00, -0.08, 0.03])
ABAND_CANAL = np.array([0.068, 0.040, 0.060, 0.012, 0.020])
PART_SEG = np.array([0.30, 0.47, 0.08, 0.15])


def _perfil_horario():
    h = np.arange(24)
    g = lambda mu, sd: np.exp(-0.5 * ((h - mu) / sd) ** 2)  # noqa: E731
    voz = (g(10.5, 1.8) + 0.9 * g(14.8, 2.0)) * ((h >= 8) & (h <= 20))
    wpp = g(11, 2.6) + 0.9 * g(16, 3.0) + 0.35 * g(20.5, 1.5) + 0.01
    chat = (g(11, 2.2) + g(15.5, 2.5)) * ((h >= 7) & (h <= 22))
    mail = g(10, 3.0) + 0.7 * g(15, 3.5) + 0.03
    app = 0.7 * g(12.5, 2.5) + g(19.8, 2.2) + 0.02
    p = np.stack([voz, wpp, chat, mail, app])
    p[1:] *= (h >= 6)                                   # canais digitais operam das 6h à meia-noite
    return p / p.sum(1, keepdims=True)


def gerar(rng, ativas_fim: int):
    nc, ns = len(CANAIS_ATEND), 4
    t = np.arange(ND) / (ND - 1)
    # ------------------------------------------------------------ volume diário por canal e segmento
    part_canal = np.stack([0.40 - 0.10 * t, 0.24 + 0.09 * t, 0.13 - 0.02 * t, 0.09 - 0.03 * t, 0.14 + 0.06 * t], axis=1)
    f_dow = np.array([[1.12, 1.05, 1.00, 0.98, 0.95, 0.30, 0.05],
                      [1.08, 1.03, 1.00, 0.99, 0.98, 0.55, 0.32],
                      [1.08, 1.03, 1.00, 0.99, 0.97, 0.45, 0.22],
                      [1.15, 1.05, 1.00, 0.98, 0.95, 0.35, 0.25],
                      [1.02, 1.00, 1.00, 1.00, 1.02, 0.75, 0.60]])[:, DOW].T          # [ND, canal]
    f_fer = np.array([0.08, 0.35, 0.25, 0.30, 0.65])
    f_dow = np.where(FERIADO[:, None], f_fer[None, :], f_dow)
    nivel = (0.86 + 0.24 * t) * (1 + 0.05 * np.isin(DOM, [4, 5, 9, 10, 14, 15, 19, 20, 24, 25]))
    nivel = nivel * np.exp(0.03 * rng.standard_normal(ND))
    lam = 9500.0 * nivel[:, None] * part_canal * f_dow                                  # [ND, canal]
    lam *= cenario.ALVOS["contatos_atendimento_dia_util"] / lam[UTIL].sum(1).mean()
    lam_cs = lam[:, :, None] * PART_SEG[None, None, :]
    cont = rng.poisson(lam_cs)                                                           # [ND, canal, seg]
    # INC-2032: telefonia parada — sem registros de Voz em 14, 15 e 16/11/2026
    d_ini = DATAS.index(cenario.TELEFONIA_PARADA_DESDE)
    voz_perdido = int(cont[d_ini:, 0].sum())
    cont[d_ini:, 0, :] = 0

    # ------------------------------------------------------------ perfil horário e abandono
    perfil = _perfil_horario()                                                           # [canal, 24]
    hora = rng.multinomial(cont, np.broadcast_to(perfil[None, :, None, :], (ND, nc, ns, 24)))
    carga = perfil / perfil.max(1, keepdims=True)
    p_ab = ABAND_CANAL[:, None] * (0.55 + 1.1 * carga)                                   # mais abandono no pico
    f_ab_dia = (1.25 - 0.30 * t) * np.where(DOW == 0, 1.18, 1.0) * np.exp(0.10 * rng.standard_normal(ND))
    p_ab_full = np.clip(p_ab[None, :, None, :] * f_ab_dia[:, None, None, None], 0, 0.6)
    aband_h = rng.binomial(hora, np.broadcast_to(p_ab_full, hora.shape))
    aband = aband_h.sum(-1)
    atend = cont - aband

    # ------------------------------------------------------------ motivos
    pm = MIX_MOTIVO[None, None, :] * AJ_CANAL[:, None, :] * AJ_SEG[None, :, :]           # [canal, seg, motivo]
    pm = np.broadcast_to(pm[None], (ND, nc, ns, 10)).copy()
    pm[:, :, :, 0] *= (1 + 0.35 * np.isin(DOM, [3, 4, 5, 8, 9, 10, 13, 14, 15, 18, 19, 20, 23, 24, 25]))[:, None, None]
    pm[:, :, :, 1] *= (1 + 0.30 * ((DOM >= 16) & (DOM <= 27)))[:, None, None]            # pós-assembleias
    pm[:, :, :, 2] *= (1 + 0.40 * ((DOM >= 8) & (DOM <= 18)))[:, None, None]             # janela de lances
    pm /= pm.sum(-1, keepdims=True)
    cont_m = rng.multinomial(cont, pm)                                                   # [ND, canal, seg, motivo]
    aband_m = aloca(aband, cont_m)
    atend_m = cont_m - aband_m
    assert (atend_m >= 0).all()
    tma = TMA_CANAL[None, :, None, None] * TMA_MOTIVO[None, None, None, :] * (1.04 - 0.08 * t)[:, None, None, None]
    tma = tma * np.exp(0.06 * rng.standard_normal(cont_m.shape))
    soma_tma_m = np.rint(atend_m * tma).astype(np.int64)
    fcr = np.clip(FCR_MOTIVO[None, None, None, :] + FCR_CANAL[None, :, None, None] + (0.03 * t - 0.015)[:, None, None, None], 0.05, 0.98)
    fcr_m = rng.binomial(atend_m, np.broadcast_to(fcr, atend_m.shape))
    tme = TME_CANAL[None, :, None] * f_ab_dia[:, None, None] * np.exp(0.08 * rng.standard_normal(cont.shape))
    soma_tme = np.rint(atend * tme).astype(np.int64)

    cb_contatos = cubo(
        "contatos", "Contatos diários por canal e segmento. TMA = soma_tma_seg / atendidos; TME = soma_tme_seg / atendidos; "
        "FCR = resolvidos_fcr / base_fcr.",
        denso(["data", "canal_atendimento", "segmento"], contatos=cont, atendidos=atend, abandonados=aband,
              soma_tma_seg=soma_tma_m.sum(-1), soma_tme_seg=soma_tme, base_fcr=atend, resolvidos_fcr=fcr_m.sum(-1)),
        [DIM_DATA, DIM_CANAL_AT, DIM_SEG],
        [med("contatos", "Contatos"), med("atendidos", "Atendidos"), med("abandonados", "Abandonados"),
         med("soma_tma_seg", "Soma do tempo de atendimento (s)", "seg"), med("soma_tme_seg", "Soma do tempo de espera (s)", "seg"),
         med("base_fcr", "Base de FCR (contatos atendidos)"), med("resolvidos_fcr", "Resolvidos no primeiro contato")])
    cb_motivos = cubo(
        "motivos", "Contatos por motivo (a soma por motivo fecha com o cubo `contatos`). Tempo médio = soma_tma_seg / contatos; "
        "resolução = resolvidos_fcr / contatos (contatos abandonados contam com tempo zero e sem resolução).",
        denso(["data", "canal_atendimento", "segmento", "motivo"], contatos=cont_m, soma_tma_seg=soma_tma_m, resolvidos_fcr=fcr_m),
        [DIM_DATA, ("motivo", "Motivo do contato", MOTIVOS), DIM_CANAL_AT, DIM_SEG],
        [med("contatos", "Contatos"), med("soma_tma_seg", "Soma do tempo de atendimento (s)", "seg"),
         med("resolvidos_fcr", "Resolvidos no primeiro contato")])
    hora_mes = np.zeros((NM, 7, nc, ns, 24), dtype=np.int64)
    ab_mes = np.zeros((NM, 7, nc, ns, 24), dtype=np.int64)
    np.add.at(hora_mes, (MES_DO_DIA, DOW), hora)
    np.add.at(ab_mes, (MES_DO_DIA, DOW), aband_h)
    cb_hora = cubo(
        "hora", "Perfil de contatos por mês, dia da semana e hora do dia.",
        denso(["mes", "dia_semana", "canal_atendimento", "segmento", "hora"], contatos=hora_mes, abandonados=ab_mes),
        [DIM_MES, ("dia_semana", "Dia da semana", DIAS_SEMANA), ("hora", "Hora do dia", [f"{h:02d}" for h in range(24)]),
         DIM_CANAL_AT, DIM_SEG],
        [med("contatos", "Contatos"), med("abandonados", "Abandonados")])

    # ------------------------------------------------------------ NPS (com duplicidade desde 01/10/2026)
    tx_resp = np.array([0.016, 0.024, 0.022, 0.012, 0.060])                              # App responde mais
    lam_n = lam_cs * tx_resp[None, :, None]
    resp = rng.poisson(lam_n)
    nps_alvo = 55 + 2.6 * np.sin(np.arange(NM) / 1.9 + 0.6) + rng.uniform(-0.6, 0.6, NM)
    nps_alvo[MESES.index("2026-10")] = cenario.NPS_CORRIGIDO_OUT
    nps_alvo[MESES.index("2026-11")] = 55.4
    of_canal = np.array([-6.0, 1.0, -2.0, -9.0, 6.5])
    of_seg = np.array([1.5, 0.5, 2.0, -5.0])
    w = lam_n.sum(0) / lam_n.sum()
    of = of_canal[:, None] + of_seg[None, :]
    of = of - (of * w).sum()
    alvo = (nps_alvo[MES_DO_DIA][:, None, None] + of[None]) / 100                        # P - D
    p_neu = 0.20 - 0.10 * (alvo - 0.55)
    p_pro = (1 - p_neu + alvo) / 2
    p_det = 1 - p_neu - p_pro
    probs = np.stack([p_pro, p_neu, p_det], axis=-1)
    pnd = rng.multinomial(resp, probs)                                                   # [ND, canal, seg, 3]
    pro, neu, det = pnd[..., 0].copy(), pnd[..., 1].copy(), pnd[..., 2].copy()

    m_out = MESES.index(cenario.NPS_DUP_INICIO[:7])
    dias_out = np.where(MES_DO_DIA == m_out)[0]

    def nps(p, d, r):
        return float(p.sum() - d.sum()) / float(r.sum()) * 100

    # ajuste fino: NPS correto de cada mês no alvo (outubro/2026 = 56,0), movendo respostas entre promotor e neutro
    nps_alvo = np.clip(nps_alvo, 52.3, 57.7)
    for m in range(NM):
        dias_m = np.where(MES_DO_DIA == m)[0]
        tol = 0.08 if m == m_out else 0.25
        for _ in range(4000):
            v = nps(pro[dias_m], det[dias_m], (pro + neu + det)[dias_m])
            if abs(v - nps_alvo[m]) <= tol:
                break
            d = int(rng.choice(dias_m)); k = int(rng.integers(0, nc)); s = int(rng.integers(0, ns))
            if v > nps_alvo[m] and pro[d, k, s] > 2:
                pro[d, k, s] -= 1; neu[d, k, s] += 1
            elif v < nps_alvo[m] and neu[d, k, s] > 0:
                pro[d, k, s] += 1; neu[d, k, s] -= 1

    # duplicatas: concentradas em promotores do App (90%), WhatsApp promotores (6%), App neutros (3%) e detratores (1%)
    pro_dup, neu_dup, det_dup = np.zeros_like(pro), np.zeros_like(neu), np.zeros_like(det)
    d0 = DATAS.index(cenario.NPS_DUP_INICIO)
    r_out = float((pro + neu + det)[dias_out].sum())
    pd_out = float(pro[dias_out].sum() - det[dias_out].sum())
    comp = np.array([0.90, 0.06, 0.03, 0.01])                                            # App pro, WhatsApp pro, App neu, App det
    liq = comp[0] + comp[1] - comp[3]                                                    # efeito líquido em (P - D)
    alvo_rep = cenario.NPS_REPORTADO_OUT / 100
    total_dup_out = int(round((alvo_rep * r_out - pd_out) / (liq - alvo_rep)))
    taxa_dup = total_dup_out / r_out
    for d_sel, total in [(dias_out, total_dup_out),
                         (np.arange(dias_out[-1] + 1, ND), None)]:
        base_r = float((pro + neu + det)[d_sel].sum())
        tot = total if total is not None else int(round(taxa_dup * base_r))
        partes = aloca(np.array(tot), comp)
        for alvo_arr, fonte, k, qtd_k in [(pro_dup, pro, 4, partes[0]), (pro_dup, pro, 1, partes[1]),
                                          (neu_dup, neu, 4, partes[2]), (det_dup, det, 4, partes[3])]:
            pesos = fonte[d_sel, k, :].astype(float)
            al = aloca(np.array(int(qtd_k)), pesos.reshape(-1)).reshape(pesos.shape)
            al = np.minimum(al, fonte[d_sel, k, :])                                     # duplicata sempre copia resposta real
            alvo_arr[d_sel, k, :] += al
    # garante o arredondamento exato do valor reportado de outubro
    for _ in range(500):
        v = nps((pro + pro_dup)[dias_out], (det + det_dup)[dias_out], (pro + neu + det + pro_dup + neu_dup + det_dup)[dias_out])
        if abs(v - cenario.NPS_REPORTADO_OUT) <= 0.08:
            break
        d = int(rng.choice(dias_out)); s = int(rng.integers(0, ns))
        if v < cenario.NPS_REPORTADO_OUT and pro_dup[d, 4, s] < pro[d, 4, s]:
            pro_dup[d, 4, s] += 1
        elif v > cenario.NPS_REPORTADO_OUT and pro_dup[d, 4, s] > 0:
            pro_dup[d, 4, s] -= 1
    assert pro_dup[:d0].sum() == 0 and neu_dup[:d0].sum() == 0 and det_dup[:d0].sum() == 0

    cb_nps = cubo(
        "nps", "Respostas de NPS como reportadas (incluem duplicatas desde 01/10/2026). As colunas *_dup isolam as "
        "respostas duplicadas: corrigido = reportado − dup. NPS = (promotores − detratores) / respostas × 100.",
        denso(["data", "canal_atendimento", "segmento"], promotores=pro + pro_dup, neutros=neu + neu_dup,
              detratores=det + det_dup, promotores_dup=pro_dup, neutros_dup=neu_dup, detratores_dup=det_dup),
        [DIM_DATA, DIM_CANAL_AT, DIM_SEG],
        [med("promotores", "Promotores (reportado)"), med("neutros", "Neutros (reportado)"),
         med("detratores", "Detratores (reportado)"), med("promotores_dup", "Promotores duplicados"),
         med("neutros_dup", "Neutros duplicados"), med("detratores_dup", "Detratores duplicados")])

    # ------------------------------------------------------------ CSAT
    tx_csat = np.array([0.100, 0.137, 0.124, 0.065, 0.143])
    r_csat = rng.binomial(atend, np.broadcast_to(tx_csat[None, :, None], atend.shape))
    p_sat = np.clip(np.array([0.80, 0.86, 0.83, 0.74, 0.89])[None, :, None] + np.array([0.01, 0.0, 0.01, -0.03])[None, None, :]
                    + (0.02 * np.sin(np.arange(NM) / 2.4))[MES_DO_DIA][:, None, None], 0, 1)
    sat = rng.binomial(r_csat, p_sat)
    notas = np.rint(sat * rng.uniform(4.52, 4.62, sat.shape) + (r_csat - sat) * rng.uniform(2.0, 2.5, sat.shape)).astype(np.int64)
    cb_csat = cubo(
        "csat", "Pesquisa de satisfação pós-atendimento (notas de 1 a 5). CSAT = satisfeitos / respostas; nota média = soma_notas / respostas.",
        denso(["data", "canal_atendimento", "segmento"], respostas=r_csat, satisfeitos=sat, soma_notas=notas),
        [DIM_DATA, DIM_CANAL_AT, DIM_SEG],
        [med("respostas", "Respostas"), med("satisfeitos", "Satisfeitos (notas 4 e 5)"), med("soma_notas", "Soma das notas", "dec")])

    # ------------------------------------------------------------ motivos de detração [mes, motivo, segmento]
    det_rep = det + det_dup
    det_ms = np.zeros((NM, ns), dtype=np.int64)
    np.add.at(det_ms, MES_DO_DIA, det_rep.sum(1))
    p_det_m = np.array([[0.34, 0.20, 0.17, 0.10, 0.08, 0.11],
                        [0.30, 0.22, 0.15, 0.13, 0.09, 0.11],
                        [0.36, 0.19, 0.18, 0.09, 0.08, 0.10],
                        [0.14, 0.24, 0.22, 0.17, 0.13, 0.10]])
    detr = rng.multinomial(det_ms, np.broadcast_to(p_det_m[None], (NM, ns, 6)))          # [mes, seg, motivo]
    cb_detr = cubo(
        "detracao", "Motivo principal declarado pelos detratores (soma = detratores reportados do mês).",
        denso(["mes", "segmento", "motivo_detracao"], detratores=detr),
        [DIM_MES, ("motivo_detracao", "Motivo de detração", MOTIVOS_DETRACAO), DIM_SEG],
        [med("detratores", "Detratores")])

    def nps_mes(m, com_dup):
        dd = MES_DO_DIA == m
        p = pro[dd].sum() + (pro_dup[dd].sum() if com_dup else 0)
        dt = det[dd].sum() + (det_dup[dd].sum() if com_dup else 0)
        r = (pro + neu + det)[dd].sum() + ((pro_dup + neu_dup + det_dup)[dd].sum() if com_dup else 0)
        return float(p - dt) / float(r) * 100

    serie = [round(nps_mes(m, False), 2) for m in range(NM)]
    dup_total = int((pro_dup + neu_dup + det_dup).sum())
    dup_out = int((pro_dup + neu_dup + det_dup)[dias_out].sum())
    info = {
        "nps_reportado_out": int(round(nps_mes(m_out, True))),
        "nps_corrigido_out": int(round(nps_mes(m_out, False))),
        "nps_reportado_out_exato": round(nps_mes(m_out, True), 2),
        "nps_corrigido_out_exato": round(nps_mes(m_out, False), 2),
        "nps_reportado_nov": round(nps_mes(NM - 1, True), 2),
        "nps_corrigido_nov": round(nps_mes(NM - 1, False), 2),
        "nps_corrigido_serie_mensal": serie,
        "respostas_nps_out_reportadas": int((pro + neu + det + pro_dup + neu_dup + det_dup)[dias_out].sum()),
        "respostas_nps_dup_out": dup_out,
        "respostas_nps_dup_total": dup_total,
        "respostas_nps_dup_app_promotores": int(pro_dup[:, 4].sum()),
        "voz_dias_ausentes": DATAS[d_ini:],
        "voz_contatos_nao_carregados_estimado": voz_perdido,
        "contatos_dia_util_medio": int(round(cont[UTIL & (np.arange(ND) < d_ini)].sum((1, 2)).mean())),
        "contatos_total": int(cont.sum()),
    }
    extras = {"cenario": {
        "incidentes": ["INC-2032", "INC-2027", "INC-2019"],
        "nota_voz": "Canal Voz sem dados em 14, 15 e 16/11/2026 (rotina de telefonia parada).",
        "nota_nps": "Respostas de NPS duplicadas desde 01/10/2026, concentradas em promotores do canal App.",
        "voz_dias_ausentes": DATAS[d_ini:],
        "nps_dup_inicio": cenario.NPS_DUP_INICIO,
        "nps_reportado_out": info["nps_reportado_out"], "nps_corrigido_out": info["nps_corrigido_out"],
        "respostas_nps_dup_total": dup_total, "whatsapp_dup_pct": cenario.WHATSAPP_DUP_PCT}}
    rel = relatorio("atendimento", [cb_contatos, cb_motivos, cb_hora, cb_nps, cb_csat, cb_detr], extras)
    vol = {"canal": cont.sum((0, 2)), "nps_true": int((pro + neu + det).sum()), "nps_dup": dup_total,
           "csat": int(r_csat.sum()), "contatos": int(cont.sum()), "nps_30d": int((pro + neu + det + pro_dup + neu_dup + det_dup)[ND - 30:].sum()),
           "csat_30d": int(r_csat[ND - 30:].sum()), "nps_dup_30d": int((pro_dup + neu_dup + det_dup)[ND - 30:].sum())}
    return rel, info, vol
