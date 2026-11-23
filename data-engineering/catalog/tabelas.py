"""
Lista mestre das 80 tabelas do Lucas Analytics Case (CONTRATO — fonte única de verdade).

Cada linha: nome | dominio | camada | criticidade | frequencia | sla_horas | pipeline | status | upstreams | descricao
- status é o farol-alvo do cenário (verde / amarelo / vermelho); o motor de governança deve CHEGAR nesse
  status a partir das execuções e testes simulados (nunca gravá-lo direto sem evidência).
- upstreams: tabelas das quais a tabela depende (linhagem direta). Fontes externas ficam em FONTES_STAGING.
- dono: derivado do domínio (DONOS), com exceções em DONO_OVERRIDE (None = tabela sem dono definido).
"""

DONOS = {
    "Staging": ("Thiago Meireles", "Engenharia de Dados"),
    "Cadastro": ("Marina Azevedo", "Cadastro & CRM"),
    "Produto": ("Rafael Nogueira", "Produtos"),
    "Grupos e Cotas": ("Camila Furtado", "Operações de Grupos"),
    "Vendas": ("Bruno Tavares", "Inteligência Comercial"),
    "Financeiro e Cobrança": ("Patrícia Lemos", "Crédito & Cobrança"),
    "Assembleias": ("Diego Sampaio", "Operações de Assembleias"),
    "Atendimento": ("Juliana Prado", "Experiência do Cliente"),
    "Corporativo": ("Thiago Meireles", "Engenharia de Dados"),
    "Marts": ("Fernanda Rocha", "Analytics & BI"),
}

# None = sem dono formal (achado de governança)
DONO_OVERRIDE = {
    "fato_chamadas_legacy": None,
    "stg_whatsapp_conversas": None,
    "fato_meta_comercial": ("Bruno Tavares", "Inteligência Comercial (planilha manual)"),
}

# Sistema-fonte de cada tabela de staging / tabelas sem upstream interno
FONTES = {
    "CRM Comercial": ["stg_crm_clientes", "stg_crm_propostas", "stg_crm_funil_eventos"],
    "ERP Consórcio": ["stg_erp_contratos", "stg_erp_cotas", "stg_erp_parcelas", "stg_erp_assembleias", "stg_erp_lances"],
    "Banco (CNAB / API)": ["stg_banco_retorno_cnab", "stg_banco_boletos_registrados"],
    "Telefonia (CDR)": ["stg_telefonia_cdr"],
    "WhatsApp Business API": ["stg_whatsapp_conversas"],
    "Helpdesk": ["stg_helpdesk_tickets"],
    "Plataforma de Pesquisas": ["stg_pesquisas_respostas"],
    "Discador legado": ["fato_chamadas_legacy"],
    "Planilha Comercial": ["fato_meta_comercial"],
    "RH (folha)": ["dim_colaborador"],
}

