import { TOP_SCORES_COUNT } from './constants.js';

// Pure rules of the top scores table (best first, at most TOP_SCORES_COUNT
// entries). score.js keeps the table itself and saves it.

// A score of 0 never enters. A full table must be beaten, not just tied.
export function qualifiesForTopScores(topScores, score) {
  if (score <= 0) {
    return false;
  }
  if (topScores.length < TOP_SCORES_COUNT) {
    return true;
  }
  return score > topScores[topScores.length - 1].score;
}

// A new table with the entry in place (the old table is not changed). On a
// tie the older entry stays above, like the arcade. The last entry drops
// off a full table.
export function insertTopScore(topScores, entry) {
  const index = topScores.findIndex((existing) => entry.score > existing.score);
  const position = index === -1 ? topScores.length : index;
  const table = [...topScores.slice(0, position), entry, ...topScores.slice(position)];
  return table.slice(0, TOP_SCORES_COUNT);
}
