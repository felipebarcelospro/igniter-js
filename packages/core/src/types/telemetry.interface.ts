/**
 * Telemetry interfaces for the Igniter Router framework.
 * Provides observability through tracing, metrics, and events.
 * 
 * @since 0.2.0
 */

/**
 * Span individual para tracing distribuído.
 * Representa uma unidade de trabalho em um trace distribuído.
 */
export interface IgniterTelemetrySpan {
  /** Nome do span */
  readonly name: string;
  /** ID único do span */
  readonly id: string;
  /** ID do trace pai */
  readonly traceId: string;
  /** ID do span pai (se existir) */
  readonly parentId?: string;
  /** Timestamp de início */
  readonly startTime: number;
  /** Status do span */
  readonly status: 'active' | 'completed' | 'error';
  
  /** Adicionar tag/attribute ao span */
  setTag(key: string, value: string | number | boolean): void;
  /** Adicionar múltiplas tags ao span */
  setTags(tags: Record<string, string | number | boolean>): void;
  /** Marcar span como erro */
  setError(error: Error): void;
  /** Adicionar evento ao span */
  addEvent(name: string, data?: Record<string, any>): void;
  /** Finalizar span */
  finish(): void;
  /** Criar child span */
  child(name: string, options?: IgniterSpanOptions): IgniterTelemetrySpan;
  /** Obter contexto do span para propagação */
  getContext(): IgniterSpanContext;
}

/**
 * Contexto de span para propagação entre serviços.
 */
export interface IgniterSpanContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  baggage?: Record<string, string>;
}

/**
 * Timer para métricas de duração.
 */
export interface IgniterTimer {
  /** Nome da métrica */
  readonly name: string;
  /** Timestamp de início */
  readonly startTime: number;
  /** Tags associadas */
  readonly tags: Record<string, string>;
  
  /** Finalizar timer e registrar métrica */
  finish(additionalTags?: Record<string, string>): void;
  /** Obter duração atual em milissegundos */
  getDuration(): number;
}

/**
 * Provider principal de telemetria.
 * Interface unificada para diferentes provedores (OpenTelemetry, DataDog, Console).
 */
export interface IgniterTelemetryProvider {
  /** Configuração do provider */
  readonly config: IgniterTelemetryConfig;
  /** Nome do provider */
  readonly name: string;
  /** Status do provider */
  readonly status: 'active' | 'inactive' | 'error';
  
  // ==========================================
  // TRACING
  // ==========================================
  
  /** Iniciar novo span */
  startSpan(name: string, options?: IgniterSpanOptions): IgniterTelemetrySpan;
  /** Obter span ativo atual */
  getActiveSpan(): IgniterTelemetrySpan | null;
  /** Definir span como ativo */
  setActiveSpan(span: IgniterTelemetrySpan): void;
  /** Executar função com span ativo */
  withActiveSpan<T>(span: IgniterTelemetrySpan, fn: () => T): T;
  
  // ==========================================
  // METRICS
  // ==========================================
  
  /** Contador (incrementa) */
  increment(metric: string, value?: number, tags?: Record<string, string>): void;
  /** Decremento */
  decrement(metric: string, value?: number, tags?: Record<string, string>): void;
  /** Histograma (distribuição de valores) */
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  /** Gauge (valor atual) */
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
  /** Timer (duração) */
  timer(metric: string, tags?: Record<string, string>): IgniterTimer;
  /** Timing (registrar duração diretamente) */
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
  
  // ==========================================
  // EVENTS & LOGS
  // ==========================================
  
  /** Log structured event */
  event(name: string, data: Record<string, any>, level?: 'debug' | 'info' | 'warn' | 'error'): void;
  /** Log de erro estruturado */
  error(error: Error, context?: Record<string, any>): void;
  /** Log de warning estruturado */
  warn(message: string, context?: Record<string, any>): void;
  /** Log de info estruturado */
  info(message: string, context?: Record<string, any>): void;
  /** Log de debug estruturado */
  debug(message: string, context?: Record<string, any>): void;
  
  // ==========================================
  // LIFECYCLE
  // ==========================================
  
  /** Flush dados pendentes */
  flush(): Promise<void>;
  /** Shutdown graceful */
  shutdown(): Promise<void>;
  /** Health check do provider */
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details?: any }>;
}

/**
 * Configuração de telemetria.
 */
export interface IgniterTelemetryConfig {
  /** Nome do serviço */
  serviceName: string;
  /** Versão do serviço */
  serviceVersion?: string;
  /** Ambiente (development, staging, production) */
  environment?: 'development' | 'staging' | 'production';
  /** Taxa de amostragem (0-1) */
  sampleRate?: number;
  /** Habilitar tracing */
  enableTracing?: boolean;
  /** Habilitar métricas */
  enableMetrics?: boolean;
  /** Habilitar eventos/logs */
  enableEvents?: boolean;
  /** Tags globais aplicadas a todos os dados */
  tags?: Record<string, string>;
  /** Configurações específicas do provider */
  providerConfig?: Record<string, any>;
  /** Endpoint para exportar dados */
  endpoint?: string;
  /** Headers customizados para exportação */
  headers?: Record<string, string>;
  /** Timeout para operações de telemetria */
  timeout?: number;
  /** Buffer size para batching */
  bufferSize?: number;
  /** Intervalo de flush em milissegundos */
  flushInterval?: number;
}