_RAW = """
stg_crm_clientes | Staging | staging | alta | diária | 24 | ingest_crm | verde | | Carga bruta de clientes e prospects do CRM Comercial
stg_crm_propostas | Staging | staging | alta | diária | 24 | ingest_crm | vermelho | | Carga bruta de propostas de adesão digitadas no CRM
stg_crm_funil_eventos | Staging | staging | media | diária | 24 | ingest_crm | verde | | Eventos de mudança de etapa do funil comercial no CRM
stg_erp_contratos | Staging | staging | alta | diária | 24 | ingest_erp | verde | | Contratos de adesão efetivados no ERP de consórcio
stg_erp_cotas | Staging | staging | alta | diária | 24 | ingest_erp | verde | | Posição bruta de cotas por grupo no ERP
stg_erp_parcelas | Staging | staging | alta | diária | 24 | ingest_erp | verde | | Parcelas emitidas e baixadas no ERP
stg_erp_assembleias | Staging | staging | alta | diária | 24 | ingest_erp | verde | | Assembleias realizadas e resultados de sorteio no ERP
stg_erp_lances | Staging | staging | media | diária | 24 | ingest_erp | verde | | Lances ofertados pelos consorciados
stg_banco_retorno_cnab | Staging | staging | alta | diária | 24 | ingest_banco_cnab | verde | | Arquivos de retorno CNAB 240 com liquidações bancárias
stg_banco_boletos_registrados | Staging | staging | alta | diária | 24 | ingest_banco_boletos | vermelho | | Boletos registrados na API de cobrança do banco
stg_telefonia_cdr | Staging | staging | alta | diária | 24 | ingest_telefonia | vermelho | | Registros de chamadas (CDR) da plataforma de telefonia
stg_whatsapp_conversas | Staging | staging | alta | horária | 3 | ingest_whatsapp | vermelho | | Conversas recebidas via webhook da WhatsApp Business API
stg_helpdesk_tickets | Staging | staging | media | horária | 3 | ingest_helpdesk | verde | | Tickets e interações digitais (chat, e-mail, app) do helpdesk
stg_pesquisas_respostas | Staging | staging | alta | diária | 24 | ingest_pesquisas | amarelo | | Respostas brutas das pesquisas NPS e CSAT
dim_cliente | Cadastro | core | alta | diária | 24 | core_cadastro | vermelho | stg_crm_clientes, stg_erp_contratos | Cadastro único de clientes (consorciados e prospects)
dim_cliente_pf | Cadastro | core | media | diária | 24 | core_cadastro | verde | dim_cliente | Atributos específicos de pessoa física
dim_cliente_pj | Cadastro | core | media | diária | 24 | core_cadastro | verde | dim_cliente | Atributos específicos de pessoa jurídica
dim_endereco | Cadastro | core | media | diária | 24 | core_cadastro | amarelo | stg_crm_clientes | Endereços dos clientes com UF e município
dim_contato | Cadastro | core | media | diária | 24 | core_cadastro | amarelo | stg_crm_clientes | Telefones e e-mails de contato dos clientes
fato_consentimento_lgpd | Cadastro | core | alta | diária | 24 | core_cadastro | amarelo | stg_crm_clientes | Consentimentos e revogações de uso de dados pessoais (LGPD)
fato_atualizacao_cadastral | Cadastro | core | baixa | diária | 24 | core_cadastro | verde | stg_crm_clientes | Histórico de alterações cadastrais
dim_segmento | Produto | core | media | semanal | 168 | core_produto | verde | stg_erp_contratos | Segmentos de consórcio (Imóvel, Auto, Pesada, Serviços)
dim_plano | Produto | core | alta | semanal | 168 | core_produto | verde | stg_erp_contratos | Planos comercializados (prazo, taxa de administração, fundo de reserva)
dim_bem_referencia | Produto | core | media | semanal | 168 | core_produto | verde | stg_erp_contratos | Bens de referência e valores de crédito
dim_tabela_taxa | Produto | core | media | semanal | 168 | core_produto | verde | stg_erp_contratos | Tabelas de taxa de administração por plano e prazo
fato_reajuste_bem | Produto | core | media | mensal | 744 | core_produto_reajuste | amarelo | dim_bem_referencia | Reajustes mensais do bem de referência (INCC, IPCA, tabela FIPE)
dim_grupo | Grupos e Cotas | core | alta | diária | 24 | core_grupos_cotas | verde | stg_erp_cotas, stg_erp_assembleias, dim_plano | Grupos de consórcio (prazo, participantes, situação)
dim_cota | Grupos e Cotas | core | alta | diária | 24 | core_grupos_cotas | vermelho | stg_erp_cotas, dim_grupo, dim_cliente, dim_plano | Cotas de consórcio e sua situação atual
fato_cota_movimentacao | Grupos e Cotas | core | media | diária | 24 | core_grupos_cotas | verde | stg_erp_cotas, dim_cota | Movimentações de situação das cotas
fato_transferencia_cota | Grupos e Cotas | core | baixa | diária | 24 | core_grupos_cotas | amarelo | stg_erp_cotas, dim_cota | Transferências de titularidade de cotas
fato_cancelamento_cota | Grupos e Cotas | core | alta | diária | 24 | core_grupos_cotas | verde | stg_erp_cotas, dim_cota | Cancelamentos e exclusões de cotas
fato_reativacao_cota | Grupos e Cotas | core | baixa | diária | 24 | core_grupos_cotas | verde | stg_erp_cotas, dim_cota | Reativações de cotas canceladas
fato_posicao_grupo_mensal | Grupos e Cotas | core | media | diária | 24 | core_grupos_cotas | verde | stg_erp_cotas, dim_grupo | Posição de ocupação e vagas por grupo
fato_lead | Vendas | core | media | diária | 24 | core_vendas | verde | stg_crm_funil_eventos | Leads captados por canal e origem
fato_proposta | Vendas | core | alta | diária | 24 | core_vendas | amarelo | stg_crm_propostas, dim_cliente, dim_vendedor | Propostas de adesão e seu desfecho
fato_contrato_venda | Vendas | core | alta | diária | 24 | core_vendas | verde | stg_erp_contratos, fato_proposta, dim_cota, dim_vendedor | Vendas efetivadas (contratos de adesão)
fato_funil_crm | Vendas | core | media | diária | 24 | core_vendas | amarelo | stg_crm_funil_eventos, fato_lead, fato_proposta | Funil comercial consolidado por etapa
dim_vendedor | Vendas | core | media | diária | 24 | core_vendas | verde | dim_colaborador, dim_equipe_comercial | Vendedores, representantes e sua equipe
dim_equipe_comercial | Vendas | core | baixa | semanal | 168 | core_vendas | verde | dim_colaborador, dim_filial | Equipes comerciais e supervisão
fato_meta_comercial | Vendas | core | alta | mensal | 744 | planilha_metas_manual | amarelo | | Metas comerciais por regional, canal e segmento (carga manual)
dim_canal_venda | Vendas | core | baixa | semanal | 168 | core_vendas | verde | | Canais de venda (Loja, Representante, Digital, Parceiro)
dim_parceiro | Vendas | core | media | diária | 24 | core_vendas | verde | stg_crm_clientes | Parceiros comerciais e correspondentes
fato_comissao | Vendas | core | media | diária | 24 | core_vendas | amarelo | fato_contrato_venda, dim_vendedor, dim_parceiro | Comissões apuradas por venda
fato_parcelas | Financeiro e Cobrança | core | alta | diária | 24 | core_financeiro_parcelas | vermelho | stg_erp_parcelas, dim_cota | Parcelas emitidas por cota, com vencimento e situação
fato_pagamento | Financeiro e Cobrança | core | alta | diária | 24 | core_financeiro_parcelas | amarelo | stg_banco_retorno_cnab, fato_parcelas | Pagamentos liquidados e conciliados
fato_boleto | Financeiro e Cobrança | core | alta | diária | 24 | core_financeiro_boletos | amarelo | stg_banco_boletos_registrados, fato_parcelas | Boletos emitidos e seu ciclo de vida
fato_acordo | Financeiro e Cobrança | core | media | diária | 24 | core_cobranca | verde | stg_erp_parcelas, fato_parcelas | Acordos de pagamento firmados
fato_renegociacao | Financeiro e Cobrança | core | media | diária | 24 | core_cobranca | verde | fato_acordo, fato_parcelas | Renegociações e diluições de parcelas
dim_regua_cobranca | Financeiro e Cobrança | core | baixa | semanal | 168 | core_cobranca | verde | | Régua de cobrança (etapas, canais e prazos)
fato_acao_cobranca | Financeiro e Cobrança | core | media | diária | 24 | core_cobranca | amarelo | dim_regua_cobranca, fato_parcelas, dim_assessoria_cobranca | Acionamentos de cobrança por canal
dim_assessoria_cobranca | Financeiro e Cobrança | core | baixa | semanal | 168 | core_cobranca | verde | | Assessorias externas de cobrança
fato_fundo_comum | Financeiro e Cobrança | core | alta | diária | 24 | core_financeiro_fundos | verde | fato_pagamento, dim_grupo | Movimentação do fundo comum por grupo
fato_fundo_reserva | Financeiro e Cobrança | core | media | diária | 24 | core_financeiro_fundos | verde | fato_pagamento, dim_grupo | Movimentação do fundo de reserva por grupo
fato_inadimplencia_diaria | Financeiro e Cobrança | core | alta | diária | 24 | core_cobranca | amarelo | fato_parcelas, fato_pagamento, dim_cota | Fotografia diária da carteira por faixa de atraso
fato_assembleia | Assembleias | core | alta | diária | 24 | core_assembleias | verde | stg_erp_assembleias, dim_grupo | Assembleias realizadas por grupo
fato_lance | Assembleias | core | alta | diária | 24 | core_assembleias | verde | stg_erp_lances, fato_assembleia, dim_grupo | Lances ofertados e vencedores
fato_sorteio | Assembleias | core | media | diária | 24 | core_assembleias | verde | stg_erp_assembleias, fato_assembleia | Resultados de sorteio por assembleia
fato_contemplacao | Assembleias | core | alta | diária | 24 | core_assembleias | verde | fato_lance, fato_sorteio, fato_assembleia | Contemplações por sorteio e por lance
fato_liberacao_credito | Assembleias | core | alta | diária | 24 | core_assembleias | verde | fato_contemplacao, stg_erp_contratos | Créditos liberados aos contemplados
fato_garantia | Assembleias | core | media | diária | 24 | core_assembleias_garantias | amarelo | fato_liberacao_credito | Garantias vinculadas aos créditos liberados
fato_chamada | Atendimento | core | alta | diária | 24 | core_atendimento | vermelho | stg_telefonia_cdr, dim_agente, dim_fila_atendimento, dim_motivo_contato | Chamadas de voz atendidas e abandonadas (URA e humano)
fato_chamadas_legacy | Atendimento | core | media | diária | 24 | legacy_chamadas_dts | vermelho | | Histórico de chamadas do discador antigo (legado)
fato_conversa_whatsapp | Atendimento | core | alta | horária | 3 | core_atendimento_digital | amarelo | stg_whatsapp_conversas, dim_agente, dim_motivo_contato | Conversas de WhatsApp consolidadas
fato_ticket | Atendimento | core | media | horária | 3 | core_atendimento_digital | amarelo | stg_helpdesk_tickets, dim_motivo_contato, dim_agente | Tickets de atendimento e seu ciclo de resolução
fato_interacao_digital | Atendimento | core | media | horária | 3 | core_atendimento_digital | verde | stg_helpdesk_tickets | Interações por chat, e-mail e aplicativo
dim_motivo_contato | Atendimento | core | baixa | semanal | 168 | core_atendimento | verde | | Árvore de motivos de contato
fato_pesquisa_nps | Atendimento | core | alta | diária | 24 | core_pesquisas | vermelho | stg_pesquisas_respostas | Respostas de NPS por cliente e canal
fato_pesquisa_csat | Atendimento | core | media | diária | 24 | core_pesquisas | verde | stg_pesquisas_respostas, fato_ticket | Respostas de CSAT pós-atendimento
dim_agente | Atendimento | core | baixa | diária | 24 | core_atendimento | verde | dim_colaborador | Agentes de atendimento e suas filas
dim_fila_atendimento | Atendimento | core | baixa | semanal | 168 | core_atendimento | verde | | Filas e skills de atendimento
dim_filial | Corporativo | core | media | semanal | 168 | core_corporativo | verde | | Filiais e lojas próprias
dim_regional | Corporativo | core | media | semanal | 168 | core_corporativo | verde | | Regionais comerciais e suas UFs
dim_calendario | Corporativo | core | baixa | mensal | 744 | core_corporativo | verde | | Calendário com dias úteis e feriados
dim_colaborador | Corporativo | core | media | diária | 24 | core_corporativo_rh | amarelo | | Colaboradores ativos e desligados (origem RH)
mart_vendas_comercial | Marts | mart | alta | diária | 24 | mart_vendas | amarelo | fato_contrato_venda, fato_proposta, fato_funil_crm, fato_meta_comercial, dim_vendedor, dim_canal_venda, fato_cancelamento_cota, dim_filial | Mart do relatório de Vendas / Comercial
mart_cobranca_carteira | Marts | mart | alta | diária | 24 | mart_cobranca | vermelho | fato_parcelas, fato_pagamento, fato_inadimplencia_diaria, fato_acordo, fato_acao_cobranca, dim_cota | Mart do relatório de Carteira e Inadimplência
mart_cobranca_safra_mob | Marts | mart | alta | diária | 24 | mart_cobranca | amarelo | fato_parcelas, fato_inadimplencia_diaria, fato_contrato_venda, fato_cancelamento_cota, dim_cota | Mart de safra, MOB e cohort de cancelamento
mart_atendimento | Marts | mart | alta | diária | 24 | mart_atendimento | vermelho | fato_chamada, fato_chamadas_legacy, fato_conversa_whatsapp, fato_ticket, fato_interacao_digital, fato_pesquisa_nps, fato_pesquisa_csat, dim_motivo_contato | Mart do relatório de Atendimento (volumes, tempos, NPS, CSAT)
mart_assembleias_contemplacoes | Marts | mart | alta | diária | 24 | mart_assembleias | verde | fato_assembleia, fato_lance, fato_sorteio, fato_contemplacao, fato_liberacao_credito, dim_grupo, fato_posicao_grupo_mensal | Mart do relatório de Assembleias e Contemplações
mart_executivo_kpis | Marts | mart | alta | diária | 24 | mart_executivo | amarelo | mart_vendas_comercial, mart_cobranca_carteira, mart_cobranca_safra_mob, mart_atendimento, mart_assembleias_contemplacoes | KPIs consolidados para o comitê executivo
"""

