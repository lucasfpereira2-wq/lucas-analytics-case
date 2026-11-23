"""
Testes de qualidade, farol e Índice de Saúde.

O farol NUNCA é copiado de tabelas.py: ele é calculado, dia a dia, a partir das execuções simuladas e dos
resultados dos testes. O status-alvo só é usado na validação final (tests/validar_governanca.py).
"""
from base import (DIAS, N_DIAS, PESO_CRITICIDADE, POR_NOME, SCHEMAS, VOLUMES, cenario, f_dec, f_dh, f_dia,
                  f_horas, f_int, idx, rng)

C = cenario
HOJE_I = N_DIAS - 1

# ---- Parâmetros do Índice de Saúde (calibrados para o índice geral ficar em 70–73) ---------------
PESOS = {"frescor": 0.30, "testes": 0.40, "pk": 0.10, "execucoes": 0.20}
PESO_SEVERIDADE = {"critico": 4, "alto": 3, "medio": 2, "baixo": 1}
NOTA_TESTE = {"ok": 1.0, "alerta": 0.5, "falha": 0.0}
NOTA_EXEC = {"sucesso": 1.0, "alerta": 0.8, "atrasada": 0.5, "falha": 0.0, "nao_executou": 0.0}
FATOR_RISCO = {"verde": 1.0, "amarelo": 0.54, "vermelho": 0.25}

