#!/usr/bin/env python3
"""
Validação de coerência dos JSONs de governança.

Uso (a partir da raiz do repositório):  python3 data-engineering/tests/validar_governanca.py
Lê somente os arquivos gerados em app/public/data/governanca/ e os contratos em data-engineering/catalog/.
Com --reproduzir, roda o motor de novo e confirma que a saída é idêntica byte a byte.
"""
import glob
import hashlib
import json
import os
import re
import subprocess
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(RAIZ, "data-engineering", "catalog"))
import cenario  # noqa: E402
import schemas  # noqa: E402
import tabelas  # noqa: E402

GOV = os.path.join(RAIZ, "app", "public", "data", "governanca")
STATUS = {"verde", "amarelo", "vermelho"}
ST_EXEC = {"sucesso", "alerta", "falha", "atrasada", "nao_executou", "sem_agenda"}
RES = {"ok", "alerta", "falha"}
REGRAS = {"pk_existente", "unicidade", "nao_nulo", "integridade_referencial", "volume", "frescor", "schema_drift",
          "reconciliacao", "dominio_valores"}
CAMPOS_RESUMO = ["nome", "descricao", "dominio", "camada", "dono", "dono_area", "criticidade", "frequencia", "sla_horas", "pipeline",
                 "fonte", "status", "motivo_status", "tem_pk", "saude", "ultima_carga", "atraso_horas", "linhas", "testes_total",
                 "testes_falhando", "testes_alerta", "execucoes_30d", "relatorios_impactados", "incidentes", "tags"]
CAMPOS_DETALHE = CAMPOS_RESUMO + ["descricao_longa", "colunas", "execucoes", "testes", "amostra", "upstream", "downstream"]
CAMPOS_PIPELINE = ["id", "nome", "descricao", "orquestrador", "agenda", "agenda_cron", "dono", "tabelas", "status", "ultima_execucao",
                   "taxa_sucesso_30d", "duracao_media_seg", "falhas_30d", "falhas_recorrentes", "execucoes_30d"]
CAMPOS_SAUDE = ["indice_geral", "variacao_7d", "variacao_30d", "tendencia_30d", "dimensoes", "por_dominio", "por_camada", "contagem",
                "rotinas_total", "rotinas_falharam_hoje", "testes_total", "testes_falhando", "testes_alerta", "relatorios_total",
                "relatorios_impactados", "tabelas_sem_pk", "tabelas_sem_dono", "formula", "projecao_90d"]
CAMPOS_INCIDENTE = ["id", "prioridade", "titulo", "tabela", "tipo", "severidade", "situacao", "detectado_em", "inicio_estimado",
                    "resumo_tecnico", "impacto_negocio", "causa_raiz", "acao_recomendada", "tabelas_afetadas", "relatorios_afetados", "metricas"]
CAMPOS_SELO = ["relatorio", "nivel", "titulo", "mensagem", "tabela_principal", "atualizado_em", "horas_desde_atualizacao", "problemas", "tabelas_fonte"]


def ler(nome):
    with open(os.path.join(GOV, nome), encoding="utf-8") as f:
        return json.load(f)


def campos(obj, lista, onde):
    faltam = [c for c in lista if c not in obj]
    assert not faltam, f"{onde}: campos ausentes {faltam}"


def hash_saida():
    h = hashlib.sha256()
    for caminho in sorted(glob.glob(os.path.join(GOV, "**", "*.json"), recursive=True)):
        h.update(os.path.relpath(caminho, GOV).encode())
        with open(caminho, "rb") as f:
            h.update(f.read())
    return h.hexdigest()


