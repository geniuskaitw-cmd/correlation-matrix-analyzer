/**
 * Calculates the Pearson correlation coefficient between two arrays of numbers.
 * Handles arrays of different lengths by using only paired valid values.
 * Returns null if calculation is impossible (e.g., zero variance or insufficient data).
 */
export const calculatePearsonCorrelation = (x: number[], y: number[]): number | null => {
  // Use the shorter length to pair values
  const maxLen = Math.max(x.length, y.length);
  
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXSq = 0;
  let sumYSq = 0;
  let validCount = 0;

  // Only use paired valid values
  for (let i = 0; i < maxLen; i++) {
    const xi = x[i];
    const yi = y[i];

    // Skip if either value is missing or not a finite number
    if (xi === undefined || yi === undefined) continue;
    if (!Number.isFinite(xi) || !Number.isFinite(yi)) continue;

    sumX += xi;
    sumY += yi;
    sumXY += xi * yi;
    sumXSq += xi * xi;
    sumYSq += yi * yi;
    validCount++;
  }

  // Need at least 2 paired values for correlation
  if (validCount < 2) return null;

  const numerator = validCount * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (validCount * sumXSq - sumX * sumX) * (validCount * sumYSq - sumY * sumY)
  );

  if (denominator === 0) return 0; // No correlation if no variance

  return numerator / denominator;
};

/**
 * Generates a full correlation matrix from a list of variable data series.
 */
export const generateCorrelationMatrix = (data: import('../types').VariableData[]): import('../types').Matrix => {
  const variables = data.map(d => d.name);
  const n = variables.length;
  const grid: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        grid[i][j] = 1; // Self correlation is always 1
      } else if (j > i) {
        // Calculate only upper triangle to save time, matrix is symmetric
        const corr = calculatePearsonCorrelation(data[i].values, data[j].values);
        const val = corr !== null ? corr : 0;
        grid[i][j] = val;
        grid[j][i] = val;
      }
    }
  }

  return { variables, grid };
};