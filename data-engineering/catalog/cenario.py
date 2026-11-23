"""
Cenário único de problemas do Lucas Analytics Case (CONTRATO — fonte única de verdade).

Os DOIS geradores (simulação de negócio e motor de governança) leem estas constantes, para que
Farol, selos de confiança e gráficos contem exatamente a mesma história.
"""

SEED = 20261117
DATA_REFERENCIA = "2026-11-17T08:00:00-03:00"   # "agora" do portal (terça-feira, 08:00)
INICIO_HISTORICO = "2024-12-01"                 # 24 meses de histórico
FIM_HISTORICO = "2026-11-16"                    # D-1 (segunda-feira)

SEGMENTOS = ["Imóvel", "Auto", "Pesada", "Serviços"]
CANAIS_VENDA = ["Loja", "Representante", "Digital", "Parceiro"]
CANAIS_ATENDIMENTO = ["Voz", "WhatsApp", "Chat", "E-mail", "App"]
CANAIS_COBRANCA = ["Régua digital (SMS/e-mail)", "WhatsApp", "Central de cobrança", "Assessoria externa", "Negativação"]
FAIXAS_ATRASO = ["Em dia", "1–30", "31–60", "61–90", "90+"]
REGIONAIS = {
    "São Paulo": ["SP"],
    "Sudeste": ["MG", "RJ", "ES"],
    "Sul": ["PR", "SC", "RS"],
    "Centro-Oeste": ["GO", "MT", "MS", "DF"],
    "Norte e Nordeste": ["BA", "PE", "CE", "MA", "RN", "PB", "AL", "SE", "PI", "PA", "AM", "TO", "RO", "AC", "AP", "RR"],
}

# Ordens de grandeza-alvo (a simulação calibra; o motor de governança usa output/resumo_simulacao.json se existir)
ALVOS = {
    "cotas_ativas": 78_000,
    "cotas_vendidas_24m": 56_000,
    "vendas_mes_media": 2_350,
    "ticket_medio_credito": 142_000,
    "inadimplencia_over30_pct": 6.8,
    "vendedores": 340,
    "grupos_ativos": 410,
    "contatos_atendimento_dia_util": 9_500,
}

# ---- Números-chave dos problemas (usar EXATAMENTE estes valores) -------------------------------
PARCELAS_DUPLICADAS = 312                 # registros duplicados em fato_parcelas.id_parcela (lote de 16/11)
RECEBIMENTO_SUPERESTIMADO_PCT = 1.8       # % de superestimação do recebimento de 16/11
TELEFONIA_PARADA_DESDE = "2026-11-14"     # 1º dia SEM DADOS de voz (14, 15 e 16/11 ausentes); as cargas de 15, 16 e 17/11 falharam -> "parada há 3 dias"
TELEFONIA_DIAS_PARADA = 3
NPS_DUP_INICIO = "2026-10-01"             # duplicidade de respostas começa aqui
NPS_REPORTADO_OUT = 62                    # NPS de outubro/2026 levado ao comitê de 05/11
NPS_CORRIGIDO_OUT = 56                    # NPS correto após deduplicação  (diferença = 6 pontos)
PROPOSTAS_D1 = 412                        # linhas carregadas em stg_crm_propostas na carga de 17/11 (dados de 16/11)
PROPOSTAS_MEDIA = 1_148                   # média das segundas-feiras -> queda de 64%
PROPOSTAS_QUEDA_PCT = 64
COTAS_FK_ORFA = 147                       # cotas com id_grupo inexistente em dim_grupo
CPF_NULO_PCT_PARCEIRO = 18                # % de nulos em cpf_cliente nos cadastros do canal Parceiro
CPF_NULO_PCT_TOTAL = 4.1
WHATSAPP_DUP_PCT = 2.3                    # % de conversas repetidas (reenvio de webhook) nos últimos 7 dias
INDICE_SAUDE_ALVO = 71                    # índice geral esperado (70–73); calibrar pesos, exibir o valor calculado

