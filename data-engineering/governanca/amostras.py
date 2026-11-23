"""
Amostra de dados fictícia de cada tabela (8 a 12 linhas), coerente com o schema.

Dados pessoais sempre mascarados. Nas tabelas com problema de conteúdo, as linhas problemáticas são
marcadas com `problema` e `colunas_problema` (pares duplicados, nulos, chaves órfãs, valores inválidos).
"""
from datetime import datetime, timedelta

from base import RESUMO, SCHEMAS, VOLUMES, cenario, rng

C = cenario
UFS = ["SP", "SP", "SP", "MG", "RJ", "PR", "RS", "SC", "GO", "BA", "PE", "DF", "MT", "CE"]
MUNICIPIOS = {"SP": "Campinas", "MG": "Uberlândia", "RJ": "Niterói", "PR": "Londrina", "RS": "Caxias do Sul", "SC": "Joinville",
              "GO": "Goiânia", "BA": "Feira de Santana", "PE": "Recife", "DF": "Brasília", "MT": "Cuiabá", "CE": "Fortaleza"}
REGIONAL_UF = {uf: reg for reg, ufs in C.REGIONAIS.items() for uf in ufs}
NOMES = ["Ana Paula", "Carlos Eduardo", "Mariana", "José Roberto", "Fernanda", "Luiz Henrique", "Patrícia", "Rodrigo", "Beatriz",
         "Marcelo", "Juliana", "Antônio", "Camila", "Ricardo", "Larissa", "Paulo Sérgio", "Aline", "Gustavo", "Renata", "Thiago"]
SOBRENOMES = ["Silveira", "Moraes", "Teixeira", "Cardoso", "Barros", "Freitas", "Pacheco", "Vieira", "Monteiro", "Rezende", "Brandão",
              "Queiroz", "Antunes", "Figueiredo", "Macedo", "Siqueira"]
EMPRESAS = ["Transportes Serra Azul Ltda", "Construtora Vale Verde S.A.", "Agropecuária Boa Safra Ltda", "Comercial Ponte Nova Ltda",
            "Logística Rota Sul Ltda", "Imobiliária Jardim Real Ltda", "Auto Center Bandeirantes Ltda", "Clínica Vida Plena Ltda"]
MOTIVOS = ["Segunda via de boleto", "Dúvida sobre contemplação", "Oferta de lance", "Alteração cadastral", "Cancelamento de cota",
           "Negociação de parcelas em atraso", "Extrato da cota", "Liberação de crédito", "Transferência de cota", "Reajuste da parcela"]
SITUACAO = ["Ativa", "Ativa", "Ativa", "Contemplada", "Cancelada", "Quitada"]

