export interface DomainEvent {
  type: string;
  timestamp: Date;
  aggregateId?: string;
  payload: Record<string, any>;
}

export interface PipelineEvent extends DomainEvent {
  pipelineId: string;
  pipelineName: string;
}

export interface PipelineStartedEvent extends PipelineEvent {
  type: 'pipeline.started';
  triggeredBy: string;
}

export interface PipelineCompletedEvent extends PipelineEvent {
  type: 'pipeline.completed';
  runId: string;
  duration: number;
  rowsProcessed: number;
}

export interface PipelineFailedEvent extends PipelineEvent {
  type: 'pipeline.failed';
  runId: string;
  error: string;
  duration: number;
}

export interface DataQualityCheckEvent extends DomainEvent {
  type: 'data_quality.check';
  runId: string;
  ruleId: string;
  passed: boolean;
  score?: number;
}

export interface ConnectionTestEvent extends DomainEvent {
  type: 'connection.test';
  sourceId?: string;
  targetId?: string;
  status: 'success' | 'failed';
  responseTimeMs?: number;
}

export type ETLDomainEvent =
  | PipelineStartedEvent
  | PipelineCompletedEvent
  | PipelineFailedEvent
  | DataQualityCheckEvent
  | ConnectionTestEvent;