# ---- Incidentes (prioridade = ordem). Os 5 primeiros formam o "Top 5 problemas críticos agora" ----
INCIDENTES = [
    dict(id="INC-2031", tabela="fato_parcelas", tipo="duplicidade", severidade="critico",
         titulo="Parcelas duplicadas inflando o recebimento",
         tecnico="312 registros duplicados em `id_parcela`: a rotina `core_financeiro_parcelas` reprocessou o lote de 16/11 após um retry e gravou em modo append, sem upsert.",
         negocio="O recebimento de 16/11 aparece ~1,8% acima do extrato bancário. Quem olhar o relatório de Cobrança hoje verá uma arrecadação que não existe.",
         causa="Carga incremental sem chave de merge; retry automático do orquestrador reexecutou o lote inteiro.",
         acao="Deduplicar por `id_parcela`, trocar append por MERGE/upsert e criar teste de unicidade bloqueante.",
         relatorios={"cobranca-carteira": "Recebimento e recuperação superestimados em ~1,8% no dia 16/11", "cobranca-safra": "Efeito marginal nas curvas de safra (abaixo de 0,1 p.p.)"}),
    dict(id="INC-2032", tabela="stg_telefonia_cdr", tipo="rotina_parada", severidade="critico",
         titulo="Rotina de telefonia parada há 3 dias",
         tecnico="`ingest_telefonia` falha desde 15/11 às 02:10 com erro de autenticação no SFTP da operadora (credencial expirada). Três execuções consecutivas sem sucesso; a última carga válida é de 14/11, com dados até 13/11.",
         negocio="O relatório de Atendimento não tem chamadas de voz de 14 a 16/11. Volume, TMA, TME e abandono do canal Voz estão desatualizados e o total de contatos parece ter caído.",
         causa="Senha do SFTP com rotação trimestral e sem alerta de expiração; falha sem notificação ao dono.",
         acao="Renovar a credencial, reprocessar os 3 dias e configurar alerta de falha com dono definido.",
         relatorios={"atendimento": "Canal Voz sem dados de 14 a 16/11; indicadores de voz desatualizados"}),
    dict(id="INC-2027", tabela="fato_pesquisa_nps", tipo="duplicidade", severidade="critico",
         titulo="NPS divulgado ao comitê 6 pontos acima do real",
         tecnico="Desde 01/10 a plataforma de pesquisas reenvia respostas já entregues e a carga não deduplica por `id_resposta`. As respostas duplicadas concentram-se em promotores (canal App).",
         negocio="O NPS de outubro foi apresentado ao comitê como 62; o valor correto é 56. Uma métrica divulgada errada, por duplicidade de respostas.",
         causa="Reenvio de webhooks pela plataforma + ausência de chave única na carga de respostas.",
         acao="Deduplicar por `id_resposta`, republicar o NPS de outubro e novembro e criar teste de unicidade.",
         relatorios={"atendimento": "NPS reportado 6 pontos acima do real desde outubro/2026"}),
    dict(id="INC-2033", tabela="stg_crm_propostas", tipo="volume_anomalo", severidade="alto",
         titulo="Carga parcial de propostas do CRM",
         tecnico="A carga de 17/11 trouxe 412 linhas contra uma média de 1.148 nas segundas-feiras (queda de 64%). A paginação da API do CRM expirou e a rotina terminou como sucesso.",
         negocio="O funil comercial de 16/11 mostra menos propostas do que realmente houve; a conversão do dia fica distorcida e parte das propostas em análise não aparece.",
         causa="Timeout na paginação da API tratado como fim de dados; não havia teste de volume.",
         acao="Reprocessar a carga, tratar timeout como falha e criar teste de volume por dia da semana.",
         relatorios={"vendas": "Propostas e conversão do funil de 16/11 subestimadas (carga com 64% menos linhas)"}),
    dict(id="INC-2024", tabela="dim_cota", tipo="fk_orfa", severidade="alto",
         titulo="Cotas apontando para grupos inexistentes",
         tecnico="147 cotas com `id_grupo` sem correspondência em `dim_grupo`: grupos encerrados foram excluídos fisicamente no ERP.",
         negocio="Essas cotas somem de qualquer análise por grupo e ficam fora das curvas de safra, subestimando a carteira analisada.",
         causa="Exclusão física de grupos encerrados na origem; ausência de teste de integridade referencial.",
         acao="Preservar grupos encerrados (soft delete) e criar teste de integridade referencial entre cotas e grupos.",
         relatorios={"cobranca-safra": "147 cotas fora das análises por grupo e safra", "cobranca-carteira": "147 cotas sem grupo nas quebras por grupo"}),
    dict(id="INC-2019", tabela="stg_whatsapp_conversas", tipo="sem_pk", severidade="alto",
         titulo="Conversas de WhatsApp sem chave primária",
         tecnico="Tabela sem chave primária definida. Reenvios de webhook geram linhas repetidas: 2,3% das conversas dos últimos 7 dias.",
         negocio="O volume do canal WhatsApp pode estar superestimado em ~2,3% e não há como garantir contagem única de conversas.",
         causa="Tabela criada sem PK; ingestão por append direto do webhook.",
         acao="Definir `id_conversa` como PK, deduplicar o histórico e aplicar upsert na ingestão.",
         relatorios={"atendimento": "Volume de WhatsApp possivelmente superestimado em ~2,3%"}),
    dict(id="INC-2011", tabela="dim_cliente", tipo="nulos", severidade="alto",
         titulo="CPF ausente em cadastros do canal Parceiro",
         tecnico="18% de nulos em `cpf_cliente` nos cadastros originados pelo canal Parceiro (4,1% do total da tabela).",
         negocio="Sem CPF não há negativação, a cobrança perde efetividade e o mesmo cliente pode existir em duplicidade. Há também exposição regulatória (LGPD e cadastro).",
         causa="Formulário de parceiros não obriga o CPF na pré-venda; campo fica vazio até a efetivação.",
         acao="Tornar o campo obrigatório na origem e criar teste de completude com limite por canal.",
         relatorios={}),
    dict(id="INC-2034", tabela="stg_banco_boletos_registrados", tipo="rotina_falhou", severidade="alto",
         titulo="Carga de boletos registrados falhou hoje",
         tecnico="`ingest_banco_boletos` falhou às 03:40 de 17/11: certificado digital da API do banco expirado.",
         negocio="Boletos registrados ontem ainda não aparecem; a visão de boletos emitidos está um dia atrasada.",
         causa="Certificado com vencimento anual sem controle de renovação.",
         acao="Renovar o certificado, reprocessar e incluir o vencimento no calendário de operações.",
         relatorios={}),
    dict(id="INC-1987", tabela="fato_chamadas_legacy", tipo="sem_pk", severidade="medio",
         titulo="Tabela legada de chamadas sem chave primária e sem dono",
         tecnico="Tabela sem chave primária definida, carregada por pacote legado (DTS). Não há dono formal nem documentação.",
         negocio="O histórico de chamadas anterior à telefonia atual não é auditável; comparações de longo prazo do atendimento carregam risco.",
         causa="Sistema legado migrado sem modelagem; ninguém assumiu a tabela.",
         acao="Definir dono, criar chave substituta e planejar a aposentadoria da tabela.",
         relatorios={"atendimento": "Histórico de voz anterior a 2025 vem de tabela legada sem PK"}),
    dict(id="INC-2030", tabela="dim_colaborador", tipo="schema_drift", severidade="medio",
         titulo="Mudança de schema na origem do RH",
         tecnico="A coluna `cd_centro_custo` passou a chegar como `centro_custo_id` desde 12/11; a carga segue preenchendo a coluna antiga com nulos.",
         negocio="Novos colaboradores ficam sem centro de custo, o que afeta o rateio de comissões e a alocação de agentes.",
         causa="Alteração de layout no sistema de RH sem aviso ao time de dados.",
         acao="Ajustar o mapeamento e criar teste de schema (contrato de dados) com o RH.",
         relatorios={}),
]