# ---- Achados do cenário -------------------------------------------------------------------------
# Cada achado vira o resultado de um teste a partir de `desde` (None = anterior à janela de 30 dias).
# O texto principal (sem `evidencia`) vem de cenario.PROBLEMAS. Achados de frescor e volume não ficam aqui:
# nascem das execuções (ver DERIVADOS).
ACHADOS = {
    "stg_whatsapp_conversas": [
        dict(regra="pk_existente", resultado="falha", evidencia="Tabela sem chave primária definida", valor=0, limite=1, unidade="chave"),
        dict(regra="unicidade", coluna="id_conversa", resultado="falha", severidade="alto", valor=C.WHATSAPP_DUP_PCT, limite=0.5, unidade="%",
             evidencia=f"{f_dec(C.WHATSAPP_DUP_PCT)}% de conversas repetidas em `id_conversa` nos últimos 7 dias (reenvio de webhook)"),
    ],
    "fato_chamadas_legacy": [
        dict(regra="pk_existente", resultado="falha", evidencia="Tabela sem chave primária definida", valor=0, limite=1, unidade="chave"),
        dict(regra="unicidade", coluna="cod_cham", resultado="alerta", severidade="medio", valor=1.2, limite=0.5, unidade="%",
             evidencia="`cod_cham` reinicia a cada ano: 1,2% dos códigos se repetem entre anos; sem chave, não há como contar chamadas únicas"),
    ],
    "dim_cliente": [dict(regra="nao_nulo", coluna="cpf_cliente", resultado="falha", valor=C.CPF_NULO_PCT_PARCEIRO, limite=2.0, unidade="%")],
    "dim_cota": [dict(regra="integridade_referencial", coluna="id_grupo", resultado="falha",
                      valor=C.COTAS_FK_ORFA, limite=0, unidade="registros")],
    "fato_parcelas": [dict(regra="unicidade", coluna="id_parcela", resultado="falha", desde="2026-11-17",
                           valor=C.PARCELAS_DUPLICADAS, limite=0, unidade="registros")],
    "fato_pesquisa_nps": [dict(regra="unicidade", coluna="id_resposta", resultado="falha", valor=4.6, limite=0, unidade="%")],
    "mart_cobranca_carteira": [dict(regra="reconciliacao", resultado="falha", desde="2026-11-17",
                                    valor=C.RECEBIMENTO_SUPERESTIMADO_PCT, limite=0.5, unidade="%")],
    "stg_pesquisas_respostas": [dict(regra="unicidade", coluna="id_resposta", resultado="alerta", severidade="alto", valor=3.4, limite=1.0, unidade="%", extra=True)],
    "dim_endereco": [dict(regra="dominio_valores", coluna="cep", resultado="alerta", valor=3.1, limite=1.0, unidade="%")],
    "dim_contato": [dict(regra="dominio_valores", coluna="telefone", resultado="alerta", valor=6.2, limite=2.0, unidade="%")],
    "fato_consentimento_lgpd": [dict(regra="nao_nulo", coluna="base_legal", resultado="alerta", valor=2.8, limite=0.5, unidade="%")],
    "fato_comissao": [dict(regra="integridade_referencial", coluna="id_vendedor", resultado="alerta", desde="2026-11-10", valor=23, limite=0, unidade="registros")],
    "fato_pagamento": [dict(regra="integridade_referencial", coluna="id_parcela", resultado="alerta", desde="2026-11-17", valor=0.4, limite=0.1, unidade="%")],
    "fato_inadimplencia_diaria": [dict(regra="reconciliacao", resultado="alerta", desde="2026-11-17", valor=1.4, limite=0.6, unidade="%")],
    "fato_conversa_whatsapp": [dict(regra="unicidade", coluna="id_conversa", resultado="alerta", valor=C.WHATSAPP_DUP_PCT, limite=0.5, unidade="%")],
    "fato_ticket": [dict(regra="nao_nulo", coluna="id_motivo", resultado="alerta", desde="2026-11-09", valor=2.7, limite=1.0, unidade="%")],
    "dim_colaborador": [dict(regra="schema_drift", coluna="cd_centro_custo", resultado="alerta", desde="2026-11-12", valor=1, limite=0, unidade="colunas")],
    "mart_vendas_comercial": [dict(regra="volume", resultado="alerta", desde="2026-11-17", valor=61, limite=20, unidade="%")],
    "mart_cobranca_safra_mob": [dict(regra="integridade_referencial", resultado="alerta", valor=C.COTAS_FK_ORFA, limite=0, unidade="registros",
                                     ref=("dim_cota", "dim_grupo", "id_grupo"))],
    "mart_executivo_kpis": [dict(regra="reconciliacao", resultado="alerta", desde="2026-11-14", valor=2, limite=0, unidade="marts")],
}
# Achado principal nasce das execuções (frescor ou volume): o texto de cenario.PROBLEMAS vai para esse teste.
DERIVADOS = {
    "stg_crm_propostas": "volume", "fato_proposta": "volume", "fato_meta_comercial": "volume",
    "stg_banco_boletos_registrados": "frescor", "stg_telefonia_cdr": "frescor", "fato_chamada": "frescor",
    "mart_atendimento": "frescor", "fato_reajuste_bem": "frescor", "fato_transferencia_cota": "frescor",
    "fato_funil_crm": "frescor", "fato_boleto": "frescor", "fato_acao_cobranca": "frescor", "fato_garantia": "frescor",
}
assert set(ACHADOS) | set(DERIVADOS) == set(C.PROBLEMAS), set(C.PROBLEMAS) ^ (set(ACHADOS) | set(DERIVADOS))

