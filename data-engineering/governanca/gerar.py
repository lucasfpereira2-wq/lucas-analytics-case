#!/usr/bin/env python3
"""
Motor de governança do Lucas Analytics Case.

Uso (a partir da raiz do repositório):  python3 data-engineering/governanca/gerar.py

Gera app/public/data/governanca/*: catálogo, detalhe das 80 tabelas, linhagem, pipelines, saúde,
incidentes, selos e glossário. Reprodutível (seed em cenario.SEED; "agora" em cenario.DATA_REFERENCIA).
"""
import os
import re
import shutil
import sys
from datetime import timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import amostras  # noqa: E402
import conteudo  # noqa: E402
import execucoes as ex  # noqa: E402
import qualidade as q  # noqa: E402
from base import (AGORA, DIAS, DOWN, FATOR_SEMANA, HOJE, N_DIAS, NOMES, ORIGEM_VOLUMES, POR_NOME, RELATORIOS,  # noqa: E402,F401
                  SAIDA, SCHEMAS, TABELAS, UP, VOLUMES, cenario, f_dec, f_int, gravar, iso, jusante, montante,
                  relatorios_a_jusante, tabelas)

C = cenario
HOJE_I = N_DIAS - 1
ORDEM_STATUS = {"vermelho": 0, "amarelo": 1, "verde": 2}
TITULO_REL = {r["id"]: r["titulo"] for r in RELATORIOS}


