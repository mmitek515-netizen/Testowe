/**
 * SPAA: Spherical, Polymorphic, Asynchronous, Asymmetric worker orchestration.
 * "Spherical" means a unified, multi-source snapshot, not literal omniscience.
 * This module contains no privileged shell execution.
 */
export type WorkerKind = 'observer' | 'diagnostic' | 'analysis' | 'integration';
export type WorkerState = 'idle' | 'running' | 'completed' | 'failed';
export interface SPAAWorker {
  id: string;
  agent: 'astyria' | 'aurelius' | 'alex' | 'aria';
  kinds: WorkerKind[];
  state: WorkerState;
  lastUpdated: string;
  lastError?: string;
}
export interface Observation {
  source: string;
  collectedAt: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}
export type ObservationSource = () => Promise<unknown>;

export class SphericalObserver {
  private readonly sources = new Map<string, ObservationSource>();
  register(name: string, source: ObservationSource) {
    if (!name || this.sources.has(name)) throw new Error('Duplicate or empty observation source');
    this.sources.set(name, source);
  }
  async snapshot(timeoutMs = 5000): Promise<Observation[]> {
    return Promise.all([...this.sources].map(async ([name, source]) => {
      try {
        const data = await Promise.race([
          source(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Observation timeout')), timeoutMs))
        ]);
        return { source: name, collectedAt: new Date().toISOString(), ok: true, data };
      } catch (error) {
        return { source: name, collectedAt: new Date().toISOString(), ok: false, error: String(error) };
      }
    }));
  }
}

export class SPAAOrchestrator {
  private readonly workers = new Map<string, SPAAWorker>();
  private readonly active = new Set<string>();
  constructor(private readonly maxConcurrent = 4) {}
  register(worker: Omit<SPAAWorker, 'state' | 'lastUpdated'>) {
    if (this.workers.has(worker.id)) throw new Error('Worker already registered');
    this.workers.set(worker.id, { ...worker, state: 'idle', lastUpdated: new Date().toISOString() });
  }
  list(): SPAAWorker[] { return [...this.workers.values()].map(w => ({ ...w, kinds: [...w.kinds] })); }
  async execute<T>(id: string, kind: WorkerKind, action: () => Promise<T>): Promise<T> {
    const worker = this.workers.get(id);
    if (!worker) throw new Error('Unknown worker');
    if (!worker.kinds.includes(kind)) throw new Error('Worker does not support this task type');
    if (this.active.has(id)) throw new Error('Worker already busy');
    if (this.active.size >= this.maxConcurrent) throw new Error('Concurrency limit reached');
    this.active.add(id);
    worker.state = 'running'; worker.lastUpdated = new Date().toISOString(); delete worker.lastError;
    try {
      const result = await action();
      worker.state = 'completed';
      return result;
    } catch (error) {
      worker.state = 'failed'; worker.lastError = String(error);
      throw error;
    } finally {
      worker.lastUpdated = new Date().toISOString();
      this.active.delete(id);
    }
  }
}
