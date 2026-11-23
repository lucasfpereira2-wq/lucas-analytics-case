"""
Simulação das execuções das rotinas (30 dias por tabela) e consolidação por pipeline.

Cada pipeline tem horário fixo. A história inclui falhas e alertas isolados já resolvidos e os
eventos do cenário (cenario.PROBLEMAS / cenario.INCIDENTES), que são a evidência de onde o farol nasce.
"""
from datetime import timedelta

from base import (AGORA, DIAS, FATOR_SEMANA, HOJE, N_DIAS, POR_NOME, TABELAS, VOLUMES, cenario, dt, f_dh,
                  f_int, iso, rng)

C = cenario

# ---- Pipelines: horário fixo, orquestrador e descrição -------------------------------------------
# hora: (h, min) da execução diária; rotinas horárias usam o minuto; dia_semana 6 = domingo.
PIPELINES = {
    "ingest_erp": dict(hora=(1, 0), nome="Ingestão do ERP de Consórcio", orquestrador="Airflow",
                       descricao="Extrai contratos, cotas, parcelas, assembleias e lances do ERP de consórcio para a staging."),
    "ingest_crm": dict(hora=(1, 15), nome="Ingestão do CRM Comercial", orquestrador="Airflow",
                       descricao="Coleta clientes, propostas e eventos de funil pela API paginada do CRM."),
    "core_corporativo_rh": dict(hora=(1, 20), nome="Colaboradores (RH)", orquestrador="Airflow",
                                descricao="Lê o arquivo diário da folha e atualiza o cadastro de colaboradores."),
    "core_cadastro": dict(hora=(1, 40), nome="Cadastro único de clientes", orquestrador="Airflow",
                          descricao="Consolida clientes do CRM e do ERP em um cadastro único, com endereços, contatos e consentimentos."),
    "ingest_banco_cnab": dict(hora=(1, 45), nome="Retorno bancário (CNAB 240)", orquestrador="Airflow",
                              descricao="Processa os arquivos de retorno CNAB 240 com as liquidações do dia anterior."),
    "core_grupos_cotas": dict(hora=(2, 0), nome="Grupos e cotas", orquestrador="Airflow",
                              descricao="Atualiza grupos, cotas e suas movimentações (transferências, cancelamentos, reativações)."),
    "ingest_telefonia": dict(hora=(2, 10), nome="Ingestão da telefonia (CDR)", orquestrador="Airflow",
                             descricao="Baixa do SFTP da operadora os arquivos CDR com as chamadas do dia anterior."),
    "ingest_pesquisas": dict(hora=(2, 30), nome="Ingestão das pesquisas (NPS e CSAT)", orquestrador="Airflow",
                             descricao="Recebe as respostas de NPS e CSAT entregues pela plataforma de pesquisas."),
    "core_vendas": dict(hora=(2, 30), nome="Vendas e funil comercial", orquestrador="Airflow",
                        descricao="Monta leads, propostas, vendas, funil, comissões e as dimensões comerciais."),
    "core_financeiro_parcelas": dict(hora=(2, 45), nome="Parcelas e pagamentos", orquestrador="Airflow",
                                     descricao="Carga incremental de parcelas do ERP e conciliação dos pagamentos com o retorno bancário."),
    "legacy_chamadas_dts": dict(hora=(2, 50), nome="Chamadas do discador antigo (legado)", orquestrador="DTS legado",
                                descricao="Pacote DTS herdado que recarrega o histórico de chamadas do discador antigo. Sem dono e sem documentação."),
    "core_atendimento": dict(hora=(3, 0), nome="Atendimento por voz", orquestrador="Airflow",
                             descricao="Consolida as chamadas de voz e atualiza agentes, filas e motivos de contato."),
    "core_assembleias": dict(hora=(3, 15), nome="Assembleias e contemplações", orquestrador="Airflow",
                             descricao="Carrega assembleias, lances, sorteios, contemplações e liberações de crédito."),
    "core_pesquisas": dict(hora=(3, 20), nome="Pesquisas de satisfação", orquestrador="Airflow",
                           descricao="Trata as respostas de NPS e CSAT e associa ao cliente e ao atendimento avaliado."),
    "core_cobranca": dict(hora=(3, 30), nome="Cobrança e inadimplência", orquestrador="Airflow",
                          descricao="Gera a fotografia diária da carteira, acordos, renegociações e acionamentos de cobrança."),
    "ingest_banco_boletos": dict(hora=(3, 40), nome="Boletos registrados (API do banco)", orquestrador="Airflow",
                                 descricao="Consulta na API de cobrança do banco os boletos registrados no dia anterior."),
    "core_financeiro_fundos": dict(hora=(3, 45), nome="Fundo comum e fundo de reserva", orquestrador="Airflow",
                                   descricao="Apura a movimentação dos fundos por grupo a partir dos pagamentos conciliados."),
    "core_financeiro_boletos": dict(hora=(4, 0), nome="Ciclo de vida dos boletos", orquestrador="Airflow",
                                    descricao="Relaciona boletos registrados às parcelas e acompanha emissão, registro e liquidação."),
    "core_assembleias_garantias": dict(hora=(4, 50), nome="Garantias dos créditos liberados", orquestrador="Airflow",
                                       descricao="Atualiza as garantias e o registro de gravames dos créditos liberados."),
    "mart_vendas": dict(hora=(5, 0), nome="Mart de Vendas / Comercial", orquestrador="Airflow",
                        descricao="Agrega vendas, funil e metas para o relatório de Vendas / Comercial."),
    "mart_atendimento": dict(hora=(5, 10), nome="Mart de Atendimento", orquestrador="Airflow",
                             descricao="Agrega volumes, tempos, NPS e CSAT de todos os canais para o relatório de Atendimento."),
    "mart_cobranca": dict(hora=(5, 20), nome="Marts de Cobrança", orquestrador="Airflow",
                          descricao="Monta a carteira por faixa de atraso e as curvas de safra, MOB e cohort."),
    "mart_assembleias": dict(hora=(5, 30), nome="Mart de Assembleias e Contemplações", orquestrador="Airflow",
                             descricao="Agrega assembleias, lances, contemplações e liberações por grupo e competência."),
    "mart_executivo": dict(hora=(6, 0), nome="KPIs executivos", orquestrador="Airflow",
                           descricao="Consolida os indicadores dos cinco marts para o comitê executivo."),
    # horárias
    "ingest_whatsapp": dict(hora=(0, 5), nome="Ingestão do WhatsApp Business", orquestrador="Airflow",
                            descricao="Grava as conversas recebidas por webhook da WhatsApp Business API, em modo append."),
    "ingest_helpdesk": dict(hora=(0, 10), nome="Ingestão do helpdesk", orquestrador="Airflow",
                            descricao="Coleta tickets e interações de chat, e-mail e aplicativo pela API do helpdesk."),
    "core_atendimento_digital": dict(hora=(0, 25), nome="Atendimento digital", orquestrador="Airflow",
                                     descricao="Consolida conversas de WhatsApp, tickets e interações digitais."),
    # semanais / mensais
    "core_corporativo": dict(hora=(2, 50), nome="Dimensões corporativas", orquestrador="Airflow",
                             descricao="Atualiza filiais, regionais e o calendário de dias úteis."),
    "core_produto": dict(hora=(3, 0), nome="Catálogo de produtos", orquestrador="Airflow",
                         descricao="Atualiza segmentos, planos, bens de referência e tabelas de taxa."),
    "core_produto_reajuste": dict(hora=(3, 15), nome="Reajuste do bem de referência", orquestrador="Airflow",
                                  descricao="Aplica os índices mensais (INCC, IPCA, FIPE) aos bens de referência. Depende da publicação dos índices."),
    "planilha_metas_manual": dict(hora=(10, 42), nome="Metas comerciais (planilha)", orquestrador="Carga manual",
                                  descricao="Planilha de metas enviada pela área comercial e carregada manualmente até o 3º dia útil do mês."),
}
assert set(PIPELINES) == {t["pipeline"] for t in TABELAS}

