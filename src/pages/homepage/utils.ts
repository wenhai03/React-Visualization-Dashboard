export function calculateThroughputWithRange({ start, end, value }: { start: number; end: number; value: number }) {
  const durationAsMinutes = (end - start) / 1000 / 60;
  return value / durationAsMinutes;
}
