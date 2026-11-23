-- core.fato_posicao_grupo_mensal
-- Posição de ocupação e vagas por grupo
-- Domínio: Grupos e Cotas | Camada: core | Dono: Camila Furtado (Operações de Grupos)
-- Rotina: core_grupos_cotas | Frequência: diária | SLA: 24h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.fato_posicao_grupo_mensal (
    id_grupo               integer       not null,
    competencia            char(7)       not null,
    qt_cotas_ativas        integer       not null,
    qt_cotas_contempladas  integer       not null,
    qt_cotas_canceladas    integer       not null,
    qt_vagas               integer       not null,
    pc_ocupacao            decimal(7,4)  not null,
    vl_saldo_fundo_comum   decimal(16,2) not null,
    constraint pk_fato_posicao_grupo_mensal primary key (id_grupo, competencia),
    constraint fk_fato_posicao_grupo_mensal_id_grupo foreign key (id_grupo) references core.dim_grupo (id_grupo)
);

comment on table core.fato_posicao_grupo_mensal is 'Posição de ocupação e vagas por grupo';
comment on column core.fato_posicao_grupo_mensal.id_grupo is 'Grupo';
comment on column core.fato_posicao_grupo_mensal.competencia is 'Mês de competência (AAAA-MM)';
comment on column core.fato_posicao_grupo_mensal.qt_cotas_ativas is 'Cotas ativas no fechamento';
comment on column core.fato_posicao_grupo_mensal.qt_cotas_contempladas is 'Cotas contempladas acumuladas';
comment on column core.fato_posicao_grupo_mensal.qt_cotas_canceladas is 'Cotas canceladas acumuladas';
comment on column core.fato_posicao_grupo_mensal.qt_vagas is 'Vagas disponíveis para venda';
comment on column core.fato_posicao_grupo_mensal.pc_ocupacao is 'Percentual de ocupação do grupo';
comment on column core.fato_posicao_grupo_mensal.vl_saldo_fundo_comum is 'Saldo do fundo comum no fechamento';
