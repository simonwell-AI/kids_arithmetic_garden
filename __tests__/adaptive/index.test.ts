import {
  computeNewWeight,
  updateWeight,
  getNextSkillKey,
  sampleQuestions,
  SLOW_RESPONSE_MS,
} from '@/src/adaptive';

describe('adaptive engine', () => {
  describe('computeNewWeight', () => {
    it('wrong: +3', () => {
      expect(computeNewWeight(0, false, 0)).toBe(3);
      expect(computeNewWeight(5, false, 100)).toBe(8);
    });

    it('slow correct: +1 (responseTimeMs > threshold)', () => {
      expect(computeNewWeight(2, true, SLOW_RESPONSE_MS + 1)).toBe(3);
      expect(computeNewWeight(0, true, 10000)).toBe(1);
    });

    it('fast correct: -1, min 0', () => {
      expect(computeNewWeight(3, true, 1000)).toBe(2);
      expect(computeNewWeight(1, true, 0)).toBe(0);
      expect(computeNewWeight(0, true, 0)).toBe(0);
    });

    it('at threshold: fast (<= 5000)', () => {
      expect(computeNewWeight(1, true, SLOW_RESPONSE_MS)).toBe(0);
    });
  });

  describe('updateWeight', () => {
    it('mutates map and returns it', () => {
      const map: Record<string, number> = { mul_7x8: 2 };
      updateWeight(map, 'mul_7x8', false, 0);
      expect(map.mul_7x8).toBe(5);
      updateWeight(map, 'mul_7x8', true, 100);
      expect(map.mul_7x8).toBe(4);
    });

    it('initializes missing skill to 0 then applies delta', () => {
      const map: Record<string, number> = {};
      updateWeight(map, 'add_3_5', true, 100);
      expect(map.add_3_5).toBe(0);
    });
  });

  describe('getNextSkillKey', () => {
    it('returns undefined for empty map', () => {
      expect(getNextSkillKey({})).toBeUndefined();
    });

    it('returns only key when one skill', () => {
      expect(getNextSkillKey({ mul_7x8: 5 })).toBe('mul_7x8');
    });

    it('splits high (top 50%) and low (rest)', () => {
      const map = { a: 10, b: 8, c: 6, d: 2 };
      const keys = new Set<string>();
      for (let i = 0; i < 50; i++) {
        keys.add(getNextSkillKey(map)!);
      }
      expect(keys.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe('sampleQuestions 80/20 ratio', () => {
    it('returns requested count', () => {
      const map = { add_1_2: 5, add_3_4: 1, sub_10_3: 2 };
      const questions = sampleQuestions(map, 20, {
        operation: 'add',
        rangeMax: 20,
        difficulty: 'normal',
      });
      expect(questions).toHaveLength(20);
    });

    it('with many samples, high-weight pool is chosen more often', () => {
      const map: Record<string, number> = {};
      for (let i = 1; i <= 10; i++) {
        map[`mul_${i}x${i}`] = i <= 5 ? 10 : 0;
      }
      let fromHigh = 0;
      const n = 500;
      for (let i = 0; i < n; i++) {
        const key = getNextSkillKey(map);
        if (key && (map[key] ?? 0) >= 10) fromHigh++;
      }
      const ratio = fromHigh / n;
      expect(ratio).toBeGreaterThan(0.6);
      expect(ratio).toBeLessThan(0.95);
    });
  });
});