DOM = {
    "tipo_pessoa": ["PF", "PF", "PF", "PJ"], "canal_origem": C.CANAIS_VENDA, "canal_venda": C.CANAIS_VENDA, "segmento": C.SEGMENTOS,
    "segmento_interesse": C.SEGMENTOS, "nm_segmento": C.SEGMENTOS, "nm_canal": C.CANAIS_VENDA,
    "status_proposta": ["Em análise", "Aprovada", "Convertida", "Convertida", "Recusada"],
    "etapa": ["Lead", "Contato", "Simulação", "Proposta", "Venda"], "etapa_anterior": ["Lead", "Contato", "Simulação", "Proposta"],
    "etapa_atual": ["Lead", "Contato", "Simulação", "Proposta", "Venda", "Perdido"],
    "situacao": ["Ativo", "Ativo", "Ativo", "Em análise", "Encerrado"], "situacao_cota": SITUACAO, "situacao_anterior": ["Ativa", "Ativa", "Cancelada"],
    "situacao_nova": ["Contemplada", "Cancelada", "Ativa", "Quitada"], "situacao_grupo": ["Em andamento", "Em andamento", "Em formação", "Encerrado"],
    "situacao_parcela": ["Paga", "Paga", "Paga", "Em aberto", "Em atraso"], "situacao_acordo": ["Vigente", "Cumprido", "Quebrado"],
    "tipo_assembleia": ["Ordinária", "Ordinária", "Ordinária", "Extraordinária"], "tipo_lance": ["Livre", "Livre", "Fixo", "Embutido"],
    "cd_ocorrencia": ["06", "06", "06", "09", "02"], "cd_banco": ["001", "237", "341", "033", "104"],
    "status_registro": ["Registrado", "Registrado", "Liquidado", "Baixado"], "status_chamada": ["Atendida", "Atendida", "Atendida", "Abandonada", "Retida na URA"],
    "status_conversa": ["Encerrada", "Encerrada", "Em atendimento", "Aguardando cliente"], "status": ["Resolvido", "Resolvido", "Fechado", "Pendente", "Aberto"],
    "canal": ["WhatsApp", "Chat", "E-mail", "App", "Voz"], "prioridade": ["Baixa", "Normal", "Normal", "Alta"],
    "tipo_pesquisa": ["NPS", "NPS", "CSAT"], "regional": list(C.REGIONAIS), "nm_regional": list(C.REGIONAIS),
    "sexo": ["F", "M"], "estado_civil": ["Casado(a)", "Solteiro(a)", "Divorciado(a)", "União estável"],
    "profissao": ["Motorista autônomo", "Professora", "Empresário", "Engenheiro civil", "Produtor rural", "Enfermeira", "Comerciante", "Servidor público"],
    "faixa_renda": ["Até R$ 3 mil", "R$ 3 a 6 mil", "R$ 6 a 10 mil", "R$ 10 a 20 mil", "Acima de R$ 20 mil"],
    "razao_social": EMPRESAS, "nome_fantasia": ["Serra Azul", "Vale Verde", "Boa Safra", "Ponte Nova", "Rota Sul", "Jardim Real"],
    "cnae_principal": ["4930-2/02", "4120-4/00", "0111-3/02", "4711-3/02", "6821-8/01"], "porte": ["ME", "EPP", "Médio", "Grande"],
    "tipo_endereco": ["Residencial", "Residencial", "Comercial", "Correspondência"], "bairro": ["Centro", "Jardim América", "Vila Nova", "Setor Bueno", "Boa Vista", "Cambuí"],
    "logradouro": ["Rua das Acácias", "Av. Brasil", "Rua Sete de Setembro", "Av. Independência", "Rua Rui Barbosa", "Alameda dos Ipês"],
    "complemento": ["Apto 42", "Casa 2", "Sala 301", "Bloco B", None, None], "tipo_contato": ["Celular", "Celular", "E-mail", "Fixo"],
    "finalidade": ["Oferta de produtos", "Análise de crédito", "Cobrança", "Pesquisa de satisfação", "Compartilhamento com parceiros"],
    "base_legal": ["Consentimento", "Execução de contrato", "Legítimo interesse", "Obrigação legal"],
    "canal_coleta": ["App", "Site", "Loja", "Central de atendimento", "Parceiro"], "versao_termo": ["v3.2", "v3.2", "v3.1", "v2.8"],
    "campo_alterado": ["telefone", "email", "endereco", "estado_civil", "renda"], "origem": ["App", "Central de atendimento", "Loja", "CRM"],
    "usuario_responsavel": ["app.cliente", "atd.jsilva", "atd.mcosta", "loja.0231", "crm.batch"], "usuario_origem": ["erp.batch", "bko.rlima", "bko.acampos", "erp.assembleia"],
    "usuario_carga": ["btavares", "analista.comercial"], "descricao": ["Consórcio de imóveis residenciais e comerciais", "Consórcio de automóveis e motocicletas",
                                                                      "Consórcio de caminhões, máquinas e implementos", "Consórcio de serviços (reformas, viagens, saúde)"],
    "nm_plano": ["Imóvel 200 meses", "Auto 80 meses", "Pesada 100 meses", "Serviços 40 meses", "Imóvel 180 meses", "Auto 60 meses"],
    "descricao_bem": ["Imóvel residencial R$ 300 mil", "Automóvel hatch 1.0", "Caminhão semipesado 6x2", "Imóvel residencial R$ 500 mil", "SUV compacto", "Trator agrícola 110 cv"],
    "indice_reajuste": ["INCC", "FIPE", "FIPE", "IPCA"], "motivo": ["Contemplação por lance", "Inadimplência", "Solicitação do cliente", "Quitação antecipada", None],
    "tipo_cancelamento": ["Desistência", "Inadimplência", "Arrependimento (7 dias)"], "motivo_cancelamento": ["Dificuldade financeira", "Comprou o bem por outro meio", "Insatisfação com o prazo", None],
    "canal_solicitacao": ["App", "Central de atendimento", "Loja"], "origem_lead": ["Site", "Indicação", "Campanha paga", "Parceiro", "Loja"],
    "campanha": ["Feirão de Novembro", "Imóvel sem juros", "Troque de carro", None, None], "motivo_recusa": [None, None, None, "Renda insuficiente", "Restrição cadastral"],
    "tipo_vendedor": ["Próprio", "Representante", "Parceiro"], "nm_equipe": ["Equipe Paulista", "Equipe Triângulo", "Equipe Digital 1", "Equipe Sul 2", "Equipe Centro-Oeste"],
    "versao_planilha": ["metas_2026-11_v2.xlsx"], "tipo_canal": ["Próprio", "Terceiro", "Próprio", "Terceiro"],
    "tipo_parceiro": ["Concessionária", "Imobiliária", "Correspondente"], "meio_pagamento": ["Boleto", "Boleto", "Pix", "Débito em conta"],
    "canal_envio": ["E-mail", "App", "WhatsApp", "Correio"], "status_boleto": ["Liquidado", "Liquidado", "Registrado", "Vencido", "Emitido"],
    "canal_cobranca": C.CANAIS_COBRANCA, "tipo_renegociacao": ["Diluição", "Alongamento", "Redução de crédito"],
    "nm_etapa": ["Lembrete pré-vencimento", "Aviso D+3", "Contato D+10", "Negociação D+30", "Assessoria D+60", "Negativação D+90"],
    "acao_prevista": ["Enviar SMS e e-mail", "Mensagem no WhatsApp", "Ligação da central", "Proposta de acordo", "Encaminhar para assessoria", "Incluir em órgão de proteção ao crédito"],
    "resultado_acao": ["Contato efetivo", "Promessa de pagamento", "Sem contato", "Mensagem entregue", "Recusa"],
    "faixa_atraso_atuacao": ["31–60", "61–90", "90+"], "faixa_atraso": C.FAIXAS_ATRASO,
    "tipo_movimento": ["Arrecadação", "Arrecadação", "Contemplação", "Rendimento", "Devolução"],
    "extracao_loteria": ["Extração 6012", "Extração 6015", "Extração 6019"], "tipo_contemplacao": ["Sorteio", "Lance", "Lance"],
    "tipo_bem_adquirido": ["Imóvel residencial", "Automóvel", "Caminhão", "Reforma", "Quitação de financiamento"],
    "tipo_garantia": ["Alienação fiduciária", "Alienação fiduciária", "Hipoteca", "Fiança"], "tipo_atendimento": ["Humano", "Humano", "URA"],
    "tp_cham": ["R", "R", "A"], "st_cham": ["AT", "AT", "AB", "OC"], "obs": [None, None, "cli pediu 2 via", "retornar apos 18h", "nao atendeu"],
    "direcao": ["Entrada", "Saída"], "autor_tipo": ["Cliente", "Agente", "Bot"], "nm_motivo": MOTIVOS, "assunto": MOTIVOS,
    "categoria": ["Financeiro", "Contemplação", "Cadastro", "Cobrança", "Pós-venda"], "subcategoria": ["Boleto", "Lance", "Dados pessoais", "Acordo", "Crédito"],
    "area_responsavel": ["Experiência do Cliente", "Operações de Assembleias", "Cadastro & CRM", "Crédito & Cobrança"],
    "classificacao": ["Promotor", "Neutro", "Detrator"], "fila_principal": ["Voz Geral", "Voz Cobrança", "WhatsApp", "Chat e App", "Retenção"],
    "nm_fila": ["Voz Geral", "Voz Cobrança", "Voz Contemplados", "WhatsApp", "Chat e App", "E-mail", "Retenção"],
    "turno": ["Manhã", "Tarde", "Noite"], "nivel": ["N1", "N1", "N2", "Retenção"], "skill": ["Geral", "Cobrança", "Contemplação", "Retenção", "Digital"],
    "nm_filial": ["Loja Campinas", "Loja Goiânia", "Loja Londrina", "Escritório Regional Sul", "Loja Recife", "Matriz São Paulo"],
    "tipo_filial": ["Loja própria", "Loja própria", "Escritório regional", "Matriz"], "ufs": [", ".join(v[:6]) for v in C.REGIONAIS.values()],
    "dia_semana": ["segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"],
    "nm_feriado": [None], "cargo": ["Consultor de vendas", "Agente de atendimento", "Analista de cobrança", "Supervisor comercial", "Analista de dados", "Assistente administrativo"],
    "nm_area": ["Comercial", "Experiência do Cliente", "Crédito & Cobrança", "Operações", "Tecnologia"],
    "cd_centro_custo": ["CC-1020", "CC-2040", "CC-3010", "CC-4100"], "cd_kpi": ["VENDAS_COTAS", "CREDITO_VENDIDO", "INAD_OVER30", "RECEBIMENTO", "NPS", "TMA_VOZ", "CONTEMPLACOES"],
    "nm_kpi": ["Cotas vendidas", "Crédito comercializado", "Inadimplência over 30", "Recebimento do dia", "NPS", "TMA do canal Voz", "Contemplações"],
    "dominio": ["Vendas", "Vendas", "Cobrança", "Cobrança", "Atendimento", "Atendimento", "Assembleias"],
    "unidade": ["cotas", "R$", "%", "R$", "pontos", "seg", "cotas"],
    "mart_origem": ["mart_vendas_comercial", "mart_vendas_comercial", "mart_cobranca_carteira", "mart_cobranca_carteira", "mart_atendimento", "mart_atendimento", "mart_assembleias_contemplacoes"],
    "comentario": [None, None, "Atendimento rápido e claro.", "Demorou para resolver, mas resolveu.", "Gostei do aplicativo.", None],
    "valor_anterior": ["(11) 9****-2041", "a***@exemplo.com.br", "Solteiro(a)"], "valor_novo": ["(11) 9****-7733", "a***@exemplo.com", "Casado(a)"],
}
# Dimensões pequenas: valores em sequência (uma linha por membro)
SEQUENCIAL = {"dim_segmento", "dim_canal_venda", "dim_regional", "dim_regua_cobranca", "dim_fila_atendimento", "mart_executivo_kpis", "dim_calendario"}
BASE_ID = {"id_cliente": 318_400, "id_cliente_crm": 902_100, "id_cota": 74_300, "id_grupo": 1_180, "id_plano": 12, "id_parcela": 48_211_900,
           "id_vendedor": 210, "id_colaborador": 640, "id_agente": 120, "id_motivo": 31, "id_equipe": 7, "id_filial": 14, "id_proposta": 598_300,
           "id_contrato": 129_800, "id_assembleia": 9_960, "id_lance": 291_400, "id_sorteio": 9_930, "id_contemplacao": 27_300,
           "id_liberacao": 24_700, "id_pagamento": 1_958_000, "id_acordo": 38_100, "id_lead": 1_864_000, "id_bem": 40, "id_fila": 1,
           "id_etapa_regua": 1, "id_assessoria": 1, "id_parceiro": 60, "id_segmento": 1, "id_ticket": 1_472_000, "nr_contrato": 2_093_400}


