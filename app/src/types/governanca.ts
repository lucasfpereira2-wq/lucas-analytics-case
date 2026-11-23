// CONTRATO dos JSONs de governança (app/public/data/governanca/*). Não alterar sem avisar o orquestrador.

export type Status = 'verde' | 'amarelo' | 'vermelho';
export type Camada = 'staging' | 'core' | 'mart';
export type Criticidade = 'alta' | 'media' | 'baixa';
export type StatusExecucao = 'sucesso' | 'alerta' | 'falha' | 'atrasada' | 'nao_executou' | 'sem_agenda';
export type ResultadoTeste = 'ok' | 'alerta' | 'falha';
export type NivelSelo = 'confiavel' | 'atencao' | 'critico';

/** meta.json (app/public/data/meta.json) */
export interface Meta {
  data_referencia: string; // ISO com fuso, "agora" do portal
  inicio_historico: string; // YYYY-MM-DD
  fim_historico: string; // YYYY-MM-DD (D-1)
  seed: number;
  segmentos: string[];
  canais_venda: string[];
  canais_atendimento: string[];
  canais_cobranca: string[];
  faixas_atraso: string[];
  regionais: { nome: string; ufs: string[] }[];
  ufs: { sigla: string; nome: string; regional: string }[];
  /** participação da UF dentro da sua regional (soma 1 por regional); usada para alocar cubos sem dimensão uf */
  pesos_uf: Record<string, number>;
  /** participação de cada regional no total (soma 1); usada em cubos sem uf nem regional (ex.: Atendimento) */
  pesos_regional: Record<string, number>;
  relatorios: { id: string; titulo: string; rota: string; mart: string }[];
}

/** governanca/catalogo.json */
export interface Catalogo {
  dias: string[]; // 30 datas YYYY-MM-DD, da mais antiga para a mais recente
  tabelas: TabelaResumo[];
}

export interface TabelaResumo {
  nome: string;
  descricao: string;
  dominio: string;
  camada: Camada;
  dono: string | null; // null = sem dono definido
  dono_area: string | null;
  criticidade: Criticidade;
  frequencia: string; // diária | horária | semanal | mensal
  sla_horas: number;
  pipeline: string;
  fonte: string | null; // sistema-fonte, quando staging/legado
  status: Status;
  motivo_status: string; // frase curta; "No SLA e testes OK" quando verde
  tem_pk: boolean;
  saude: number; // 0–100
  ultima_carga: string | null; // ISO
  atraso_horas: number; // horas além do SLA (0 quando dentro)
  linhas: number;
  testes_total: number;
  testes_falhando: number;
  testes_alerta: number;
  execucoes_30d: StatusExecucao[]; // alinhado a Catalogo.dias
  relatorios_impactados: string[]; // ids de relatório a jusante
  incidentes: string[]; // ids
  tags: string[]; // ex.: 'PII', 'LGPD', 'legado', 'manual', 'sem dono'
}

/** governanca/tabelas/<nome>.json */
export interface TabelaDetalhe extends TabelaResumo {
  descricao_longa: string;
  colunas: Coluna[];
  execucoes: Execucao[]; // 30 dias, da mais antiga para a mais recente
  testes: TesteQualidade[];
  amostra: {
    colunas: string[];
    linhas: { valores: (string | number | null)[]; problema?: string; colunas_problema?: string[] }[];
  };
  upstream: string[]; // diretos
  downstream: string[]; // diretos
}

export interface Coluna {
  nome: string;
  tipo: string;
  descricao: string;
  pk: boolean;
  fk?: { tabela: string; coluna: string };
  nulavel: boolean;
  pii: boolean; // dado pessoal (LGPD)
}

export interface Execucao {
  data: string; // YYYY-MM-DD
  inicio: string | null; // ISO
  duracao_seg: number | null;
  linhas: number | null;
  linhas_esperadas: number;
  status: StatusExecucao;
  anomalia_volume: boolean;
  mensagem?: string;
}

export type RegraQualidade =
  | 'pk_existente'
  | 'unicidade'
  | 'nao_nulo'
  | 'integridade_referencial'
  | 'volume'
  | 'frescor'
  | 'schema_drift'
  | 'reconciliacao'
  | 'dominio_valores';

