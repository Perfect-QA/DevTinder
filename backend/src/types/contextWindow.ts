export interface TestCaseContext {
  id: string;
  summary: string;
  precondition: string;
  steps: string;
  expectedResult: string;
  priority: 'P1' | 'P2' | 'P3';
  parentId?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextWindow {
  id: string;
  userId: string;
  sessionId: string;
  name: string;
  description?: string;
  rootPrompt: string;
  fileIds: string[];
  testCases: TestCaseContext[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ContextWindowRequest {
  prompt: string;
  fileIds?: string[];
  count?: number;
  parentTestCaseId?: string;
  contextWindowId?: string;
  sessionId?: string;
}

export interface ContextWindowResponse {
  success: boolean;
  contextWindow?: ContextWindow;
  testCases?: TestCaseContext[];
  message?: string;
  error?: string;
}


export interface ContextWindowStats {
  totalTestCases: number;
  testCasesByPriority: Record<string, number>;
}
