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

    return Math.round((sorted[middle + 1] + sorted[middle]) / 2);
  }

  export function speedUp(currentTime: number, minTime: number, amount: number = 0.1) {
    const newTime = Math.round((currentTime - amount) * 10) / 10;
    if (newTime < minTime) return minTime;
    return newTime;
  }

  export function slowDown(currentTime: number, maxTime: number, amount: number = 0.1) {
    if (currentTime < maxTime) return Math.round((currentTime + amount) * 10) / 10;
    return maxTime;
  }
}
