import OpenAI from 'openai';
import { getEnvVar } from '../config/envValidator';

interface TestCase {
  id: number;
  summary: string;
  precondition: string;
  steps: string;
  expectedResult: string;
  priority: 'P1' | 'P2' | 'P3';
}

interface TestGenerationRequest {
  prompt: string;
  fileContent?: string;
  fileName?: string;
  fileType?: string;
  count?: number;
  offset?: number;
}

interface TestGenerationResponse {
  success: boolean;
  testCases: TestCase[];
  totalGenerated: number;
  hasMore: boolean;
  error?: string;
}

class OpenAIService {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor() {
    const apiKey = getEnvVar('OPENAI_API_KEY');
    this.model = getEnvVar('OPENAI_MODEL', 'gpt-4');
    this.maxTokens = parseInt(getEnvVar('OPENAI_MAX_TOKENS', '4000'));

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Generate test cases based on user prompt and/or file content
   */
  async generateTestCases(request: TestGenerationRequest): Promise<TestGenerationResponse> {
    try {
      const { prompt, fileContent, fileName, fileType, count = 10, offset = 0 } = request;

      // Build the context for OpenAI
      let context = this.buildContext(prompt, fileContent, fileName, fileType);
      
      // Create the system prompt
      const systemPrompt = this.createSystemPrompt();
      
      // Create the user prompt with specific instructions
      const userPrompt = this.createUserPrompt(context, count, offset);

      console.log('🤖 Generating test cases with OpenAI...');
      console.log(`📊 Request: ${count} test cases, offset: ${offset}`);
      console.log(`🔑 Using model: ${this.model}`);
      console.log(`🔑 Max tokens: ${this.maxTokens}`);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the response to extract test cases
      const testCases = this.parseTestCasesResponse(response, offset);
      

      // Prevent infinite loops by limiting total test cases
      const maxTotalTests = 30; // Maximum total test cases per user session
      const currentTotal = offset + testCases.length;
      
      return {
        success: true,
        testCases,
        totalGenerated: testCases.length,
        hasMore: testCases.length >= count && currentTotal < maxTotalTests, // More available if we got the requested count and haven't hit the limit
      };

    } catch (error) {
      console.error('❌ OpenAI API Error:', error);
      return {
        success: false,
        testCases: [],
        totalGenerated: 0,
        hasMore: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Build context from prompt and file content
   */
  private buildContext(prompt: string, fileContent?: string, fileName?: string, fileType?: string): string {
    let context = `User Request: ${prompt}\n\n`;

    if (fileContent && fileName) {
      context += `File Information:\n`;
      context += `- File Name: ${fileName}\n`;
      context += `- File Type: ${fileType || 'Unknown'}\n`;
      context += `- Content:\n${fileContent}\n\n`;
    }

    return context;
  }

  /**
   * Create system prompt for test case generation
   */
  private createSystemPrompt(): string {
    return `You are an expert QA engineer and test case generator. Your task is to generate comprehensive, high-quality test cases based on user requirements and file content.

IMPORTANT GUIDELINES:
1. Generate test cases in JSON format only
2. Prioritize test cases: P1 (High Priority) first, then P2 (Medium Priority), then P3 (Low Priority)
3. Each test case must have: id, summary, precondition, steps, expectedResult, priority
4. Make test cases specific, actionable, and realistic
5. Focus on critical functionality first (P1), then edge cases and error scenarios
6. Steps should be numbered and detailed
7. Expected results should be clear and measurable

PRIORITY GUIDELINES:
- P1 (High): Core functionality, critical user flows, security, data integrity
- P2 (Medium): Secondary features, edge cases, performance scenarios
- P3 (Low): Nice-to-have features, cosmetic issues, minor edge cases

RESPONSE FORMAT:
Return ONLY a valid JSON array of test cases. No additional text or explanations.`;
  }

  /**
   * Create user prompt with specific generation instructions
   */
  private createUserPrompt(context: string, count: number, offset: number): string {
    return `Based on the following context, generate exactly ${count} test cases starting from ID ${offset + 1}.

${context}

Requirements:
- Generate ${count} test cases
- Start with ID ${offset + 1}
- Prioritize high-priority (P1) test cases first
- Make test cases comprehensive and realistic
- Focus on the most important functionality first

Return the test cases as a JSON array with this exact structure:
[
  {
    "id": ${offset + 1},
    "summary": "Brief description of what is being tested",
    "precondition": "Conditions that must be met before the test",
    "steps": "1. Step one\\n2. Step two\\n3. Step three",
    "expectedResult": "What should happen when the test passes",
    "priority": "P1"
  }
]`;
  }

  /**
   * Parse OpenAI response to extract test cases
   */
  private parseTestCasesResponse(response: string, offset: number): TestCase[] {
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanResponse = response.trim();
      
      // Remove markdown code blocks if present
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      // Try to find JSON array in the response
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const testCases = JSON.parse(cleanResponse);
      
      if (!Array.isArray(testCases)) {
        throw new Error('Response is not an array');
      }

      // Validate and clean test cases
      return testCases.map((testCase: any, index: number) => ({
        id: testCase.id || offset + index + 1,
        summary: testCase.summary || `Test case ${offset + index + 1}`,
        precondition: testCase.precondition || 'No specific preconditions',
        steps: testCase.steps || '1. Execute test',
        expectedResult: testCase.expectedResult || 'Test should pass',
        priority: this.validatePriority(testCase.priority) || 'P2'
      }));

    } catch (error) {
      console.error('❌ Error parsing OpenAI response:', error);
      console.error('Raw response:', response);
      
      // Fallback: create a basic test case
      return [{
        id: offset + 1,
        summary: 'Generated test case (parsing failed)',
        precondition: 'System is ready for testing',
        steps: '1. Execute the test scenario\n2. Verify the results',
        expectedResult: 'Test should complete successfully',
        priority: 'P2' as const
      }];
    }
  }

  /**
   * Validate and normalize priority values
   */
  private validatePriority(priority: any): 'P1' | 'P2' | 'P3' | null {
    if (typeof priority === 'string') {
      const normalized = priority.toUpperCase().trim();
      if (normalized === 'P1' || normalized === 'P2' || normalized === 'P3') {
        return normalized as 'P1' | 'P2' | 'P3';
      }
    }
    return null;
  }

  /**
   * Extract text content from various file types
   */
  async extractTextFromFile(buffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    try {
      switch (ext) {
        case 'txt':
          return buffer.toString('utf-8');
          
        case 'pdf':
          const pdfParse = require('pdf-parse');
          const pdfData = await pdfParse(buffer);
          return pdfData.text;
          
        case 'docx':
          const mammoth = require('mammoth');
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;
          
        case 'xlsx':
        case 'xls':
          const XLSX = require('xlsx');
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          let text = '';
          workbook.SheetNames.forEach((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            text += XLSX.utils.sheet_to_txt(worksheet) + '\n';
          });
          return text;
          
        case 'doc':
          // For .doc files, we'll return a placeholder since mammoth doesn't support them
          return `[Binary DOC file: ${fileName}. Content extraction not supported for .doc files. Please convert to .docx format.]`;
          
        case 'ppt':
        case 'pptx':
          // PowerPoint files are complex, return placeholder
          return `[PowerPoint file: ${fileName}. Content extraction not fully supported. Please provide text description of the content.]`;
          
        case 'zip':
        case 'rar':
          return `[Archive file: ${fileName}. Please extract and provide individual files for content analysis.]`;
          
        case 'png':
        case 'jpg':
        case 'jpeg':
          return `[Image file: ${fileName}. Please provide a text description of the image content for test case generation.]`;
          
        default:
          return `[File: ${fileName} (${mimeType}). Content extraction not supported for this file type.]`;
      }
    } catch (error) {
      console.error(`❌ Error extracting text from ${fileName}:`, error);
      return `[Error extracting content from ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}]`;
    }
  }
}

export default new OpenAIService();
