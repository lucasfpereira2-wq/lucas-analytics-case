"""Gera um arquivo DDL por tabela em sql/ddl/ a partir de catalog/schemas.py (SCHEMAS) e catalog/tabelas.py.

Interface esperada: SCHEMAS: dict[str, list[dict]], cada coluna com
nome, tipo, descricao, pk, fk ((tabela, coluna) ou None), nulavel, pii.
Tabelas sem PK (achado de governança) recebem um comentário de alerta em vez da constraint.
"""
from __future__ import annotations

import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(RAIZ))
from catalog import tabelas  # noqa: E402

DIR_DDL = Path(__file__).resolve().parent / "ddl"
ESQUEMA = {"staging": "staging", "core": "core", "mart": "marts"}


def _lit(txt: str) -> str:
    return str(txt).replace("'", "''")


def ddl_tabela(t: dict, colunas: list[dict]) -> str:
    esquema = ESQUEMA[t["camada"]]
    nome = f"{esquema}.{t['nome']}"
    dono = f"{t['dono']} ({t['dono_area']})" if t["dono"] else "SEM DONO DEFINIDO"
    linhas = [
        f"-- {nome}",
        f"-- {t['descricao']}",
        f"-- Domínio: {t['dominio']} | Camada: {t['camada']} | Dono: {dono}",
        f"-- Rotina: {t['pipeline']} | Frequência: {t['frequencia']} | SLA: {t['sla_horas']}h",
        "-- Gerado por sql/gerar_ddl.py a partir de catalog/schemas.py. Não editar à mão.",
        "",
        f"create table if not exists {nome} (",
    ]
    larg = max(len(c["nome"]) for c in colunas)
    larg_t = max(len(c["tipo"]) for c in colunas)
    defs = []
    for c in colunas:
        nulo = "" if c.get("nulavel", True) and not c.get("pk") else " not null"
        defs.append(f"    {c['nome']:<{larg}}  {c['tipo']:<{larg_t}}{nulo}".rstrip())
    pks = [c["nome"] for c in colunas if c.get("pk")]
    if pks:
        defs.append(f"    constraint pk_{t['nome']} primary key ({', '.join(pks)})")
    for c in colunas:
        fk = c.get("fk")
        if fk:
            tab_fk, col_fk = fk
            esq_fk = ESQUEMA[tabelas.POR_NOME[tab_fk]["camada"]] if tab_fk in tabelas.POR_NOME else esquema
            defs.append(f"    constraint fk_{t['nome']}_{c['nome']} foreign key ({c['nome']}) references {esq_fk}.{tab_fk} ({col_fk})")
    linhas.append(",\n".join(defs))
    linhas.append(");")
    if not pks:
        linhas += ["", "-- ATENÇÃO: tabela sem chave primária definida (achado de governança; ver Farol de Dados)."]
    linhas += ["", f"comment on table {nome} is '{_lit(t['descricao'])}';"]
    for c in colunas:
        desc = c.get("descricao", "")
        if c.get("pii"):
            desc = f"[PII/LGPD] {desc}"
        linhas.append(f"comment on column {nome}.{c['nome']} is '{_lit(desc)}';")
    return "\n".join(linhas) + "\n"


def main() -> int:
    try:
        from catalog import schemas
    except ImportError:
        print("catalog/schemas.py ainda não existe: DDL não gerada (rode novamente depois).")
        return 0
    DIR_DDL.mkdir(parents=True, exist_ok=True)
    for antigo in DIR_DDL.glob("*.sql"):
        antigo.unlink()
    n = 0
    for t in tabelas.TABELAS:
        colunas = schemas.SCHEMAS.get(t["nome"])
        if not colunas:
            print(f"  aviso: sem schema para {t['nome']}")
            continue
        (DIR_DDL / f"{t['nome']}.sql").write_text(ddl_tabela(t, colunas), encoding="utf-8")
        n += 1
    print(f"DDL gerada: {n} tabelas em {DIR_DDL.relative_to(RAIZ.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
