'use client';

import { useEffect, useState } from 'react';
import { api, Pipeline } from '@/lib/api';

export default function PipelinesPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPipelines();
  }, []);

  const loadPipelines = async () => {
    try {
      setLoading(true);
      const data = await api.getPipelines();
      setPipelines(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async (id: string) => {
    try {
      await api.executePipeline(id);
      alert('Pipeline execution started');
      await loadPipelines();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to execute pipeline');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pipeline?')) return;

    try {
      await api.deletePipeline(id);
      await loadPipelines();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete pipeline');
    }
  };

  const toggleEnabled = async (id: string, currentEnabled: boolean) => {
    try {
      await api.updatePipeline(id, { enabled: !currentEnabled });
      await loadPipelines();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update pipeline');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadPipelines}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Pipelines</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your ETL pipelines
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            {pipelines.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">No pipelines configured yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                        Name
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Source
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Target
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Schedule
                      </th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                        Status
                      </th>
                      <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {pipelines.map((pipeline) => (
                      <tr key={pipeline.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                          <div className="font-medium text-gray-900">
                            <a
                              href={`/pipelines/${pipeline.id}`}
                              className="hover:text-blue-600"
                            >
                              {pipeline.name}
                            </a>
                          </div>
                          {pipeline.description && (
                            <div className="text-gray-500 text-xs">
                              {pipeline.description}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {pipeline.source?.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {pipeline.target?.name}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {pipeline.scheduleCron || '-'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <button
                            onClick={() => toggleEnabled(pipeline.id, pipeline.enabled)}
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                              pipeline.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {pipeline.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                          <button
                            onClick={() => handleExecute(pipeline.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Execute
                          </button>
                          <button
                            onClick={() => handleDelete(pipeline.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
