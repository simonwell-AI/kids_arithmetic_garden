import type { Operation, Difficulty } from './types';

/** Check if a+b has a carry in the ones place (digits sum >= 10). */
export function hasCarry(a: number, b: number): boolean {
  return (a % 10) + (b % 10) >= 10;
}

/** Check if a-b requires borrow in the ones place (ones digit of a < ones digit of b). */
export function hasBorrow(a: number, b: number): boolean {
  return (a % 10) < (b % 10);
}

/** Multiplication difficulty tiers: easy = 2,5,10; normal = 3,4,6; hard = 7,8,9. */
const MUL_EASY = [2, 5, 10];
const MUL_NORMAL = [3, 4, 6];
const MUL_HARD = [7, 8, 9];

export function getMultipliersForDifficulty(difficulty: Difficulty): number[] {
  switch (difficulty) {
    case 'easy':
      return MUL_EASY;
    case 'normal':
      return [...MUL_EASY, ...MUL_NORMAL];
    case 'hard':
      return [...MUL_EASY, ...MUL_NORMAL, ...MUL_HARD];
    default:
      return [...MUL_EASY, ...MUL_NORMAL, ...MUL_HARD];
  }
}

/** For division, divisor 1-9 only (times tables). Easy 2,5; normal 3,4,6; hard 7,8,9. */
export function getDivisorsForDifficulty(difficulty: Difficulty): number[] {
  switch (difficulty) {
    case 'easy':
      return [2, 5];
    case 'normal':
      return [2, 3, 4, 5, 6];
    case 'hard':
      return [2, 3, 4, 5, 6, 7, 8, 9];
    default:
      return [2, 3, 4, 5, 6, 7, 8, 9];
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Generate two addends for addition; if easy, ensure no carry. */
export function randomAddends(
  rangeMin: number,
  rangeMax: number,
  difficulty: Difficulty
): [number, number] {
  const maxSum = rangeMax * 2;
  for (let i = 0; i < 100; i++) {
    const a = randomInt(rangeMin, rangeMax);
    const b = randomInt(rangeMin, rangeMax);
    if (a + b > maxSum) continue;
    if (difficulty === 'easy' && hasCarry(a, b)) continue;
    return [a, b];
  }
  return [rangeMin, rangeMin];
}

/** Generate minuend and subtrahend with minuend >= subtrahend; if easy, no borrow. */
export function randomMinuendSubtrahend(
  rangeMin: number,
  rangeMax: number,
  difficulty: Difficulty
): [number, number] {
  for (let i = 0; i < 100; i++) {
    const a = randomInt(rangeMin, rangeMax);
    const b = randomInt(rangeMin, rangeMax);
    if (a < b) continue;
    if (a === b && rangeMax > rangeMin) continue; // prefer variety
    if (difficulty === 'easy' && hasBorrow(a, b)) continue;
    return [a, b];
  }
  return [rangeMax, rangeMin];
}

/** Generate factors for multiplication; factors chosen by difficulty. */
export function randomFactors(difficulty: Difficulty): [number, number] {
  const multipliers = getMultipliersForDifficulty(difficulty);
  const m = pick(multipliers);
  const n = randomInt(1, 9);
  return [m, n];
}

/** Generate dividend and divisor for integer division (dividend = divisor * quotient). */
export function randomDivisionOperands(difficulty: Difficulty): [number, number, number] {
  const divisors = getDivisorsForDifficulty(difficulty);
  const b = pick(divisors);
  const q = randomInt(1, 9);
  const a = b * q;
  return [a, b, q];
}
