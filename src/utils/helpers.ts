let counter = 0;

export function generateId(): string {
  counter++;
  return `evt_${Date.now()}_${counter}_${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function standardDeviation(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const sqDiffs = arr.map(v => (v - avg) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

export function zScore(value: number, arr: number[]): number {
  const sd = standardDeviation(arr);
  if (sd === 0) return 0;
  return (value - mean(arr)) / sd;
}

export function giniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const totalSum = sorted.reduce((a, b) => a + b, 0);
  if (totalSum === 0) return 0;
  
  let cumulativeSum = 0;
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    cumulativeSum += sorted[i];
    weightedSum += (2 * (i + 1) - n - 1) * sorted[i];
  }
  
  return weightedSum / (n * totalSum);
}

export function getHealthStatus(score: number, thresholds: { green: number; amber: number }): 'green' | 'amber' | 'red' {
  if (score >= thresholds.green) return 'green';
  if (score >= thresholds.amber) return 'amber';
  return 'red';
}

export function getRiskStatus(score: number): 'green' | 'amber' | 'red' {
  if (score >= 60) return 'red';
  if (score >= 30) return 'amber';
  return 'green';
}

export function hoursBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e)) return 24; // default
  return Math.abs(e - s) / (1000 * 60 * 60);
}

export function formatScore(score: number): string {
  return Math.round(score).toString();
}

export function daysBetween(start: string, end: string): number {
  return hoursBetween(start, end) / 24;
}
