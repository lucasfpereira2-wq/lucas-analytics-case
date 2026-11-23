// CONTRATO dos JSONs de relatório (app/public/data/relatorios/<id>.json). Formato colunar, autodescritivo.

export type FormatoMedida = 'int' | 'brl' | 'pct' | 'dec' | 'seg';

export interface DimCubo {
  nome: string; // 'data' (YYYY-MM-DD) | 'mes' (YYYY-MM) | 'segmento' | 'uf' | 'regional' | 'canal' | ...
  rotulo: string;
  valores: string[]; // dicionário; colunas[nome] guarda o ÍNDICE neste array
}

export interface MedidaCubo {
  nome: string;
  rotulo: string;
  formato: FormatoMedida;
  /** fluxo = soma no tempo; estoque = fotografia (usar a última data do período/bucket, nunca somar datas) */
  tipo: 'fluxo' | 'estoque';
}

export interface Cubo {
  id: string;
  descricao: string;
  dims: DimCubo[];
  medidas: MedidaCubo[];
  n: number; // número de linhas
  /** uma coluna por dimensão (índices) e por medida (valores); todas com tamanho n */
  colunas: Record<string, number[]>;
}

export interface DadosRelatorio {
  relatorio: string;
  gerado_em: string;
  cubos: Record<string, Cubo>;
  /** tabelas auxiliares pequenas (ex.: cadastro de vendedores, grupos, notas do cenário) */
  extras: Record<string, unknown>;
}

/**
 * Regra de filtros (válida para todos os relatórios):
 * - filtro de dimensão presente no cubo: aplica nativamente;
 * - filtro de UF em cubo que só tem `regional`: filtra a regional da UF e multiplica as medidas por meta.pesos_uf[uf];
 * - cubo sem `uf` e sem `regional`: multiplica por meta.pesos_regional[regional] (e por pesos_uf[uf], se houver UF);
 * - filtro de regional em cubo que só tem `uf`: mapeia UF -> regional via meta.ufs;
 * - razões (ticket médio, TMA, % inadimplência, NPS) NUNCA vêm prontas: são calculadas no front a partir de
 *   numerador e denominador aditivos.
 */
