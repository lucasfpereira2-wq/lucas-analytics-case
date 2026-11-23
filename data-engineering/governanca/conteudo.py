"""
Conteúdo editorial do motor: metadados dos incidentes, frases dos selos, descrições longas e glossário.
Os números vêm de cenario.py e, quando disponível, de output/resumo_simulacao.json (mesma fonte dos cubos).
"""
from base import RESUMO, cenario, f_dec, f_int

C = cenario
CEN = RESUMO.get("cenario") if isinstance(RESUMO.get("cenario"), dict) else {}


def _mi(v):
    return f"R$ {f_dec(v / 1_000_000, 2)} mi"


def _mil(v):
    return f"R$ {f_int(v / 1000)} mil"


VL_DUP = CEN.get("valor_recebido_dup_16nov")
VL_REC = CEN.get("valor_recebido_16nov")
VL_REC_OK = CEN.get("valor_recebido_corrigido_16nov")
VOZ_PERDIDA = CEN.get("voz_contatos_nao_carregados_estimado")
NPS_DUP = CEN.get("respostas_nps_dup_total")
COTAS_ATIVAS = CEN.get("cotas_ativas")
_PCT = f_dec(C.RECEBIMENTO_SUPERESTIMADO_PCT)
_WPP = f_dec(C.WHATSAPP_DUP_PCT)

# ---- Incidentes: datas, situação e métricas -------------------------------------------------------
INCIDENTES_META = {
    "INC-2031": dict(detectado="2026-11-17T05:32:00-03:00", inicio="2026-11-17T02:58:00-03:00", situacao="em_analise", metricas=[
        ("Registros duplicados", f_int(C.PARCELAS_DUPLICADAS)), ("Recebimento superestimado em 16/11", f"~{_PCT}%")]
        + ([("Valor lançado em duplicidade", _mil(VL_DUP))] if VL_DUP else [])
        + ([("Recebimento de 16/11: relatório x correto", f"{_mi(VL_REC)} x {_mi(VL_REC_OK)}")] if VL_REC and VL_REC_OK else [])),
    "INC-2032": dict(detectado="2026-11-17T06:05:00-03:00", inicio="2026-11-15T02:10:00-03:00", situacao="aberto", metricas=[
        ("Dias sem dados de voz", f"{C.TELEFONIA_DIAS_PARADA} (14 a 16/11)"), ("Última carga com sucesso", "14/11 às 02:10")]
        + ([("Contatos de voz não carregados (estimativa)", f_int(VOZ_PERDIDA))] if VOZ_PERDIDA else [])
        + [("Tabelas a jusante paradas", "2")]),
    "INC-2027": dict(detectado="2026-11-06T10:20:00-03:00", inicio=C.NPS_DUP_INICIO + "T00:00:00-03:00", situacao="em_analise", metricas=[
        ("NPS divulgado (out/2026)", str(C.NPS_REPORTADO_OUT)), ("NPS correto", str(C.NPS_CORRIGIDO_OUT)),
        ("Diferença", f"{C.NPS_REPORTADO_OUT - C.NPS_CORRIGIDO_OUT} pontos")]
        + ([("Respostas duplicadas desde 01/10", f_int(NPS_DUP))] if NPS_DUP else [])),
    "INC-2033": dict(detectado="2026-11-17T06:40:00-03:00", inicio="2026-11-17T01:15:00-03:00", situacao="aberto", metricas=[
        ("Linhas carregadas em 17/11", f_int(C.PROPOSTAS_D1)), ("Média das segundas-feiras", f_int(C.PROPOSTAS_MEDIA)),
        ("Queda de volume", f"{C.PROPOSTAS_QUEDA_PCT}%")]),
    "INC-2024": dict(detectado="2026-11-03T09:15:00-03:00", inicio="2026-10-05T22:00:00-03:00", situacao="em_analise", metricas=[
        ("Cotas com grupo inexistente", f_int(C.COTAS_FK_ORFA))]
        + ([("Participação na carteira ativa", f"{f_dec(100 * C.COTAS_FK_ORFA / COTAS_ATIVAS, 2)}%")] if COTAS_ATIVAS else [])
        + [("Relatórios afetados", "2")]),
    "INC-2019": dict(detectado="2026-10-27T14:30:00-03:00", inicio="2026-08-10T00:00:00-03:00", situacao="aberto", metricas=[
        ("Conversas repetidas (7 dias)", f"{_WPP}%"), ("Chave primária", "Não definida"), ("Dono da tabela", "Não definido")]),
    "INC-2011": dict(detectado="2026-10-13T11:00:00-03:00", inicio="2026-03-02T00:00:00-03:00", situacao="aberto", metricas=[
        ("CPF nulo no canal Parceiro", f"{C.CPF_NULO_PCT_PARCEIRO}%"), ("CPF nulo no total da tabela", f"{f_dec(C.CPF_NULO_PCT_TOTAL)}%"),
        ("Limite aceito", "2%")]),
    "INC-2034": dict(detectado="2026-11-17T07:15:00-03:00", inicio="2026-11-17T03:40:00-03:00", situacao="em_analise", metricas=[
        ("Falha da rotina", "17/11 às 03:40"), ("Atraso da visão de boletos", "1 dia"), ("Tabelas aguardando", "1 (`fato_boleto`)")]),
    "INC-1987": dict(detectado="2026-09-08T16:00:00-03:00", inicio="2025-01-06T00:00:00-03:00", situacao="aberto", metricas=[
        ("Chave primária", "Não definida"), ("Dono da tabela", "Não definido"), ("Orquestração", "Pacote DTS legado")]),
    "INC-2030": dict(detectado="2026-11-13T09:40:00-03:00", inicio="2026-11-12T01:20:00-03:00", situacao="em_analise", metricas=[
        ("Coluna afetada", "cd_centro_custo"), ("Novo nome na origem", "centro_custo_id"), ("Desde", "12/11")]),
}
assert set(INCIDENTES_META) == {i["id"] for i in C.INCIDENTES}