DIA_MENSAL = {"dim_calendario": 1, "fato_reajuste_bem": 12, "fato_meta_comercial": 3}

for _id, _p in PIPELINES.items():
    _tabs = [t for t in TABELAS if t["pipeline"] == _id]
    _freqs = {t["frequencia"] for t in _tabs}
    h, m = _p["hora"]
    if "horária" in _freqs:
        _p["frequencia"] = "horária"
        _p["agenda"], _p["agenda_cron"] = f"A cada hora, no minuto {m:02d}", f"{m} * * * *"
    elif "diária" in _freqs:
        _p["frequencia"] = "diária"
        _p["agenda"], _p["agenda_cron"] = f"Diária às {h:02d}:{m:02d}", f"{m} {h} * * *"
    elif "semanal" in _freqs:
        _p["frequencia"] = "semanal"
        _p["agenda"], _p["agenda_cron"] = f"Semanal, domingos às {h:02d}:{m:02d}", f"{m} {h} * * 0"
    else:
        _p["frequencia"] = "mensal"
        dia = DIA_MENSAL[_tabs[0]["nome"]]
        _p["agenda"], _p["agenda_cron"] = f"Mensal, dia {dia} às {h:02d}:{m:02d}", f"{m} {h} {dia} * *"
    _donos = [t["dono"] for t in _tabs]
    _p["dono"] = max(set(_donos), key=_donos.count) if any(_donos) else None
    _p["tabelas"] = [t["nome"] for t in _tabs]
