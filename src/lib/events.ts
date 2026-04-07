import { EventEmitter } from "node:events";
import type {
  SessionStartEvent,
  PlannerCompleteEvent,
  FeatureStartEvent,
  FeatureCompleteEvent,
  ValidatorResultEvent,
  EvaluatorResultEvent,
  CostUpdateEvent,
  SessionCompleteEvent,
  SessionErrorEvent,
} from "./types.js";

export interface EngineEventMap {
  sessionStart: [SessionStartEvent];
  plannerComplete: [PlannerCompleteEvent];
  featureStart: [FeatureStartEvent];
  featureComplete: [FeatureCompleteEvent];
  validatorResult: [ValidatorResultEvent];
  evaluatorResult: [EvaluatorResultEvent];
  costUpdate: [CostUpdateEvent];
  sessionComplete: [SessionCompleteEvent];
  sessionError: [SessionErrorEvent];
}

export class TypedEmitter extends EventEmitter {
  override emit<K extends keyof EngineEventMap>(
    event: K,
    ...args: EngineEventMap[K]
  ): boolean {
    return super.emit(event, ...args);
  }

  override on<K extends keyof EngineEventMap>(
    event: K,
    listener: (...args: EngineEventMap[K]) => void
  ): this {
    return super.on(event, listener as (...args: unknown[]) => void);
  }
}
