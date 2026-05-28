import type { UsageStats as Stats } from '../api';

interface Props {
  usage: Stats;
}

export function UsageStats({ usage }: Props) {
  return (
    <div className="card">
      <h2>Usage (last 30 days)</h2>
      <div className="stats-grid">
        <div className="stat">
          <div className="stat-value">{usage.total_reviews}</div>
          <div className="stat-label">Reviews</div>
        </div>
        <div className="stat">
          <div className="stat-value">{usage.total_comments}</div>
          <div className="stat-label">Comments posted</div>
        </div>
        <div className="stat">
          <div className="stat-value">{usage.total_tokens.toLocaleString()}</div>
          <div className="stat-label">Tokens used</div>
        </div>
        <div className="stat">
          <div className="stat-value">{(usage.avg_duration_ms / 1000).toFixed(1)}s</div>
          <div className="stat-label">Avg duration</div>
        </div>
      </div>
    </div>
  );
}
