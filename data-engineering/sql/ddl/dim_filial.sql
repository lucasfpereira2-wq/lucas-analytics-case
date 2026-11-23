-- core.dim_filial
-- Filiais e lojas próprias
-- Domínio: Corporativo | Camada: core | Dono: Thiago Meireles (Engenharia de Dados)
-- Rotina: core_corporativo | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_filial (
    id_filial    integer     not null,
    nm_filial    varchar(60) not null,
    tipo_filial  varchar(20) not null,
    municipio    varchar(80) not null,
    uf           char(2)     not null,
    regional     varchar(30) not null,
    fl_ativa     char(1)     not null,
    dt_abertura  date        not null,
    constraint pk_dim_filial primary key (id_filial)
);

comment on table core.dim_filial is 'Filiais e lojas próprias';
comment on column core.dim_filial.id_filial is 'Chave da filial';
comment on column core.dim_filial.nm_filial is 'Nome da filial ou loja';
comment on column core.dim_filial.tipo_filial is 'Loja própria, escritório regional ou matriz';
comment on column core.dim_filial.municipio is 'Município';
comment on column core.dim_filial.uf is 'UF';
comment on column core.dim_filial.regional is 'Regional comercial';
comment on column core.dim_filial.fl_ativa is 'Filial ativa (S/N)';
comment on column core.dim_filial.dt_abertura is 'Data de abertura';