# Tabelas não-verdes cujo problema deriva de um incidente sem citar a tabela de origem no texto do cenário
INCIDENTE_EXTRA = {"fato_inadimplencia_diaria": ["INC-2031"], "fato_funil_crm": ["INC-2033"], "stg_pesquisas_respostas": ["INC-2027"]}

# ---- Selos: frase de cada incidente dentro da mensagem do selo, e impacto estimado por relatório ----
FRASE_SELO = {
    ("INC-2031", "cobranca-carteira"): (f"Este relatório usa `fato_parcelas`, que contém {C.PARCELAS_DUPLICADAS} registros duplicados hoje. "
                                         f"Valores de recebimento de 16/11 podem estar superestimados em ~{_PCT}%."),
    ("INC-2031", "cobranca-safra"): "As parcelas duplicadas em `fato_parcelas` têm efeito marginal nas curvas (abaixo de 0,1 p.p.).",
    ("INC-2024", "cobranca-safra"): (f"Este relatório usa `dim_cota`, que tem {C.COTAS_FK_ORFA} cotas apontando para grupos inexistentes. "
                                      "Essas cotas ficam fora das análises por grupo e safra."),
    ("INC-2024", "cobranca-carteira"): f"Há também {C.COTAS_FK_ORFA} cotas sem grupo em `dim_cota`, ausentes das quebras por grupo.",
    ("INC-2032", "atendimento"): (f"Este relatório usa `stg_telefonia_cdr`, que está parada há {C.TELEFONIA_DIAS_PARADA} dias. "
                                  "O canal Voz não tem dados de 14 a 16/11 e os indicadores de voz estão desatualizados."),
    ("INC-2027", "atendimento"): (f"O NPS de outubro foi divulgado como {C.NPS_REPORTADO_OUT}; o correto é {C.NPS_CORRIGIDO_OUT} "
                                  "(respostas duplicadas em `fato_pesquisa_nps`)."),
    ("INC-2033", "vendas"): (f"Este relatório usa `stg_crm_propostas`, cuja carga de hoje trouxe {f_int(C.PROPOSTAS_D1)} linhas contra a média de "
                             f"{f_int(C.PROPOSTAS_MEDIA)}. Propostas e conversão do funil de 16/11 estão subestimadas; as vendas efetivadas não foram afetadas."),
}
IMPACTO = {
    ("INC-2031", "cobranca-carteira"): f"Recebimento de 16/11 superestimado em ~{_PCT}%" + (f" ({_mil(VL_DUP)})" if VL_DUP else ""),
    ("INC-2031", "cobranca-safra"): "Abaixo de 0,1 p.p. nas curvas de safra",
    ("INC-2024", "cobranca-safra"): f"{C.COTAS_FK_ORFA} cotas fora das curvas" + (f" ({f_dec(100 * C.COTAS_FK_ORFA / COTAS_ATIVAS, 2)}% da carteira ativa)" if COTAS_ATIVAS else ""),
    ("INC-2024", "cobranca-carteira"): f"{C.COTAS_FK_ORFA} cotas sem grupo; os totais da carteira não mudam",
    ("INC-2032", "atendimento"): (f"Cerca de {f_int(VOZ_PERDIDA)} contatos de voz não carregados (14 a 16/11)" if VOZ_PERDIDA else "Canal Voz sem dados de 14 a 16/11"),
    ("INC-2027", "atendimento"): f"NPS de outubro: {C.NPS_REPORTADO_OUT} divulgado x {C.NPS_CORRIGIDO_OUT} correto ({C.NPS_REPORTADO_OUT - C.NPS_CORRIGIDO_OUT} pontos)",
    ("INC-2019", "atendimento"): f"Volume de WhatsApp até ~{_WPP}% acima do real",
    ("INC-1987", "atendimento"): "Restrito ao histórico de voz anterior a 2025",
    ("INC-2033", "vendas"): f"Propostas de 16/11: {f_int(C.PROPOSTAS_D1)} carregadas de cerca de {f_int(C.PROPOSTAS_MEDIA)} esperadas (-{C.PROPOSTAS_QUEDA_PCT}%)",
}
TITULO_SELO = {"confiavel": "Dados confiáveis", "atencao": "Atenção", "critico": "Dados com problema crítico"}