def main():
    nomes = [t["nome"] for t in tabelas.TABELAS]
    conj = set(nomes)
    hoje = cenario.DATA_REFERENCIA[:10]
    rel_ids = {r["id"] for r in tabelas.RELATORIOS}
    n_ok = 0

    def ok(msg):
        nonlocal n_ok
        n_ok += 1
        print(f"  ok  {msg}")

    cat, saude, pipes = ler("catalogo.json"), ler("saude.json"), ler("pipelines.json")
    incs, selos, lin, glo = ler("incidentes.json"), ler("selos.json"), ler("linhagem.json"), ler("glossario.json")
    resumos = {t["nome"]: t for t in cat["tabelas"]}

    # ---- catálogo -------------------------------------------------------------------------------
    assert len(cat["tabelas"]) == 80 and set(resumos) == conj, "catálogo deve ter exatamente as 80 tabelas"
    assert len(cat["dias"]) == 30 and cat["dias"] == sorted(cat["dias"]) and cat["dias"][-1] == hoje and cat["dias"][0] == "2026-10-19"
    ok("catálogo com 80 tabelas e janela de 30 dias (19/10 a 17/11/2026)")
    for n, r in resumos.items():
        campos(r, CAMPOS_RESUMO, n)
        alvo = tabelas.POR_NOME[n]
        assert r["status"] == alvo["status"], f"{n}: farol {r['status']} diferente do alvo {alvo['status']}"
        assert r["status"] in STATUS and 0 <= r["saude"] <= 100
        assert len(r["execucoes_30d"]) == 30 and set(r["execucoes_30d"]) <= ST_EXEC, n
        assert (r["motivo_status"] == "No SLA e testes OK") == (r["status"] == "verde"), n
        assert r["dono"] == alvo["dono"] and r["pipeline"] == alvo["pipeline"] and r["camada"] == alvo["camada"], n
        assert r["tem_pk"] == (n not in cenario.TABELAS_SEM_PK), n
        assert ("sem PK" in r["tags"]) == (not r["tem_pk"]) and ("sem dono" in r["tags"]) == (r["dono"] is None), n
        assert ("PII" in r["tags"]) == any(c["pii"] for c in schemas.SCHEMAS[n]), n
        assert set(r["relatorios_impactados"]) <= rel_ids and r["atraso_horas"] >= 0, n
        if n in cenario.PROBLEMAS:
            assert r["motivo_status"] == cenario.PROBLEMAS[n][1], f"{n}: motivo fora do cenário"
    ok("farol calculado igual ao status-alvo nas 80 tabelas")
    cont = {s: sum(1 for r in resumos.values() if r["status"] == s) for s in STATUS}
    assert (cont["verde"], cont["amarelo"], cont["vermelho"]) == (47, 21, 12), cont
    ok("contagem 47 verdes / 21 amarelas / 12 vermelhas")
    assert "LGPD" in resumos["fato_consentimento_lgpd"]["tags"] and "legado" in resumos["fato_chamadas_legacy"]["tags"]
    assert "manual" in resumos["fato_meta_comercial"]["tags"]

    # ---- detalhes -------------------------------------------------------------------------------
    arquivos = sorted(os.path.basename(a)[:-5] for a in glob.glob(os.path.join(GOV, "tabelas", "*.json")))
    assert arquivos == sorted(nomes), "deve haver exatamente 80 arquivos de detalhe"
    total_testes = falhando = alerta = 0
    for n in nomes:
        d = ler(os.path.join("tabelas", f"{n}.json"))
        campos(d, CAMPOS_DETALHE, f"tabelas/{n}")
        for c in CAMPOS_RESUMO:
            assert d[c] == resumos[n][c], f"{n}: campo {c} difere entre catálogo e detalhe"
        esquema = schemas.SCHEMAS[n]
        assert [c["nome"] for c in d["colunas"]] == [c["nome"] for c in esquema], n
        for c, e in zip(d["colunas"], esquema):
            campos(c, ["nome", "tipo", "descricao", "pk", "nulavel", "pii"], f"{n}.{c['nome']}")
            assert c["pk"] == e["pk"] and c["pii"] == e["pii"]
            if "fk" in c:
                assert c["fk"]["tabela"] in conj and c["fk"]["coluna"] in [x["nome"] for x in schemas.SCHEMAS[c["fk"]["tabela"]]]
        assert len(d["execucoes"]) == 30 and [e["data"] for e in d["execucoes"]] == cat["dias"], n
        assert [e["status"] for e in d["execucoes"]] == d["execucoes_30d"], n
        for e in d["execucoes"]:
            campos(e, ["data", "inicio", "duracao_seg", "linhas", "linhas_esperadas", "status", "anomalia_volume"], f"{n} execução")
            assert e["status"] in ST_EXEC
            if e["status"] in ("sem_agenda", "nao_executou"):
                assert e["inicio"] is None and e["linhas"] is None
            if e["status"] == "sucesso":
                assert e["inicio"] and e["linhas"] is not None and e["duracao_seg"] > 0
        assert 3 <= len(d["testes"]) <= 8 and len(d["testes"]) == d["testes_total"], n
        assert len({t["id"] for t in d["testes"]}) == len(d["testes"]), n
        for t in d["testes"]:
            campos(t, ["id", "regra", "nome", "severidade", "resultado", "evidencia", "historico_7d", "sql"], f"{n} teste")
            assert t["regra"] in REGRAS and t["resultado"] in RES and len(t["historico_7d"]) == 7 and set(t["historico_7d"]) <= RES
            assert t["historico_7d"][-1] == t["resultado"] and t["evidencia"]
        assert d["testes_falhando"] == sum(1 for t in d["testes"] if t["resultado"] == "falha"), n
        assert d["testes_alerta"] == sum(1 for t in d["testes"] if t["resultado"] == "alerta"), n
        if d["status"] == "verde":
            assert all(t["resultado"] == "ok" for t in d["testes"]), f"{n}: verde com teste não aprovado"
            assert d["execucoes"][-1]["status"] in ("sucesso", "sem_agenda") and d["atraso_horas"] == 0, n
            assert not any("problema" in li for li in d["amostra"]["linhas"]), f"{n}: amostra de tabela verde deve ser limpa"
        pk_teste = next(t for t in d["testes"] if t["regra"] == "pk_existente")
        assert (pk_teste["resultado"] == "ok") == d["tem_pk"], n
        am = d["amostra"]
        assert am["colunas"] == [c["nome"] for c in esquema], n
        minimo = min(8, d["linhas"])
        assert minimo <= len(am["linhas"]) <= 12, f"{n}: amostra com {len(am['linhas'])} linhas"
        for li in am["linhas"]:
            assert len(li["valores"]) == len(am["colunas"]), n
            if "problema" in li:
                assert set(li["colunas_problema"]) <= set(am["colunas"]), n
        assert d["upstream"] == tabelas.POR_NOME[n]["upstreams"], n
        assert sorted(d["downstream"]) == sorted(x["nome"] for x in tabelas.TABELAS if n in x["upstreams"]), n
        total_testes += len(d["testes"])
        falhando += d["testes_falhando"]
        alerta += d["testes_alerta"]
    ok(f"80 arquivos de detalhe coerentes com o catálogo e com schemas.py ({total_testes} testes)")

    # ---- cenário nas execuções e nas evidências -------------------------------------------------------
    def det(n):
        return ler(os.path.join("tabelas", f"{n}.json"))

    def execs(n):
        return {e["data"]: e for e in det(n)["execucoes"]}

    tel = execs("stg_telefonia_cdr")
    assert all(tel[d]["status"] == "falha" for d in ("2026-11-15", "2026-11-16", "2026-11-17")) and tel["2026-11-14"]["status"] == "sucesso"
    assert tel["2026-11-15"]["inicio"].startswith("2026-11-15T02:10") and resumos["stg_telefonia_cdr"]["ultima_carga"].startswith("2026-11-14")
    for n in ("fato_chamada", "mart_atendimento"):
        assert all(execs(n)[d]["status"] in ("nao_executou", "falha") for d in ("2026-11-15", "2026-11-16", "2026-11-17")), n
    prop = execs("stg_crm_propostas")[hoje]
    assert prop["status"] == "sucesso" and prop["linhas"] == cenario.PROPOSTAS_D1 and prop["linhas_esperadas"] == cenario.PROPOSTAS_MEDIA and prop["anomalia_volume"]
    bol = execs("stg_banco_boletos_registrados")[hoje]
    assert bol["status"] == "falha" and bol["inicio"].startswith("2026-11-17T03:40")
    par = execs("fato_parcelas")[hoje]
    assert par["anomalia_volume"] and par["linhas"] - par["linhas_esperadas"] == cenario.PARCELAS_DUPLICADAS
    for n in ("fato_transferencia_cota", "fato_funil_crm", "fato_boleto", "fato_acao_cobranca", "fato_garantia"):
        assert execs(n)[hoje]["status"] == "atrasada", n
    assert {resumos[n]["atraso_horas"] for n in ("fato_transferencia_cota",)} == {6} and resumos["fato_funil_crm"]["atraso_horas"] == 5
    assert resumos["fato_acao_cobranca"]["atraso_horas"] == 4 and resumos["fato_garantia"]["atraso_horas"] == 9
    ev = {n: " | ".join(t["evidencia"] for t in det(n)["testes"] if t["resultado"] != "ok") for n in cenario.PROBLEMAS}
    assert "312 registros duplicados em `id_parcela`" in ev["fato_parcelas"]
    assert "Tabela sem chave primária definida" in ev["stg_whatsapp_conversas"] and "Tabela sem chave primária definida" in ev["fato_chamadas_legacy"]
    assert "18% de nulos em `cpf_cliente` nos cadastros do canal Parceiro" in ev["dim_cliente"]
    assert "147 cotas com `id_grupo` inexistente" in ev["dim_cota"] and "1,8% acima do extrato" in ev["mart_cobranca_carteira"]
    for n, (_, texto) in cenario.PROBLEMAS.items():
        assert ev[n], f"{n}: tabela com problema sem teste reprovado"
        if n not in cenario.TABELAS_SEM_PK:
            assert texto in ev[n], f"{n}: evidência do cenário não aparece nos testes"
    amostra_par = det("fato_parcelas")["amostra"]
    ids = [li["valores"][0] for li in amostra_par["linhas"] if "problema" in li]
    assert ids and all(ids.count(i) == 2 for i in ids), "amostra de fato_parcelas deve trazer pares duplicados de id_parcela"
    ok("eventos do cenário presentes nas execuções, nos testes e nas amostras")

    # ---- saúde ----------------------------------------------------------------------------------
    campos(saude, CAMPOS_SAUDE, "saude")
    assert 70 <= saude["indice_geral"] <= 73, saude["indice_geral"]
    assert saude["contagem"] == {"verde": 47, "amarelo": 21, "vermelho": 12, "total": 80}
    assert saude["testes_total"] == total_testes and saude["testes_falhando"] == falhando and saude["testes_alerta"] == alerta
    assert saude["tabelas_sem_pk"] == 2 == sum(1 for r in resumos.values() if not r["tem_pk"])
    assert saude["tabelas_sem_dono"] == 2 == sum(1 for r in resumos.values() if r["dono"] is None)
    assert len(saude["tendencia_30d"]) == 30 and [p["data"] for p in saude["tendencia_30d"]] == cat["dias"]
    assert saude["tendencia_30d"][-1]["indice"] == saude["indice_geral"]
    assert saude["tendencia_30d"][0]["indice"] > saude["indice_geral"], "a tendência deve cair com os incidentes"
    assert round(saude["indice_geral"] - saude["tendencia_30d"][0]["indice"], 1) == saude["variacao_30d"]
    assert round(saude["indice_geral"] - saude["tendencia_30d"][-8]["indice"], 1) == saude["variacao_7d"]
    assert [d["nome"].lower() for d in saude["dimensoes"]] == ["completude", "unicidade", "frescor", "integridade", "conformidade"]
    assert sum(g["tabelas"] for g in saude["por_dominio"]) == 80 == sum(g["tabelas"] for g in saude["por_camada"])
    for g in saude["por_dominio"] + saude["por_camada"]:
        assert g["verde"] + g["amarelo"] + g["vermelho"] == g["tabelas"] and 0 <= g["indice"] <= 100
    peso = {"alta": 3, "media": 2, "baixa": 1}
    geral = sum(peso[r["criticidade"]] * r["saude"] for r in resumos.values()) / sum(peso[r["criticidade"]] for r in resumos.values())
    assert abs(geral - saude["indice_geral"]) < 0.06, (geral, saude["indice_geral"])
    assert abs(sum(f["peso"] for f in saude["formula"]) - 1) < 1e-9
    proj = saude["projecao_90d"]
    assert proj[0]["dia"] == 0 and proj[0]["indice"] == saude["indice_geral"] and proj[-1]["dia"] == 90 and 91 <= proj[-1]["indice"] <= 93
    assert all(a["indice"] <= b["indice"] for a, b in zip(proj, proj[1:])) and sum(1 for p in proj if "marco" in p) == 6
    assert saude["relatorios_total"] == 5 and saude["relatorios_impactados"] == sum(1 for s in selos.values() if s["nivel"] != "confiavel")
    ok(f"índice de saúde {saude['indice_geral']} dentro de 70–73 e totais batendo com o catálogo")

    # ---- pipelines ------------------------------------------------------------------------------
    assert {p["id"] for p in pipes} == {t["pipeline"] for t in tabelas.TABELAS} and saude["rotinas_total"] == len(pipes)
    cobertas = []
    for p in pipes:
        campos(p, CAMPOS_PIPELINE, p["id"])
        assert p["status"] in STATUS and 0 <= p["taxa_sucesso_30d"] <= 100 and set(p["tabelas"]) <= conj
        assert len(p["execucoes_30d"]) == 30 and [e["data"] for e in p["execucoes_30d"]] == cat["dias"], p["id"]
        assert sorted(p["tabelas"]) == sorted(t["nome"] for t in tabelas.TABELAS if t["pipeline"] == p["id"])
        assert p["falhas_30d"] == sum(1 for e in p["execucoes_30d"] if e["status"] in ("falha", "nao_executou"))
        assert sum(f["ocorrencias"] for f in p["falhas_recorrentes"]) == p["falhas_30d"], p["id"]
        cobertas += p["tabelas"]
    assert sorted(cobertas) == sorted(nomes)
    falharam = sum(1 for p in pipes if p["execucoes_30d"][-1]["status"] == "falha")
    assert saude["rotinas_falharam_hoje"] == falharam and falharam >= 2, falharam
    ok(f"{len(pipes)} pipelines cobrindo as 80 tabelas; {falharam} falharam em 17/11")

    # ---- linhagem -------------------------------------------------------------------------------
    ids_no = {n["id"] for n in lin["nos"]}
    tab_nos = {n["id"] for n in lin["nos"] if n["tipo"] == "tabela"}
    assert tab_nos == conj and len(ids_no) == len(lin["nos"])
    assert sum(1 for n in lin["nos"] if n["tipo"] == "fonte") == len(tabelas.FONTES) and sum(1 for n in lin["nos"] if n["tipo"] == "relatorio") == 5
    for a in lin["arestas"]:
        assert a["de"] in ids_no and a["para"] in ids_no, a
    pares = {(a["de"], a["para"]) for a in lin["arestas"]}
    for t in tabelas.TABELAS:
        for u in t["upstreams"]:
            assert (u, t["nome"]) in pares
    for r in tabelas.RELATORIOS:
        assert (r["mart"], "relatorio:" + r["id"]) in pares
        no = next(n for n in lin["nos"] if n["id"] == "relatorio:" + r["id"])
        assert no["nivel_selo"] == selos[r["id"]]["nivel"] and no["rota"] == r["rota"]
    assert not any(a["de"] == "mart_executivo_kpis" for a in lin["arestas"]), "mart_executivo_kpis não gera relatório"
    for n in lin["nos"]:
        if n["tipo"] == "tabela":
            assert n["status"] == resumos[n["id"]]["status"]
    ok("linhagem: fontes -> tabelas -> 5 relatórios, sem nós desconhecidos")

    # ---- incidentes -----------------------------------------------------------------------------
    assert [i["id"] for i in incs] == [i["id"] for i in cenario.INCIDENTES] and [i["prioridade"] for i in incs] == list(range(1, len(incs) + 1))
    for i in incs:
        campos(i, CAMPOS_INCIDENTE, i["id"])
        assert i["tabela"] in conj and set(i["tabelas_afetadas"]) <= conj and i["tabela"] not in i["tabelas_afetadas"]
        assert {r["id"] for r in i["relatorios_afetados"]} <= rel_ids and 2 <= len(i["metricas"]) <= 4, i["id"]
        assert i["inicio_estimado"] <= i["detectado_em"] <= cenario.DATA_REFERENCIA and i["situacao"] in ("aberto", "em_analise", "mitigado")
        assert i["id"] in resumos[i["tabela"]]["incidentes"] and resumos[i["tabela"]]["status"] != "verde"
    ok(f"{len(incs)} incidentes na ordem de prioridade do cenário")

    # ---- selos ----------------------------------------------------------------------------------
    assert set(selos) == rel_ids
    for rid, s in selos.items():
        campos(s, CAMPOS_SELO, f"selo {rid}")
        assert s["nivel"] == cenario.SELOS_ESPERADOS[rid], f"selo {rid}: {s['nivel']}"
        assert set(s["tabelas_fonte"]) <= conj and (s["tabela_principal"] is None or s["tabela_principal"] in conj)
        citadas = re.findall(r"`([a-z_0-9]+)`", s["mensagem"] + " ".join(p["texto"] for p in s["problemas"]))
        for c in citadas:
            assert c in conj or any(c in [x["nome"] for x in cols] for cols in schemas.SCHEMAS.values()) or c == "centro_custo_id", f"selo {rid} cita `{c}`"
        for p in s["problemas"]:
            assert p["tabela"] in s["tabelas_fonte"] and p["status"] == resumos[p["tabela"]]["status"] != "verde", (rid, p["tabela"])
        ordem = [("incidente" in p and "Sem efeito direto" not in p.get("impacto_estimado", "")) for p in s["problemas"]]
        assert ordem == sorted(ordem, reverse=True), f"selo {rid}: problemas fora de ordem"
        mart = next(r["mart"] for r in tabelas.RELATORIOS if r["id"] == rid)
        assert s["atualizado_em"] == resumos[mart]["ultima_carga"] and s["tabelas_fonte"][0] == mart
    nao_verdes = [n for n in selos["assembleias"]["tabelas_fonte"] if resumos[n]["status"] != "verde"]
    assert not nao_verdes and not selos["assembleias"]["problemas"], f"upstream de assembleias com problema: {nao_verdes}"
    assert "atualizados há 2h" in selos["assembleias"]["mensagem"]
    assert "`fato_parcelas`" in selos["cobranca-carteira"]["mensagem"] and "312" in selos["cobranca-carteira"]["mensagem"] and "1,8%" in selos["cobranca-carteira"]["mensagem"]
    assert "`stg_telefonia_cdr`" in selos["atendimento"]["mensagem"] and "62" in selos["atendimento"]["mensagem"] and "56" in selos["atendimento"]["mensagem"]
    assert "412" in selos["vendas"]["mensagem"] and "1.148" in selos["vendas"]["mensagem"] and "147" in selos["cobranca-safra"]["mensagem"]
    ok("selos iguais a SELOS_ESPERADOS; upstream de Assembleias 100% verde")

    # ---- glossário ------------------------------------------------------------------------------
    assert 22 <= len(glo) <= 28, len(glo)
    for g in glo:
        campos(g, ["termo", "definicao", "dominio", "tabelas", "relatorios", "dono"], g.get("termo", "?"))
        assert set(g["tabelas"]) <= conj and set(g["relatorios"]) <= rel_ids, g["termo"]
    assert len({g["termo"] for g in glo}) == len(glo)
    ok(f"glossário com {len(glo)} termos e referências válidas")

    if "--reproduzir" in sys.argv:
        antes = hash_saida()
        subprocess.run([sys.executable, os.path.join(RAIZ, "data-engineering", "governanca", "gerar.py")], check=True, capture_output=True, cwd=RAIZ)
        assert hash_saida() == antes, "a saída mudou ao rodar o motor de novo (não reprodutível)"
        ok("motor reprodutível: segunda execução gerou saída idêntica")

    print(f"\nValidação de governança concluída: {n_ok} blocos aprovados.")


if __name__ == "__main__":
    main()
