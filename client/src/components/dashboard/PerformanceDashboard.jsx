import { useState, useEffect, useRef } from 'react';
import { request } from '../../lib/afterlink.js';
import { useUIStore } from '../../stores/uiStore.js';
import { X, Activity } from 'lucide-react';

export function PerformanceDashboard() {
  const { togglePerformance } = useUIStore();
  const [stats, setStats] = useState({
    connections: 0,
    requestsPerMinute: 0,
    errorRate: 0,
    uptime: 0,
    latency: [],
  });
  const latencyRef = useRef([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const start = Date.now();
        const res = await request('__health.stats', {});
        const latency = Date.now() - start;
        if (res) {
          setStats((prev) => {
            const latencies = [...latencyRef.current.slice(-59), latency];
            latencyRef.current = latencies;
            return {
              connections: res.connections || 0,
              requestsPerMinute: res.requestsPerMinute || 0,
              errorRate: res.errorRate || 0,
              uptime: res.uptime || 0,
              latency: latencies,
            };
          });
        }
      } catch {}
    };

    fetchStats();
    intervalRef.current = setInterval(fetchStats, 1000);

    return () => clearInterval(intervalRef.current);
  }, []);

  const avgLatency = stats.latency.length > 0
    ? (stats.latency.reduce((a, b) => a + b, 0) / stats.latency.length).toFixed(1)
    : 0;

  const messagesPerSec = (stats.requestsPerMinute / 60).toFixed(1);

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-dark-surface rounded-xl border border-dark-bg shadow-2xl z-50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-bg">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-primary" />
          <span className="text-sm font-medium text-white">Performance (Dev Mode)</span>
        </div>
        <button onClick={togglePerformance} className="text-gray-400 hover:text-white transition">
          <X size={16} />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Messages/sec" value={messagesPerSec} />
          <MetricCard label="Avg Latency" value={`${avgLatency}ms`} color={parseFloat(avgLatency) < 5 ? 'text-green-500' : 'text-yellow-500'} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Connections" value={stats.connections} />
          <MetricCard label="Error Rate" value={`${(stats.errorRate * 100).toFixed(1)}%`} color={stats.errorRate < 0.01 ? 'text-green-500' : 'text-red-500'} />
        </div>
        <div className="h-12 flex items-end gap-0.5">
          {stats.latency.slice(-30).map((l, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/30 rounded-t"
              style={{ height: `${Math.min(l * 2, 100)}%` }}
              title={`${l.toFixed(0)}ms`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-dark-bg rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