_CAMADA = {"staging": "camada de staging (dado bruto, como chega da origem)", "core": "camada core (dado tratado e modelado)",
           "mart": "camada de marts (dado agregado para consumo em relatório)"}


def descricao_longa(t, n_colunas, pks, relatorios, titulos_rel):
    partes = [f"{t['descricao']}. Pertence ao domínio {t['dominio']} e fica na {_CAMADA[t['camada']]}."]
    if t["fonte"]:
        partes.append(f"Origem: {t['fonte']}.")
    elif t["upstreams"]:
        ups = ", ".join(f"`{u}`" for u in t["upstreams"][:4]) + (" e outras" if len(t["upstreams"]) > 4 else "")
        partes.append(f"É construída a partir de {ups}.")
    partes.append(f"Carga {t['frequencia']} pela rotina `{t['pipeline']}`, com SLA de {t['sla_horas']} horas.")
    partes.append(f"Tem {n_colunas} colunas; " + (f"chave primária: `{', '.join(pks)}`." if pks else "não possui chave primária definida."))
    partes.append(f"Responsável: {t['dono']} ({t['dono_area']})." if t["dono"] else "Não há dono formal definido para esta tabela.")
    if relatorios:
        partes.append("Alimenta: " + ", ".join(titulos_rel[r] for r in relatorios) + ".")
    return " ".join(partes)


# ---- Glossário ------------------------------------------------------------------------------------
def _g(termo, definicao, dominio, tabelas, relatorios, dono, formula=None, sigla=None):
    d = dict(termo=termo, definicao=definicao, dominio=dominio, tabelas=tabelas, relatorios=relatorios, dono=dono)
    if formula:
        d["formula"] = formula
    if sigla:
        d["sigla"] = sigla
    return d