PIPELINES["planilha_metas_manual"]["agenda"] = "Mensal, até o 3º dia útil (carga manual)"
PIPELINES["legacy_chamadas_dts"]["dono"] = None
PIPELINES["ingest_whatsapp"]["dono"] = None

# ---- Eventos ----------------------------------------------------------------------------------
# chave: (pipeline ou tabela, 'AAAA-MM-DD') -> dict(status, msg, atraso_h, pendente, fator, linhas, anomalia, dur)
EV_PIPE, EV_TAB = {}, {}


def _pipe(pipeline, dia, status, msg, **kw):
    EV_PIPE[(pipeline, dia)] = dict(status=status, msg=msg, **kw)


def _tab(tabela, dia, status, msg, **kw):
    EV_TAB[(tabela, dia)] = dict(status=status, msg=msg, **kw)


# História: falhas e alertas isolados, já resolvidos
_ERRO_DTS = "DTS_E_OLEDBERROR: falha de login no servidor SQLLEG01 (0x80040E4D). Pacote PKG_CHAMADAS_HIST abortado na etapa 3."
_pipe("core_corporativo_rh", "2026-10-20", "falha", "Arquivo colaboradores_20261019.csv não encontrado no diretório de troca do RH.")
for _d in ("2026-10-21", "2026-10-28", "2026-11-06", "2026-11-15"):
    _pipe("legacy_chamadas_dts", _d, "falha", _ERRO_DTS)
_pipe("core_assembleias", "2026-10-22", "alerta", "Duração 2,4 vezes acima da média: pico de lances na semana de assembleias.", dur=2.4)
_pipe("ingest_erp", "2026-10-23", "atrasada", "Janela de backup do ERP estendida; extração iniciou com 2 horas de atraso.", atraso_h=2)
_pipe("mart_vendas", "2026-10-26", "atrasada", "Aguardou a conclusão de `core_vendas`, que excedeu a janela; iniciou com 2 horas de atraso.", atraso_h=2)
_pipe("core_financeiro_fundos", "2026-10-27", "falha", "Deadlock ao gravar o saldo dos fundos (transação escolhida como vítima). Reprocessada no dia seguinte.")
_pipe("ingest_crm", "2026-10-29", "falha", "HTTP 503 Service Unavailable na API do CRM após 5 tentativas (manutenção do fornecedor).")
_pipe("ingest_banco_cnab", "2026-11-03", "alerta", "Arquivo de retorno com volume 41% abaixo do esperado (feriado bancário de 02/11).", fator=0.59, anomalia=True)
_pipe("core_cobranca", "2026-11-04", "falha", "Timeout ao consultar `fato_parcelas`: consulta excedeu 30 minutos. Reprocessada no dia seguinte.")
_pipe("ingest_helpdesk", "2026-11-05", "alerta", "Limite de requisições da API do helpdesk (HTTP 429); carga concluída na 3ª tentativa.", dur=2.1)
_pipe("mart_executivo", "2026-11-08", "atrasada", "Aguardou os marts de origem; iniciou com 1 hora de atraso.", atraso_h=1)
_pipe("ingest_pesquisas", "2026-11-10", "falha", "Token da API da plataforma de pesquisas expirado (HTTP 401). Renovado manualmente no mesmo dia.")

# Cenário: telefonia parada. Última carga com sucesso em 14/11 (dados até 13/11); as cargas de 15, 16 e 17/11
# falharam, então faltam os dados de voz de 14, 15 e 16/11 -> "parada há 3 dias"
for _d in ("2026-11-15", "2026-11-16", "2026-11-17"):
    _tab("stg_telefonia_cdr", _d, "falha", "Falha de autenticação no SFTP da operadora (530 Login incorrect): credencial expirada.")
    _tab("fato_chamada", _d, "nao_executou", "Tarefa ignorada (upstream_failed): `stg_telefonia_cdr` não foi carregada.")
    _tab("mart_atendimento", _d, "falha",
         "Etapa de voz ignorada por falha na dependência `fato_chamada`; canais digitais carregados e execução marcada como falha.",
         fator=0.56, anomalia=True, parcial=True)

