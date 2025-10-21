/**
 * Debounce function that delays execution until after a wait period
 * Useful for preventing excessive API calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

/**
 * Debounced batch accumulator for status updates
 * Collects IDs and flushes them after a delay
 */
export class DebouncedBatch<T = string> {
  private batch: Set<T> = new Set();
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private readonly wait: number;
  private readonly onFlush: (items: T[]) => void | Promise<void>;

  constructor(onFlush: (items: T[]) => void | Promise<void>, wait: number = 1000) {
    this.onFlush = onFlush;
    this.wait = wait;
  }

  add(item: T): void {
    this.batch.add(item);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.timeout = setTimeout(() => {
      this.flush();
    }, this.wait);
  }

  async flush(): Promise<void> {
    if (this.batch.size === 0) return;

    const items = Array.from(this.batch);
    this.batch.clear();

    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    await this.onFlush(items);
  }

  clear(): void {
    this.batch.clear();
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}