CAMPOS = ["nome", "dominio", "camada", "criticidade", "frequencia", "sla_horas", "pipeline", "status", "upstreams", "descricao"]


def _parse():
    tabelas = []
    for linha in _RAW.strip().splitlines():
        partes = [p.strip() for p in linha.split("|")]
        assert len(partes) == len(CAMPOS), linha
        t = dict(zip(CAMPOS, partes))
        t["sla_horas"] = int(t["sla_horas"])
        t["upstreams"] = [u.strip() for u in t["upstreams"].split(",") if u.strip()]
        dono = DONO_OVERRIDE.get(t["nome"], DONOS[t["dominio"]])
        t["dono"], t["dono_area"] = (dono if dono else (None, None))
        t["fonte"] = next((f for f, ts in FONTES.items() if t["nome"] in ts), None)
        tabelas.append(t)
    nomes = {t["nome"] for t in tabelas}
    for t in tabelas:
        for u in t["upstreams"]:
            assert u in nomes, f"upstream desconhecido: {u} em {t['nome']}"
    assert len(tabelas) == 80, len(tabelas)
    return tabelas


TABELAS = _parse()
POR_NOME = {t["nome"]: t for t in TABELAS}

# Relatórios do portal e o mart que alimenta cada um
RELATORIOS = [
    {"id": "vendas", "titulo": "Vendas / Comercial", "rota": "/relatorios/vendas", "mart": "mart_vendas_comercial"},
    {"id": "cobranca-carteira", "titulo": "Cobrança: Carteira e Inadimplência", "rota": "/relatorios/cobranca-carteira", "mart": "mart_cobranca_carteira"},
    {"id": "cobranca-safra", "titulo": "Cobrança: Safra, MOB e Cohort", "rota": "/relatorios/cobranca-safra", "mart": "mart_cobranca_safra_mob"},
    {"id": "atendimento", "titulo": "Atendimento", "rota": "/relatorios/atendimento", "mart": "mart_atendimento"},
    {"id": "assembleias", "titulo": "Assembleias e Contemplações", "rota": "/relatorios/assembleias", "mart": "mart_assembleias_contemplacoes"},
]

if __name__ == "__main__":
    from collections import Counter
    print(len(TABELAS), Counter(t["status"] for t in TABELAS), Counter(t["dominio"] for t in TABELAS))
