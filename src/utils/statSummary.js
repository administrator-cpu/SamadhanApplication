// src/utils/statSummary.js
export function pickStat(summary = {}, keywords) {
  const entries = Object.entries(summary);
  const match = entries.find(([key]) => {
    const k = key.toLowerCase();
    return keywords.some((word) => k.includes(word));
  });
  return match ? match[1] : null;
}