# Cenário: 17/11
_HOJE = HOJE.isoformat()
_tab("stg_crm_propostas", _HOJE, "sucesso",
     f"Concluída como sucesso com {f_int(C.PROPOSTAS_D1)} linhas (esperado: cerca de {f_int(C.PROPOSTAS_MEDIA)}). A paginação da API do CRM expirou e foi tratada como fim de dados.",
     linhas=C.PROPOSTAS_D1, anomalia=True)
_tab("fato_proposta", _HOJE, "sucesso", "Volume 61% abaixo do esperado: carga parcial herdada de `stg_crm_propostas`.", fator=0.39, anomalia=True)
_tab("fato_funil_crm", _HOJE, "atrasada", "Aguardou nova tentativa de `stg_crm_propostas`; concluída com 5 horas de atraso.", atraso_h=5)
_tab("stg_banco_boletos_registrados", _HOJE, "falha", "Certificado digital da API do banco expirado (SSL: CERTIFICATE_HAS_EXPIRED).")
_tab("fato_boleto", _HOJE, "atrasada", "Aguardando `stg_banco_boletos_registrados`, que falhou hoje às 03:40.", pendente=True)
_tab("fato_parcelas", _HOJE, "alerta",
     f"Concluída após 1 retry: o lote de 16/11 foi gravado duas vezes em modo append ({C.PARCELAS_DUPLICADAS} linhas além do recebido da origem).",
     extra=C.PARCELAS_DUPLICADAS, anomalia=True)
_tab("fato_acao_cobranca", _HOJE, "atrasada", "Fila de processamento congestionada após a falha de boletos; concluída com 4 horas de atraso.", atraso_h=4)
_tab("fato_transferencia_cota", _HOJE, "atrasada", "Execução de hoje ainda não concluída: tarefa aguardando liberação de bloqueio na tabela de origem do ERP.", pendente=True)
_tab("fato_garantia", "2026-11-16", "atrasada", "Aguardou o retorno do sistema de registro de gravames; concluída com 9 horas de atraso.", atraso_h=9)
_tab("fato_garantia", _HOJE, "atrasada", "Execução de hoje ainda não concluída: aguardando o retorno do sistema de registro de gravames.", pendente=True)
_tab("fato_reajuste_bem", "2026-11-12", "atrasada", "Índices de novembro (INCC, IPCA e FIPE) ainda não recebidos; carga não realizada.", pendente=True)
_tab("fato_meta_comercial", "2026-11-03", "alerta", "Planilha de novembro carregada sem 2 das 5 regionais (48 de 80 linhas).", fator=0.6, anomalia=True)

# Última carga antes da janela, quando não é simplesmente "o ciclo anterior"
CARGA_ANTERIOR = {"fato_reajuste_bem": dt(DIAS[0].replace(month=10, day=12), 3, 15)}


def _agendada(t, dia):
    f = t["frequencia"]
    if f in ("diária", "horária"):
        return True
    if f == "semanal":
        return dia.weekday() == 6
    return dia.day == DIA_MENSAL[t["nome"]]


def _horario(t, dia):
    h, m = PIPELINES[t["pipeline"]]["hora"]
    if t["frequencia"] == "horária":
        return dt(dia, 7 if dia == HOJE else 23, m)
    return dt(dia, h, m)


def _esperadas(nome, i, dia):
    v = VOLUMES[nome]
    if v["carga"] is None:  # recarga completa, com crescimento vegetativo leve
        total = v["total"]
        cresc = 0.0003 if total > 2_000 else 0.0
        return int(round(total * (1 - cresc * (N_DIAS - 1 - i))))
    fator = FATOR_SEMANA[(dia - timedelta(days=1)).weekday()] if v["sazonal"] else 1.0
    return max(1, int(round(v["carga"] * fator)))


def _duracao_base(t):
    v = VOLUMES[t["nome"]]
    carga = v["carga"] if v["carga"] is not None else v["total"]
    seg = 22 + carga / 1500
    if t["camada"] == "core":
        seg *= 1.6
    seg = min(600.0, seg)
    if t["camada"] == "mart":
        seg = 260 + seg * 3
    return max(14.0, seg)


