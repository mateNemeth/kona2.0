export namespace Utils {
  export function sleep (ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  };

  export function calculateAverage(numArr: number[]): number {
    return Math.round(numArr.reduce((a, b) => a + b) / numArr.length);
  }

  export function calculateMedian(numArr: number[]): number {
    const sorted = numArr.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
      ? Math.round((sorted[middle + 1] + sorted[middle]) / 2)
      : Math.round(sorted[middle])
  }
}
