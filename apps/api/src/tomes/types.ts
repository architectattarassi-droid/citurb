export type OrchestratorContext = {
  project_id: string;
  action: string;
  payload: Record<string, unknown>;

  // enriched progressively
  now: string;
  trace_id: string;
  state?: string;
  door?: number;
  actor_id?: string;
  role?: string;
  entitlements?: string[];

  // outputs
  result?: any;
};

export interface TomeHandler {
  readonly tome: string;
  handle(ctx: OrchestratorContext): Promise<OrchestratorContext>;
}
