const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DataSource {
  id: string;
  name: string;
  type: string;
  configJson: any;
  createdAt: string;
  updatedAt: string;
}

export interface DataTarget {
  id: string;
  name: string;
  type: string;
  configJson: any;
  createdAt: string;
  updatedAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  sourceId: string;
  targetId: string;
  transformScriptPath?: string;
  scheduleCron?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  source?: DataSource;
  target?: DataTarget;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  startedAt: string;
  finishedAt?: string;
  status: string;
  statsJson?: any;
  logPath?: string;
  errorMessage?: string;
}

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Sources
  async getSources(): Promise<DataSource[]> {
    return this.request<DataSource[]>('/api/sources');
  }

  async getSource(id: string): Promise<DataSource> {
    return this.request<DataSource>(`/api/sources/${id}`);
  }

  async createSource(data: Partial<DataSource>): Promise<DataSource> {
    return this.request<DataSource>('/api/sources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSource(id: string, data: Partial<DataSource>): Promise<DataSource> {
    return this.request<DataSource>(`/api/sources/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSource(id: string): Promise<void> {
    await this.request(`/api/sources/${id}`, { method: 'DELETE' });
  }

  // Targets
  async getTargets(): Promise<DataTarget[]> {
    return this.request<DataTarget[]>('/api/targets');
  }

  async getTarget(id: string): Promise<DataTarget> {
    return this.request<DataTarget>(`/api/targets/${id}`);
  }

  async createTarget(data: Partial<DataTarget>): Promise<DataTarget> {
    return this.request<DataTarget>('/api/targets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTarget(id: string, data: Partial<DataTarget>): Promise<DataTarget> {
    return this.request<DataTarget>(`/api/targets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTarget(id: string): Promise<void> {
    await this.request(`/api/targets/${id}`, { method: 'DELETE' });
  }

  // Pipelines
  async getPipelines(): Promise<Pipeline[]> {
    return this.request<Pipeline[]>('/api/pipelines');
  }

  async getPipeline(id: string): Promise<Pipeline> {
    return this.request<Pipeline>(`/api/pipelines/${id}`);
  }

  async createPipeline(data: Partial<Pipeline>): Promise<Pipeline> {
    return this.request<Pipeline>('/api/pipelines', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePipeline(id: string, data: Partial<Pipeline>): Promise<Pipeline> {
    return this.request<Pipeline>(`/api/pipelines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePipeline(id: string): Promise<void> {
    await this.request(`/api/pipelines/${id}`, { method: 'DELETE' });
  }

  async executePipeline(id: string): Promise<{ runId: string }> {
    return this.request<{ runId: string }>(`/api/pipelines/${id}/execute`, {
      method: 'POST',
    });
  }

  // Runs
  async getPipelineRuns(pipelineId: string): Promise<PipelineRun[]> {
    return this.request<PipelineRun[]>(`/api/pipelines/${pipelineId}/runs`);
  }

  async getRun(id: string): Promise<PipelineRun> {
    return this.request<PipelineRun>(`/api/runs/${id}`);
  }
}

export const api = new ApiClient();