_OPS, _COM, _COB, _ASS, _ATD, _DAD = ("Camila Furtado", "Bruno Tavares", "Patrícia Lemos", "Diego Sampaio", "Juliana Prado", "Thiago Meireles")
GLOSSARIO = [
    _g("Cota", "Participação de um consorciado em um grupo. Cada cota dá direito a um crédito e gera parcelas mensais até o fim do plano.",
       "Grupos e Cotas", ["dim_cota", "fato_cota_movimentacao"], ["vendas", "cobranca-carteira", "cobranca-safra", "assembleias"], _OPS),
    _g("Grupo", "Conjunto de consorciados reunidos para formar poupança comum, com prazo e número máximo de participantes definidos.",
       "Grupos e Cotas", ["dim_grupo", "fato_posicao_grupo_mensal"], ["assembleias", "cobranca-safra"], _OPS),
    _g("Carteira ativa", "Quantidade de cotas ativas (não canceladas nem quitadas) na data de referência. É medida de estoque: usa a última fotografia do período, nunca a soma de datas.",
       "Grupos e Cotas", ["dim_cota", "fato_inadimplencia_diaria"], ["cobranca-carteira"], _OPS, formula="Cotas com situação ativa ou contemplada em pagamento na data de referência"),
    _g("Assembleia", "Reunião periódica do grupo em que ocorrem as contemplações por sorteio e por lance, conforme o saldo do fundo comum.",
       "Assembleias", ["fato_assembleia", "fato_sorteio", "fato_lance"], ["assembleias"], _ASS),
    _g("Contemplação", "Atribuição do crédito a uma cota, por sorteio ou por lance vencedor, em assembleia.",
       "Assembleias", ["fato_contemplacao"], ["assembleias"], _ASS),
    _g("Lance", "Oferta de antecipação de parcelas feita pelo consorciado para tentar a contemplação. Vence o maior percentual ofertado.",
       "Assembleias", ["fato_lance"], ["assembleias"], _ASS, formula="Percentual do lance = valor ofertado / valor do crédito"),
    _g("Lance embutido", "Parte do lance paga com o próprio crédito da cota. O valor embutido é abatido do crédito liberado.",
       "Assembleias", ["fato_lance", "fato_liberacao_credito"], ["assembleias"], _ASS),
    _g("Crédito comercializado", "Soma dos valores de crédito das cotas vendidas no período. É a principal medida de produção comercial.",
       "Vendas", ["fato_contrato_venda", "mart_vendas_comercial"], ["vendas"], _COM, formula="Soma de vl_credito das vendas do período"),
    _g("Ticket médio", "Valor médio do crédito por cota vendida.",
       "Vendas", ["fato_contrato_venda"], ["vendas"], _COM, formula="Crédito comercializado / cotas vendidas"),
    _g("Fundo comum", "Recursos arrecadados dos consorciados destinados ao pagamento dos créditos contemplados do grupo.",
       "Financeiro e Cobrança", ["fato_fundo_comum", "fato_parcelas"], ["assembleias", "cobranca-carteira"], _COB),
    _g("Fundo de reserva", "Parcela da arrecadação usada para cobrir insuficiências do grupo, como inadimplência. O saldo remanescente é devolvido no encerramento.",
       "Financeiro e Cobrança", ["fato_fundo_reserva"], ["cobranca-carteira"], _COB),
    _g("Taxa de administração", "Remuneração da administradora pela gestão do grupo, cobrada como percentual do crédito ao longo do plano.",
       "Produto", ["dim_plano", "dim_tabela_taxa", "fato_parcelas"], ["vendas"], "Rafael Nogueira", formula="Percentual total do plano / prazo em meses, aplicado sobre o crédito"),
    _g("Inadimplência over 30/60/90", "Parcela da carteira com atraso superior a 30, 60 ou 90 dias, em quantidade de cotas ou em saldo.",
       "Financeiro e Cobrança", ["fato_inadimplencia_diaria", "mart_cobranca_carteira"], ["cobranca-carteira", "cobranca-safra"], _COB,
       formula="Cotas (ou saldo) com atraso acima de N dias / carteira ativa", sigla="Over 30/60/90"),
    _g("Roll rate", "Percentual de cotas que migram de uma faixa de atraso para a faixa seguinte de um mês para o outro.",
       "Financeiro e Cobrança", ["fato_inadimplencia_diaria"], ["cobranca-carteira"], _COB, formula="Cotas que passaram da faixa A para a faixa B / cotas na faixa A no mês anterior"),
    _g("Safra", "Conjunto de cotas vendidas no mesmo mês de adesão. Permite comparar a qualidade das vendas ao longo do tempo.",
       "Financeiro e Cobrança", ["mart_cobranca_safra_mob", "fato_contrato_venda"], ["cobranca-safra"], _COB),
    _g("MOB", "Meses decorridos desde a adesão da cota. Eixo usado nas curvas de safra.",
       "Financeiro e Cobrança", ["mart_cobranca_safra_mob"], ["cobranca-safra"], _COB, formula="Meses entre a data de adesão e a data de referência", sigla="Months on Book"),
    _g("Cohort de cancelamento", "Acompanhamento do percentual de cotas canceladas de cada safra conforme o MOB.",
       "Financeiro e Cobrança", ["fato_cancelamento_cota", "mart_cobranca_safra_mob"], ["cobranca-safra"], _COB, formula="Cancelamentos acumulados da safra até o MOB / cotas vendidas na safra"),
    _g("Tempo médio de atendimento", "Tempo médio em que o agente fica em contato com o cliente.",
       "Atendimento", ["fato_chamada", "mart_atendimento"], ["atendimento"], _ATD, formula="Soma do tempo de atendimento / contatos atendidos", sigla="TMA"),
    _g("Tempo médio de espera", "Tempo médio que o cliente aguarda em fila até ser atendido.",
       "Atendimento", ["fato_chamada", "mart_atendimento"], ["atendimento"], _ATD, formula="Soma do tempo de espera / contatos atendidos", sigla="TME"),
    _g("Resolução no primeiro contato", "Parcela dos contatos resolvidos sem necessidade de novo contato pelo mesmo motivo.",
       "Atendimento", ["fato_chamada", "fato_ticket", "mart_atendimento"], ["atendimento"], _ATD, formula="Contatos resolvidos no primeiro contato / contatos atendidos", sigla="FCR"),
    _g("Taxa de abandono", "Parcela dos contatos em que o cliente desiste antes de ser atendido.",
       "Atendimento", ["fato_chamada", "mart_atendimento"], ["atendimento"], _ATD, formula="Contatos abandonados / contatos recebidos"),
    _g("Net Promoter Score", "Indicador de lealdade medido pela pergunta de recomendação (nota de 0 a 10). Exige uma resposta por cliente e pesquisa: respostas duplicadas distorcem o resultado.",
       "Atendimento", ["fato_pesquisa_nps", "stg_pesquisas_respostas"], ["atendimento"], _ATD, formula="% de promotores (notas 9 e 10) - % de detratores (notas de 0 a 6)", sigla="NPS"),
    _g("Satisfação do cliente", "Parcela das avaliações pós-atendimento com nota 4 ou 5.",
       "Atendimento", ["fato_pesquisa_csat"], ["atendimento"], _ATD, formula="Respostas com nota 4 ou 5 / total de respostas", sigla="CSAT"),
    _g("SLA de dados", "Prazo máximo acordado entre uma carga e a seguinte. Passado esse prazo, a tabela é considerada atrasada.",
       "Governança de Dados", [], [], _DAD, formula="Horas desde a última carga <= SLA da tabela"),
    _g("Frescor", "Idade do dado: tempo decorrido desde a última carga concluída com sucesso.",
       "Governança de Dados", [], [], _DAD, formula="Agora - data e hora da última carga"),
    _g("Linhagem", "Mapa do caminho do dado, da fonte ao relatório. Mostra quais tabelas e relatórios são afetados quando algo falha na origem.",
       "Governança de Dados", [], ["vendas", "cobranca-carteira", "cobranca-safra", "atendimento", "assembleias"], _DAD),
    _g("Chave primária", "Coluna ou conjunto de colunas que identifica cada registro de forma única. Sem ela, não há como garantir contagens sem duplicidade.",
       "Governança de Dados", ["stg_whatsapp_conversas", "fato_chamadas_legacy"], [], _DAD, sigla="PK"),
    _g("Índice de Saúde dos Dados", "Nota de 0 a 100 que resume a confiabilidade de uma tabela, de um domínio ou do ambiente inteiro.",
       "Governança de Dados", [], [], _DAD,
       formula="(40% testes de qualidade + 30% frescor + 20% sucesso das rotinas em 30 dias + 10% chave primária) x fator de risco do farol, com média ponderada pela criticidade"),
]