RECONCILIA = {
    "stg_banco_retorno_cnab": ("vl_pago", "o trailer dos arquivos CNAB"),
    "fato_parcelas": ("vl_parcela", "`stg_erp_parcelas`"),
    "fato_pagamento": ("vl_pago", "`stg_banco_retorno_cnab`"),
    "fato_boleto": ("vl_boleto", "`stg_banco_boletos_registrados`"),
    "fato_fundo_comum": ("vl_movimento", "`fato_pagamento`"),
    "fato_fundo_reserva": ("vl_movimento", "`fato_pagamento`"),
    "fato_inadimplencia_diaria": ("vl_saldo_atraso", "a fotografia do dia anterior"),
    "fato_contrato_venda": ("vl_credito", "`stg_erp_contratos`"),
    "fato_contemplacao": ("vl_credito", "`stg_erp_assembleias`"),
    "fato_liberacao_credito": ("vl_credito_liberado", "`stg_erp_contratos`"),
    "fato_comissao": ("vl_comissao", "a folha de comissões do mês"),
    "mart_vendas_comercial": ("vl_credito_vendido", "`fato_contrato_venda`"),
    "mart_cobranca_carteira": ("vl_recebido", "o extrato bancário (`stg_banco_retorno_cnab`)"),
    "mart_cobranca_safra_mob": ("qt_cotas_safra", "`fato_contrato_venda`"),
    "mart_atendimento": ("qt_contatos", "as tabelas de origem por canal"),
    "mart_assembleias_contemplacoes": ("vl_credito_contemplado", "`fato_contemplacao`"),
    "mart_executivo_kpis": ("vl_kpi", "os marts de origem"),
}
_DOMINIO_PREFIXOS = ("situacao", "status", "tipo_", "uf", "canal", "segmento", "faixa_atraso", "etapa", "nota",
                     "classificacao", "cep", "telefone", "tp_", "st_", "turno", "nivel", "prioridade", "dia_semana",
                     "unidade", "indice_reajuste", "meio_pagamento", "direcao")
_ROTULO = {
    "pk_existente": "Chave primária definida", "unicidade": "Unicidade", "nao_nulo": "Completude (não nulo)",
    "integridade_referencial": "Integridade referencial", "volume": "Volume da carga", "frescor": "Frescor (SLA)",
    "schema_drift": "Contrato de schema", "reconciliacao": "Reconciliação", "dominio_valores": "Domínio de valores",
}


def _col(nome, pred):
    return next((c for c in SCHEMAS[nome] if pred(c)), None)


