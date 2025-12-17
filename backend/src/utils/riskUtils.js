export function labelFromIndex(idx) {
  if (idx === 2 || idx === '2') return 'High';
  if (idx === 1 || idx === '1') return 'Medium';
  return 'Low';
}

export function humanRiskText(score, idx) {
  const pct = Math.round(score * 100);
  const label = labelFromIndex(idx);
  const emoji = label === 'High' ? '🔴' : (label === 'Medium' ? '🟡' : '🟢');
  return `${emoji} ${label} (${pct}%)`;
}