def _mascara_cpf(r):
    return f"***.{r.randint(100, 999)}.***-{r.randint(10, 99)}"


def _valor(tabela, col, k, r, ancora, seq):
    nome, tipo = col["nome"], col["tipo"]
    nulo = col["nulavel"] and r.random() < 0.2

    def pick(lista):
        return lista[k % len(lista)] if seq else r.choice(lista)

    if col["pk"] and not col["fk"] and tipo in ("bigint", "integer", "smallint"):
        if seq:
            return k + 1
        return BASE_ID.get(nome, {"smallint": 1, "integer": 1_000}.get(tipo, 5_000_000)) + k
    if nome.startswith("dt_") or tipo in ("date", "timestamp"):
        if nulo and "nasc" not in nome:
            return None
        if "nascimento" in nome or "fundacao" in nome:
            return f"{r.randint(1958, 2001)}-{r.randint(1, 12):02d}-{r.randint(1, 28):02d}" if "nasc" not in nome else f"**/**/{r.randint(1958, 2001)}"
        recuo = r.randint(0, 2) if tipo == "timestamp" else r.randint(0, 25)
        if any(p in nome for p in ("adesao", "cadastro", "formacao", "admissao", "inicio_vigencia", "credenciamento", "contrato", "abertura", "primeira_assembleia")) and tabela.startswith(("dim_", "stg_erp_c")):
            recuo = r.randint(60, 1400)
        if nome == "dt_data":
            recuo = -k - 14
        d = ancora - timedelta(days=recuo)
        if "previsto" in nome or nome == "dt_vencimento":
            d = ancora + timedelta(days=r.randint(-12, 20))
        if tipo == "timestamp":
            return f"{d.isoformat()} {r.randint(7, 21):02d}:{r.randint(0, 59):02d}:{r.randint(0, 59):02d}"
        return d.isoformat()
    if nome in ("competencia", "safra"):
        return f"2026-{11 - (k % 3 if nome == 'safra' else 0):02d}"
    if nome == "ano":
        return ancora.year
    if nome == "mes":
        return ancora.month
    if nome in DOM:
        v = pick(DOM[nome])
        return v
    if nome == "uf":
        return pick(UFS)
    if nome == "municipio":
        return MUNICIPIOS[pick([u for u in UFS])]
    if "cpf_cnpj" in nome or nome.startswith("cpf") or nome == "cpf":
        return None if nulo else _mascara_cpf(r)
    if "cnpj" in nome:
        return f"**.{r.randint(100, 999)}.{r.randint(100, 999)}/0001-**"
    if "email" in nome:
        return None if nulo else f"{r.choice('abcdefgjlmprt')}***@{r.choice(['exemplo.com.br', 'correio.example', 'empresa.example'])}"
    if "telefone" in nome or nome in ("fone_cli", "nr_origem", "nr_telefone"):
        return None if nulo else f"({r.choice([11, 19, 21, 31, 41, 51, 62, 71, 81])}) 9****-{r.randint(1000, 9999)}"
    if nome == "nr_destino":
        return r.choice(["0800 *** 1200", "4003-1200"])
    if nome == "cep":
        return f"{r.randint(10000, 89999):05d}-***"
    if nome == "numero":
        return str(r.randint(12, 2400))
    if nome == "ip_coleta":
        return None if nulo else f"187.{r.randint(10, 99)}.***.***"
    if nome.startswith(("nome_", "nm_")) and col["pii"]:
        return None if nulo else f"{r.choice(NOMES)} {r.choice(SOBRENOMES)[0]}. {r.choice(SOBRENOMES)}"
    if nome.startswith("fl_"):
        return r.choice(["S", "S", "S", "N"]) if not seq else ["S", "N"][k % 7 == 5]
    if nome.startswith("vl_"):
        if nulo:
            return None
        if "credito" in nome or "avaliacao" in nome or "divida" in nome or "acordo" in nome or "renegociado" in nome:
            return float(r.choice([45, 60, 80, 95, 120, 150, 180, 240, 300, 420]) * 1000) if "credito" in nome or "avaliacao" in nome else round(r.uniform(1800, 14500), 2)
        if "saldo" in nome or "fundo_disponivel" in nome or "meta" in nome:
            return round(r.uniform(0.4, 9.5) * 1_000_000, 2)
        if "kpi" in nome or "periodo" in nome:
            return round(r.uniform(40, 9000), 2)
        if any(p in nome for p in ("recebido", "previsto", "recuperado", "movimento", "lance", "vendido", "contemplado", "liberado")):
            return round(r.uniform(18_000, 640_000), 2)
        if any(p in nome for p in ("tarifa", "juros", "taxa_transferencia")):
            return round(r.uniform(1.2, 380), 2)
        if any(p in nome for p in ("fundo_comum",)):
            return round(r.uniform(380, 2900), 2)
        if any(p in nome for p in ("taxa_adm", "fundo_reserva")):
            return round(r.uniform(18, 320), 2)
        return round(r.uniform(420, 3900), 2)
    if nome.startswith("pc_"):
        return None if nulo else round(r.uniform(0.5, 62) if "pago" in nome or "lance" in nome or "ocupacao" in nome else r.uniform(0.5, 22), 2)
    if nome.startswith("qt_"):
        teto = 40 if any(p in nome for p in ("assemble", "parcelas", "acordo", "contempl")) else 900
        if nome == "qt_mensagens":
            return r.randint(2, 38)
        return r.randint(0 if teto == 40 else 12, teto)
    if nome == "nota":
        return r.choice([10, 10, 9, 9, 8, 7, 6, 3]) if "nps" in tabela or "pesquisas" in tabela else r.choice([5, 5, 4, 4, 3, 2])
    if nome in ("mob", "mob_cancelamento", "ordem_etapa", "nr_parcela", "nr_parcela_comissao", "nr_assembleia", "dia_vencimento"):
        return {"dia_vencimento": r.choice([5, 10, 15, 20, 25])}.get(nome, (k % 5 + 1) if nome == "ordem_etapa" else r.randint(1, 36))
    if "seg" in nome and tipo in ("integer", "bigint"):
        return None if nulo else (r.randint(40_000, 900_000) if tipo == "bigint" else r.randint(8, 620))
    if nome in ("dias_atraso", "dias_atraso_inicio", "dias_atraso_fim", "dias_ate_liberacao", "tempo_etapa_horas", "prazo_meses", "prazo_maximo_meses", "qt_participantes_max", "dias_medio_liberacao"):
        return {"prazo_meses": r.choice([60, 80, 100, 180, 200]), "prazo_maximo_meses": [200, 80, 100, 40][k % 4]}.get(nome, None if nulo else r.choice([0, 0, 0, 4, 12, 35, 68]) if nome == "dias_atraso" else r.randint(3, 95))
    if nome in ("hr_ini", "hr_fim"):
        return None if nulo else f"{r.randint(8, 19):02d}:{r.randint(0, 59):02d}:{r.randint(0, 59):02d}"
    if nome == "nosso_numero":
        return f"109{r.randint(10_000_000, 99_999_999)}"
    if nome == "linha_digitavel":
        return f"23793.38128 6{r.randint(1000, 9999)}.****** ******.****** 1 {r.randint(10**13, 10**14 - 1)}"
    if nome in ("nm_arquivo", "nm_arquivo_origem"):
        return (f"CNAB240_RET_{ancora:%Y%m%d}_{r.randint(1, 4):02d}.ret" if nome == "nm_arquivo" else f"cdr_{ancora:%Y%m%d}_{r.randint(0, 23):02d}.csv.gz")
    if nome == "payload_hash":
        return f"{r.getrandbits(128):032x}"
    if tipo.startswith("varchar(36)") or tipo.startswith("varchar(40)"):
        return f"{nome.split('_')[1][:3] if '_' in nome else 'id'}-{r.getrandbits(40):010x}"
    if nome.startswith("id_") or nome.startswith(("nr_", "cod_cham")):
        if nulo:
            return None
        base = BASE_ID.get(nome.replace("_cedente", "").replace("_cessionario", "").replace("_erp", "").replace("_supervisor", "_colaborador").replace("_helpdesk", ""), 1_000)
        return base + r.randint(0, 400 if base > 500 else 30)
    if nome.startswith("cd_") or nome in ("ramal", "ramal_agente", "cod_oper", "matricula"):
        if nulo:
            return None
        prefixo = {"cd_vendedor": "V", "cd_plano": "PL", "cd_grupo": "G", "cd_bem": "B", "cd_fila": "F", "cd_agente": "A", "cd_motivo": "M"}.get(nome, "")
        return f"{prefixo}{r.randint(1000, 9999)}"
    if nome == "nr_sorteado":
        return r.randint(1, 99_999)
    if tipo in ("integer", "smallint", "bigint"):
        return r.randint(1, 500)
    return None if nulo else "n/d"


