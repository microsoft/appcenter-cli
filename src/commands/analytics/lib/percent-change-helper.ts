export function calculatePercentChange(currentValue: number, previousValue: number) {
  if (previousValue !== 0) {
    return (currentValue - previousValue) / previousValue * 100;
  } else if (currentValue === 0) {
    return 0;
  } else {
    return 100;
  }
}
