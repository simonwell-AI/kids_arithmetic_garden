export type Operation = 'add' | 'sub' | 'mul' | 'div';

/** 運算選項：單一運算或混合所有 */
export type OperationOption = Operation | 'mixed';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GenerateQuestionOptions {
  operation: OperationOption;
  rangeMin?: number;
  rangeMax: number;
  difficulty?: Difficulty;
  count?: number;
  skillKey?: string;
}

export interface Question {
  a: number;
  b: number;
  op: Operation;
  answer: number;
  skillKey: string;
  hasCarry?: boolean;
  hasBorrow?: boolean;
}