# Marcação das linhas problemáticas: (operação, coluna, linhas, texto[, extras])
PROBLEMAS_AMOSTRA = {
    "fato_parcelas": [("dup", "id_parcela", [(1, 2), (6, 7)], "Registro duplicado: mesmo `id_parcela` gravado duas vezes no reprocesso do lote de 16/11")],
    "fato_pesquisa_nps": [("dup", "id_resposta", [(2, 3), (7, 8)], "Resposta repetida: `id_resposta` já entregue antes pela plataforma")],
    "stg_pesquisas_respostas": [("dup", "id_resposta", [(4, 5)], "Reenvio da plataforma: mesmo `id_resposta` em duas entregas")],
    "stg_whatsapp_conversas": [("dup", "id_conversa", [(3, 4)], "Conversa repetida por reenvio de webhook; sem PK, as duas linhas foram gravadas")],
    "fato_conversa_whatsapp": [("marca", "id_conversa", [5], "Possível duplicata não resolvida pela deduplicação heurística")],
    "dim_cliente": [("nulo", "cpf_cliente", [2, 6], "CPF ausente em cadastro do canal Parceiro", {"canal_origem": "Parceiro"})],
    "dim_cota": [("valor", "id_grupo", {4: 9071, 8: 9102}, "`id_grupo` sem correspondência em `dim_grupo` (grupo encerrado excluído no ERP)")],
    "fato_chamadas_legacy": [("valor", "cod_cham", {1: 48211, 2: 48211}, "Mesmo `cod_cham` em registros distintos: sem chave primária não há como identificar a chamada")],
    "fato_consentimento_lgpd": [("nulo", "base_legal", [3, 8], "Consentimento sem `base_legal` informada")],
    "fato_ticket": [("nulo", "id_motivo", [2, 7], "Ticket sem `id_motivo` preenchido")],
    "dim_endereco": [("valor", "cep", {3: "00000-000", 7: "7402-1"}, "CEP inválido")],
    "dim_contato": [("valor", "telefone", {2: "9****-1187", 6: "(62) 3***-12"}, "Telefone fora do padrão (DDD ausente ou tamanho inválido)")],
    "dim_colaborador": [("nulo", "cd_centro_custo", [8, 9], "Centro de custo vazio: a origem passou a enviar `centro_custo_id` em 12/11")],
    "fato_comissao": [("valor", "id_vendedor", {5: 9914}, "Vendedor inexistente ou inativo em `dim_vendedor`")],
    "fato_pagamento": [("marca", "id_parcela", [4], "Pagamento de 16/11 sem parcela correspondente após a duplicidade em `fato_parcelas`")],
    "mart_cobranca_carteira": [("marca", "vl_recebido", [0, 1], "Recebimento de 16/11 inflado pelas parcelas duplicadas", {"dt_referencia": "2026-11-16"})],
}
_NAO_COPIA = ("_dt_carga", "dt_carga", "id_entrega", "id_webhook_evento", "payload_hash")


