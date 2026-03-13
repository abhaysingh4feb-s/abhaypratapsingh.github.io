import { ImpactMetric } from "@/lib/projects";

interface ImpactMetricsProps {
  metrics: ImpactMetric[];
}

export default function ImpactMetrics({ metrics }: ImpactMetricsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6">
      {metrics.map((m) => (
        <div
          key={m.metric}
          className="text-center p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--card-border)]"
        >
          <div className="text-xl md:text-2xl font-bold gradient-text">
            {m.result}
          </div>
          <div className="mt-1 text-xs text-[var(--text-secondary)]">
            {m.metric}
          </div>
        </div>
      ))}
    </div>
  );
}
