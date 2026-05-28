import type { DashboardData } from '../api';

interface Props {
  reviews: DashboardData['recentReviews'];
}

export function ReviewHistory({ reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <div className="card">
        <h2>Recent reviews</h2>
        <p style={{ color: 'var(--muted)' }}>No reviews yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Recent reviews</h2>
      <table>
        <thead>
          <tr>
            <th>Repository</th>
            <th>PR</th>
            <th>Comments</th>
            <th>Tokens</th>
            <th>Duration</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {reviews.map((r) => (
            <tr key={r.id}>
              <td>
                {r.repo_owner}/{r.repo_name}
              </td>
              <td>#{r.pr_number}</td>
              <td>{r.comments_posted}</td>
              <td>{r.tokens_used}</td>
              <td>{(r.duration_ms / 1000).toFixed(1)}s</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