_CEN = RESUMO.get("cenario") if isinstance(RESUMO.get("cenario"), dict) else {}
_KPI = {
    "VENDAS_COTAS": (float(_CEN.get("contratos_16nov", 118)), 112.0),
    "CREDITO_VENDIDO": (round(_CEN.get("contratos_16nov", 118) * _CEN.get("ticket_medio_credito", 142_000), 2), 16_000_000.0),
    "INAD_OVER30": (float(_CEN.get("over30_pct", C.ALVOS["inadimplencia_over30_pct"])), 6.5),
    "RECEBIMENTO": (float(_CEN.get("valor_recebido_16nov", 19_300_000)), None),
    "NPS": (float(_CEN.get("nps_reportado_nov", 61.6)), 60.0),
    "TMA_VOZ": (372.0, 360.0),
    "CONTEMPLACOES": (38.0, None),
}


def _coerencia(nome, linhas, pos, r, carga):
    """Ajustes para a amostra parecer dado real: datas em ordem, valores que fecham, carimbo da carga."""
    carimbo = f"{carga:%Y-%m-%d %H:%M:%S}"

    def mais(ts, minutos):
        return f"{datetime.strptime(ts, '%Y-%m-%d %H:%M:%S') + timedelta(minutes=minutos):%Y-%m-%d %H:%M:%S}"

    for li in linhas:
        for c_ in ("_dt_carga", "dt_carga"):
            if c_ in pos:
                li[pos[c_]] = carimbo
        if "dt_inicio" in pos and isinstance(li[pos["dt_inicio"]], str) and " " in li[pos["dt_inicio"]]:
            ini = li[pos["dt_inicio"]]
            if "dt_atendimento" in pos and li[pos["dt_atendimento"]]:
                li[pos["dt_atendimento"]] = mais(ini, 1)
            if "dt_fim" in pos and li[pos["dt_fim"]]:
                li[pos["dt_fim"]] = mais(ini, r.randint(3, 26))
        if "dt_abertura" in pos and "dt_primeira_resposta" in pos:
            ab = li[pos["dt_abertura"]]
            if li[pos["dt_primeira_resposta"]]:
                li[pos["dt_primeira_resposta"]] = mais(ab, r.randint(2, 55))
            if li[pos["dt_resolucao"]]:
                li[pos["dt_resolucao"]] = mais(ab, r.randint(60, 900))
        if "hr_ini" in pos and "hr_fim" in pos and li[pos["hr_fim"]]:
            h, m, s_ = (int(x) for x in li[pos["hr_ini"]].split(":"))
            li[pos["hr_fim"]] = f"{h:02d}:{min(59, m + r.randint(1, 9)):02d}:{s_:02d}"
        if all(c_ in pos for c_ in ("vl_parcela", "vl_fundo_comum", "vl_taxa_adm", "vl_fundo_reserva")):
            v = li[pos["vl_parcela"]]
            li[pos["vl_taxa_adm"]] = round(v * 0.13, 2)
            li[pos["vl_fundo_reserva"]] = round(v * 0.02, 2)
            li[pos["vl_fundo_comum"]] = round(v - li[pos["vl_taxa_adm"]] - li[pos["vl_fundo_reserva"]], 2)
        if "dias_atraso" in pos and "situacao_parcela" in pos:
            atrasada = li[pos["situacao_parcela"]] == "Em atraso"
            li[pos["dias_atraso"]] = r.choice([6, 14, 35, 68]) if atrasada else 0
            if atrasada:
                li[pos["dt_vencimento"]] = (carga.date() - timedelta(days=li[pos["dias_atraso"]])).isoformat()
            elif li[pos["situacao_parcela"]] == "Em aberto":
                li[pos["dt_vencimento"]] = (carga.date() + timedelta(days=r.randint(1, 20))).isoformat()
        if nome == "mart_atendimento":
            c = li[pos["qt_contatos"]]
            ab = int(c * r.uniform(0.02, 0.09))
            li[pos["qt_abandonados"]], li[pos["qt_atendidos"]] = ab, c - ab
            li[pos["tempo_atendimento_seg"]] = (c - ab) * r.randint(240, 420)
            li[pos["tempo_espera_seg"]] = (c - ab) * r.randint(25, 90)
            li[pos["qt_resolvidos_primeiro_contato"]] = int((c - ab) * r.uniform(0.62, 0.8))
            resp = int(c * r.uniform(0.04, 0.09))
            li[pos["qt_respostas_nps"]], li[pos["qt_promotores"]], li[pos["qt_detratores"]] = resp, int(resp * 0.68), int(resp * 0.11)
        if nome == "dim_cliente":
            li[pos["tipo_pessoa"]] = "PF"
        if nome == "dim_cota":
            sit = li[pos["situacao_cota"]]
            li[pos["dt_contemplacao"]] = li[pos["dt_contemplacao"]] or li[pos["dt_atualizacao"]][:10] if sit == "Contemplada" else None
            li[pos["dt_cancelamento"]] = (li[pos["dt_cancelamento"]] or li[pos["dt_atualizacao"]][:10]) if sit == "Cancelada" else None
            li[pos["pc_pago"]] = 100.0 if sit == "Quitada" else li[pos["pc_pago"]]
        if nome == "dim_plano":
            seg_, prazo = li[pos["nm_plano"]].split(" ")[0], int(li[pos["nm_plano"]].split(" ")[1])
            li[pos["segmento"]], li[pos["prazo_meses"]] = seg_, prazo
            li[pos["pc_taxa_administracao"]] = round(r.uniform(14, 22), 2)
            li[pos["pc_fundo_reserva"]] = r.choice([1.0, 2.0, 3.0])
            li[pos["pc_seguro"]] = r.choice([None, 0.03, 0.05])
        if "pc_lance" in pos and "vl_lance" in pos:
            credito = r.choice([60, 80, 120, 150, 240, 300]) * 1000
            li[pos["vl_lance"]] = round(credito * li[pos["pc_lance"]] / 100, 2)
            emb = next((c_ for c_ in ("vl_lance_embutido", "vl_embutido") if c_ in pos), None)
            if emb:
                li[pos[emb]] = round(li[pos["vl_lance"]] * 0.4, 2) if li[pos["tipo_lance"]] == "Embutido" else None
        if "dt_ocorrencia" in pos and "dt_credito" in pos:
            oc = carga.date() - timedelta(days=1)
            li[pos["dt_ocorrencia"]] = oc.isoformat()
            li[pos["dt_credito"]] = (oc + timedelta(days=1)).isoformat() if li[pos["cd_ocorrencia"]] == "06" else None
            li[pos["vl_tarifa"]] = r.choice([1.89, 2.1, 2.45])
        if nome == "mart_executivo_kpis":
            cd = li[pos["cd_kpi"]]
            v, meta = _KPI[cd]
            li[pos["vl_kpi"]], li[pos["vl_meta"]], li[pos["vl_periodo_anterior"]] = v, meta, round(v * r.uniform(0.94, 1.05), 2)
        if nome == "dim_calendario":
            d = datetime.strptime(li[pos["dt_data"]], "%Y-%m-%d").date()
            util = d.weekday() < 5 and (d.month, d.day) not in ((11, 2), (11, 15), (11, 20))
            li[pos["ano"]], li[pos["mes"]], li[pos["competencia"]] = d.year, d.month, f"{d.year}-{d.month:02d}"
            li[pos["dia_semana"]] = DOM["dia_semana"][d.weekday()]
            li[pos["fl_dia_util"]] = "S" if util else "N"
            feriado = {(11, 2): "Finados", (11, 15): "Proclamação da República", (11, 20): "Dia da Consciência Negra"}.get((d.month, d.day))
            li[pos["fl_feriado"]], li[pos["nm_feriado"]] = ("S" if feriado else "N"), feriado
        if "dt_referencia" in pos:
            li[pos["dt_referencia"]] = (carga.date() - timedelta(days=1 + r.randint(0, 2))).isoformat()


