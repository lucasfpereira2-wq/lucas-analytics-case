"""Executa a esteira completa: simulação de negócio -> motor de governança -> DDL -> validações.

Uso: python3 data-engineering/run_all.py
"""
from __future__ import annotations

import subprocess
import sys
import time
from pathlib import Path

RAIZ = Path(__file__).resolve().parent


def etapa(titulo: str, script: Path, obrigatoria: bool = True) -> bool:
    print(f"\n=== {titulo} ===", flush=True)
    if not script.exists():
        print(f"(pulado: {script.relative_to(RAIZ)} ainda não existe)")
        return not obrigatoria
    t0 = time.time()
    r = subprocess.run([sys.executable, str(script)], cwd=str(RAIZ))
    print(f"--- {titulo}: {'ok' if r.returncode == 0 else 'FALHOU'} em {time.time() - t0:.1f}s", flush=True)
    return r.returncode == 0


def main() -> int:
    ok = etapa("1/4 Simulação de negócio (cubos dos relatórios)", RAIZ / "simulacao" / "main.py")
    if not ok:
        return 1
    ok_gov = etapa("2/4 Motor de governança (catálogo, testes, linhagem, selos)", RAIZ / "governanca" / "gerar.py", obrigatoria=False)
    ok_ddl = etapa("3/4 DDL das 80 tabelas", RAIZ / "sql" / "gerar_ddl.py", obrigatoria=False)
    ok_val = etapa("4/4 Validação e reconciliação dos relatórios", RAIZ / "tests" / "validar_relatorios.py")
    outros = sorted(p for p in (RAIZ / "tests").glob("validar_*.py") if p.name != "validar_relatorios.py")
    ok_out = all([etapa(f"Extra: {p.name}", p, obrigatoria=False) for p in outros]) if ok_gov else True
    tudo = ok_gov and ok_ddl and ok_val and ok_out
    print("\n" + ("TUDO OK" if tudo else "HÁ FALHAS: veja as etapas acima"))
    return 0 if tudo else 1


if __name__ == "__main__":
    sys.exit(main())
