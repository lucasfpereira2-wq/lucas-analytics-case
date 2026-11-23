"""
Schemas das 80 tabelas do Lucas Analytics Case (colunas, PK, FK e marcação de dado pessoal).

SCHEMAS: dict[str, list[dict]] — cada coluna:
    nome, tipo, descricao, pk (bool), fk ((tabela, coluna) ou None), nulavel (bool), pii (bool)

Convenções:
- snake_case em português; prefixos id_ (chave), cd_ (código de origem), nm_ (nome), dt_ (data),
  vl_ (valor em R$), pc_ (percentual), qt_ (quantidade), fl_ (indicador S/N).
- PK é a chave declarada no catálogo. O warehouse não impõe unicidade, por isso existe o teste
  `unicidade` no motor de governança (é assim que 312 duplicados chegam a `fato_parcelas.id_parcela`).
- Tabelas de cenario.TABELAS_SEM_PK não têm nenhuma coluna pk=True.
- FKs apontam sempre para tabelas a montante na linhagem (tabelas.py) ou, na staging, para tabelas
  do mesmo sistema-fonte.

Formato compacto usado abaixo (uma coluna por linha):
    nome | tipo | flags | descrição
    flags: pk, pii, null, fk=tabela.coluna (separadas por espaço)
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import cenario  # noqa: E402
import tabelas  # noqa: E402

_DSL = {}


def _t(nome, texto):
    _DSL[nome] = texto


# =============================== STAGING ===============================
_t("stg_crm_clientes", """
id_cliente_crm | bigint | pk | Identificador do cliente no CRM Comercial
nome_cliente | varchar(120) | pii | Nome completo ou razão social informada no cadastro
cpf_cnpj | varchar(18) | pii null | CPF ou CNPJ como digitado na origem
tipo_pessoa | char(2) | | PF ou PJ
email | varchar(120) | pii null | E-mail principal
telefone | varchar(20) | pii null | Telefone principal com DDD
cep | varchar(9) | pii null | CEP do endereço principal
municipio | varchar(80) | null | Município do endereço principal
uf | char(2) | null | Unidade da federação
canal_origem | varchar(30) | | Canal em que o cadastro foi originado
dt_cadastro | timestamp | | Data e hora do cadastro no CRM
dt_atualizacao | timestamp | | Última alteração do registro na origem
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_crm_propostas", """
id_proposta_crm | bigint | pk | Identificador da proposta no CRM
id_cliente_crm | bigint | fk=stg_crm_clientes.id_cliente_crm | Cliente proponente
cd_vendedor | varchar(12) | | Código do vendedor responsável
cd_plano | varchar(12) | | Plano escolhido na proposta
segmento | varchar(20) | | Segmento do consórcio
canal_venda | varchar(30) | | Canal de venda da proposta
vl_credito | decimal(14,2) | | Valor do crédito pretendido
status_proposta | varchar(20) | | Situação da proposta no CRM
dt_proposta | timestamp | | Data e hora da digitação
dt_atualizacao | timestamp | | Última alteração na origem
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_crm_funil_eventos", """
id_evento | bigint | pk | Identificador do evento de funil
id_lead | bigint | | Lead ao qual o evento pertence
id_proposta_crm | bigint | null | Proposta associada, quando houver
etapa | varchar(30) | | Etapa de destino do evento
etapa_anterior | varchar(30) | null | Etapa de origem
cd_vendedor | varchar(12) | null | Vendedor responsável no momento do evento
canal_venda | varchar(30) | | Canal de venda
dt_evento | timestamp | | Data e hora da mudança de etapa
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_erp_contratos", """
nr_contrato | bigint | pk | Número do contrato de adesão no ERP
nr_proposta | bigint | null | Número da proposta que originou o contrato
cd_cliente_erp | bigint | | Código do cliente no ERP
cpf_cnpj | varchar(18) | pii | CPF ou CNPJ do titular
cd_grupo | varchar(8) | | Código do grupo
nr_cota | integer | | Número da cota dentro do grupo
cd_plano | varchar(12) | | Plano contratado
cd_bem | varchar(12) | | Bem de referência
vl_credito | decimal(14,2) | | Valor do crédito contratado
dt_adesao | date | | Data de adesão
situacao | varchar(20) | | Situação do contrato
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_erp_cotas", """
id_cota_erp | bigint | pk | Identificador interno da cota no ERP
cd_grupo | varchar(8) | | Código do grupo
nr_cota | integer | | Número da cota dentro do grupo
cd_cliente_erp | bigint | | Código do titular no ERP
cd_plano | varchar(12) | | Plano da cota
situacao_cota | varchar(20) | | Situação atual da cota
vl_credito_atual | decimal(14,2) | | Valor do crédito atualizado
pc_pago | decimal(7,4) | | Percentual do plano já pago
dt_adesao | date | | Data de adesão
dt_situacao | date | | Data da última mudança de situação
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_erp_parcelas", """
id_parcela_erp | bigint | pk | Identificador da parcela no ERP
id_cota_erp | bigint | fk=stg_erp_cotas.id_cota_erp | Cota a que a parcela pertence
nr_parcela | integer | | Número sequencial da parcela
dt_vencimento | date | | Data de vencimento
vl_parcela | decimal(12,2) | | Valor total da parcela
vl_fundo_comum | decimal(12,2) | | Parte destinada ao fundo comum
vl_taxa_adm | decimal(12,2) | | Parte de taxa de administração
vl_fundo_reserva | decimal(12,2) | | Parte de fundo de reserva
dt_baixa | date | null | Data da baixa no ERP
vl_baixado | decimal(12,2) | null | Valor baixado
situacao | varchar(20) | | Situação da parcela
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_erp_assembleias", """
id_assembleia_erp | bigint | pk | Identificador da assembleia no ERP
cd_grupo | varchar(8) | | Código do grupo
nr_assembleia | integer | | Número sequencial da assembleia no grupo
dt_assembleia | date | | Data de realização
tipo_assembleia | varchar(20) | | Ordinária ou extraordinária
qt_participantes | integer | | Cotas aptas a concorrer
qt_contemplados_sorteio | integer | | Contemplações por sorteio
qt_contemplados_lance | integer | | Contemplações por lance
vl_saldo_fundo | decimal(16,2) | | Saldo do fundo comum disponível na assembleia
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_erp_lances", """
id_lance_erp | bigint | pk | Identificador do lance no ERP
id_assembleia_erp | bigint | fk=stg_erp_assembleias.id_assembleia_erp | Assembleia em que o lance foi ofertado
id_cota_erp | bigint | fk=stg_erp_cotas.id_cota_erp | Cota ofertante
tipo_lance | varchar(20) | | Livre, fixo ou embutido
pc_lance | decimal(7,4) | | Percentual do crédito ofertado
vl_lance | decimal(14,2) | | Valor do lance
vl_embutido | decimal(14,2) | null | Parte do lance embutida no crédito
fl_vencedor | char(1) | | Indica lance vencedor (S/N)
dt_oferta | timestamp | | Data e hora da oferta
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_banco_retorno_cnab", """
id_registro | bigint | pk | Identificador do registro de retorno
nm_arquivo | varchar(60) | | Nome do arquivo CNAB 240 de origem
nr_lote | integer | | Número do lote no arquivo
nosso_numero | varchar(20) | | Identificação do título no banco
cd_ocorrencia | char(2) | | Código de ocorrência do retorno
dt_ocorrencia | date | | Data da ocorrência
dt_credito | date | null | Data de crédito em conta
vl_pago | decimal(12,2) | | Valor pago pelo sacado
vl_tarifa | decimal(8,2) | | Tarifa cobrada pelo banco
cd_banco | char(3) | | Código do banco
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_banco_boletos_registrados", """
id_boleto_banco | bigint | pk | Identificador do boleto na API do banco
nosso_numero | varchar(20) | | Identificação do título no banco
nr_documento | varchar(20) | | Número do documento (parcela)
cpf_cnpj_pagador | varchar(18) | pii | CPF ou CNPJ do pagador
dt_emissao | date | | Data de emissão
dt_vencimento | date | | Data de vencimento
vl_nominal | decimal(12,2) | | Valor nominal do boleto
status_registro | varchar(20) | | Situação do registro no banco
linha_digitavel | varchar(54) | | Linha digitável
dt_registro | timestamp | null | Data e hora do registro
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_telefonia_cdr", """
id_chamada_cdr | varchar(36) | pk | Identificador único da chamada na plataforma de telefonia
nr_origem | varchar(20) | pii | Número de origem da chamada
nr_destino | varchar(20) | | Número de destino (0800 ou DDR)
ramal_agente | varchar(8) | null | Ramal do agente que atendeu
cd_fila | varchar(12) | | Fila de atendimento
dt_inicio | timestamp | | Início da chamada
dt_atendimento | timestamp | null | Momento do atendimento humano
dt_fim | timestamp | | Fim da chamada
duracao_seg | integer | | Duração total em segundos
tempo_espera_seg | integer | | Tempo em fila em segundos
status_chamada | varchar(20) | | Atendida, abandonada ou retida na URA
nm_arquivo_origem | varchar(60) | | Arquivo CDR de origem no SFTP
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_whatsapp_conversas", """
id_conversa | varchar(40) | | Identificador da conversa enviado pelo webhook (candidata a chave; não há PK definida)
nr_telefone | varchar(20) | pii | Telefone do cliente
nm_contato | varchar(80) | pii null | Nome do perfil no WhatsApp
dt_inicio | timestamp | | Início da conversa
dt_fim | timestamp | null | Encerramento da conversa
qt_mensagens | integer | | Mensagens trocadas
cd_agente | varchar(12) | null | Agente que assumiu a conversa
status_conversa | varchar(20) | | Situação da conversa
id_webhook_evento | varchar(40) | | Identificador do evento de webhook recebido
payload_hash | char(32) | | Hash do payload recebido
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_helpdesk_tickets", """
id_ticket_helpdesk | bigint | pk | Identificador do ticket no helpdesk
canal | varchar(20) | | Chat, e-mail ou aplicativo
email_solicitante | varchar(120) | pii null | E-mail de quem abriu o ticket
cpf_solicitante | varchar(14) | pii null | CPF informado na abertura
assunto | varchar(160) | | Assunto do ticket
cd_motivo | varchar(12) | null | Motivo classificado pelo agente
status | varchar(20) | | Situação do ticket
prioridade | varchar(10) | | Prioridade atribuída
cd_agente | varchar(12) | null | Agente responsável
dt_abertura | timestamp | | Abertura do ticket
dt_primeira_resposta | timestamp | null | Primeira resposta ao cliente
dt_resolucao | timestamp | null | Resolução do ticket
_dt_carga | timestamp | | Data e hora da ingestão
""")
_t("stg_pesquisas_respostas", """
id_entrega | varchar(40) | pk | Identificador da entrega (evento) feita pela plataforma de pesquisas
id_resposta | varchar(40) | | Identificador da resposta; deveria ser único, mas a plataforma reenvia respostas
tipo_pesquisa | varchar(10) | | NPS ou CSAT
cpf_respondente | varchar(14) | pii null | CPF do respondente
nota | smallint | | Nota atribuída
comentario | varchar(500) | pii null | Comentário livre do cliente
canal | varchar(20) | | Canal em que a pesquisa foi respondida
id_ticket_helpdesk | bigint | null | Ticket avaliado (CSAT)
dt_resposta | timestamp | | Data e hora da resposta
_dt_carga | timestamp | | Data e hora da ingestão
""")

# =============================== CADASTRO ===============================
_t("dim_cliente", """
id_cliente | bigint | pk | Chave do cliente no cadastro único
id_cliente_crm | bigint | fk=stg_crm_clientes.id_cliente_crm null | Identificador no CRM Comercial
cpf_cliente | varchar(14) | pii null | CPF do cliente (ausente em parte dos cadastros do canal Parceiro)
nome_cliente | varchar(120) | pii | Nome completo ou razão social
tipo_pessoa | char(2) | | PF ou PJ
dt_nascimento | date | pii null | Data de nascimento (PF)
canal_origem | varchar(30) | | Canal em que o cadastro foi originado
uf | char(2) | null | UF de residência
regional | varchar(30) | null | Regional comercial
fl_consorciado | char(1) | | Possui cota ativa (S/N)
dt_cadastro | date | | Data do primeiro cadastro
dt_atualizacao | timestamp | | Última atualização do registro
""")
_t("dim_cliente_pf", """
id_cliente | bigint | pk fk=dim_cliente.id_cliente | Cliente pessoa física
cpf | varchar(14) | pii | CPF
nome_mae | varchar(120) | pii null | Nome da mãe
dt_nascimento | date | pii | Data de nascimento
sexo | char(1) | pii null | Sexo declarado
estado_civil | varchar(20) | null | Estado civil
profissao | varchar(60) | null | Profissão declarada
faixa_renda | varchar(20) | null | Faixa de renda mensal declarada
""")
_t("dim_cliente_pj", """
id_cliente | bigint | pk fk=dim_cliente.id_cliente | Cliente pessoa jurídica
cnpj | varchar(18) | | CNPJ
razao_social | varchar(120) | | Razão social
nome_fantasia | varchar(120) | null | Nome fantasia
cnae_principal | varchar(9) | null | CNAE principal
porte | varchar(20) | null | Porte da empresa
nome_representante | varchar(120) | pii | Representante legal
cpf_representante | varchar(14) | pii | CPF do representante legal
dt_fundacao | date | null | Data de fundação
""")
_t("dim_endereco", """
id_endereco | bigint | pk | Chave do endereço
id_cliente | bigint | fk=stg_crm_clientes.id_cliente_crm | Cliente (identificador do CRM)
tipo_endereco | varchar(20) | | Residencial, comercial ou correspondência
logradouro | varchar(120) | pii | Logradouro
numero | varchar(10) | pii null | Número
complemento | varchar(60) | pii null | Complemento
bairro | varchar(60) | null | Bairro
municipio | varchar(80) | | Município
uf | char(2) | | Unidade da federação
cep | varchar(9) | pii | CEP
fl_principal | char(1) | | Endereço principal (S/N)
""")
_t("dim_contato", """
id_contato | bigint | pk | Chave do contato
id_cliente | bigint | fk=stg_crm_clientes.id_cliente_crm | Cliente (identificador do CRM)
tipo_contato | varchar(20) | | Celular, fixo ou e-mail
telefone | varchar(20) | pii null | Telefone com DDD
email | varchar(120) | pii null | Endereço de e-mail
fl_whatsapp | char(1) | | Número com WhatsApp (S/N)
fl_principal | char(1) | | Contato principal (S/N)
fl_opt_in | char(1) | | Aceita comunicações (S/N)
dt_atualizacao | timestamp | | Última atualização
""")
_t("fato_consentimento_lgpd", """
id_consentimento | bigint | pk | Chave do registro de consentimento
id_cliente | bigint | fk=stg_crm_clientes.id_cliente_crm | Titular dos dados (identificador do CRM)
finalidade | varchar(40) | | Finalidade do tratamento
base_legal | varchar(40) | null | Base legal do tratamento (LGPD, art. 7º)
canal_coleta | varchar(30) | | Canal em que o consentimento foi coletado
fl_consentido | char(1) | | Consentimento concedido (S/N)
dt_consentimento | timestamp | | Data e hora do consentimento
dt_revogacao | timestamp | null | Data e hora da revogação
versao_termo | varchar(10) | | Versão do termo aceito
ip_coleta | varchar(45) | pii null | Endereço IP da coleta
""")
_t("fato_atualizacao_cadastral", """
id_atualizacao | bigint | pk | Chave da alteração cadastral
id_cliente | bigint | fk=stg_crm_clientes.id_cliente_crm | Cliente (identificador do CRM)
campo_alterado | varchar(40) | | Campo que sofreu alteração
valor_anterior | varchar(200) | pii null | Valor antes da alteração
valor_novo | varchar(200) | pii null | Valor depois da alteração
origem | varchar(30) | | Canal que originou a alteração
usuario_responsavel | varchar(40) | | Usuário ou sistema responsável
dt_alteracao | timestamp | | Data e hora da alteração
""")

# =============================== PRODUTO ===============================
_t("dim_segmento", """
id_segmento | smallint | pk | Chave do segmento
nm_segmento | varchar(20) | | Imóvel, Auto, Pesada ou Serviços
descricao | varchar(160) | | Descrição do segmento
prazo_maximo_meses | smallint | | Prazo máximo dos planos do segmento
fl_ativo | char(1) | | Segmento comercializado (S/N)
dt_atualizacao | timestamp | | Última atualização
""")
_t("dim_plano", """
id_plano | integer | pk | Chave do plano
cd_plano | varchar(12) | | Código do plano no ERP
nm_plano | varchar(60) | | Nome comercial do plano
segmento | varchar(20) | | Segmento do plano
prazo_meses | smallint | | Prazo em meses
pc_taxa_administracao | decimal(7,4) | | Taxa de administração total do plano
pc_fundo_reserva | decimal(7,4) | | Percentual de fundo de reserva
pc_seguro | decimal(7,4) | null | Percentual de seguro prestamista
fl_ativo | char(1) | | Plano em comercialização (S/N)
dt_inicio_vigencia | date | | Início da vigência
""")
_t("dim_bem_referencia", """
id_bem | integer | pk | Chave do bem de referência
cd_bem | varchar(12) | | Código do bem no ERP
descricao_bem | varchar(120) | | Descrição do bem ou serviço
segmento | varchar(20) | | Segmento do bem
vl_credito | decimal(14,2) | | Valor atual do crédito de referência
indice_reajuste | varchar(10) | | Índice de reajuste aplicado (INCC, IPCA, FIPE)
fl_ativo | char(1) | | Bem em comercialização (S/N)
dt_atualizacao | timestamp | | Última atualização
""")
_t("dim_tabela_taxa", """
id_tabela_taxa | integer | pk | Chave da tabela de taxa
cd_plano | varchar(12) | | Plano a que a tabela se aplica
prazo_meses | smallint | | Prazo em meses
pc_taxa_administracao | decimal(7,4) | | Taxa de administração total
pc_taxa_antecipada | decimal(7,4) | | Taxa de administração antecipada
dt_inicio_vigencia | date | | Início da vigência
dt_fim_vigencia | date | null | Fim da vigência
""")
_t("fato_reajuste_bem", """
id_reajuste | bigint | pk | Chave do reajuste
id_bem | integer | fk=dim_bem_referencia.id_bem | Bem de referência reajustado
competencia | char(7) | | Mês de competência (AAAA-MM)
indice_reajuste | varchar(10) | | Índice aplicado
pc_reajuste | decimal(7,4) | | Percentual de reajuste
vl_anterior | decimal(14,2) | | Valor do crédito antes do reajuste
vl_reajustado | decimal(14,2) | | Valor do crédito após o reajuste
dt_aplicacao | date | | Data de aplicação
""")

# =============================== GRUPOS E COTAS ===============================
_t("dim_grupo", """
id_grupo | integer | pk | Chave do grupo de consórcio
cd_grupo | varchar(8) | | Código do grupo no ERP
id_plano | integer | fk=dim_plano.id_plano | Plano do grupo
segmento | varchar(20) | | Segmento do grupo
prazo_meses | smallint | | Prazo do grupo em meses
qt_participantes_max | integer | | Número máximo de participantes
dia_vencimento | smallint | | Dia de vencimento das parcelas
dt_formacao | date | | Data de formação do grupo
dt_primeira_assembleia | date | | Data da primeira assembleia
dt_encerramento_previsto | date | | Encerramento previsto
situacao_grupo | varchar(20) | | Em formação, em andamento ou encerrado
""")
_t("dim_cota", """
id_cota | bigint | pk | Chave da cota
id_grupo | integer | fk=dim_grupo.id_grupo | Grupo da cota
id_cliente | bigint | fk=dim_cliente.id_cliente | Titular atual da cota
id_plano | integer | fk=dim_plano.id_plano | Plano da cota
nr_cota | integer | | Número da cota dentro do grupo
situacao_cota | varchar(20) | | Ativa, contemplada, cancelada ou quitada
vl_credito | decimal(14,2) | | Valor atual do crédito
pc_pago | decimal(7,4) | | Percentual do plano já pago
dt_adesao | date | | Data de adesão
dt_contemplacao | date | null | Data de contemplação
dt_cancelamento | date | null | Data de cancelamento
dt_atualizacao | timestamp | | Última atualização
""")
_t("fato_cota_movimentacao", """
id_movimentacao | bigint | pk | Chave da movimentação
id_cota | bigint | fk=dim_cota.id_cota | Cota movimentada
situacao_anterior | varchar(20) | | Situação antes da movimentação
situacao_nova | varchar(20) | | Situação após a movimentação
motivo | varchar(60) | null | Motivo informado
usuario_origem | varchar(40) | | Usuário ou rotina que originou a movimentação
dt_movimentacao | timestamp | | Data e hora da movimentação
""")
_t("fato_transferencia_cota", """
id_transferencia | bigint | pk | Chave da transferência
id_cota | bigint | fk=dim_cota.id_cota | Cota transferida
id_cliente_cedente | bigint | fk=dim_cliente.id_cliente | Titular que cede a cota
id_cliente_cessionario | bigint | fk=dim_cliente.id_cliente | Novo titular
vl_taxa_transferencia | decimal(10,2) | | Taxa de transferência cobrada
situacao | varchar(20) | | Solicitada, em análise, efetivada ou recusada
dt_solicitacao | date | | Data da solicitação
dt_efetivacao | date | null | Data da efetivação
""")
_t("fato_cancelamento_cota", """
id_cancelamento | bigint | pk | Chave do cancelamento
id_cota | bigint | fk=dim_cota.id_cota | Cota cancelada
tipo_cancelamento | varchar(20) | | Desistência, inadimplência ou arrependimento (7 dias)
motivo_cancelamento | varchar(60) | null | Motivo declarado
qt_parcelas_pagas | smallint | | Parcelas pagas até o cancelamento
mob_cancelamento | smallint | | Meses desde a adesão no cancelamento
vl_pago_acumulado | decimal(14,2) | | Valor pago ao fundo comum
vl_a_devolver | decimal(14,2) | | Valor a devolver ao excluído
dt_cancelamento | date | | Data do cancelamento
""")
_t("fato_reativacao_cota", """
id_reativacao | bigint | pk | Chave da reativação
id_cota | bigint | fk=dim_cota.id_cota | Cota reativada
canal_solicitacao | varchar(30) | | Canal em que a reativação foi solicitada
vl_regularizado | decimal(14,2) | | Valor regularizado na reativação
qt_parcelas_regularizadas | smallint | | Parcelas regularizadas
usuario_responsavel | varchar(40) | | Usuário que efetivou a reativação
dt_reativacao | date | | Data da reativação
""")
_t("fato_posicao_grupo_mensal", """
id_grupo | integer | pk fk=dim_grupo.id_grupo | Grupo
competencia | char(7) | pk | Mês de competência (AAAA-MM)
qt_cotas_ativas | integer | | Cotas ativas no fechamento
qt_cotas_contempladas | integer | | Cotas contempladas acumuladas
qt_cotas_canceladas | integer | | Cotas canceladas acumuladas
qt_vagas | integer | | Vagas disponíveis para venda
pc_ocupacao | decimal(7,4) | | Percentual de ocupação do grupo
vl_saldo_fundo_comum | decimal(16,2) | | Saldo do fundo comum no fechamento
""")

# =============================== VENDAS ===============================
_t("fato_lead", """
id_lead | bigint | pk | Chave do lead
canal_venda | varchar(30) | | Canal de captação
origem_lead | varchar(40) | | Origem (site, indicação, campanha, parceiro)
campanha | varchar(60) | null | Campanha de marketing associada
uf | char(2) | null | UF informada pelo lead
segmento_interesse | varchar(20) | null | Segmento de interesse
etapa_atual | varchar(30) | | Etapa atual no funil
cd_vendedor | varchar(12) | null | Vendedor responsável
dt_captacao | timestamp | | Data e hora da captação
dt_ultima_interacao | timestamp | null | Última interação registrada
""")
_t("fato_proposta", """
id_proposta | bigint | pk | Chave da proposta
id_cliente | bigint | fk=dim_cliente.id_cliente | Cliente proponente
id_vendedor | integer | fk=dim_vendedor.id_vendedor | Vendedor responsável
id_lead | bigint | null | Lead de origem, quando rastreado
segmento | varchar(20) | | Segmento do consórcio
canal_venda | varchar(30) | | Canal de venda
vl_credito | decimal(14,2) | | Crédito pretendido
status_proposta | varchar(20) | | Em análise, aprovada, recusada ou convertida
motivo_recusa | varchar(60) | null | Motivo da recusa
dt_proposta | date | | Data da proposta
dt_decisao | date | null | Data da decisão
""")
_t("fato_contrato_venda", """
id_contrato | bigint | pk | Chave da venda (contrato de adesão)
id_proposta | bigint | fk=fato_proposta.id_proposta null | Proposta que originou a venda
id_cota | bigint | fk=dim_cota.id_cota | Cota vendida
id_vendedor | integer | fk=dim_vendedor.id_vendedor | Vendedor da venda
segmento | varchar(20) | | Segmento
canal_venda | varchar(30) | | Canal de venda
uf | char(2) | | UF da venda
vl_credito | decimal(14,2) | | Crédito comercializado
vl_primeira_parcela | decimal(12,2) | | Valor da primeira parcela
fl_cancelado_7d | char(1) | | Cancelada no prazo de arrependimento (S/N)
dt_venda | date | | Data da venda
""")
_t("fato_funil_crm", """
id_funil | bigint | pk | Chave do registro de funil
id_lead | bigint | fk=fato_lead.id_lead | Lead
id_proposta | bigint | fk=fato_proposta.id_proposta null | Proposta, a partir da etapa de proposta
etapa | varchar(30) | | Etapa do funil
ordem_etapa | smallint | | Ordem da etapa no funil
canal_venda | varchar(30) | | Canal de venda
dt_entrada_etapa | timestamp | | Entrada na etapa
dt_saida_etapa | timestamp | null | Saída da etapa
tempo_etapa_horas | decimal(10,2) | null | Tempo de permanência na etapa
""")
_t("dim_vendedor", """
id_vendedor | integer | pk | Chave do vendedor
id_colaborador | integer | fk=dim_colaborador.id_colaborador null | Colaborador (vazio para representantes externos)
id_equipe | integer | fk=dim_equipe_comercial.id_equipe | Equipe comercial
nm_vendedor | varchar(120) | pii | Nome do vendedor
tipo_vendedor | varchar(20) | | Próprio, representante ou parceiro
canal_venda | varchar(30) | | Canal de atuação
regional | varchar(30) | | Regional comercial
fl_ativo | char(1) | | Vendedor ativo (S/N)
dt_inicio | date | | Início da atuação
""")
_t("dim_equipe_comercial", """
id_equipe | integer | pk | Chave da equipe comercial
nm_equipe | varchar(60) | | Nome da equipe
id_filial | integer | fk=dim_filial.id_filial | Filial da equipe
id_supervisor | integer | fk=dim_colaborador.id_colaborador null | Supervisor responsável
canal_venda | varchar(30) | | Canal de venda da equipe
regional | varchar(30) | | Regional comercial
fl_ativa | char(1) | | Equipe ativa (S/N)
""")
_t("fato_meta_comercial", """
competencia | char(7) | pk | Mês de competência (AAAA-MM)
regional | varchar(30) | pk | Regional comercial
canal_venda | varchar(30) | pk | Canal de venda
segmento | varchar(20) | pk | Segmento
qt_meta_cotas | integer | | Meta de cotas vendidas
vl_meta_credito | decimal(16,2) | | Meta de crédito comercializado
versao_planilha | varchar(20) | | Versão da planilha carregada
usuario_carga | varchar(40) | | Usuário que realizou a carga manual
dt_carga | timestamp | | Data e hora da carga
""")
_t("dim_canal_venda", """
id_canal_venda | smallint | pk | Chave do canal de venda
nm_canal | varchar(30) | | Loja, Representante, Digital ou Parceiro
tipo_canal | varchar(20) | | Próprio ou terceiro
fl_digital | char(1) | | Canal digital (S/N)
pc_comissao_padrao | decimal(7,4) | | Comissão padrão do canal
fl_ativo | char(1) | | Canal ativo (S/N)
""")
_t("dim_parceiro", """
id_parceiro | integer | pk | Chave do parceiro comercial
cnpj_parceiro | varchar(18) | | CNPJ do parceiro
razao_social | varchar(120) | | Razão social
nm_contato | varchar(120) | pii null | Pessoa de contato
email_contato | varchar(120) | pii null | E-mail de contato
uf | char(2) | | UF de atuação
tipo_parceiro | varchar(30) | | Correspondente, concessionária ou imobiliária
fl_ativo | char(1) | | Parceiro ativo (S/N)
dt_credenciamento | date | | Data de credenciamento
""")
_t("fato_comissao", """
id_comissao | bigint | pk | Chave da comissão
id_contrato | bigint | fk=fato_contrato_venda.id_contrato | Venda que gerou a comissão
id_vendedor | integer | fk=dim_vendedor.id_vendedor | Vendedor comissionado
id_parceiro | integer | fk=dim_parceiro.id_parceiro null | Parceiro comissionado, quando houver
competencia | char(7) | | Mês de apuração (AAAA-MM)
nr_parcela_comissao | smallint | | Parcela da comissão
pc_comissao | decimal(7,4) | | Percentual aplicado
vl_comissao | decimal(12,2) | | Valor apurado
situacao | varchar(20) | | Apurada, paga ou estornada
dt_pagamento | date | null | Data de pagamento
""")

# =============================== FINANCEIRO E COBRANÇA ===============================
_t("fato_parcelas", """
id_parcela | bigint | pk | Chave da parcela (declarada; unicidade verificada por teste)
id_cota | bigint | fk=dim_cota.id_cota | Cota a que a parcela pertence
nr_parcela | smallint | | Número sequencial da parcela
dt_vencimento | date | | Data de vencimento
vl_parcela | decimal(12,2) | | Valor total da parcela
vl_fundo_comum | decimal(12,2) | | Parte destinada ao fundo comum
vl_taxa_adm | decimal(12,2) | | Parte de taxa de administração
vl_fundo_reserva | decimal(12,2) | | Parte de fundo de reserva
dt_pagamento | date | null | Data do pagamento
vl_pago | decimal(12,2) | null | Valor pago
situacao_parcela | varchar(20) | | Em aberto, paga, em atraso ou renegociada
dias_atraso | integer | | Dias de atraso na data de referência
dt_carga | timestamp | | Data e hora da carga
""")
_t("fato_pagamento", """
id_pagamento | bigint | pk | Chave do pagamento
id_parcela | bigint | fk=fato_parcelas.id_parcela | Parcela liquidada
nosso_numero | varchar(20) | | Identificação do título no banco
meio_pagamento | varchar(20) | | Boleto, débito em conta ou Pix
cd_banco | char(3) | | Banco da liquidação
vl_pago | decimal(12,2) | | Valor pago
vl_juros_multa | decimal(10,2) | | Juros e multa cobrados
fl_conciliado | char(1) | | Conciliado com o retorno bancário (S/N)
dt_pagamento | date | | Data do pagamento
dt_credito | date | | Data do crédito em conta
""")
_t("fato_boleto", """
id_boleto | bigint | pk | Chave do boleto
id_parcela | bigint | fk=fato_parcelas.id_parcela | Parcela cobrada
nosso_numero | varchar(20) | | Identificação do título no banco
canal_envio | varchar(20) | | E-mail, aplicativo, WhatsApp ou correio
status_boleto | varchar(20) | | Emitido, registrado, liquidado, vencido ou baixado
vl_boleto | decimal(12,2) | | Valor do boleto
dt_emissao | date | | Data de emissão
dt_vencimento | date | | Data de vencimento
dt_registro | timestamp | null | Registro no banco
dt_liquidacao | date | null | Data de liquidação
""")
_t("fato_acordo", """
id_acordo | bigint | pk | Chave do acordo
id_cota | bigint | fk=dim_cota.id_cota | Cota negociada
canal_cobranca | varchar(40) | | Canal em que o acordo foi firmado
qt_parcelas_acordo | smallint | | Parcelas do acordo
vl_divida_original | decimal(14,2) | | Dívida original negociada
vl_acordo | decimal(14,2) | | Valor total do acordo
pc_desconto | decimal(7,4) | | Desconto concedido sobre encargos
situacao_acordo | varchar(20) | | Vigente, cumprido ou quebrado
dt_acordo | date | | Data do acordo
dt_quebra | date | null | Data da quebra
""")
_t("fato_renegociacao", """
id_renegociacao | bigint | pk | Chave da renegociação
id_acordo | bigint | fk=fato_acordo.id_acordo null | Acordo relacionado
id_cota | bigint | fk=dim_cota.id_cota | Cota renegociada
tipo_renegociacao | varchar(30) | | Diluição, alongamento ou redução de crédito
qt_parcelas_diluidas | smallint | | Parcelas diluídas no saldo
vl_renegociado | decimal(14,2) | | Valor renegociado
situacao | varchar(20) | | Situação da renegociação
dt_renegociacao | date | | Data da renegociação
""")
_t("dim_regua_cobranca", """
id_etapa_regua | smallint | pk | Chave da etapa da régua
nm_etapa | varchar(60) | | Nome da etapa
dias_atraso_inicio | smallint | | Dia de atraso em que a etapa começa
dias_atraso_fim | smallint | | Dia de atraso em que a etapa termina
canal_cobranca | varchar(40) | | Canal de cobrança da etapa
acao_prevista | varchar(120) | | Ação prevista
fl_ativa | char(1) | | Etapa ativa (S/N)
""")
_t("fato_acao_cobranca", """
id_acao | bigint | pk | Chave do acionamento
id_parcela | bigint | fk=fato_parcelas.id_parcela | Parcela cobrada
id_etapa_regua | smallint | fk=dim_regua_cobranca.id_etapa_regua | Etapa da régua
id_assessoria | integer | fk=dim_assessoria_cobranca.id_assessoria null | Assessoria externa, quando houver
canal_cobranca | varchar(40) | | Canal do acionamento
resultado_acao | varchar(30) | | Resultado do contato
fl_promessa_pagamento | char(1) | | Houve promessa de pagamento (S/N)
vl_recuperado | decimal(12,2) | null | Valor recuperado atribuído à ação
dt_acao | timestamp | | Data e hora do acionamento
""")
_t("dim_assessoria_cobranca", """
id_assessoria | integer | pk | Chave da assessoria
cnpj_assessoria | varchar(18) | | CNPJ
razao_social | varchar(120) | | Razão social
uf | char(2) | | UF da sede
faixa_atraso_atuacao | varchar(10) | | Faixa de atraso em que atua
pc_honorario | decimal(7,4) | | Honorário sobre o valor recuperado
fl_ativa | char(1) | | Contrato ativo (S/N)
dt_contrato | date | | Início do contrato
""")
_t("fato_fundo_comum", """
id_movimento | bigint | pk | Chave do movimento
id_grupo | integer | fk=dim_grupo.id_grupo | Grupo
id_pagamento | bigint | fk=fato_pagamento.id_pagamento null | Pagamento que originou o movimento
tipo_movimento | varchar(30) | | Arrecadação, contemplação, rendimento ou devolução
competencia | char(7) | | Mês de competência (AAAA-MM)
vl_movimento | decimal(14,2) | | Valor do movimento
vl_saldo_apos | decimal(16,2) | | Saldo do fundo após o movimento
dt_movimento | date | | Data do movimento
""")
_t("fato_fundo_reserva", """
id_movimento | bigint | pk | Chave do movimento
id_grupo | integer | fk=dim_grupo.id_grupo | Grupo
id_pagamento | bigint | fk=fato_pagamento.id_pagamento null | Pagamento que originou o movimento
tipo_movimento | varchar(30) | | Arrecadação, cobertura de inadimplência ou rendimento
competencia | char(7) | | Mês de competência (AAAA-MM)
vl_movimento | decimal(14,2) | | Valor do movimento
vl_saldo_apos | decimal(16,2) | | Saldo do fundo após o movimento
dt_movimento | date | | Data do movimento
""")
_t("fato_inadimplencia_diaria", """
dt_referencia | date | pk | Data da fotografia
id_cota | bigint | pk fk=dim_cota.id_cota | Cota
segmento | varchar(20) | | Segmento da cota
faixa_atraso | varchar(10) | | Em dia, 1–30, 31–60, 61–90 ou 90+
dias_atraso | integer | | Dias de atraso da parcela mais antiga
qt_parcelas_atraso | smallint | | Parcelas em atraso
vl_saldo_atraso | decimal(14,2) | | Saldo em atraso
vl_saldo_devedor | decimal(14,2) | | Saldo devedor total
fl_contemplada | char(1) | | Cota contemplada (S/N)
""")

# =============================== ASSEMBLEIAS ===============================
_t("fato_assembleia", """
id_assembleia | bigint | pk | Chave da assembleia
id_grupo | integer | fk=dim_grupo.id_grupo | Grupo
nr_assembleia | smallint | | Número sequencial da assembleia no grupo
tipo_assembleia | varchar(20) | | Ordinária ou extraordinária
qt_cotas_participantes | integer | | Cotas aptas a concorrer
qt_contemplacoes | integer | | Contemplações na assembleia
vl_fundo_disponivel | decimal(16,2) | | Fundo comum disponível para contemplação
situacao | varchar(20) | | Realizada, agendada ou cancelada
dt_assembleia | date | | Data de realização
""")
_t("fato_lance", """
id_lance | bigint | pk | Chave do lance
id_assembleia | bigint | fk=fato_assembleia.id_assembleia | Assembleia
id_grupo | integer | fk=dim_grupo.id_grupo | Grupo
id_cota | bigint | | Cota ofertante
tipo_lance | varchar(20) | | Livre, fixo ou embutido
pc_lance | decimal(7,4) | | Percentual do crédito ofertado
vl_lance | decimal(14,2) | | Valor do lance
vl_lance_embutido | decimal(14,2) | null | Parte embutida no crédito
fl_vencedor | char(1) | | Lance vencedor (S/N)
dt_oferta | timestamp | | Data e hora da oferta
""")
_t("fato_sorteio", """
id_sorteio | bigint | pk | Chave do sorteio
id_assembleia | bigint | fk=fato_assembleia.id_assembleia | Assembleia
id_cota | bigint | | Cota sorteada
nr_sorteado | integer | | Número sorteado
extracao_loteria | varchar(20) | | Extração da Loteria Federal usada como referência
fl_contemplada | char(1) | | Cota apta e contemplada (S/N)
dt_sorteio | date | | Data do sorteio
""")
_t("fato_contemplacao", """
id_contemplacao | bigint | pk | Chave da contemplação
id_assembleia | bigint | fk=fato_assembleia.id_assembleia | Assembleia
id_cota | bigint | | Cota contemplada
id_lance | bigint | fk=fato_lance.id_lance null | Lance vencedor, quando por lance
id_sorteio | bigint | fk=fato_sorteio.id_sorteio null | Sorteio, quando por sorteio
tipo_contemplacao | varchar(10) | | Sorteio ou lance
vl_credito | decimal(14,2) | | Crédito contemplado
situacao | varchar(20) | | Confirmada, pendente de análise ou cancelada
dt_contemplacao | date | | Data da contemplação
""")
_t("fato_liberacao_credito", """
id_liberacao | bigint | pk | Chave da liberação
id_contemplacao | bigint | fk=fato_contemplacao.id_contemplacao | Contemplação
nr_contrato | bigint | fk=stg_erp_contratos.nr_contrato | Contrato de adesão
tipo_bem_adquirido | varchar(30) | | Bem ou serviço adquirido com o crédito
vl_credito_liberado | decimal(14,2) | | Crédito liberado
vl_lance_embutido_abatido | decimal(14,2) | | Lance embutido abatido do crédito
situacao | varchar(20) | | Em análise, liberado ou pendente de documentação
dt_solicitacao | date | | Data da solicitação
dt_liberacao | date | null | Data da liberação
dias_ate_liberacao | smallint | null | Dias entre contemplação e liberação
""")
_t("fato_garantia", """
id_garantia | bigint | pk | Chave da garantia
id_liberacao | bigint | fk=fato_liberacao_credito.id_liberacao | Crédito liberado
tipo_garantia | varchar(30) | | Alienação fiduciária, hipoteca ou fiança
descricao_bem | varchar(160) | | Bem dado em garantia
vl_avaliacao | decimal(14,2) | | Valor de avaliação
fl_alienacao_registrada | char(1) | | Gravame registrado (S/N)
situacao | varchar(20) | | Situação da garantia
dt_registro | date | null | Data do registro do gravame
""")

# =============================== ATENDIMENTO ===============================
_t("fato_chamada", """
id_chamada | varchar(36) | pk | Chave da chamada
id_agente | integer | fk=dim_agente.id_agente null | Agente que atendeu
id_fila | smallint | fk=dim_fila_atendimento.id_fila | Fila de atendimento
id_motivo | integer | fk=dim_motivo_contato.id_motivo null | Motivo do contato
tipo_atendimento | varchar(10) | | URA ou humano
dt_inicio | timestamp | | Início da chamada
duracao_seg | integer | | Tempo de atendimento em segundos
tempo_espera_seg | integer | | Tempo de espera em segundos
fl_atendida | char(1) | | Chamada atendida (S/N)
fl_abandonada | char(1) | | Chamada abandonada em fila (S/N)
fl_resolvida_primeiro_contato | char(1) | | Resolvida no primeiro contato (S/N)
""")
_t("fato_chamadas_legacy", """
cod_cham | integer | | Código da chamada no discador antigo (reinicia a cada ano; não é chave)
dt_cham | date | | Data da chamada
hr_ini | char(8) | | Hora de início
hr_fim | char(8) | null | Hora de fim
ramal | varchar(8) | null | Ramal do operador
fone_cli | varchar(20) | pii null | Telefone do cliente
cod_oper | varchar(8) | null | Código do operador
tp_cham | char(1) | | Tipo da chamada (R receptiva, A ativa)
st_cham | char(2) | | Situação da chamada
obs | varchar(255) | null | Observações livres
""")
_t("fato_conversa_whatsapp", """
id_conversa | varchar(40) | pk | Chave da conversa (após deduplicação heurística)
id_agente | integer | fk=dim_agente.id_agente null | Agente que assumiu a conversa
id_motivo | integer | fk=dim_motivo_contato.id_motivo null | Motivo do contato
dt_inicio | timestamp | | Início da conversa
dt_fim | timestamp | null | Encerramento
qt_mensagens | integer | | Mensagens trocadas
tempo_primeira_resposta_seg | integer | null | Tempo até a primeira resposta
duracao_seg | integer | null | Duração da conversa
fl_resolvida_bot | char(1) | | Resolvida pelo assistente virtual (S/N)
fl_resolvida | char(1) | | Resolvida no contato (S/N)
""")
_t("fato_ticket", """
id_ticket | bigint | pk | Chave do ticket
id_motivo | integer | fk=dim_motivo_contato.id_motivo null | Motivo do contato
id_agente | integer | fk=dim_agente.id_agente null | Agente responsável
canal | varchar(20) | | Chat, e-mail ou aplicativo
prioridade | varchar(10) | | Prioridade
status | varchar(20) | | Aberto, pendente, resolvido ou fechado
dt_abertura | timestamp | | Abertura
dt_primeira_resposta | timestamp | null | Primeira resposta
dt_resolucao | timestamp | null | Resolução
fl_reaberto | char(1) | | Ticket reaberto (S/N)
fl_dentro_sla | char(1) | | Resolvido dentro do SLA (S/N)
""")
_t("fato_interacao_digital", """
id_interacao | bigint | pk | Chave da interação
id_ticket_helpdesk | bigint | fk=stg_helpdesk_tickets.id_ticket_helpdesk | Ticket a que a interação pertence
canal | varchar(20) | | Chat, e-mail ou aplicativo
direcao | varchar(10) | | Entrada ou saída
autor_tipo | varchar(10) | | Cliente, agente ou bot
fl_automatica | char(1) | | Resposta automática (S/N)
tempo_resposta_seg | integer | null | Tempo de resposta em segundos
dt_interacao | timestamp | | Data e hora da interação
""")
_t("dim_motivo_contato", """
id_motivo | integer | pk | Chave do motivo de contato
nm_motivo | varchar(80) | | Nome do motivo
categoria | varchar(40) | | Categoria (nível 1)
subcategoria | varchar(60) | | Subcategoria (nível 2)
area_responsavel | varchar(40) | | Área responsável pela solução
fl_ativo | char(1) | | Motivo ativo (S/N)
""")
_t("fato_pesquisa_nps", """
id_resposta | varchar(40) | pk | Chave da resposta (declarada; a carga não deduplica)
id_cliente | bigint | null | Cliente respondente
nota | smallint | | Nota de 0 a 10
classificacao | varchar(10) | | Promotor, neutro ou detrator
canal | varchar(20) | | Canal em que a pesquisa foi respondida
comentario | varchar(500) | pii null | Comentário livre
competencia | char(7) | | Mês de competência (AAAA-MM)
dt_resposta | timestamp | | Data e hora da resposta
dt_carga | timestamp | | Data e hora da carga
""")
_t("fato_pesquisa_csat", """
id_resposta | varchar(40) | pk | Chave da resposta
id_ticket | bigint | fk=fato_ticket.id_ticket null | Ticket avaliado
nota | smallint | | Nota de 1 a 5
canal | varchar(20) | | Canal do atendimento avaliado
fl_satisfeito | char(1) | | Nota 4 ou 5 (S/N)
comentario | varchar(500) | pii null | Comentário livre
dt_resposta | timestamp | | Data e hora da resposta
""")
_t("dim_agente", """
id_agente | integer | pk | Chave do agente
id_colaborador | integer | fk=dim_colaborador.id_colaborador | Colaborador
nm_agente | varchar(120) | pii | Nome do agente
fila_principal | varchar(40) | | Fila principal de atuação
turno | varchar(10) | | Turno de trabalho
nivel | varchar(10) | | Nível (N1, N2, retenção)
fl_ativo | char(1) | | Agente ativo (S/N)
dt_inicio | date | | Início na operação
""")
_t("dim_fila_atendimento", """
id_fila | smallint | pk | Chave da fila
nm_fila | varchar(40) | | Nome da fila
canal | varchar(20) | | Canal atendido pela fila
skill | varchar(40) | | Habilidade exigida
sla_atendimento_seg | integer | | Meta de tempo de espera em segundos
fl_ativa | char(1) | | Fila ativa (S/N)
""")

# =============================== CORPORATIVO ===============================
_t("dim_filial", """
id_filial | integer | pk | Chave da filial
nm_filial | varchar(60) | | Nome da filial ou loja
tipo_filial | varchar(20) | | Loja própria, escritório regional ou matriz
municipio | varchar(80) | | Município
uf | char(2) | | UF
regional | varchar(30) | | Regional comercial
fl_ativa | char(1) | | Filial ativa (S/N)
dt_abertura | date | | Data de abertura
""")
_t("dim_regional", """
id_regional | smallint | pk | Chave da regional
nm_regional | varchar(30) | | Nome da regional
ufs | varchar(80) | | UFs atendidas pela regional
nm_gestor | varchar(120) | pii | Gestor regional
fl_ativa | char(1) | | Regional ativa (S/N)
dt_atualizacao | timestamp | | Última atualização
""")
_t("dim_calendario", """
dt_data | date | pk | Data
ano | smallint | | Ano
mes | smallint | | Mês
competencia | char(7) | | Mês de competência (AAAA-MM)
dia_semana | varchar(15) | | Dia da semana
fl_dia_util | char(1) | | Dia útil (S/N)
fl_feriado | char(1) | | Feriado nacional (S/N)
nm_feriado | varchar(60) | null | Nome do feriado
""")
_t("dim_colaborador", """
id_colaborador | integer | pk | Chave do colaborador
matricula | varchar(10) | | Matrícula no RH
nm_colaborador | varchar(120) | pii | Nome do colaborador
cpf_colaborador | varchar(14) | pii | CPF
email_corporativo | varchar(120) | pii | E-mail corporativo
cargo | varchar(60) | | Cargo
cd_centro_custo | varchar(10) | null | Centro de custo (origem passou a enviar `centro_custo_id` em 12/11)
nm_area | varchar(60) | | Área de lotação
situacao | varchar(20) | | Ativo, afastado ou desligado
dt_admissao | date | | Data de admissão
dt_desligamento | date | null | Data de desligamento
""")

# =============================== MARTS ===============================
_t("mart_vendas_comercial", """
dt_referencia | date | pk | Data de referência
regional | varchar(30) | pk | Regional comercial
uf | char(2) | pk | UF
canal_venda | varchar(30) | pk | Canal de venda
segmento | varchar(20) | pk | Segmento
qt_leads | integer | | Leads captados
qt_propostas | integer | | Propostas digitadas
qt_vendas | integer | | Cotas vendidas
vl_credito_vendido | decimal(16,2) | | Crédito comercializado
qt_meta_cotas | integer | null | Meta de cotas do período
vl_meta_credito | decimal(16,2) | null | Meta de crédito do período
qt_cancelamentos_7d | integer | | Cancelamentos no prazo de arrependimento
dt_carga | timestamp | | Data e hora da carga
""")
_t("mart_cobranca_carteira", """
dt_referencia | date | pk | Data de referência
segmento | varchar(20) | pk | Segmento
regional | varchar(30) | pk | Regional
faixa_atraso | varchar(10) | pk | Faixa de atraso
qt_cotas | integer | | Cotas na carteira
vl_saldo_devedor | decimal(18,2) | | Saldo devedor
vl_saldo_atraso | decimal(18,2) | | Saldo em atraso
vl_previsto | decimal(18,2) | | Recebimento previsto no dia
vl_recebido | decimal(18,2) | | Recebimento realizado no dia
vl_recuperado | decimal(18,2) | | Valor recuperado por ações de cobrança
qt_acordos | integer | | Acordos firmados
dt_carga | timestamp | | Data e hora da carga
""")
_t("mart_cobranca_safra_mob", """
safra | char(7) | pk | Mês de adesão (AAAA-MM)
mob | smallint | pk | Meses desde a adesão
segmento | varchar(20) | pk | Segmento
canal_venda | varchar(30) | pk | Canal de venda
qt_cotas_safra | integer | | Cotas vendidas na safra
qt_cotas_ativas | integer | | Cotas ativas no MOB
qt_cotas_over30 | integer | | Cotas com atraso acima de 30 dias
qt_cotas_over60 | integer | | Cotas com atraso acima de 60 dias
qt_cotas_over90 | integer | | Cotas com atraso acima de 90 dias
qt_cancelamentos | integer | | Cancelamentos acumulados até o MOB
vl_credito_safra | decimal(18,2) | | Crédito comercializado na safra
dt_carga | timestamp | | Data e hora da carga
""")
_t("mart_atendimento", """
dt_referencia | date | pk | Data de referência
canal | varchar(20) | pk | Canal de atendimento
id_motivo | integer | pk fk=dim_motivo_contato.id_motivo | Motivo do contato
qt_contatos | integer | | Contatos recebidos
qt_atendidos | integer | | Contatos atendidos
qt_abandonados | integer | | Contatos abandonados
tempo_atendimento_seg | bigint | | Soma do tempo de atendimento (numerador do TMA)
tempo_espera_seg | bigint | | Soma do tempo de espera (numerador do TME)
qt_resolvidos_primeiro_contato | integer | | Resolvidos no primeiro contato (FCR)
qt_promotores | integer | | Respostas NPS 9 ou 10
qt_detratores | integer | | Respostas NPS de 0 a 6
qt_respostas_nps | integer | | Total de respostas NPS
dt_carga | timestamp | | Data e hora da carga
""")
_t("mart_assembleias_contemplacoes", """
competencia | char(7) | pk | Mês de competência (AAAA-MM)
id_grupo | integer | pk fk=dim_grupo.id_grupo | Grupo
segmento | varchar(20) | | Segmento do grupo
qt_assembleias | integer | | Assembleias realizadas
qt_contemplacoes_sorteio | integer | | Contemplações por sorteio
qt_contemplacoes_lance | integer | | Contemplações por lance
qt_lances_ofertados | integer | | Lances ofertados
pc_lance_medio | decimal(7,4) | null | Percentual médio dos lances vencedores
vl_credito_contemplado | decimal(18,2) | | Crédito contemplado
vl_credito_liberado | decimal(18,2) | | Crédito liberado
dias_medio_liberacao | decimal(7,2) | null | Prazo médio entre contemplação e liberação
dt_carga | timestamp | | Data e hora da carga
""")
_t("mart_executivo_kpis", """
dt_referencia | date | pk | Data de referência
cd_kpi | varchar(30) | pk | Código do indicador
nm_kpi | varchar(80) | | Nome do indicador
dominio | varchar(30) | | Domínio de negócio
vl_kpi | decimal(18,4) | | Valor do indicador
vl_meta | decimal(18,4) | null | Meta do indicador
vl_periodo_anterior | decimal(18,4) | null | Valor no período anterior
unidade | varchar(10) | | Unidade de medida
mart_origem | varchar(40) | | Mart de origem do indicador
dt_carga | timestamp | | Data e hora da carga
""")


def _montar():
    schemas = {}
    for nome, texto in _DSL.items():
        colunas = []
        for linha in texto.strip().splitlines():
            partes = [p.strip() for p in linha.split("|", 3)]
            assert len(partes) == 4, f"{nome}: {linha}"
            col, tipo, flags, descricao = partes
            fl = flags.split()
            fk = next((f[3:] for f in fl if f.startswith("fk=")), None)
            colunas.append({
                "nome": col,
                "tipo": tipo,
                "descricao": descricao,
                "pk": "pk" in fl,
                "fk": tuple(fk.split(".")) if fk else None,
                "nulavel": "null" in fl,
                "pii": "pii" in fl,
            })
        schemas[nome] = colunas
    return schemas


SCHEMAS: dict[str, list[dict]] = _montar()


def _montante(nome, visto=None):
    visto = visto if visto is not None else set()
    for u in tabelas.POR_NOME[nome]["upstreams"]:
        if u not in visto:
            visto.add(u)
            _montante(u, visto)
    return visto


def validar():
    nomes = [t["nome"] for t in tabelas.TABELAS]
    assert set(SCHEMAS) == set(nomes), set(nomes) ^ set(SCHEMAS)
    for nome in nomes:
        cols = SCHEMAS[nome]
        nomes_col = [c["nome"] for c in cols]
        assert 6 <= len(cols) <= 14, (nome, len(cols))
        assert len(set(nomes_col)) == len(nomes_col), nome
        tem_pk = any(c["pk"] for c in cols)
        assert tem_pk != (nome in cenario.TABELAS_SEM_PK), f"PK inconsistente: {nome}"
        for obrig in cenario.COLUNAS_OBRIGATORIAS.get(nome, []):
            assert obrig in nomes_col, f"{nome}: falta {obrig}"
        acima = _montante(nome)
        fonte = tabelas.POR_NOME[nome]["fonte"]
        if fonte:  # tabelas brutas podem referenciar outras tabelas do mesmo sistema-fonte
            acima |= set(tabelas.FONTES[fonte])
        for c in cols:
            assert not (c["pk"] and c["nulavel"]), (nome, c["nome"])
            if c["fk"]:
                tab, col = c["fk"]
                assert tab in SCHEMAS, (nome, c["fk"])
                assert col in [x["nome"] for x in SCHEMAS[tab]], (nome, c["fk"])
                assert tab in acima, f"FK fora do upstream: {nome}.{c['nome']} -> {tab}"
    return True


validar()

if __name__ == "__main__":
    total = sum(len(c) for c in SCHEMAS.values())
    pii = sum(1 for cols in SCHEMAS.values() if any(c["pii"] for c in cols))
    print(f"{len(SCHEMAS)} tabelas, {total} colunas, {pii} tabelas com dado pessoal")
