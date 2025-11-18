'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, Pipeline, PipelineRun } from '@/lib/api';

export default function PipelineDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPipeline();
      loadRuns();
    }
  }, [id]);

  const loadPipeline = async () => {
    try {
      const data = await api.getPipeline(id);
      setPipeline(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline');
    }
  };

  const loadRuns = async () => {
    try {
      setLoading(true);
      const data = await api.getPipelineRuns(id);
      setRuns(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    try {
      await api.executePipeline(id);
      alert('Pipeline execution started');
      // Refresh after a short delay
      setTimeout(() => {
        loadRuns();
      }, 1000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to execute pipeline');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !pipeline) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!pipeline) {
    return <div className="text-center py-12">Pipeline not found</div>;
  }

  return (
    <div className="px-4">
      <div className="mb-6">
        <a href="/pipelines" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to Pipelines
        </a>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{pipeline.name}</h1>
            {pipeline.description && (
              <p className="mt-1 text-sm text-gray-500">{pipeline.description}</p>
            )}
          </div>
          <button
            onClick={handleExecute}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Execute Now
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Source</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {pipeline.source?.name} ({pipeline.source?.type})
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Target</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {pipeline.target?.name} ({pipeline.target?.type})
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Schedule</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {pipeline.scheduleCron || 'Manual execution only'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                  pipeline.enabled
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {pipeline.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </dd>
          </div>
          {pipeline.transformScriptPath && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Transform Script</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {pipeline.transformScriptPath}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Pipeline Runs</h2>
        </div>

        {runs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No runs yet. Execute the pipeline to see results.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {runs.map((run) => {
                  const duration = run.finishedAt
                    ? Math.round(
                        (new Date(run.finishedAt).getTime() -
                          new Date(run.startedAt).getTime()) /
                          1000
                      )
                    : null;

                  return (
                    <tr key={run.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(run.startedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {duration !== null ? `${duration}s` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                            run.status
                          )}`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {run.statsJson && typeof run.statsJson === 'object' ? (
                          <div className="space-y-1">
                            {Object.entries(run.statsJson).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