def montar_testes(t, execs, estados):
    """Lista de testes da tabela. Cada teste guarda `serie` (resultado em cada um dos 30 dias)."""
    nome = t["nome"]
    cols = SCHEMAS[nome]
    nomes_col = [c["nome"] for c in cols]
    pks = [c["nome"] for c in cols if c["pk"]]
    achados = ACHADOS.get(nome, [])
    alta = t["criticidade"] == "alta"
    r = rng("teste", nome)
    total = VOLUMES[nome]["total"]
    testes = []

    def achado(regra, coluna=None, extra=False):
        for a in achados:
            if a["regra"] == regra and bool(a.get("extra")) == extra and (a.get("coluna") in (None, coluna) or coluna is None):
                return a
        return None

    def add(regra, coluna=None, severidade="medio", a=None, **kw):
        testes.append(dict(regra=regra, coluna=coluna, severidade=(a or {}).get("severidade", severidade), achado=a, **kw))

    # 1. chave primária
    add("pk_existente", severidade="critico", a=achado("pk_existente"))
    # 2. unicidade
    col_uni = ", ".join(pks) if pks else nomes_col[0]
    add("unicidade", coluna=col_uni, severidade="critico" if alta else "alto", a=achado("unicidade", col_uni if pks else None))
    a_x = achado("unicidade", extra=True)
    if a_x:
        add("unicidade", coluna=a_x["coluna"], a=a_x)
    # 3. completude
    a_n = achado("nao_nulo")
    c_n = a_n["coluna"] if a_n else (_col(nome, lambda c: not c["pk"] and not c["nulavel"] and (c["fk"] or c["nome"].startswith(("id_", "cpf", "dt_", "vl_", "nr_"))))
                                     or _col(nome, lambda c: not c["pk"] and not c["nulavel"]) or {}).get("nome")
    if c_n:
        add("nao_nulo", coluna=c_n, severidade="alto", a=a_n)
    # 4. integridade referencial
    a_f = achado("integridade_referencial")
    c_f = _col(nome, lambda c: c["fk"] and (not a_f or a_f.get("coluna") in (None, c["nome"])))
    if c_f or a_f:
        ref = (a_f or {}).get("ref") or (nome, c_f["fk"][0], c_f["fk"][1])
        add("integridade_referencial", coluna=(c_f["nome"] if c_f and not (a_f or {}).get("ref") else None), severidade="alto", a=a_f, ref=ref)
    # 5. volume
    if not nome.startswith("dim_"):
        add("volume", severidade="alto" if t["camada"] == "staging" else "medio", a=achado("volume"))
    # 6. frescor
    add("frescor", severidade="critico" if alta else "alto")
    # 7. contrato de schema
    a_s = achado("schema_drift")
    if nome.startswith("stg_") or t["fonte"] or a_s:
        add("schema_drift", coluna=(a_s or {}).get("coluna"), severidade="medio", a=a_s)
    # 8. reconciliação
    if nome in RECONCILIA:
        add("reconciliacao", coluna=RECONCILIA[nome][0], severidade="critico" if (alta or nome.startswith("mart_")) else "alto", a=achado("reconciliacao"))
    # 9. domínio
    a_d = achado("dominio_valores")
    c_d = a_d["coluna"] if a_d else (_col(nome, lambda c: c["nome"].startswith(_DOMINIO_PREFIXOS) and not c["pk"]) or {}).get("nome")
    if c_d:
        add("dominio_valores", coluna=c_d, severidade="medio", a=a_d)

    # no máximo 8 testes: descarta primeiro os menos relevantes que não têm achado
    for regra in ("dominio_valores", "nao_nulo", "schema_drift"):
        if len(testes) > 8:
            cand = [x for x in testes if x["regra"] == regra and not x["achado"]]
            if cand:
                testes.remove(cand[0])
    assert 3 <= len(testes) <= 8, (nome, len(testes))
    for a in achados:
        assert any(x["achado"] is a for x in testes), (nome, a)

    # ---- série de resultados (30 dias) -----------------------------------------------------------
    for x in testes:
        a = x["achado"]
        serie = []
        for i in range(N_DIAS):
            if a:
                serie.append(a["resultado"] if i >= idx(a.get("desde")) else "ok")
            elif x["regra"] == "frescor":
                at = estados[i]["atraso_h"]
                serie.append("ok" if at == 0 else ("alerta" if at <= t["sla_horas"] else "falha"))
            elif x["regra"] == "volume":
                ref = estados[i]["ref"]
                if ref and ref["anomalia_volume"] and ref["linhas"] is not None:
                    desvio = abs(ref["linhas"] - ref["linhas_esperadas"]) / max(1, ref["linhas_esperadas"])
                    serie.append("falha" if (t["camada"] == "staging" and desvio > 0.5) else "alerta")
                else:
                    serie.append("ok")
            else:
                serie.append("ok")
        x["serie"] = serie

    # ---- evidência, valores e SQL do dia de referência --------------------------------------------
    est = estados[HOJE_I]
    principal_txt = C.PROBLEMAS[nome][1] if nome in C.PROBLEMAS else None
    # tabelas sem PK: o texto do cenário vai para o motivo do farol; os testes trazem cada parte da evidência
    principal_usado = bool(achados) and all(a.get("evidencia") for a in achados)
    for n, x in enumerate(testes, 1):
        regra, col, a = x["regra"], x["coluna"], x["achado"]
        res = x["serie"][HOJE_I]
        x["id"] = f"{nome}.{regra}" + (f".{col.split(',')[0]}" if col and regra in ("unicidade", "nao_nulo", "dominio_valores") else "")
        x["nome"] = _ROTULO[regra] + (f" de `{col}`" if col and regra != "reconciliacao" else "")
        valor = limite = unidade = None
        if regra == "pk_existente":
            valor, limite, unidade = (1 if pks else 0), 1, "chave"
            ev = f"Chave primária declarada: `{', '.join(pks)}`" if pks else "Tabela sem chave primária definida"
            sql = (f"SELECT COUNT(*) AS qt_pk\nFROM information_schema.table_constraints\n"
                   f"WHERE table_name = '{nome}' AND constraint_type = 'PRIMARY KEY';")
        elif regra == "unicidade":
            valor, limite, unidade = 0, 0, "registros"
            ev = f"Nenhuma duplicidade em `{col}` ({f_int(total)} linhas verificadas)"
            sql = f"SELECT {col}, COUNT(*) AS qtd\nFROM {nome}\nGROUP BY {col}\nHAVING COUNT(*) > 1;"
        elif regra == "nao_nulo":
            valor, limite, unidade = 0.0, 0.5, "%"
            ev = f"0% de nulos em `{col}`"
            sql = f"SELECT 100.0 * SUM(CASE WHEN {col} IS NULL THEN 1 ELSE 0 END) / COUNT(*) AS pc_nulos\nFROM {nome};"
        elif regra == "integridade_referencial":
            filho, pai, chave = x["ref"]
            valor, limite, unidade = 0, 0, "registros"
            ev = f"Todas as chaves de `{col or chave}` existem em `{pai}`"
            sql = (f"SELECT COUNT(*) AS qt_orfaos\nFROM {filho} f\nLEFT JOIN {pai} p ON p.{chave} = f.{col or chave}\n"
                   f"WHERE f.{col or chave} IS NOT NULL AND p.{chave} IS NULL;")
        elif regra == "volume":
            ref = est["ref"]
            ult = next((e for e in reversed(execs) if e["linhas"] is not None), None)
            base_e = ref if (ref and ref["linhas"] is not None) else ult
            valor = base_e["linhas"] if base_e else 0
            limite = base_e["linhas_esperadas"] if base_e else 0
            unidade = "linhas"
            ev = f"{f_int(valor)} linhas na última carga, dentro da faixa esperada (cerca de {f_int(limite)})"
            if res != "ok" and not a:
                dif = valor - limite
                pct = 100 * dif / max(1, limite)
                ev = (f"{f_int(valor)} linhas na última carga contra {f_int(limite)} esperadas "
                      f"({'+' if dif > 0 else '-'}{f_dec(abs(pct))}%)")
            sql = (f"SELECT dt_execucao, linhas_carregadas, linhas_esperadas\nFROM governanca.log_execucao\n"
                   f"WHERE tabela = '{nome}'\nORDER BY dt_execucao DESC\nLIMIT 1;  -- esperado: média do mesmo dia da semana (8 semanas)")
        elif regra == "frescor":
            valor, limite, unidade = round(est["idade_h"], 1), t["sla_horas"], "horas"
            ev = f"Última carga há {f_horas(est['idade_h'])} ({f_dh(est['ultima_carga'])}); SLA de {t['sla_horas']}h"
            if res != "ok":
                ev = f"Última carga em {f_dh(est['ultima_carga'])}: {f_int(est['atraso_h'])}h além do SLA de {t['sla_horas']}h"
            sql = (f"SELECT EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - MAX(dt_fim))) / 3600 AS horas_desde_carga\n"
                   f"FROM governanca.log_execucao\nWHERE tabela = '{nome}' AND status IN ('sucesso', 'alerta');")
        elif regra == "schema_drift":
            valor, limite, unidade = 0, 0, "colunas"
            ev = f"Schema idêntico ao contrato ({len(cols)} colunas)"
            sql = (f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{nome}'\nEXCEPT\n"
                   f"SELECT coluna, tipo FROM governanca.contrato_schema WHERE tabela = '{nome}';")
        elif regra == "reconciliacao":
            medida, origem = RECONCILIA[nome]
            valor, limite, unidade = round(r.uniform(0.0, 0.06), 2), 0.5, "%"
            ev = f"Diferença de {f_dec(valor, 2)}% em `{medida}` contra {origem}"
            sql = (f"SELECT 100.0 * (SUM(a.{medida}) - o.total) / o.total AS pc_diferenca\nFROM {nome} a\n"
                   f"CROSS JOIN governanca.totais_origem o\nWHERE o.tabela = '{nome}' AND o.dt_referencia = CURRENT_DATE - 1\nGROUP BY o.total;")
        else:  # dominio_valores
            valor, limite, unidade = round(r.choice([0.0, 0.0, 0.0, 0.1, 0.2]), 1), 1.0, "%"
            ev = (f"100% dos valores de `{col}` dentro do domínio esperado" if valor == 0
                  else f"{f_dec(valor)}% dos valores de `{col}` fora do domínio (limite de {f_dec(limite)}%)")
            sql = (f"SELECT {col}, COUNT(*) AS qtd\nFROM {nome}\n"
                   f"WHERE {col} NOT IN (SELECT valor FROM governanca.dominio WHERE coluna = '{col}')\nGROUP BY {col};")
        if a and res != "ok":
            valor, limite, unidade = a.get("valor", valor), a.get("limite", limite), a.get("unidade", unidade)
            ev = a.get("evidencia")
            if not ev:
                ev, principal_usado = principal_txt, True
        elif not a and res != "ok" and DERIVADOS.get(nome) == regra:
            ev, principal_usado = principal_txt, True
        x.update(resultado=res, evidencia=ev, valor_observado=valor, limite=limite, unidade=unidade, sql=sql,
                 historico_7d=x["serie"][-7:])
    if principal_txt:
        assert principal_usado, f"achado principal de {nome} não virou evidência"
    return testes