def gerar_execucoes():
    """dict nome -> lista de 30 execuções (campos do contrato + campos internos com prefixo _)."""
    todas = {}
    for t in TABELAS:
        nome = t["nome"]
        r = rng("exec", nome)
        base_dur = _duracao_base(t)
        lista = []
        for i, dia in enumerate(DIAS):
            d_iso = dia.isoformat()
            if not _agendada(t, dia):
                lista.append(dict(data=d_iso, inicio=None, duracao_seg=None, linhas=None, linhas_esperadas=0,
                                  status="sem_agenda", anomalia_volume=False, _agendada=False, _concluida=False,
                                  _atraso_h=0.0, _sched=None))
                continue
            sched = _horario(t, dia)
            esperadas = _esperadas(nome, i, dia)
            ev = EV_TAB.get((nome, d_iso)) or EV_PIPE.get((t["pipeline"], d_iso)) or {}
            status = ev.get("status", "sucesso")
            ruido = 1 + r.uniform(-0.035, 0.035)
            if VOLUMES[nome]["carga"] is None:
                linhas = esperadas
            elif nome == "fato_parcelas":  # carga incremental espelha exatamente o que veio da origem
                linhas = todas["stg_erp_parcelas"][i]["linhas"] or esperadas
                esperadas = linhas
            else:
                linhas = max(1, int(round(esperadas * ruido)))
            if "fator" in ev:
                linhas = int(round(esperadas * ev["fator"]))
            if "linhas" in ev:
                linhas = ev["linhas"]
            if "extra" in ev:
                linhas = linhas + ev["extra"]
            dur = base_dur * (0.75 + 0.25 * linhas / max(1, esperadas)) * (1 + r.uniform(-0.12, 0.12)) * ev.get("dur", 1.0)
            inicio = sched + timedelta(seconds=r.randint(2, 55))
            concluida, atraso_h = True, 0.0
            if status == "falha":
                concluida = False
                dur = base_dur * r.uniform(0.08, 0.3) + 20
                if not ev.get("parcial"):
                    linhas = None
            elif status == "nao_executou":
                concluida, inicio, dur, linhas = False, None, None, None
            elif status == "atrasada":
                if ev.get("pendente"):
                    concluida, inicio, dur, linhas = False, None, None, None
                else:
                    atraso_h = float(ev.get("atraso_h", 1))
                    inicio = sched + timedelta(hours=atraso_h, seconds=r.randint(2, 55))
            e = dict(data=d_iso, inicio=iso(inicio), duracao_seg=(int(round(dur)) if dur is not None else None),
                     linhas=linhas, linhas_esperadas=esperadas, status=status,
                     anomalia_volume=bool(ev.get("anomalia", False)),
                     _agendada=True, _concluida=concluida, _atraso_h=atraso_h, _sched=sched, _inicio=inicio)
            if ev.get("msg"):
                e["mensagem"] = ev["msg"]
            lista.append(e)
        todas[nome] = lista
    return todas


def carga_anterior(t):
    """Última carga concluída antes da janela de 30 dias."""
    nome = t["nome"]
    if nome in CARGA_ANTERIOR:
        return CARGA_ANTERIOR[nome]
    f = t["frequencia"]
    d = DIAS[0] - timedelta(days=1)
    if f == "semanal":
        while d.weekday() != 6:
            d -= timedelta(days=1)
    elif f == "mensal":
        while d.day != DIA_MENSAL[nome]:
            d -= timedelta(days=1)
    return _horario(t, d) if f != "horária" else dt(d, 23, PIPELINES[t["pipeline"]]["hora"][1])


def estado_diario(t, execs):
    """Para cada dia: execução de referência (última agendada), última carga concluída e atraso em horas.

    atraso = maior valor entre (idade da última carga - SLA) e o atraso com que a última carga foi concluída.
    """
    sla = t["sla_horas"]
    ult_carga, ult_atraso_carga = carga_anterior(t), 0.0
    ref = None
    estados = []
    for i, dia in enumerate(DIAS):
        e = execs[i]
        if e["_agendada"]:
            ref = e
            if e["_concluida"]:
                ult_carga, ult_atraso_carga = e["_inicio"], e["_atraso_h"]
        foto = dt(dia, AGORA.hour)
        idade = max(0.5, (foto - ult_carga).total_seconds() / 3600)
        atraso = max(0.0, idade - sla, ult_atraso_carga)
        atraso = float(round(atraso)) if atraso >= 0.5 else 0.0
        estados.append(dict(ref=ref, ultima_carga=ult_carga, idade_h=idade, atraso_h=atraso,
                            status_exec=(ref["status"] if ref else "sucesso")))
    return estados


