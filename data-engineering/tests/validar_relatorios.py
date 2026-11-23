"""Validação e reconciliação dos JSONs gerados pela simulação (meta, 5 relatórios e resumo).

Uso: python3 data-engineering/tests/validar_relatorios.py   (código de saída 1 se alguma checagem falhar)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))
from catalog import cenario, tabelas  # noqa: E402

DADOS = RAIZ.parent / "app" / "public" / "data"
LIMITE_BYTES = 5.2 * 1024 * 1024
RELATORIOS = ["vendas", "cobranca-carteira", "cobranca-safra", "atendimento", "assembleias"]
CUBOS_ESPERADOS = {
    "vendas": {"vendas": (["data", "segmento", "uf", "canal", "vendedor"], ["cotas_vendidas", "credito_vendido"]),
               "cancelamentos": (["data", "segmento", "uf", "canal", "motivo"], ["cotas_canceladas", "credito_cancelado"]),
               "funil": (["data", "segmento", "regional", "canal"], ["leads", "propostas", "propostas_aprovadas", "contratos"]),
               "metas": (["mes", "segmento", "regional", "canal"], ["meta_cotas", "meta_credito"])},
    "cobranca-carteira": {
        "carteira": (["data", "segmento", "uf", "faixa"], ["cotas", "saldo_devedor", "valor_em_atraso"]),
        "roll_rate": (["mes", "segmento", "regional", "faixa_origem", "faixa_destino"], ["cotas", "saldo"]),
        "recebimento": (["data", "segmento", "regional"],
                        ["valor_previsto", "valor_recebido", "valor_recebido_dup", "parcelas_pagas", "parcelas_dup"]),
        "recuperacao": (["data", "segmento", "regional", "canal_cobranca"],
                        ["acionamentos", "contatos_efetivos", "acordos_firmados", "valor_acordado", "acordos_cumpridos", "valor_recuperado"])},
    "cobranca-safra": {"safra_mob": (["safra", "mob", "segmento", "regional", "canal"],
                                     ["cotas_base", "cotas_ativas", "over30", "over60", "over90", "cancelados_acum", "credito_base"])},
    "atendimento": {
        "contatos": (["data", "canal_atendimento", "segmento"],
                     ["contatos", "atendidos", "abandonados", "soma_tma_seg", "soma_tme_seg", "base_fcr", "resolvidos_fcr"]),
        "motivos": (["data", "motivo", "canal_atendimento", "segmento"], ["contatos", "soma_tma_seg", "resolvidos_fcr"]),
        "hora": (["mes", "dia_semana", "hora", "canal_atendimento", "segmento"], ["contatos", "abandonados"]),
        "nps": (["data", "canal_atendimento", "segmento"],
                ["promotores", "neutros", "detratores", "promotores_dup", "neutros_dup", "detratores_dup"]),
        "csat": (["data", "canal_atendimento", "segmento"], ["respostas", "satisfeitos", "soma_notas"]),
        "detracao": (["mes", "motivo_detracao", "segmento"], ["detratores"])},
    "assembleias": {
        "contemplacoes": (["data", "segmento", "regional", "modalidade"], ["contemplacoes", "credito_contemplado", "soma_lance_pct"]),
        "lances": (["mes", "segmento", "regional"],
                   ["lances_ofertados", "lances_vencedores", "soma_lance_pct_ofertado", "soma_lance_pct_vencedor"]),
        "liberacao": (["data", "segmento", "regional"], ["creditos_liberados", "valor_liberado", "soma_dias_ate_liberacao"]),
        "grupos": (["mes", "segmento", "regional"],
                   ["grupos_ativos", "cotas_capacidade", "cotas_ocupadas", "cotas_disponiveis", "assembleias_realizadas"])},
}

resultados: list[tuple[bool, str, str]] = []


def checa(cond, nome: str, detalhe: str = ""):
    resultados.append((bool(cond), nome, str(detalhe)))
    return bool(cond)


def df(rel: dict, cubo: str) -> pd.DataFrame:
    """DataFrame do cubo com as dimensões já traduzidas para os valores do dicionário."""
    cb = rel["cubos"][cubo]
    d = pd.DataFrame(cb["colunas"])
    for dim in cb["dims"]:
        d[dim["nome"]] = np.array(dim["valores"], dtype=object)[d[dim["nome"]].to_numpy()]
    return d


def valida_schema(rid: str, rel: dict):
    checa(rel.get("relatorio") == rid, f"[{rid}] campo relatorio", rel.get("relatorio"))
    checa(set(rel["cubos"]) == set(CUBOS_ESPERADOS[rid]), f"[{rid}] conjunto de cubos", sorted(rel["cubos"]))
    for cid, cb in rel["cubos"].items():
        p = f"[{rid}.{cid}]"
        dims = [d["nome"] for d in cb["dims"]]
        meds = [m["nome"] for m in cb["medidas"]]
        esp = CUBOS_ESPERADOS[rid].get(cid)
        if esp:
            checa(dims == esp[0], f"{p} dimensões", dims)
            checa(meds == esp[1], f"{p} medidas", meds)
        checa(cb["id"] == cid and cb["n"] > 0, f"{p} id e n > 0", cb["n"])
        checa(set(cb["colunas"]) == set(dims + meds), f"{p} colunas = dims + medidas", sorted(cb["colunas"]))
        tam = {k: len(v) for k, v in cb["colunas"].items()}
        checa(all(t == cb["n"] for t in tam.values()), f"{p} todas as colunas com tamanho n", tam)
        ok_idx = ok_int = ok_pos = True
        for d in cb["dims"]:
            a = np.asarray(cb["colunas"][d["nome"]])
            ok_idx &= bool(len(d["valores"]) > 0 and a.min() >= 0 and a.max() < len(d["valores"]))
            ok_idx &= len(set(d["valores"])) == len(d["valores"])
        for m in cb["medidas"]:
            a = np.asarray(cb["colunas"][m["nome"]])
            ok_int &= bool(np.issubdtype(a.dtype, np.integer))
            ok_pos &= bool(a.min() >= 0)
            ok_int &= m["formato"] in ("int", "brl", "pct", "dec", "seg") and m["tipo"] in ("fluxo", "estoque")
        checa(ok_idx, f"{p} índices de dimensão dentro do dicionário")
        checa(ok_int, f"{p} medidas inteiras e metadados válidos")
        checa(ok_pos, f"{p} sem valores negativos")
        chave = pd.DataFrame({d: cb["colunas"][d] for d in dims})
        checa(not chave.duplicated().any(), f"{p} sem chave de dimensões repetida")
        m_arr = np.column_stack([cb["colunas"][m] for m in meds])
        checa(bool((m_arr != 0).any(axis=1).all()), f"{p} sem linhas totalmente zeradas")


def main() -> int:
    meta = json.loads((DADOS / "meta.json").read_text(encoding="utf-8"))
    rels = {}
    for rid in RELATORIOS:
        caminho = DADOS / "relatorios" / f"{rid}.json"
        tam = caminho.stat().st_size
        checa(tam <= LIMITE_BYTES, f"[{rid}] tamanho do arquivo <= 5,2 MB", f"{tam / 1024 / 1024:.2f} MB")
        rels[rid] = json.loads(caminho.read_text(encoding="utf-8"))
        valida_schema(rid, rels[rid])
    resumo = json.loads((RAIZ / "output" / "resumo_simulacao.json").read_text(encoding="utf-8"))
    FIM = cenario.FIM_HISTORICO

    # ---------------------------------------------------------------- meta
    ufs = [u["sigla"] for u in meta["ufs"]]
    checa(len(ufs) == 27 and len(set(ufs)) == 27, "[meta] 27 UFs", len(ufs))
    checa([r["nome"] for r in meta["regionais"]] == list(cenario.REGIONAIS), "[meta] regionais do cenário")
    for r in meta["regionais"]:
        s = sum(meta["pesos_uf"][u] for u in r["ufs"])
        checa(abs(s - 1) < 1e-4, f"[meta] pesos_uf somam 1 em {r['nome']}", round(s, 6))
    checa(abs(sum(meta["pesos_regional"].values()) - 1) < 1e-4, "[meta] pesos_regional somam 1")
    checa(meta["relatorios"] == tabelas.RELATORIOS and meta["seed"] == cenario.SEED, "[meta] relatórios e seed")
    checa(all(u["nome"] and u["regional"] in cenario.REGIONAIS for u in meta["ufs"]), "[meta] UFs com nome e regional")

    # ---------------------------------------------------------------- vendas x safra x funil
    v = df(rels["vendas"], "vendas")
    sm = df(rels["cobranca-safra"], "safra_mob")
    fu = df(rels["vendas"], "funil")
    mob0 = sm[sm["mob"] == "0"]
    checa(v["cotas_vendidas"].sum() == mob0["cotas_base"].sum(), "[reconciliação] cotas vendidas = cotas_base da safra (MOB 0)",
          f"{v['cotas_vendidas'].sum()} x {mob0['cotas_base'].sum()}")
    por_mes_v = v.assign(mes=v["data"].str[:7]).groupby("mes")["cotas_vendidas"].sum()
    por_mes_s = mob0.groupby("safra")["cotas_base"].sum()
    checa(por_mes_v.equals(por_mes_s.rename_axis("mes").rename("cotas_vendidas")), "[reconciliação] vendas por mês = cotas_base por safra")
    checa(v["credito_vendido"].sum() == mob0["credito_base"].sum(), "[reconciliação] crédito vendido = credito_base (MOB 0)")
    checa(v["cotas_vendidas"].sum() == fu["contratos"].sum(), "[reconciliação] contratos do funil = cotas vendidas")
    chv = ["segmento", "canal"]
    a = v.groupby(chv)["cotas_vendidas"].sum()
    b = mob0.groupby(chv)["cotas_base"].sum()
    checa((a.sort_index().values == b.sort_index().values).all(), "[reconciliação] vendas por segmento x canal = safra")
    vend = rels["vendas"]["extras"]["vendedores"]
    dim_v = next(d for d in rels["vendas"]["cubos"]["vendas"]["dims"] if d["nome"] == "vendedor")["valores"]
    checa([x["id"] for x in vend] == dim_v and len(vend) == cenario.ALVOS["vendedores"], "[vendas] extras.vendedores alinhado à dimensão", len(vend))
    checa(len({x["nome"] for x in vend}) == len(vend), "[vendas] nomes de vendedores únicos")
    tot = v["cotas_vendidas"].sum()
    checa(abs(tot / cenario.ALVOS["cotas_vendidas_24m"] - 1) < 0.05, "[vendas] cotas vendidas em 24 meses perto do alvo", tot)
    mix = (v.groupby("segmento")["cotas_vendidas"].sum() / tot).round(3).to_dict()
    checa(abs(mix["Auto"] - 0.48) < 0.03 and abs(mix["Imóvel"] - 0.30) < 0.03, "[vendas] mix de segmentos", mix)
    sp = v.loc[v["uf"] == "SP", "cotas_vendidas"].sum() / tot
    checa(abs(sp - 0.28) < 0.02, "[vendas] participação de SP ~28%", round(float(sp), 3))
    metas = df(rels["vendas"], "metas")
    real = v.assign(mes=v["data"].str[:7], regional=v["uf"].map({u["sigla"]: u["regional"] for u in meta["ufs"]}))
    at = (real.groupby(["mes", "regional"])["cotas_vendidas"].sum() / metas.groupby(["mes", "regional"])["meta_cotas"].sum())
    at = at[at.index.get_level_values("mes") < FIM[:7]]
    checa(at.min() > 0.86 and at.max() < 1.10, "[vendas] atingimento de meta entre ~88% e ~108% (meses fechados)",
          f"{at.min():.3f} a {at.max():.3f}")

    # ---------------------------------------------------------------- cenário 4: propostas
    prop = fu.groupby("data")[["leads", "propostas", "contratos"]].sum()
    seg = pd.date_range(end=pd.Timestamp(FIM) - pd.Timedelta(days=7), periods=8, freq="7D").strftime("%Y-%m-%d")
    media = prop.loc[seg, "propostas"].mean()
    checa(prop.loc[FIM, "propostas"] == cenario.PROPOSTAS_D1, "[cenário 4] propostas em 16/11 = 412", int(prop.loc[FIM, "propostas"]))
    checa(abs(media / cenario.PROPOSTAS_MEDIA - 1) <= 0.03, "[cenário 4] média das 8 segundas anteriores ~ 1.148 (±3%)", round(float(media), 1))
    checa(prop.loc[FIM, "leads"] > 0.85 * prop.loc[seg, "leads"].mean(), "[cenário 4] leads de 16/11 normais",
          f"{int(prop.loc[FIM, 'leads'])} x média {prop.loc[seg, 'leads'].mean():.0f}")
    checa(prop.loc[FIM, "contratos"] > 0.6 * prop.loc[seg, "contratos"].mean(), "[cenário 4] contratos de 16/11 normais",
          f"{int(prop.loc[FIM, 'contratos'])} x média {prop.loc[seg, 'contratos'].mean():.0f}")

    # ---------------------------------------------------------------- cenário 1: parcelas duplicadas
    rec = df(rels["cobranca-carteira"], "recebimento")
    dia = rec.groupby("data")[["valor_recebido", "valor_recebido_dup", "parcelas_pagas", "parcelas_dup"]].sum()
    fora = dia.drop(index=FIM)
    checa(fora["parcelas_dup"].sum() == 0 and fora["valor_recebido_dup"].sum() == 0, "[cenário 1] duplicatas só em 16/11/2026")
    checa(dia.loc[FIM, "parcelas_dup"] == cenario.PARCELAS_DUPLICADAS, "[cenário 1] parcelas duplicadas = 312", int(dia.loc[FIM, "parcelas_dup"]))
    pct = dia.loc[FIM, "valor_recebido_dup"] / (dia.loc[FIM, "valor_recebido"] - dia.loc[FIM, "valor_recebido_dup"]) * 100
    checa(abs(pct - cenario.RECEBIMENTO_SUPERESTIMADO_PCT) <= 0.05, "[cenário 1] superestimação de 1,8% (±0,05)", round(float(pct), 3))
    checa((rec["valor_recebido_dup"] <= rec["valor_recebido"]).all() and (rec["parcelas_dup"] <= rec["parcelas_pagas"]).all(),
          "[cenário 1] parte duplicada nunca maior que o reportado")

    # ---------------------------------------------------------------- carteira, roll rate e safra
    cart = df(rels["cobranca-carteira"], "carteira")
    ult = cart[cart["data"] == FIM]
    o30 = ult.loc[ult["faixa"].isin(["31–60", "61–90", "90+"]), "cotas"].sum() / ult["cotas"].sum() * 100
    checa(abs(o30 - cenario.ALVOS["inadimplencia_over30_pct"]) < 0.5, "[carteira] over30 em 16/11 perto de 6,8%", round(float(o30), 2))
    checa(abs(ult["cotas"].sum() / cenario.ALVOS["cotas_ativas"] - 1) < 0.03, "[carteira] cotas ativas perto de 78 mil", int(ult["cotas"].sum()))
    datas_foto = set(cart["data"])
    todos = pd.date_range(cenario.INICIO_HISTORICO, FIM)
    esperadas = {d.strftime("%Y-%m-%d") for d in todos if d.dayofweek == 6 or d.is_month_end or d > todos[-1] - pd.Timedelta(days=35)}
    checa(datas_foto == esperadas, "[carteira] fotografias: domingos + fins de mês + últimos 35 dias", len(datas_foto))
    checa((cart["valor_em_atraso"] <= cart["saldo_devedor"]).all(), "[carteira] valor em atraso <= saldo devedor")
    checa((cart.loc[cart["faixa"] == "Em dia", "valor_em_atraso"] == 0).all(), "[carteira] faixa Em dia sem valor em atraso")
    rr = df(rels["cobranca-carteira"], "roll_rate")
    orig = rr.groupby("mes")["cotas"].sum()
    checa(len(orig) == 23 and FIM[:7] not in orig.index, "[roll rate] 23 meses fechados (novembro parcial fora)", len(orig))
    checa((sm["over30"] >= sm["over60"]).all() and (sm["over60"] >= sm["over90"]).all(), "[safra] over30 >= over60 >= over90")
    checa((sm["cotas_ativas"] >= sm["over30"]).all() and (sm["cotas_ativas"] + sm["cancelados_acum"] <= sm["cotas_base"]).all(),
          "[safra] ativas + cancelados <= base e over30 <= ativas")
    safras = sorted(sm["safra"].unique())
    tri = all(sm.loc[sm["safra"] == s, "mob"].astype(int).max() == len(safras) - 1 - i for i, s in enumerate(safras))
    checa(len(safras) == 24 and tri, "[safra] triangular: cada safra só tem MOBs observados")
    base_const = sm.groupby(["safra", "segmento", "regional", "canal"])["cotas_base"].nunique().max()
    checa(base_const == 1, "[safra] cotas_base constante em todos os MOBs da safra")
    g6 = sm[sm["mob"] == "6"].groupby("safra")[["over30", "cotas_ativas"]].sum()
    tx6 = g6["over30"] / g6["cotas_ativas"]
    ruins = tx6[(tx6.index >= "2025-01") & (tx6.index <= "2025-06")].mean()
    demais = tx6[(tx6.index < "2025-01") | (tx6.index > "2025-06")].mean()
    checa(ruins > demais * 1.15, "[safra] safras do 1º semestre de 2025 piores no MOB 6", f"{ruins:.3%} x {demais:.3%}")
    recup = df(rels["cobranca-carteira"], "recuperacao")
    checa((recup["contatos_efetivos"] <= recup["acionamentos"]).all() and (recup["acordos_firmados"] <= recup["contatos_efetivos"]).all()
          and (recup["acordos_cumpridos"] <= recup["acordos_firmados"]).all() and (recup["valor_recuperado"] <= recup["valor_acordado"]).all(),
          "[recuperação] funil coerente (acionamentos >= contatos >= acordos >= cumpridos)")
    checa(set(recup["canal_cobranca"]) == set(cenario.CANAIS_COBRANCA), "[recuperação] todos os canais de cobrança presentes")

    # ---------------------------------------------------------------- atendimento
    ct = df(rels["atendimento"], "contatos")
    mo = df(rels["atendimento"], "motivos")
    ho = df(rels["atendimento"], "hora")
    ch = ["data", "canal_atendimento", "segmento"]
    for medida in ["contatos", "soma_tma_seg", "resolvidos_fcr"]:
        a = ct.groupby(ch)[medida].sum()
        b = mo.groupby(ch)[medida].sum().reindex(a.index, fill_value=0)
        checa((a == b).all() and mo[medida].sum() == ct[medida].sum(), f"[reconciliação] soma de motivos = contatos ({medida})",
              f"{mo[medida].sum()} x {ct[medida].sum()}")
    checa((ct["contatos"] == ct["atendidos"] + ct["abandonados"]).all(), "[atendimento] contatos = atendidos + abandonados")
    checa((ct["resolvidos_fcr"] <= ct["base_fcr"]).all(), "[atendimento] resolvidos_fcr <= base_fcr")
    chm = ["mes", "canal_atendimento", "segmento"]
    for medida in ["contatos", "abandonados"]:
        a = ct.assign(mes=ct["data"].str[:7]).groupby(chm)[medida].sum()
        b = ho.groupby(chm)[medida].sum().reindex(a.index, fill_value=0)
        checa((a == b).all(), f"[reconciliação] perfil horário = contatos por mês ({medida})")
    checa(len(set(mo["motivo"])) == 10, "[atendimento] 10 motivos de contato", len(set(mo["motivo"])))
    util = ct[pd.to_datetime(ct["data"]).dt.dayofweek < 5].groupby("data")["contatos"].sum()
    checa(abs(util.mean() / cenario.ALVOS["contatos_atendimento_dia_util"] - 1) < 0.08, "[atendimento] contatos por dia útil perto de 9.500",
          round(float(util.mean())))
    # cenário 2: telefonia parada
    parada = pd.date_range(cenario.TELEFONIA_PARADA_DESDE, FIM).strftime("%Y-%m-%d").tolist()
    checa(len(parada) == cenario.TELEFONIA_DIAS_PARADA, "[cenário 2] 3 dias de telefonia parada", parada)
    for nome, d in [("contatos", ct), ("motivos", mo)]:
        voz = d[(d["canal_atendimento"] == "Voz") & d["data"].isin(parada)]
        checa(len(voz) == 0, f"[cenário 2] sem registros de Voz em 14, 15 e 16/11 ({nome})", len(voz))
        outros = d[(d["canal_atendimento"] != "Voz") & d["data"].isin(parada)].groupby("data")["contatos"].sum()
        checa(len(outros) == 3 and (outros > 0).all(), f"[cenário 2] demais canais presentes nos 3 dias ({nome})")
    vesp = ct[(ct["canal_atendimento"] == "Voz") & (ct["data"] == "2026-11-13")]["contatos"].sum()
    checa(vesp > 1500, "[cenário 2] Voz normal em 13/11 (véspera)", int(vesp))
    # cenário 3: NPS
    nps = df(rels["atendimento"], "nps")
    nps["mes"] = nps["data"].str[:7]
    antes = nps[nps["data"] < cenario.NPS_DUP_INICIO]
    checa(antes[["promotores_dup", "neutros_dup", "detratores_dup"]].to_numpy().sum() == 0, "[cenário 3] sem duplicatas antes de 01/10/2026")
    checa((nps["promotores_dup"] <= nps["promotores"]).all() and (nps["neutros_dup"] <= nps["neutros"]).all()
          and (nps["detratores_dup"] <= nps["detratores"]).all(), "[cenário 3] duplicatas <= reportado")
    m = nps.groupby("mes")[["promotores", "neutros", "detratores", "promotores_dup", "neutros_dup", "detratores_dup"]].sum()
    resp = m["promotores"] + m["neutros"] + m["detratores"]
    dup = m["promotores_dup"] + m["neutros_dup"] + m["detratores_dup"]
    rep = (m["promotores"] - m["detratores"]) / resp * 100
    cor = (m["promotores"] - m["promotores_dup"] - m["detratores"] + m["detratores_dup"]) / (resp - dup) * 100
    out = cenario.NPS_DUP_INICIO[:7]
    checa(round(rep[out]) == cenario.NPS_REPORTADO_OUT, "[cenário 3] NPS reportado de outubro/2026 = 62", round(float(rep[out]), 2))
    checa(round(cor[out]) == cenario.NPS_CORRIGIDO_OUT, "[cenário 3] NPS corrigido de outubro/2026 = 56", round(float(cor[out]), 2))
    hist = cor[cor.index < out]
    checa(hist.min() >= 51.5 and hist.max() <= 58.5, "[cenário 3] NPS correto entre ~52 e ~58 antes de outubro", f"{hist.min():.1f} a {hist.max():.1f}")
    d_out = nps[nps["mes"] >= out]
    app_pro = d_out.loc[d_out["canal_atendimento"] == "App", "promotores_dup"].sum()
    tot_dup = d_out[["promotores_dup", "neutros_dup", "detratores_dup"]].to_numpy().sum()
    checa(app_pro / tot_dup > 0.8, "[cenário 3] duplicatas concentradas em promotores do App", f"{app_pro / tot_dup:.1%} de {tot_dup}")
    det = df(rels["atendimento"], "detracao")
    a = det.groupby(["mes", "segmento"])["detratores"].sum()
    b = nps.groupby(["mes", "segmento"])["detratores"].sum().reindex(a.index, fill_value=0)
    checa((a == b).all() and det["detratores"].sum() == nps["detratores"].sum(), "[reconciliação] motivos de detração = detratores do NPS")
    cs = df(rels["atendimento"], "csat")
    checa((cs["satisfeitos"] <= cs["respostas"]).all() and (cs["soma_notas"] <= 5 * cs["respostas"]).all()
          and (cs["soma_notas"] >= cs["respostas"]).all(), "[atendimento] CSAT coerente (notas entre 1 e 5)")

    # ---------------------------------------------------------------- assembleias (cenário 5: sem anomalias)
    co = df(rels["assembleias"], "contemplacoes")
    la = df(rels["assembleias"], "lances")
    gr = df(rels["assembleias"], "grupos")
    li = df(rels["assembleias"], "liberacao")
    venc = co[co["modalidade"] != "Sorteio"].assign(mes=lambda x: x["data"].str[:7])
    a = la.groupby(["mes", "segmento", "regional"])["lances_vencedores"].sum()
    b = venc.groupby(["mes", "segmento", "regional"])["contemplacoes"].sum().reindex(a.index, fill_value=0)
    checa((a == b).all(), "[reconciliação] lances vencedores = contemplações por lance")
    checa(la["soma_lance_pct_vencedor"].sum() == venc["soma_lance_pct"].sum(), "[reconciliação] soma dos lances vencedores bate entre cubos")
    checa((co.loc[co["modalidade"] == "Sorteio", "soma_lance_pct"] == 0).all(), "[assembleias] sorteio sem lance")
    checa((la["lances_vencedores"] <= la["lances_ofertados"]).all(), "[assembleias] vencedores <= ofertados")
    checa((gr["cotas_capacidade"] == gr["cotas_ocupadas"] + gr["cotas_disponiveis"]).all(), "[assembleias] capacidade = ocupadas + disponíveis")
    g_fim = gr[gr["mes"] == FIM[:7]]
    checa(abs(g_fim["grupos_ativos"].sum() / cenario.ALVOS["grupos_ativos"] - 1) < 0.05, "[assembleias] grupos ativos perto de 410", int(g_fim["grupos_ativos"].sum()))
    checa(g_fim["cotas_ocupadas"].sum() == ult["cotas"].sum(), "[reconciliação] cotas ocupadas nos grupos = cotas ativas da carteira (16/11)",
          f"{g_fim['cotas_ocupadas'].sum()} x {ult['cotas'].sum()}")
    mens = co.assign(mes=co["data"].str[:7]).groupby("mes")["contemplacoes"].sum()
    fechado = mens[mens.index < FIM[:7]]
    checa(fechado.min() > 0.5 * fechado.median() and fechado.max() < 1.8 * fechado.median(), "[cenário 5] contemplações sem quebras ou picos anômalos",
          f"{fechado.min()} a {fechado.max()} por mês")
    checa(len(set(co["data"])) > 250 and li["creditos_liberados"].sum() <= len(co) * 50, "[cenário 5] série de assembleias e liberações completa")
    grupos = rels["assembleias"]["extras"]["grupos"]
    campos = {"grupo", "segmento", "regional", "prazo_meses", "participantes", "ocupacao_pct", "lance_medio_pct", "contemplados", "inicio"}
    checa(120 <= len(grupos) <= 180 and all(set(g) == campos for g in grupos) and len({g["grupo"] for g in grupos}) == len(grupos),
          "[assembleias] extras.grupos com ~150 grupos e campos completos", len(grupos))
    checa(all(0 < g["ocupacao_pct"] <= 100 and g["contemplados"] <= g["participantes"] for g in grupos), "[assembleias] grupos com ocupação e contemplados coerentes")

    # ---------------------------------------------------------------- resumo
    vol = resumo["volumes"]
    nomes = {t["nome"] for t in tabelas.TABELAS}
    checa(set(vol) == nomes and all(isinstance(x, int) and x > 0 for x in vol.values()), "[resumo] volumes para as 80 tabelas", len(vol))
    cen = resumo["cenario"]
    checa(cen["nps_reportado_out"] == cenario.NPS_REPORTADO_OUT and cen["nps_corrigido_out"] == cenario.NPS_CORRIGIDO_OUT
          and cen["parcelas_dup"] == cenario.PARCELAS_DUPLICADAS and cen["propostas_16nov"] == cenario.PROPOSTAS_D1,
          "[resumo] números-chave iguais aos do cenário")
    checa(cen["valor_recebido_16nov"] == int(dia.loc[FIM, "valor_recebido"]) and cen["valor_recebido_dup_16nov"] == int(dia.loc[FIM, "valor_recebido_dup"])
          and cen["cotas_ativas"] == int(ult["cotas"].sum()), "[resumo] valores do resumo iguais aos dos cubos")

    # ---------------------------------------------------------------- saída
    falhas = [r for r in resultados if not r[0]]
    print("=" * 100)
    print("VALIDAÇÃO DOS RELATÓRIOS — Lucas Analytics Case")
    print("=" * 100)
    estrutura = [r for r in resultados if "." in r[1].split("]")[0] or "tamanho do arquivo" in r[1] or "campo relatorio" in r[1]
                 or "conjunto de cubos" in r[1] or r[1].startswith("[meta]")]
    print(f"  {'OK   ' if all(r[0] for r in estrutura) else 'FALHA'} [schema] {len(estrutura)} checagens de estrutura "
          "(colunas com tamanho n, índices no dicionário, inteiros, sem negativos, sem linhas zeradas, meta.json)")
    for ok, nome, det_ in resultados:
        if not ok or (ok, nome, det_) not in estrutura:
            print(f"  {'OK   ' if ok else 'FALHA'} {nome}" + (f"  ->  {det_}" if det_ else ""))
    print("-" * 100)
    for rid in RELATORIOS:
        tam = (DADOS / "relatorios" / f"{rid}.json").stat().st_size
        print(f"  {rid:20s} {tam / 1024 / 1024:5.2f} MB   " + ", ".join(f"{k}={c['n']}" for k, c in rels[rid]["cubos"].items()))
    print("-" * 100)
    print(f"  {len(resultados) - len(falhas)} de {len(resultados)} checagens OK" + ("" if not falhas else f"  |  {len(falhas)} FALHA(S)"))
    return 1 if falhas else 0


if __name__ == "__main__":
    sys.exit(main())
