import { useCallback, useEffect, useState } from 'react';
import { fetchInstallation, type DashboardData, type RepoSettings } from './api';
import { UsageStats } from './components/UsageStats';
import { ReviewHistory } from './components/ReviewHistory';
import { RepoSettingsForm } from './components/RepoSettingsForm';

export default function App() {
  const [installationId, setInstallationId] = useState(
    () => localStorage.getItem('github_installation_id') ?? ''
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<RepoSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (id: number) => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchInstallation(id);
      setData(result);
      localStorage.setItem('github_installation_id', String(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = Number(installationId);
    if (!Number.isNaN(id) && id > 0) {
      void load(id);
    }
  }, []);

  function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const id = Number(installationId);
    if (Number.isNaN(id) || id <= 0) {
      setError('Enter a valid GitHub installation ID');
      return;
    }
    void load(id);
  }

  return (
    <>
      <h1>AI Code Reviewer</h1>
      <p className="subtitle">Per-repository rules, reviewer assignment, and usage analytics</p>

      <form className="config-bar card" onSubmit={handleConnect}>
        <div>
          <label htmlFor="installation-id">GitHub Installation ID</label>
          <input
            id="installation-id"
            value={installationId}
            onChange={(e) => setInstallationId(e.target.value)}
            placeholder="12345678"
          />
        </div>
        <div style={{ alignSelf: 'end' }}>
          <button type="submit" disabled={loading}>
            {loading ? 'Loading…' : 'Connect'}
          </button>
        </div>
      </form>

      {error && <div className="error">{error}</div>}

      {data && (
        <>
          <p style={{ marginBottom: '1rem', color: 'var(--muted)' }}>
            Account: <strong>{data.installation.account_login}</strong>
          </p>

          <UsageStats usage={data.usage} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card">
              <h2>Repositories</h2>
              <ul className="repo-list">
                {data.repos.length === 0 ? (
                  <li style={{ color: 'var(--muted)' }}>
                    No repo settings yet — reviews will auto-create settings on first PR.
                  </li>
                ) : (
                  data.repos.map((repo) => (
                    <li
                      key={repo.id}
                      className="repo-item"
                      onClick={() => setSelectedRepo(repo)}
                    >
                      <span>
                        {repo.repo_owner}/{repo.repo_name}
                      </span>
                      <span className={`badge ${repo.enabled ? 'enabled' : 'disabled'}`}>
                        {repo.enabled ? 'On' : 'Off'}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {selectedRepo ? (
              <RepoSettingsForm
                githubInstallationId={data.installation.github_installation_id}
                settings={selectedRepo}
                onSaved={(updated) => {
                  setSelectedRepo(updated);
                  setData((prev) =>
                    prev
                      ? {
                          ...prev,
                          repos: prev.repos.map((r) =>
                            r.id === updated.id ? updated : r
                          ),
                        }
                      : prev
                  );
                }}
              />
            ) : (
              <div className="card">
                <h2>Repository settings</h2>
                <p style={{ color: 'var(--muted)' }}>Select a repository to configure rules.</p>
              </div>
            )}
          </div>

          <ReviewHistory reviews={data.recentReviews} />
        </>
      )}
    </>
  );
}