def enriquecer_com_simulacao(testes_por_tabela):
    """Acrescenta às evidências os valores em R$ publicados pela simulação (os mesmos dos cubos dos relatórios)."""
    import conteudo
    if conteudo.VL_DUP:
        for x in testes_por_tabela.get("fato_parcelas", []):
            if x["regra"] == "unicidade" and x["resultado"] != "ok":
                x["evidencia"] += f" ({conteudo._mil(conteudo.VL_DUP)} lançados em duplicidade no recebimento de 16/11)"
    if conteudo.VL_REC and conteudo.VL_REC_OK:
        for x in testes_por_tabela.get("mart_cobranca_carteira", []):
            if x["regra"] == "reconciliacao" and x["resultado"] != "ok":
                x["evidencia"] += f": {conteudo._mi(conteudo.VL_REC)} no mart contra {conteudo._mi(conteudo.VL_REC_OK)} no banco"


def teste_publico(x):
    campos = ("id", "regra", "nome", "coluna", "severidade", "resultado", "evidencia", "valor_observado", "limite",
              "unidade", "historico_7d", "sql")
    return {k: x[k] for k in campos if x.get(k) is not None}


# ---- Farol ------------------------------------------------------------------------------------
def farol(t, estado, resultados):
    """resultados: lista de (severidade, resultado) dos testes no dia."""
    critico = any(r == "falha" and s in ("critico", "alto") for s, r in resultados)
    if estado["status_exec"] in ("falha", "nao_executou") or estado["atraso_h"] > t["sla_horas"] or critico:
        return "vermelho"
    if estado["status_exec"] in ("atrasada", "alerta") or estado["atraso_h"] > 0 or any(r != "ok" for _, r in resultados):
        return "amarelo"
    return "verde"


