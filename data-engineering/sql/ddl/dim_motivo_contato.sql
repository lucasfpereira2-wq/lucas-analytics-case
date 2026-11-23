-- core.dim_motivo_contato
-- Árvore de motivos de contato
-- Domínio: Atendimento | Camada: core | Dono: Juliana Prado (Experiência do Cliente)
-- Rotina: core_atendimento | Frequência: semanal | SLA: 168h
-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.

create table if not exists core.dim_motivo_contato (
    id_motivo         integer     not null,
    nm_motivo         varchar(80) not null,
    categoria         varchar(40) not null,
    subcategoria      varchar(60) not null,
    area_responsavel  varchar(40) not null,
    fl_ativo          char(1)     not null,
    constraint pk_dim_motivo_contato primary key (id_motivo)
);

comment on table core.dim_motivo_contato is 'Árvore de motivos de contato';
comment on column core.dim_motivo_contato.id_motivo is 'Chave do motivo de contato';
comment on column core.dim_motivo_contato.nm_motivo is 'Nome do motivo';
comment on column core.dim_motivo_contato.categoria is 'Categoria (nível 1)';
comment on column core.dim_motivo_contato.subcategoria is 'Subcategoria (nível 2)';
comment on column core.dim_motivo_contato.area_responsavel is 'Área responsável pela solução';
comment on column core.dim_motivo_contato.fl_ativo is 'Motivo ativo (S/N)';