# ---- Problema de cada tabela não-verde: (tipo, evidência) ---------------------------------------
# tipos: sem_pk, duplicidade, nulos, fk_orfa, volume_anomalo, rotina_parada, rotina_falhou, atraso,
#        schema_drift, reconciliacao, dominio_valores, upstream_degradado
PROBLEMAS = {
    # vermelhos
    "stg_crm_propostas": ("volume_anomalo", "412 linhas carregadas contra média de 1.148 (queda de 64%)"),
    "stg_banco_boletos_registrados": ("rotina_falhou", "Rotina falhou hoje às 03:40: certificado da API do banco expirado"),
    "stg_telefonia_cdr": ("rotina_parada", "Sem atualização há 3 dias: falha de autenticação no SFTP da operadora desde 15/11"),
    "stg_whatsapp_conversas": ("sem_pk", "Tabela sem chave primária definida; 2,3% de conversas repetidas nos últimos 7 dias"),
    "dim_cliente": ("nulos", "18% de nulos em `cpf_cliente` nos cadastros do canal Parceiro (4,1% do total)"),
    "dim_cota": ("fk_orfa", "147 cotas com `id_grupo` inexistente em `dim_grupo`"),
    "fato_parcelas": ("duplicidade", "312 registros duplicados em `id_parcela`"),
    "fato_chamada": ("rotina_parada", "Sem atualização há 3 dias: depende de `stg_telefonia_cdr`, que está parada"),
    "fato_chamadas_legacy": ("sem_pk", "Tabela sem chave primária definida e sem dono formal"),
    "fato_pesquisa_nps": ("duplicidade", "Respostas duplicadas em `id_resposta` desde 01/10; NPS de outubro inflado em 6 pontos"),
    "mart_cobranca_carteira": ("reconciliacao", "Recebimento de 16/11 está 1,8% acima do extrato bancário (CNAB)"),
    "mart_atendimento": ("rotina_parada", "Canal Voz sem dados de 14 a 16/11; carga do mart ignorada por falha na dependência"),
    # amarelos
    "stg_pesquisas_respostas": ("duplicidade", "Plataforma reenviando respostas já entregues: 3,4% de linhas repetidas nos últimos 30 dias"),
    "dim_endereco": ("dominio_valores", "3,1% dos registros com CEP inválido"),
    "dim_contato": ("dominio_valores", "6,2% dos telefones fora do padrão (DDD ausente ou tamanho inválido)"),
    "fato_consentimento_lgpd": ("nulos", "2,8% dos consentimentos sem `base_legal` informada"),
    "fato_reajuste_bem": ("atraso", "Reajuste de novembro ainda não carregado: 5 dias além do previsto"),
    "fato_transferencia_cota": ("atraso", "Última carga com 6 horas de atraso em relação ao SLA"),
    "fato_proposta": ("upstream_degradado", "Volume 61% abaixo do esperado, herdado da carga parcial de `stg_crm_propostas`"),
    "fato_funil_crm": ("atraso", "Carga concluída com 5 horas de atraso; etapa de proposta incompleta em 16/11"),
    "fato_meta_comercial": ("atraso", "Metas de novembro carregadas parcialmente: planilha manual sem 2 regionais"),
    "fato_comissao": ("fk_orfa", "23 comissões apontam para vendedores inativos ou inexistentes"),
    "fato_pagamento": ("fk_orfa", "0,4% dos pagamentos de 16/11 sem parcela correspondente após a duplicidade em `fato_parcelas`"),
    "fato_boleto": ("atraso", "Atrasada: aguardando `stg_banco_boletos_registrados`, que falhou hoje"),
    "fato_acao_cobranca": ("atraso", "Carga concluída com 4 horas de atraso em relação ao SLA"),
    "fato_inadimplencia_diaria": ("upstream_degradado", "Variação anômala no saldo em atraso de 16/11, herdada das parcelas duplicadas"),
    "fato_garantia": ("atraso", "Última carga com 9 horas de atraso em relação ao SLA"),
    "fato_conversa_whatsapp": ("upstream_degradado", "Deduplicação heurística: origem `stg_whatsapp_conversas` não tem chave primária"),
    "fato_ticket": ("nulos", "2,7% dos tickets sem `id_motivo` preenchido"),
    "dim_colaborador": ("schema_drift", "Coluna `cd_centro_custo` passou a chegar como `centro_custo_id` desde 12/11"),
    "mart_vendas_comercial": ("upstream_degradado", "Funil de 16/11 subestimado: `fato_proposta` recebeu carga parcial"),
    "mart_cobranca_safra_mob": ("upstream_degradado", "147 cotas sem grupo fora das safras; efeito marginal das parcelas duplicadas"),
    "mart_executivo_kpis": ("upstream_degradado", "Consolida marts com alerta: Cobrança e Atendimento com problemas críticos"),
}

# Colunas que DEVEM existir nos schemas (citadas nas evidências)
COLUNAS_OBRIGATORIAS = {
    "fato_parcelas": ["id_parcela", "id_cota", "dt_vencimento", "vl_parcela", "dt_pagamento"],
    "dim_cliente": ["id_cliente", "cpf_cliente", "canal_origem"],
    "dim_cota": ["id_cota", "id_grupo", "id_cliente"],
    "dim_grupo": ["id_grupo"],
    "fato_pesquisa_nps": ["id_resposta", "id_cliente", "nota", "canal"],
    "stg_whatsapp_conversas": ["id_conversa"],     # existe, mas NÃO é PK (tabela sem PK)
    "fato_chamadas_legacy": [],                   # sem PK
    "fato_consentimento_lgpd": ["base_legal"],
    "fato_ticket": ["id_motivo"],
    "dim_colaborador": ["cd_centro_custo"],
}
TABELAS_SEM_PK = ["stg_whatsapp_conversas", "fato_chamadas_legacy"]

# Selo de confiança esperado por relatório
SELOS_ESPERADOS = {
    "vendas": "atencao",
    "cobranca-carteira": "critico",
    "cobranca-safra": "atencao",
    "atendimento": "critico",
    "assembleias": "confiavel",
}