# ---- Índice de Saúde -----------------------------------------------------------------------------
def saude_tabela(t, execs, estados, testes, i):
    """Índice de 0 a 100 da tabela no dia i (fotografia das 08:00)."""
    est = estados[i]
    resultados = [(x["severidade"], x["serie"][i]) for x in testes]
    status = farol(t, est, resultados)
    frescor = max(0.0, 1 - est["atraso_h"] / t["sla_horas"])
    peso = sum(PESO_SEVERIDADE[s] for s, _ in resultados)
    nota_testes = sum(PESO_SEVERIDADE[s] * NOTA_TESTE[r] for s, r in resultados) / peso
    pk = 1.0 if any(c["pk"] for c in SCHEMAS[t["nome"]]) else 0.0
    agend = [e for e in execs[: i + 1] if e["_agendada"]]
    taxa = (sum(NOTA_EXEC[e["status"]] for e in agend) / len(agend)) if agend else 1.0
    base = PESOS["frescor"] * frescor + PESOS["testes"] * nota_testes + PESOS["pk"] * pk + PESOS["execucoes"] * taxa
    return dict(status=status, saude=round(100 * base * FATOR_RISCO[status], 1),
                componentes=dict(frescor=frescor, testes=nota_testes, pk=pk, execucoes=taxa))


