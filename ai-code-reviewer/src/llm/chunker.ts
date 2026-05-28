export interface FileDiff {
  filename: string;
  patch: string;
  additions: number;
  deletions: number;
  status?: string;
}

export interface Chunk {
  files: FileDiff[];
  estimatedTokens: number;
}

/** Conservative limit leaving room for system prompt + JSON response. */
export const MAX_TOKENS_PER_CHUNK = 6000;

/** ~4 characters per token for source code (rough heuristic). */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitPatchByLines(patch: string, maxTokens: number): string[] {
  const lines = patch.split('\n');
  const parts: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const line of lines) {
    const lineTokens = estimateTokens(line);
    if (currentTokens + lineTokens > maxTokens && current.length > 0) {
      parts.push(current.join('\n'));
      current = [];
      currentTokens = 0;
    }
    current.push(line);
    currentTokens += lineTokens;
  }

  if (current.length > 0) {
    parts.push(current.join('\n'));
  }

  return parts.length > 0 ? parts : [patch];
}

export function chunkDiff(files: FileDiff[], maxTokensPerChunk = MAX_TOKENS_PER_CHUNK): Chunk[] {
  const chunks: Chunk[] = [];
  let currentChunk: FileDiff[] = [];
  let currentTokens = 0;

  for (const file of files) {
    const headerOverhead = estimateTokens(file.filename) + 32;
    const fileTokens = estimateTokens(file.patch) + headerOverhead;

    if (fileTokens > maxTokensPerChunk) {
      if (currentChunk.length > 0) {
        chunks.push({ files: currentChunk, estimatedTokens: currentTokens });
        currentChunk = [];
        currentTokens = 0;
      }

      const subPatches = splitPatchByLines(file.patch, maxTokensPerChunk - headerOverhead);
      for (let i = 0; i < subPatches.length; i++) {
        const part: FileDiff = {
          ...file,
          filename: subPatches.length > 1 ? `${file.filename} (part ${i + 1}/${subPatches.length})` : file.filename,
          patch: subPatches[i],
        };
        chunks.push({
          files: [part],
          estimatedTokens: estimateTokens(part.patch) + headerOverhead,
        });
      }
      continue;
    }

    if (currentTokens + fileTokens > maxTokensPerChunk && currentChunk.length > 0) {
      chunks.push({ files: currentChunk, estimatedTokens: currentTokens });
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(file);
    currentTokens += fileTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push({ files: currentChunk, estimatedTokens: currentTokens });
  }

  return chunks;
}

/** Aggregate token estimate for billing/analytics. */
export function totalEstimatedTokens(chunks: Chunk[]): number {
  return chunks.reduce((sum, c) => sum + c.estimatedTokens, 0);
}
