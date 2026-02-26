export type Operation = 'add' | 'sub' | 'mul' | 'div';

/** 運算選項：單一運算、混合所有、或混合不含除法 */
export type OperationOption = Operation | 'mixed' | 'mixed_no_div';

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