def media_ponderada(itens):
    """itens: lista de (criticidade, valor)."""
    peso = sum(PESO_CRITICIDADE[c] for c, _ in itens)
    return sum(PESO_CRITICIDADE[c] * v for c, v in itens) / peso if peso else 0.0


FORMULA = [
    dict(nome="Testes de qualidade", peso=PESOS["testes"],
         descricao="Parcela de testes aprovados, ponderada pela severidade (crítico 4, alto 3, médio 2, baixo 1). Teste em alerta vale metade."),
    dict(nome="Frescor / SLA", peso=PESOS["frescor"],
         descricao="100% quando a última carga está dentro do SLA; cai de forma linear com as horas de atraso e zera quando o atraso alcança um SLA inteiro."),
    dict(nome="Sucesso das rotinas (30 dias)", peso=PESOS["execucoes"],
         descricao="Taxa de sucesso das execuções agendadas nos últimos 30 dias (alerta vale 0,8; atraso vale 0,5; falha vale 0)."),
    dict(nome="Chave primária", peso=PESOS["pk"],
         descricao="100% quando a tabela tem chave primária definida; zero quando não tem."),
    dict(nome="Fator de risco do farol", peso=0,
         descricao=(f"Multiplicador aplicado ao resultado da tabela: x{f_dec(FATOR_RISCO['amarelo'], 2)} quando o farol está amarelo e "
                    f"x{f_dec(FATOR_RISCO['vermelho'], 2)} quando está vermelho. O índice geral, por domínio e por camada é a média das tabelas "
                    "ponderada pela criticidade (alta 3, média 2, baixa 1).")),
]

DIMENSOES = [
    ("Completude", ("nao_nulo",), "Campos obrigatórios preenchidos (testes de não nulo)."),
    ("Unicidade", ("pk_existente", "unicidade"), "Chave primária definida e ausência de registros duplicados."),
    ("Frescor", ("frescor", "volume"), "Cargas dentro do SLA e com o volume esperado."),
    ("Integridade", ("integridade_referencial", "reconciliacao"), "Chaves estrangeiras válidas e valores reconciliados com a origem."),
    ("Conformidade", ("schema_drift", "dominio_valores"), "Schema aderente ao contrato e valores dentro do domínio."),
]
NOTA_DIMENSAO = {"ok": 100.0, "alerta": 55.0, "falha": 15.0}


def dimensoes(tabelas_testes):
    """tabelas_testes: lista de (tabela, testes). Nota da tabela na dimensão = pior resultado entre seus testes."""
    saida = []
    for nome, regras, desc in DIMENSOES:
        itens = []
        for t, testes in tabelas_testes:
            res = [x["resultado"] for x in testes if x["regra"] in regras]
            if res:
                pior = "falha" if "falha" in res else ("alerta" if "alerta" in res else "ok")
                itens.append((t["criticidade"], NOTA_DIMENSAO[pior]))
        saida.append(dict(nome=nome, indice=round(media_ponderada(itens), 1),
                          descricao=desc + " Média das tabelas ponderada pela criticidade; alerta vale 55 e falha vale 15."))
    return saida


__all__ = ["montar_testes", "farol", "saude_tabela", "media_ponderada", "FORMULA", "dimensoes", "teste_publico",
           "enriquecer_com_simulacao", "DIAS", "POR_NOME", "f_dia"]
