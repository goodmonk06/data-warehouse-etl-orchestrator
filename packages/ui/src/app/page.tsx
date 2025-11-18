export default function Home() {
  return (
    <div className="px-4 py-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to ETL Orchestrator
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Centralize ETL from various app databases and APIs into your data warehouse
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <a
            href="/sources"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Data Sources</h3>
            <p className="text-gray-600">
              Configure connections to databases and APIs
            </p>
          </a>

          <a
            href="/targets"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Data Targets</h3>
            <p className="text-gray-600">
              Set up warehouse destinations
            </p>
          </a>

          <a
            href="/pipelines"
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Pipelines</h3>
            <p className="text-gray-600">
              Create and manage ETL pipelines
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