def gerar_amostra(nome, ancora, tem_problema, carga):
    cols = SCHEMAS[nome]
    r = rng("amostra", nome)
    seq = nome in SEQUENCIAL
    n = min(VOLUMES[nome]["total"], r.randint(8, 12)) if not seq else min(VOLUMES[nome]["total"], 8)
    n = max(n, 4)
    linhas = []
    for k in range(n):
        linhas.append([_valor(nome, c, k, r, ancora, seq) for c in cols])
    pos = {c["nome"]: j for j, c in enumerate(cols)}
    # coerências simples entre colunas
    for li in linhas:
        if "classificacao" in pos and "nota" in pos:
            li[pos["classificacao"]] = "Promotor" if li[pos["nota"]] >= 9 else ("Neutro" if li[pos["nota"]] >= 7 else "Detrator")
        if "fl_satisfeito" in pos and "nota" in pos:
            li[pos["fl_satisfeito"]] = "S" if li[pos["nota"]] >= 4 else "N"
        if "uf" in pos and "regional" in pos and li[pos["uf"]]:
            li[pos["regional"]] = REGIONAL_UF.get(li[pos["uf"]], li[pos["regional"]])
        if "uf" in pos and "municipio" in pos and li[pos["uf"]]:
            li[pos["municipio"]] = MUNICIPIOS.get(li[pos["uf"]], li[pos["municipio"]])
        if "cpf_cliente" in pos and li[pos["cpf_cliente"]] is None:
            li[pos["cpf_cliente"]] = _mascara_cpf(r)  # nulos só entram como problema marcado
        if "dt_pagamento" in pos and "situacao_parcela" in pos:
            pago = li[pos["situacao_parcela"]] == "Paga"
            li[pos["dt_pagamento"]] = li[pos["dt_pagamento"]] or (ancora.isoformat() if pago else None)
            if not pago:
                li[pos["dt_pagamento"]] = None
            if "vl_pago" in pos:
                li[pos["vl_pago"]] = li[pos["vl_parcela"]] if pago else None
    _coerencia(nome, linhas, pos, r, carga)
    saida = [dict(valores=li) for li in linhas]
    if tem_problema:
        for op in PROBLEMAS_AMOSTRA.get(nome, []):
            tipo, coluna, alvo, texto = op[:4]
            extras = op[4] if len(op) > 4 else {}
            j = pos[coluna]
            marcar = []
            if tipo == "dup":
                for a, b in alvo:
                    if b < n:
                        for c_ in cols:
                            if c_["nome"] not in _NAO_COPIA:
                                saida[b]["valores"][pos[c_["nome"]]] = saida[a]["valores"][pos[c_["nome"]]]
                        if nome == "fato_parcelas":
                            saida[b]["valores"][pos["dt_carga"]] = f"{carga + timedelta(minutes=12):%Y-%m-%d %H:%M:%S}"
                        marcar += [a, b]
            elif tipo == "nulo":
                for a in alvo:
                    if a < n:
                        saida[a]["valores"][j] = None
                        marcar.append(a)
            elif tipo == "valor":
                for a, v in alvo.items():
                    if a < n:
                        saida[a]["valores"][j] = v
                        marcar.append(a)
            else:
                marcar = [a for a in alvo if a < n]
            for a in marcar:
                for cx, vx in extras.items():
                    saida[a]["valores"][pos[cx]] = vx
                saida[a]["problema"] = texto
                saida[a]["colunas_problema"] = [coluna]
    return dict(colunas=[c["nome"] for c in cols], linhas=saida)
