-- Teste: toda tabela do catálogo deve ter chave primária declarada (regra: pk_existente | severidade: alto)
-- Falha se retornar linhas. Hoje retorna staging.stg_whatsapp_conversas e core.fato_chamadas_legacy.
select t.table_schema, t.table_name
from information_schema.tables t
left join information_schema.table_constraints c
       on c.table_schema = t.table_schema
      and c.table_name = t.table_name
      and c.constraint_type = 'PRIMARY KEY'
where t.table_schema in ('staging', 'core', 'marts')
  and t.table_type = 'BASE TABLE'
  and c.constraint_name is null
order by 1, 2;
