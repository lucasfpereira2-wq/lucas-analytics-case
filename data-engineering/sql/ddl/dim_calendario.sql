-- core.dim_calendario
-- Calendário com dias úteis e feriados
-- Domínio: Corporativo | Camada: core | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: core_corporativo | Frequência: mensal | SLA: 744h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_calendario (
    dt_data      date        not null,
    ano          smallint    not null,
    mes          smallint    not null,
    competencia  char(7)     not null,
    dia_semana   varchar(15) not null,
    fl_dia_util  char(1)     not null,
    fl_feriado   char(1)     not null,
    nm_feriado   varchar(60),
    constraint pk_dim_calendario primary key (dt_data)
);

comment on table core.dim_calendario is 'Calendário com dias úteis e feriados';
comment on column core.dim_calendario.dt_data is 'Data';
comment on column core.dim_calendario.ano is 'Ano';
comment on column core.dim_calendario.mes is 'Mês';
comment on column core.dim_calendario.competencia is 'Mês de competência (AAAA-MM)';
comment on column core.dim_calendario.dia_semana is 'Dia da semana';
comment on column core.dim_calendario.fl_dia_util is 'Dia útil (S/N)';
comment on column core.dim_calendario.fl_feriado is 'Feriado nacional (S/N)';
comment on column core.dim_calendario.nm_feriado is 'Nome do feriado';
