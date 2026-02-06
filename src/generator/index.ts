import type { GenerateQuestionOptions, Question } from './types';
import type { Operation } from './types';
import { getRandom, setRandom, resetRandom, hashString, createSeededRandom } from './random';
import {
  hasCarry,
  hasBorrow,
  randomAddends,
  randomMinuendSubtrahend,
  randomFactors,
  randomDivisionOperands,
} from './difficulty';

const OPS: Operation[] = ['add', 'sub', 'mul', 'div'];

function pickOperation(option: GenerateQuestionOptions['operation']): Operation {
  if (option === 'mixed') {
    return OPS[Math.floor(getRandom() * OPS.length)];
  }
  return option;
}

function skillKeyAdd(a: number, b: number): string {
  return `add_${a}_${b}`;
}
function skillKeySub(a: number, b: number): string {
  return `sub_${a}_${b}`;
}
function skillKeyMul(a: number, b: number): string {
  return `mul_${a}x${b}`;
}
function skillKeyDiv(a: number, b: number): string {
  return `div_${a}_${b}`;
}

export function generateQuestion(options: GenerateQuestionOptions): Question {
  const rangeMin = options.rangeMin ?? 0;
  const rangeMax = options.rangeMax;
  const difficulty = options.difficulty ?? 'normal';
  const operation = pickOperation(options.operation);

  switch (operation) {
    case 'add': {
      const [a, b] = randomAddends(rangeMin, rangeMax, difficulty);
      const answer = a + b;
      return {
        a,
        b,
        op: 'add',
        answer,
        skillKey: options.skillKey ?? skillKeyAdd(a, b),
        hasCarry: hasCarry(a, b),
      };
    }
    case 'sub': {
      const [a, b] = randomMinuendSubtrahend(rangeMin, rangeMax, difficulty);
      const answer = a - b;
      return {
        a,
        b,
        op: 'sub',
        answer,
        skillKey: options.skillKey ?? skillKeySub(a, b),
        hasBorrow: hasBorrow(a, b),
      };
    }
    case 'mul': {
      const [a, b] = randomFactors(difficulty);
      const answer = a * b;
      return {
        a,
        b,
        op: 'mul',
        answer,
        skillKey: options.skillKey ?? skillKeyMul(a, b),
      };
    }
    case 'div': {
      const [a, b, q] = randomDivisionOperands(difficulty);
      return {
        a,
        b,
        op: 'div',
        answer: q,
        skillKey: options.skillKey ?? skillKeyDiv(a, b),
      };
    }
    default:
      return generateQuestion({ ...options, operation: 'add' });
  }
}

/** Parse skillKey and return fixed question, or null if invalid. */
export function generateQuestionFromSkillKey(
  skillKey: string,
  options?: Pick<GenerateQuestionOptions, 'rangeMin' | 'rangeMax'>
): Question | null {
  const rangeMax = options?.rangeMax ?? 100;
  const rangeMin = options?.rangeMin ?? 0;
  const addMatch = skillKey.match(/^add_(\d+)_(\d+)$/);
  if (addMatch) {
    const a = parseInt(addMatch[1], 10);
    const b = parseInt(addMatch[2], 10);
    if (a + b > rangeMax * 2 || a < rangeMin || b < rangeMin) return null;
    return {
      a,
      b,
      op: 'add',
      answer: a + b,
      skillKey,
      hasCarry: hasCarry(a, b),
    };
  }
  const subMatch = skillKey.match(/^sub_(\d+)_(\d+)$/);
  if (subMatch) {
    const a = parseInt(subMatch[1], 10);
    const b = parseInt(subMatch[2], 10);
    if (a < b || a > rangeMax || b < rangeMin) return null;
    return {
      a,
      b,
      op: 'sub',
      answer: a - b,
      skillKey,
      hasBorrow: hasBorrow(a, b),
    };
  }
  const mulMatch = skillKey.match(/^mul_(\d+)x(\d+)$/);
  if (mulMatch) {
    const a = parseInt(mulMatch[1], 10);
    const b = parseInt(mulMatch[2], 10);
    return {
      a,
      b,
      op: 'mul',
      answer: a * b,
      skillKey,
    };
  }
  const divMatch = skillKey.match(/^div_(\d+)_(\d+)$/);
  if (divMatch) {
    const a = parseInt(divMatch[1], 10);
    const b = parseInt(divMatch[2], 10);
    if (b === 0 || a % b !== 0) return null;
    return {
      a,
      b,
      op: 'div',
      answer: a / b,
      skillKey,
    };
  }
  return null;
}

export function generateQuestions(options: GenerateQuestionOptions): Question[] {
  const count = options.count ?? 10;
  const questions: Question[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const q = generateQuestion(options);
    const key = `${q.a},${q.b},${q.op}`;
    if (seen.has(key) && count <= 100) {
      i--;
      continue;
    }
    seen.add(key);
    questions.push(q);
  }
  return questions;
}

/** 用日期字串當 seed 產生「今日專屬」固定題組（同一天同一組題） */
export function generateTodayQuestions(dateKey: string, count: number): Question[] {
  const seed = hashString(dateKey);
  const seeded = createSeededRandom(seed);
  setRandom(seeded);
  try {
    return generateQuestions({
      operation: 'mixed',
      rangeMin: 0,
      rangeMax: 50,
      count,
      difficulty: 'normal',
    });
  } finally {
    resetRandom();
  }
}

export * from './types';
export * from './difficulty';
export * from './random';