/**
 * Opções para criação de spans.
 */
export interface IgniterSpanOptions {
  /** Span pai */
  parent?: IgniterTelemetrySpan;
  /** Contexto de span pai para propagação */
  parentContext?: IgniterSpanContext;
  /** Tags iniciais */
  tags?: Record<string, string | number | boolean>;
  /** Timestamp de início customizado */
  startTime?: number;
  /** Tipo de operação */
  operation?: 'http' | 'job' | 'db' | 'cache' | 'custom' | 'middleware' | 'procedure';
  /** Nível de importância */
  level?: 'critical' | 'important' | 'normal' | 'debug';
  /** Se deve ser amostrado */
  sampled?: boolean;
}

/**
 * Context enriquecido com telemetria.
 * Adicionado ao contexto existente quando telemetria está habilitada.
 */
export interface IgniterContextWithTelemetry<TContext extends object> {
  /** Provider de telemetria */
  telemetry?: IgniterTelemetryProvider;
  /** Span ativo atual */
  span?: IgniterTelemetrySpan;
  /** Contexto de trace para propagação */
  traceContext?: IgniterSpanContext;
}

/**
 * Evento de telemetria para CLI integration.
 */
export interface TelemetryEvent {
  /** ID único do evento */
  id: string;
  /** Timestamp do evento */
  timestamp: Date;
  /** Tipo do evento */
  type: 'span' | 'metric' | 'event' | 'log';
  /** Nome do evento */
  name: string;
  /** Operação relacionada */
  operation: 'http' | 'job' | 'db' | 'cache' | 'custom' | 'middleware' | 'procedure';
  /** Duração (se aplicável) */
  duration?: number;
  /** Status */
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  /** Tags/metadata */
  tags: Record<string, string | number | boolean>;
  /** Dados específicos do evento */
  data?: any;
  /** Erro (se houver) */
  error?: string;
  /** ID do span pai */
  parentId?: string;
  /** ID do trace */
  traceId?: string;
  /** Nível de severidade */
  level?: 'debug' | 'info' | 'warn' | 'error' | 'critical';
}

/**
 * Métricas agregadas para dashboards.
 */
export interface TelemetryMetrics {
  /** Timestamp da coleta */
  timestamp: Date;
  /** Período de agregação em segundos */
  period: number;
  
  // HTTP Metrics
  http: {
    /** Total de requests */
    requestCount: number;
    /** Requests por segundo */
    requestRate: number;
    /** Latência média */
    avgLatency: number;
    /** Latência p95 */
    p95Latency: number;
    /** Latência p99 */
    p99Latency: number;
    /** Taxa de erro */
    errorRate: number;
    /** Distribuição por status code */
    statusCodes: Record<string, number>;
    /** Distribuição por método */
    methods: Record<string, number>;
  };
  
  // Job Metrics
  jobs: {
    /** Total de jobs processados */
    jobCount: number;
    /** Jobs por segundo */
    jobRate: number;
    /** Jobs ativos */
    activeJobs: number;
    /** Jobs na fila */
    queuedJobs: number;
    /** Taxa de sucesso */
    successRate: number;
    /** Taxa de falha */
    failureRate: number;
    /** Tempo médio de processamento */
    avgProcessingTime: number;
    /** Distribuição por status */
    statuses: Record<string, number>;
  };
  
  // System Metrics
  system: {
    /** Uso de CPU (%) */
    cpuUsage?: number;
    /** Uso de memória (bytes) */
    memoryUsage?: number;
    /** Spans ativos */
    activeSpans: number;
    /** Total de spans */
    totalSpans: number;
    /** Eventos por segundo */
    eventRate: number;
  };
}

/**
 * Configuração para CLI telemetry integration.
 */
export interface CliTelemetryConfig {
  /** Porta do WebSocket server */
  websocketPort?: number;
  /** Tamanho do buffer */
  bufferSize?: number;
  /** Intervalo de refresh em milissegundos */
  refreshInterval?: number;
  /** Habilitar agregação de métricas */
  enableMetrics?: boolean;
  /** Período de agregação de métricas em segundos */
  metricsAggregationPeriod?: number;
  /** Máximo de eventos no buffer */
  maxEvents?: number;
  /** Filtros de eventos */
  eventFilters?: {
    operations?: string[];
    levels?: string[];
    minDuration?: number;
  };
}

/**
 * Factory function type para criar telemetry providers.
 */
export type TelemetryProviderFactory<TConfig = any> = (
  config: IgniterTelemetryConfig & TConfig
) => IgniterTelemetryProvider | Promise<IgniterTelemetryProvider>;

/**
 * Utility types para inferência de tipos.
 */
export type InferTelemetryProvider<T> = 
  T extends IgniterTelemetryProvider ? T : never;

export type InferTelemetryConfig<T> = 
  T extends IgniterTelemetryProvider ? T['config'] : never;

/**
 * Constantes para operações padronizadas.
 */
export const TELEMETRY_OPERATIONS = {
  HTTP: 'http',
  JOB: 'job',
  DATABASE: 'db',
  CACHE: 'cache',
  MIDDLEWARE: 'middleware',
  PROCEDURE: 'procedure',
  CUSTOM: 'custom'
} as const;

/**
 * Constantes para níveis de log.
 */
export const TELEMETRY_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

/**
 * Constantes para status de spans.
 */
export const SPAN_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ERROR: 'error'
} as const; 