declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function beforeAll(fn: () => void | Promise<void>): void;
  export function afterAll(fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function expect<T>(actual: T): {
    toBe(expected: T): void;
    toEqual(expected: any): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toBeNull(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toContain(expected: any): void;
    toHaveLength(expected: number): void;
    toHaveProperty(property: string, value?: any): void;
    toMatch(expected: RegExp | string): void;
    toMatchObject(expected: object): void;
    toThrow(expected?: string | RegExp | Error): void;
    toHaveBeenCalled(): void;
    toHaveBeenCalledWith(...args: any[]): void;
    toHaveBeenCalledTimes(count: number): void;
    not: any;
  };
  export function mock<T extends (...args: any[]) => any>(
    implementation?: T,
  ): jest.Mock<ReturnType<T>, Parameters<T>>;

  namespace jest {
    interface Mock<T = any, Y extends any[] = any[]> {
      (...args: Y): T;
      mock: {
        calls: Y[];
        instances: any[];
        invocationCallOrder: number[];
        results: { type: string; value: any }[];
        lastCall: Y;
      };
      mockClear(): this;
      mockReset(): this;
      mockRestore(): void;
      mockImplementation(fn: (...args: Y) => T): this;
      mockImplementationOnce(fn: (...args: Y) => T): this;
      mockReturnValue(value: T): this;
      mockReturnValueOnce(value: T): this;
    }
  }
}