PIOR = ["falha", "nao_executou", "atrasada", "alerta", "sucesso"]


def execucoes_pipeline(pid, execs):
    """Consolida as execuções das tabelas em execuções do pipeline (uma por dia)."""
    tabs = PIPELINES[pid]["tabelas"]
    saida = []
    for i, dia in enumerate(DIAS):
        do_dia = [execs[n][i] for n in tabs if execs[n][i]["_agendada"]]
        if not do_dia:
            saida.append(dict(data=dia.isoformat(), status="sem_agenda", duracao_seg=None, inicio=None, mensagem=None))
            continue
        sts = [e["status"] for e in do_dia]
        if all(s == "nao_executou" for s in sts):
            status = "nao_executou"
        elif "falha" in sts or "nao_executou" in sts:
            status = "falha"
        else:
            status = next(s for s in PIOR if s in sts)
        durs = [e["duracao_seg"] for e in do_dia if e["duracao_seg"] is not None]
        inicios = [e["_inicio"] for e in do_dia if e.get("_inicio")]
        pior = sorted(do_dia, key=lambda e: PIOR.index(e["status"]))[0]
        # tarefas rodam em paralelo: duração do pipeline = tarefa mais longa + parte das demais
        total = int(max(durs) + 0.25 * (sum(durs) - max(durs))) if durs else None
        saida.append(dict(data=dia.isoformat(), status=status, duracao_seg=total,
                          inicio=iso(min(inicios)) if inicios else None, mensagem=pior.get("mensagem")))
    return saida


def montar_pipelines(execs):
    lista = []
    for pid, p in PIPELINES.items():
        ex = execucoes_pipeline(pid, execs)
        agend = [e for e in ex if e["status"] != "sem_agenda"]
        ultima = agend[-1]
        falhas = [e for e in agend if e["status"] in ("falha", "nao_executou")]
        ok = [e for e in agend if e["status"] in ("sucesso", "alerta")]
        if ultima["status"] in ("falha", "nao_executou"):
            status = "vermelho"
        elif ultima["status"] in ("atrasada", "alerta") or any(e["status"] in ("falha", "nao_executou") for e in agend[-3:-1]):
            status = "amarelo"
        else:
            status = "verde"
        rec = {}
        for e in falhas:
            msg = e["mensagem"] or "Falha sem mensagem registrada."
            r_ = rec.setdefault(msg, dict(erro=msg, ocorrencias=0, ultima=e["data"]))
            r_["ocorrencias"] += 1
            r_["ultima"] = max(r_["ultima"], e["data"])
        durs = [e["duracao_seg"] for e in agend if e["duracao_seg"] is not None and e["status"] in ("sucesso", "alerta", "atrasada")]
        ult = dict(inicio=ultima["inicio"], duracao_seg=ultima["duracao_seg"], status=ultima["status"])
        if ultima["mensagem"]:
            ult["mensagem"] = ultima["mensagem"]
        lista.append(dict(
            id=pid, nome=p["nome"], descricao=p["descricao"], orquestrador=p["orquestrador"],
            agenda=p["agenda"], agenda_cron=p["agenda_cron"], dono=p["dono"], tabelas=p["tabelas"],
            status=status, ultima_execucao=ult,
            taxa_sucesso_30d=round(100 * len(ok) / len(agend), 1),
            duracao_media_seg=int(round(sum(durs) / len(durs))) if durs else 0,
            falhas_30d=len(falhas),
            falhas_recorrentes=sorted(rec.values(), key=lambda x: (-x["ocorrencias"], x["ultima"])),
            execucoes_30d=[dict(data=e["data"], status=e["status"], duracao_seg=e["duracao_seg"]) for e in ex],
        ))
    ordem = {"vermelho": 0, "amarelo": 1, "verde": 2}
    lista.sort(key=lambda p: (ordem[p["status"]], PIPELINES[p["id"]]["hora"]))
    return lista


def publico(e):
    """Remove os campos internos de uma execução."""
    return {k: v for k, v in e.items() if not k.startswith("_")}


__all__ = ["PIPELINES", "gerar_execucoes", "estado_diario", "montar_pipelines", "publico", "f_dh"]