export interface TesteQualidade {
  id: string;
  regra: RegraQualidade;
  nome: string;
  coluna?: string;
  severidade: 'critico' | 'alto' | 'medio' | 'baixo';
  resultado: ResultadoTeste;
  evidencia: string; // ex.: "312 registros duplicados em `id_parcela`"
  valor_observado?: number;
  limite?: number;
  unidade?: string;
  historico_7d: ResultadoTeste[];
  sql?: string;
}

/** governanca/linhagem.json */
export interface Linhagem {
  nos: {
    id: string;
    tipo: 'fonte' | 'tabela' | 'relatorio';
    rotulo: string;
    camada?: Camada;
    dominio?: string;
    status?: Status;
    nivel_selo?: NivelSelo; // quando tipo = relatorio
    rota?: string; // quando tipo = relatorio
  }[];
  arestas: { de: string; para: string }[];
}

/** governanca/pipelines.json */
export interface Pipeline {
  id: string;
  nome: string;
  descricao: string;
  orquestrador: string;
  agenda: string; // legível: "Diária às 02:00"
  agenda_cron: string;
  dono: string | null;
  tabelas: string[];
  status: Status;
  ultima_execucao: { inicio: string | null; duracao_seg: number | null; status: StatusExecucao; mensagem?: string };
  taxa_sucesso_30d: number; // 0–100
  duracao_media_seg: number;
  falhas_30d: number;
  falhas_recorrentes: { erro: string; ocorrencias: number; ultima: string }[];
  execucoes_30d: { data: string; status: StatusExecucao; duracao_seg: number | null }[];
}

/** governanca/saude.json */
export interface Saude {
  indice_geral: number;
  variacao_7d: number; // pontos
  variacao_30d: number;
  tendencia_30d: { data: string; indice: number }[];
  dimensoes: { nome: string; indice: number; descricao: string }[]; // completude, unicidade, frescor, integridade, conformidade
  por_dominio: { dominio: string; indice: number; tabelas: number; verde: number; amarelo: number; vermelho: number }[];
  por_camada: { camada: Camada; indice: number; tabelas: number; verde: number; amarelo: number; vermelho: number }[];
  contagem: { verde: number; amarelo: number; vermelho: number; total: number };
  rotinas_total: number;
  rotinas_falharam_hoje: number;
  testes_total: number;
  testes_falhando: number;
  testes_alerta: number;
  relatorios_total: number;
  relatorios_impactados: number;
  tabelas_sem_pk: number;
  tabelas_sem_dono: number;
  formula: { nome: string; peso: number; descricao: string }[];
  /** projeção usada no Plano de 90 dias */
  projecao_90d: { dia: number; indice: number; marco?: string }[];
}

/** governanca/incidentes.json (ordenado por prioridade) */
export interface Incidente {
  id: string;
  prioridade: number;
  titulo: string;
  tabela: string;
  tipo: string;
  severidade: 'critico' | 'alto' | 'medio';
  situacao: 'aberto' | 'em_analise' | 'mitigado';
  detectado_em: string; // ISO
  inicio_estimado: string; // ISO
  resumo_tecnico: string;
  impacto_negocio: string;
  causa_raiz: string;
  acao_recomendada: string;
  tabelas_afetadas: string[]; // a jusante
  relatorios_afetados: { id: string; titulo: string; efeito: string }[];
  metricas: { rotulo: string; valor: string }[];
}

/** governanca/selos.json — Record<idRelatorio, Selo> */
export interface Selo {
  relatorio: string;
  nivel: NivelSelo;
  titulo: string; // "Dados confiáveis" | "Atenção" | "Dados com problema crítico"
  mensagem: string; // nomes de tabela entre crases, ex.: "... usa `fato_parcelas`, que contém ..."
  tabela_principal: string | null; // destino do link no Farol
  atualizado_em: string; // ISO (última carga do mart)
  horas_desde_atualizacao: number;
  problemas: { tabela: string; status: Status; incidente?: string; texto: string; impacto_estimado?: string }[];
  tabelas_fonte: string[]; // todo o upstream do relatório
}

/** governanca/glossario.json */
export interface TermoGlossario {
  termo: string;
  sigla?: string;
  definicao: string;
  formula?: string;
  dominio: string;
  tabelas: string[];
  relatorios: string[];
  dono: string;
}
