import {
  generateQuestion,
  generateQuestions,
  hasCarry,
  hasBorrow,
  getMultipliersForDifficulty,
} from '@/src/generator';

describe('generator', () => {
  describe('addition', () => {
    it('produces correct sum and result within range', () => {
      for (let i = 0; i < 30; i++) {
        const q = generateQuestion({
          operation: 'add',
          rangeMax: 20,
          rangeMin: 0,
        });
        expect(q.op).toBe('add');
        expect(q.a + q.b).toBe(q.answer);
        expect(q.a).toBeGreaterThanOrEqual(0);
        expect(q.b).toBeGreaterThanOrEqual(0);
        expect(q.a).toBeLessThanOrEqual(20);
        expect(q.b).toBeLessThanOrEqual(20);
      }
    });

    it('easy addition avoids carry when possible', () => {
      let carried = 0;
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion({
          operation: 'add',
          rangeMax: 20,
          difficulty: 'easy',
        });
        if (q.hasCarry) carried++;
      }
      expect(carried).toBe(0);
    });

    it('includes skillKey in form add_a_b', () => {
      const q = generateQuestion({
        operation: 'add',
        rangeMax: 10,
      });
      expect(q.skillKey).toMatch(/^add_\d+_\d+$/);
    });
  });

  describe('subtraction', () => {
    it('produces a >= b and non-negative result', () => {
      for (let i = 0; i < 30; i++) {
        const q = generateQuestion({
          operation: 'sub',
          rangeMax: 20,
          rangeMin: 0,
        });
        expect(q.op).toBe('sub');
        expect(q.a).toBeGreaterThanOrEqual(q.b);
        expect(q.answer).toBe(q.a - q.b);
        expect(q.answer).toBeGreaterThanOrEqual(0);
      }
    });

    it('easy subtraction avoids borrow when possible', () => {
      let borrowed = 0;
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion({
          operation: 'sub',
          rangeMax: 20,
          difficulty: 'easy',
        });
        if (q.hasBorrow) borrowed++;
      }
      expect(borrowed).toBe(0);
    });

    it('skillKey format sub_a_b', () => {
      const q = generateQuestion({
        operation: 'sub',
        rangeMax: 10,
      });
      expect(q.skillKey).toMatch(/^sub_\d+_\d+$/);
    });
  });

  describe('multiplication', () => {
    it('produces correct product', () => {
      for (let i = 0; i < 20; i++) {
        const q = generateQuestion({
          operation: 'mul',
          rangeMax: 100,
          difficulty: 'normal',
        });
        expect(q.op).toBe('mul');
        expect(q.a * q.b).toBe(q.answer);
      }
    });

    it('easy prioritizes 2, 5, 10', () => {
      const easy = getMultipliersForDifficulty('easy');
      expect(easy).toContain(2);
      expect(easy).toContain(5);
      expect(easy).toContain(10);
      let count = 0;
      for (let i = 0; i < 50; i++) {
        const q = generateQuestion({
          operation: 'mul',
          rangeMax: 100,
          difficulty: 'easy',
        });
        if ([2, 5, 10].includes(q.a) || [2, 5, 10].includes(q.b)) count++;
      }
      expect(count).toBeGreaterThan(30);
    });

    it('hard includes 7, 8, 9', () => {
      let hasHard = false;
      for (let i = 0; i < 80; i++) {
        const q = generateQuestion({
          operation: 'mul',
          rangeMax: 100,
          difficulty: 'hard',
        });
        if ([7, 8, 9].includes(q.a) || [7, 8, 9].includes(q.b)) hasHard = true;
      }
      expect(hasHard).toBe(true);
    });

    it('skillKey format mul_axb', () => {
      const q = generateQuestion({
        operation: 'mul',
        rangeMax: 100,
        difficulty: 'hard',
      });
      expect(q.skillKey).toMatch(/^mul_\d+x\d+$/);
    });
  });

  describe('division', () => {
    it('integer division only, dividend = divisor * quotient', () => {
      for (let i = 0; i < 30; i++) {
        const q = generateQuestion({
          operation: 'div',
          rangeMax: 100,
          difficulty: 'normal',
        });
        expect(q.op).toBe('div');
        expect(q.a / q.b).toBe(q.answer);
        expect(q.a % q.b).toBe(0);
        expect(q.answer).toBeGreaterThanOrEqual(1);
        expect(q.answer).toBeLessThanOrEqual(9);
      }
    });

    it('quotient and divisor in 1-9 range', () => {
      for (let i = 0; i < 20; i++) {
        const q = generateQuestion({
          operation: 'div',
          rangeMax: 100,
          difficulty: 'hard',
        });
        expect(q.b).toBeGreaterThanOrEqual(1);
        expect(q.b).toBeLessThanOrEqual(9);
        expect(q.answer).toBeGreaterThanOrEqual(1);
        expect(q.answer).toBeLessThanOrEqual(9);
      }
    });

    it('skillKey format div_a_b', () => {
      const q = generateQuestion({
        operation: 'div',
        rangeMax: 100,
        difficulty: 'easy',
      });
      expect(q.skillKey).toMatch(/^div_\d+_\d+$/);
    });
  });

  describe('generateQuestions', () => {
    it('returns requested count', () => {
      const list = generateQuestions({
        operation: 'add',
        rangeMax: 10,
        count: 15,
      });
      expect(list).toHaveLength(15);
    });
  });
});

describe('difficulty helpers', () => {
  it('hasCarry detects carry', () => {
    expect(hasCarry(5, 5)).toBe(true);
    expect(hasCarry(3, 4)).toBe(false);
    expect(hasCarry(15, 16)).toBe(true);
  });

  it('hasBorrow detects borrow', () => {
    expect(hasBorrow(12, 5)).toBe(true);
    expect(hasBorrow(10, 3)).toBe(true);
    expect(hasBorrow(15, 5)).toBe(false);
  });
});

describe('mixed operation', () => {
  it('produces questions with add, sub, mul, div when operation is mixed', () => {
    const ops = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const q = generateQuestion({
        operation: 'mixed',
        rangeMax: 20,
        rangeMin: 0,
      });
      ops.add(q.op);
    }
    expect(ops.has('add')).toBe(true);
    expect(ops.has('sub')).toBe(true);
    expect(ops.has('mul')).toBe(true);
    expect(ops.has('div')).toBe(true);
  });

  it('generateQuestions with mixed yields varied operations', () => {
    const qs = generateQuestions({ operation: 'mixed', rangeMax: 20, count: 20 });
    const ops = new Set(qs.map((q) => q.op));
    expect(ops.size).toBeGreaterThanOrEqual(2);
  });
});