def slug(texto):
    s = texto.lower()
    for a, b in (("ã", "a"), ("á", "a"), ("â", "a"), ("é", "e"), ("ê", "e"), ("í", "i"), ("ó", "o"), ("õ", "o"), ("ú", "u"), ("ç", "c")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def main():
    # 1. Execuções, estado diário, testes e saúde por tabela ---------------------------------------
    execs = ex.gerar_execucoes()
    estados, testes, serie = {}, {}, {}
    for t in TABELAS:
        n = t["nome"]
        estados[n] = ex.estado_diario(t, execs[n])
        testes[n] = q.montar_testes(t, execs[n], estados[n])
        serie[n] = [q.saude_tabela(t, execs[n], estados[n], testes[n], i) for i in range(N_DIAS)]
    q.enriquecer_com_simulacao(testes)

    # 2. Incidentes por tabela ------------------------------------------------------------------------
    status = {n: serie[n][HOJE_I]["status"] for n in NOMES}
    inc_tabela = {n: [] for n in NOMES}
    for inc in C.INCIDENTES:
        raiz = inc["tabela"]
        inc_tabela[raiz].append(inc["id"])
        for n in jusante(raiz):
            if status[n] == "verde" or n not in C.PROBLEMAS:
                continue
            cita = f"`{raiz}`" in C.PROBLEMAS[n][1]
            rel = tabelas_rel_do_mart(n)
            if cita or (rel and rel in inc["relatorios"]):
                inc_tabela[n].append(inc["id"])
    for n, ids in conteudo.INCIDENTE_EXTRA.items():
        inc_tabela[n] += [i for i in ids if i not in inc_tabela[n]]

    # 3. Catálogo e detalhes ----------------------------------------------------------------------------
    resumos, detalhes = [], {}
    for t in TABELAS:
        n = t["nome"]
        cols = SCHEMAS[n]
        pks = [c["nome"] for c in cols if c["pk"]]
        est = estados[n][HOJE_I]
        st = status[n]
        if st == "verde":
            motivo = "No SLA e testes OK"
        elif n in C.PROBLEMAS:
            motivo = C.PROBLEMAS[n][1]
        else:
            pior = sorted(testes[n], key=lambda x: ("falha", "alerta", "ok").index(x["resultado"]))[0]
            motivo = pior["evidencia"] if pior["resultado"] != "ok" else (est["ref"].get("mensagem") or "Execução recente com alerta")
        tags = []
        if any(c["pii"] for c in cols):
            tags.append("PII")
        if "lgpd" in n:
            tags.append("LGPD")
        if "legacy" in n or ex.PIPELINES[t["pipeline"]]["orquestrador"] == "DTS legado":
            tags.append("legado")
        if ex.PIPELINES[t["pipeline"]]["orquestrador"] == "Carga manual":
            tags.append("manual")
        if not t["dono"]:
            tags.append("sem dono")
        if not pks:
            tags.append("sem PK")
        rels = relatorios_a_jusante(n)
        resumo = dict(
            nome=n, descricao=t["descricao"], dominio=t["dominio"], camada=t["camada"], dono=t["dono"], dono_area=t["dono_area"],
            criticidade=t["criticidade"], frequencia=t["frequencia"], sla_horas=t["sla_horas"], pipeline=t["pipeline"], fonte=t["fonte"],
            status=st, motivo_status=motivo, tem_pk=bool(pks), saude=serie[n][HOJE_I]["saude"],
            ultima_carga=iso(est["ultima_carga"]), atraso_horas=est["atraso_h"], linhas=VOLUMES[n]["total"],
            testes_total=len(testes[n]),
            testes_falhando=sum(1 for x in testes[n] if x["resultado"] == "falha"),
            testes_alerta=sum(1 for x in testes[n] if x["resultado"] == "alerta"),
            execucoes_30d=[e["status"] for e in execs[n]],
            relatorios_impactados=rels, incidentes=inc_tabela[n], tags=tags,
        )
        resumos.append(resumo)
        ancora = est["ultima_carga"].date() - timedelta(days=1)
        colunas = []
        for c in cols:
            col = dict(nome=c["nome"], tipo=c["tipo"], descricao=c["descricao"], pk=c["pk"])
            if c["fk"]:
                col["fk"] = dict(tabela=c["fk"][0], coluna=c["fk"][1])
            col.update(nulavel=c["nulavel"], pii=c["pii"])
            colunas.append(col)
        detalhes[n] = dict(
            resumo,
            descricao_longa=conteudo.descricao_longa(t, len(cols), pks, rels, TITULO_REL),
            colunas=colunas,
            execucoes=[ex.publico(e) for e in execs[n]],
            testes=[q.teste_publico(x) for x in testes[n]],
            amostra=amostras.gerar_amostra(n, ancora, st != "verde", est["ultima_carga"]),
            upstream=list(UP[n]), downstream=list(DOWN[n]),
        )

    # 4. Saúde ------------------------------------------------------------------------------------------
    def indice(nomes, i=HOJE_I):
        return q.media_ponderada([(POR_NOME[n]["criticidade"], serie[n][i]["saude"]) for n in nomes])

    tendencia = [dict(data=DIAS[i].isoformat(), indice=round(indice(NOMES, i), 1)) for i in range(N_DIAS)]
    geral = tendencia[-1]["indice"]

    def grupo(chave, valores):
        saida = []
        for v in valores:
            ns = [t["nome"] for t in TABELAS if t[chave] == v]
            cont = {s: sum(1 for n in ns if status[n] == s) for s in ORDEM_STATUS}
            saida.append({chave: v, "indice": round(indice(ns), 1), "tabelas": len(ns), **cont})
        return saida

    dominios = list(dict.fromkeys(t["dominio"] for t in TABELAS))
    contagem = {s: sum(1 for n in NOMES if status[n] == s) for s in ("verde", "amarelo", "vermelho")}
    contagem["total"] = len(NOMES)

    # 5. Pipelines -------------------------------------------------------------------------------------
    pipelines = ex.montar_pipelines(execs)
    falharam_hoje = sum(1 for p in pipelines if p["execucoes_30d"][-1]["status"] == "falha")

    # 6. Incidentes --------------------------------------------------------------------------------------
    incidentes = []
    for prio, inc in enumerate(C.INCIDENTES, 1):
        meta = conteudo.INCIDENTES_META[inc["id"]]
        incidentes.append(dict(
            id=inc["id"], prioridade=prio, titulo=inc["titulo"], tabela=inc["tabela"], tipo=inc["tipo"], severidade=inc["severidade"],
            situacao=meta["situacao"], detectado_em=meta["detectado"], inicio_estimado=meta["inicio"],
            resumo_tecnico=inc["tecnico"], impacto_negocio=inc["negocio"], causa_raiz=inc["causa"], acao_recomendada=inc["acao"],
            tabelas_afetadas=jusante(inc["tabela"]),
            relatorios_afetados=[dict(id=r, titulo=TITULO_REL[r], efeito=e) for r, e in inc["relatorios"].items()],
            metricas=[dict(rotulo=a, valor=b) for a, b in meta["metricas"]],
        ))

    # 7. Selos ---------------------------------------------------------------------------------------------
    resumo_por_nome = {r["nome"]: r for r in resumos}
    selos = {}
    for rel in RELATORIOS:
        rid, mart = rel["id"], rel["mart"]
        fontes = [mart] + montante(mart)
        declarados = [(p, inc) for p, inc in enumerate(C.INCIDENTES) if rid in inc["relatorios"]]
        declarados.sort(key=lambda x: ("marginal" in x[1]["relatorios"][rid].lower(), x[0]))
        problemas, cobertos = [], set()
        for _, inc in declarados:
            item = dict(tabela=inc["tabela"], status=status[inc["tabela"]], incidente=inc["id"], texto=inc["relatorios"][rid])
            if (inc["id"], rid) in conteudo.IMPACTO:
                item["impacto_estimado"] = conteudo.IMPACTO[(inc["id"], rid)]
            problemas.append(item)
            cobertos.add(inc["id"])
        outros = [n for n in fontes if status[n] != "verde" and not (set(inc_tabela[n]) & cobertos)]
        outros.sort(key=lambda n: (ORDEM_STATUS[status[n]], fontes.index(n)))
        for n in outros:
            item = dict(tabela=n, status=status[n])
            if inc_tabela[n]:
                item["incidente"] = inc_tabela[n][0]
            item["texto"] = resumo_por_nome[n]["motivo_status"]
            item["impacto_estimado"] = "Sem efeito direto declarado nos indicadores deste relatório"
            problemas.append(item)
        nao_verdes = [n for n in fontes if status[n] != "verde"]
        if status[mart] == "vermelho":
            nivel = "critico"
        elif status[mart] == "amarelo" or nao_verdes or declarados:
            nivel = "atencao"
        else:
            nivel = "confiavel"
        atualizado = estados[mart][HOJE_I]["ultima_carga"]
        horas = (AGORA - atualizado).total_seconds() / 3600
        if nivel == "confiavel":
            mensagem = (f"Dados confiáveis, atualizados há {int(horas)}h. As {len(fontes)} tabelas que alimentam este relatório estão "
                        "dentro do SLA e com todos os testes aprovados.")
            principal = mart
        else:
            frases = [conteudo.FRASE_SELO[(inc["id"], rid)] for _, inc in declarados if (inc["id"], rid) in conteudo.FRASE_SELO]
            mensagem = " ".join(frases[:2]) if frases else f"Este relatório usa `{problemas[0]['tabela']}`: {problemas[0]['texto']}."
            principal = problemas[0]["tabela"]
        selos[rid] = dict(relatorio=rid, nivel=nivel, titulo=conteudo.TITULO_SELO[nivel], mensagem=mensagem, tabela_principal=principal,
                          atualizado_em=iso(atualizado), horas_desde_atualizacao=round(horas, 1), problemas=problemas, tabelas_fonte=fontes)

    # 8. Linhagem --------------------------------------------------------------------------------------------
    nos, arestas = [], []
    for fonte, tabs in tabelas.FONTES.items():
        fid = "fonte:" + slug(fonte)
        nos.append(dict(id=fid, tipo="fonte", rotulo=fonte))
        arestas += [dict(de=fid, para=n) for n in tabs]
    for t in TABELAS:
        nos.append(dict(id=t["nome"], tipo="tabela", rotulo=t["nome"], camada=t["camada"], dominio=t["dominio"], status=status[t["nome"]]))
        arestas += [dict(de=u, para=t["nome"]) for u in t["upstreams"]]
    for rel in RELATORIOS:
        rid = "relatorio:" + rel["id"]
        nos.append(dict(id=rid, tipo="relatorio", rotulo=rel["titulo"], nivel_selo=selos[rel["id"]]["nivel"], rota=rel["rota"]))
        arestas.append(dict(de=rel["mart"], para=rid))

    # 9. Saúde (arquivo) ----------------------------------------------------------------------------------------
    todos_testes = [x for n in NOMES for x in testes[n]]
    fracoes = {15: 0.14, 30: 0.33, 45: 0.57, 60: 0.78, 75: 0.92, 90: 1.0}
    marcos = {15: "Inventário concluído", 30: "Donos e SLAs definidos", 45: "PKs padronizadas",
              60: "Testes automatizados em tabelas críticas", 75: "Alertas e catálogo no ar", 90: "OKRs de qualidade em operação"}
    alvo_90 = 92.0
    ancoras = [(0, geral)] + [(d, geral + (alvo_90 - geral) * f) for d, f in fracoes.items()]
    projecao = []
    for dia in range(0, 91, 5):
        (d0, v0), (d1, v1) = next((a, b) for a, b in zip(ancoras, ancoras[1:]) if a[0] <= dia <= b[0])
        ponto = dict(dia=dia, indice=round(v0 + (v1 - v0) * (dia - d0) / (d1 - d0), 1))
        if dia in marcos:
            ponto["marco"] = marcos[dia]
        projecao.append(ponto)
    saude = dict(
        indice_geral=geral,
        variacao_7d=round(geral - tendencia[-8]["indice"], 1),
        variacao_30d=round(geral - tendencia[0]["indice"], 1),
        tendencia_30d=tendencia,
        dimensoes=q.dimensoes([(t, testes[t["nome"]]) for t in TABELAS]),
        por_dominio=grupo("dominio", dominios),
        por_camada=grupo("camada", ["staging", "core", "mart"]),
        contagem=contagem,
        rotinas_total=len(pipelines), rotinas_falharam_hoje=falharam_hoje,
        testes_total=len(todos_testes),
        testes_falhando=sum(1 for x in todos_testes if x["resultado"] == "falha"),
        testes_alerta=sum(1 for x in todos_testes if x["resultado"] == "alerta"),
        relatorios_total=len(RELATORIOS), relatorios_impactados=sum(1 for s in selos.values() if s["nivel"] != "confiavel"),
        tabelas_sem_pk=sum(1 for r in resumos if not r["tem_pk"]), tabelas_sem_dono=sum(1 for r in resumos if not r["dono"]),
        formula=q.FORMULA, projecao_90d=projecao,
    )

    # 10. Gravação ---------------------------------------------------------------------------------------------
    pasta_tabelas = os.path.join(SAIDA, "tabelas")
    if os.path.isdir(pasta_tabelas):
        shutil.rmtree(pasta_tabelas)
    gravar("catalogo.json", dict(dias=[d.isoformat() for d in DIAS], tabelas=resumos))
    for n, d in detalhes.items():
        gravar(os.path.join("tabelas", f"{n}.json"), d)
    gravar("linhagem.json", dict(nos=nos, arestas=arestas))
    gravar("pipelines.json", pipelines)
    gravar("saude.json", saude)
    gravar("incidentes.json", incidentes)
    gravar("selos.json", selos)
    gravar("glossario.json", conteudo.GLOSSARIO)

    # 11. Resumo no terminal -------------------------------------------------------------------------------------
    divergentes = [(n, POR_NOME[n]["status"], status[n]) for n in NOMES if POR_NOME[n]["status"] != status[n]]
    print(f"Índice de Saúde: {f_dec(geral)}  (7 dias: {saude['variacao_7d']:+}, 30 dias: {saude['variacao_30d']:+})  volumes: {ORIGEM_VOLUMES}")
    print(f"Farol: {contagem['verde']} verdes, {contagem['amarelo']} amarelas, {contagem['vermelho']} vermelhas")
    print(f"Rotinas: {len(pipelines)} ({falharam_hoje} falharam hoje)  Testes: {saude['testes_total']} "
          f"({saude['testes_falhando']} falhando, {saude['testes_alerta']} em alerta)")
    print("Selos: " + ", ".join(f"{k}={v['nivel']}" for k, v in selos.items()))
    print("Tendência: " + " ".join(f_dec(p["indice"]) for p in tendencia))
    if divergentes:
        print("ATENÇÃO: farol calculado diferente do status-alvo:", divergentes)
    return 1 if divergentes else 0


def tabelas_rel_do_mart(nome):
    r = next((r for r in RELATORIOS if r["mart"] == nome), None)
    return r["id"] if r else None


if __name__ == "__main__":
    sys.exit(main())
