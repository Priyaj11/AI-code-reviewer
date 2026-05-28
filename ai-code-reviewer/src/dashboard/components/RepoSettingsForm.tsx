import { useState } from 'react';
import type { RepoSettings } from '../api';
import { updateRepoSettings } from '../api';

interface Props {
  githubInstallationId: number;
  settings: RepoSettings;
  onSaved: (settings: RepoSettings) => void;
}

export function RepoSettingsForm({ githubInstallationId, settings, onSaved }: Props) {
  const [enabled, setEnabled] = useState(settings.enabled);
  const [reviewLevel, setReviewLevel] = useState(settings.review_level);
  const [ignoredPaths, setIgnoredPaths] = useState(settings.ignored_paths.join('\n'));
  const [assignReviewer, setAssignReviewer] = useState(settings.assign_reviewer ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const { settings: updated } = await updateRepoSettings(
        githubInstallationId,
        settings.repo_owner,
        settings.repo_name,
        {
          enabled,
          review_level: reviewLevel,
          ignored_paths: ignoredPaths
            .split('\n')
            .map((p) => p.trim())
            .filter(Boolean),
          assign_reviewer: assignReviewer.trim() || null,
        }
      );
      onSaved(updated);
      setMessage('Settings saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h2>
        {settings.repo_owner}/{settings.repo_name}
      </h2>
      <form onSubmit={(e) => void handleSave(e)}>
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />{' '}
          Enable AI reviews for this repository
        </label>

        <label htmlFor="review-level">Review strictness</label>
        <select
          id="review-level"
          value={reviewLevel}
          onChange={(e) => setReviewLevel(e.target.value as RepoSettings['review_level'])}
        >
          <option value="light">Light — critical issues only</option>
          <option value="standard">Standard — bugs & security</option>
          <option value="strict">Strict — thorough review</option>
        </select>

        <label htmlFor="ignored-paths">Ignored path patterns (one per line)</label>
        <textarea
          id="ignored-paths"
          rows={4}
          value={ignoredPaths}
          onChange={(e) => setIgnoredPaths(e.target.value)}
          placeholder="docs/&#10;*.test.ts"
        />

        <label htmlFor="assign-reviewer">Auto-assign GitHub reviewer (username)</label>
        <input
          id="assign-reviewer"
          value={assignReviewer}
          onChange={(e) => setAssignReviewer(e.target.value)}
          placeholder="senior-engineer"
        />

        <button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
        {message && (
          <p style={{ marginTop: '0.75rem', color: 'var(--muted)', fontSize: '0.9rem' }}>{message}</p>
        )}
      </form>
    </div>
  );
}
