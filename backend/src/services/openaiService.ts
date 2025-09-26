import OpenAI from "openai";
import { getEnvVar } from "../config/envValidator";

interface TestCase {
  id: number;
  summary: string;
  precondition: string;
  steps: string;
  expectedResult: string;
  priority: "P1" | "P2" | "P3";
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
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenAIService {
  private openai: OpenAI;
  private model: string;
  private maxTokens: number;

  constructor() {
    const apiKey = getEnvVar("OPENAI_API_KEY");
    this.model = getEnvVar("OPENAI_MODEL", "gpt-3.5-turbo");
    this.maxTokens = parseInt(getEnvVar("OPENAI_MAX_TOKENS", "2000"));

    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Generate test cases based on user prompt and/or file content
   */
  async generateTestCases(
    request: TestGenerationRequest
  ): Promise<TestGenerationResponse> {
    try {
      const {
        prompt,
        fileContent,
        fileName,
        fileType,
        count = 10,
        offset = 0,
      } = request;

      // Build the context for OpenAI
      let context = this.buildContext(prompt, fileContent, fileName, fileType);

      // Create the system prompt
      const systemPrompt = this.createSystemPrompt();

      // Create the user prompt with specific instructions
      const userPrompt = this.createUserPrompt(context, count, offset);

      console.log("🤖 Generating test cases with OpenAI...");
      console.log(`📊 Request: ${count} test cases, offset: ${offset}`);
      console.log(`🔑 Using model: ${this.model}`);
      console.log(`🔑 Max tokens: ${this.maxTokens}`);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: this.maxTokens,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error("No response from OpenAI");
      }

      // Parse the response to extract test cases
      const testCases = this.parseTestCasesResponse(response, offset);

      // Prevent infinite loops by limiting total test cases
      const maxTotalTests = 50; // Reduced limit to save tokens
      const currentTotal = offset + testCases.length;
      
      // Token usage is managed by the controller's count limits (1-50)
      // and daily token limits (20,000 tokens per user per day)

      return {
        success: true,
        testCases,
        totalGenerated: testCases.length,
        hasMore: testCases.length >= count && currentTotal < maxTotalTests, // More available if we got the requested count and haven't hit the limit
        usage: {
          prompt_tokens: completion.usage?.prompt_tokens || 0,
          completion_tokens: completion.usage?.completion_tokens || 0,
          total_tokens: completion.usage?.total_tokens || 0,
        }
      };
    } catch (error) {
      console.error("❌ OpenAI API Error:", error);
      return {
        success: false,
        testCases: [],
        totalGenerated: 0,
        hasMore: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Build context from prompt and file content
   */
  private buildContext(
    prompt: string,
    fileContent?: string,
    fileName?: string,
    fileType?: string
  ): string {
    let context = `Test cases for: ${prompt}`;

    if (fileContent && fileName) {
      // Truncate file content to save tokens (keep first 2000 chars)
      const truncatedContent = fileContent.length > 2000 
        ? fileContent.substring(0, 2000) + "...[truncated]"
        : fileContent;
      
      context += `\nFile: ${fileName} (${fileType || "Unknown"})\n${truncatedContent}`;
    }

    return context;
  }

  /**
   * Create system prompt for test case generation
   */
  private createSystemPrompt(): string {
    return `QA test generator. Return JSON array only.
Format: [{"id":n,"summary":"text","precondition":"text","steps":"1. Action\\n2. Verify","expectedResult":"text","priority":"P1|P2|P3"}]
Priorities: P1=critical, P2=important, P3=optional. JSON only, no explanations.`;
  }

  /**
   * Create user prompt with specific generation instructions
   */
  private createUserPrompt(
    context: string,
    count: number,
    offset: number
  ): string {
    return `Generate ${count} test cases (IDs ${offset + 1}-${offset + count}).

${context}

JSON format: [{"id":n,"summary":"text","precondition":"text","steps":"1. Action\\n2. Verify","expectedResult":"text","priority":"P1|P2|P3"}]
Focus: P1 first, then P2, then P3.`;
  }

  /**
   * Parse OpenAI response to extract test cases
   */
  private parseTestCasesResponse(response: string, offset: number): TestCase[] {
    try {
      // Clean the response - remove any markdown formatting or extra text
      let cleanResponse = response.trim();

      // Remove markdown code blocks if present
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }

      // Try to find JSON array in the response
      const jsonMatch = cleanResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      const testCases = JSON.parse(cleanResponse);

      if (!Array.isArray(testCases)) {
        throw new Error("Response is not an array");
      }

      // Validate and clean test cases
      return testCases.map((testCase: any, index: number) => ({
        id: testCase.id || offset + index + 1,
        summary: testCase.summary || `Test case ${offset + index + 1}`,
        precondition: testCase.precondition || "No specific preconditions",
        steps: testCase.steps || "1. Execute test",
        expectedResult: testCase.expectedResult || "Test should pass",
        priority: this.validatePriority(testCase.priority) || "P2",
      }));
    } catch (error) {
      console.error("❌ Error parsing OpenAI response:", error);
      console.error("Raw response:", response);

      // Fallback: create a basic test case
      return [
        {
          id: offset + 1,
          summary: "Generated test case (parsing failed)",
          precondition: "System is ready for testing",
          steps: "1. Execute the test scenario\n2. Verify the results",
          expectedResult: "Test should complete successfully",
          priority: "P2" as const,
        },
      ];
    }
  }

  /**
   * Validate and normalize priority values
   */
  private validatePriority(priority: any): "P1" | "P2" | "P3" | null {
    if (typeof priority === "string") {
      const normalized = priority.toUpperCase().trim();
      if (normalized === "P1" || normalized === "P2" || normalized === "P3") {
        return normalized as "P1" | "P2" | "P3";
      }
    }
    return null;
  }

  /**
   * Extract text content from various file types
   */
  async extractTextFromFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    const ext = fileName.split(".").pop()?.toLowerCase();

    try {
      switch (ext) {
        case "txt":
          return buffer.toString("utf-8");

        case "pdf":
          const pdfParse = require("pdf-parse");
          const pdfData = await pdfParse(buffer);
          return pdfData.text;

        case "docx":
          const mammoth = require("mammoth");
          const docxResult = await mammoth.extractRawText({ buffer });
          return docxResult.value;

        case "xlsx":
        case "xls":
          const XLSX = require("xlsx");
          const workbook = XLSX.read(buffer, { type: "buffer" });
          let text = "";
          workbook.SheetNames.forEach((sheetName: string) => {
            const worksheet = workbook.Sheets[sheetName];
            text += XLSX.utils.sheet_to_txt(worksheet) + "\n";
          });
          return text;

        case "doc":
          // For .doc files, we'll return a placeholder since mammoth doesn't support them
          return `[Binary DOC file: ${fileName}. Content extraction not supported for .doc files. Please convert to .docx format.]`;

        case "ppt":
        case "pptx":
          // PowerPoint files are complex, return placeholder
          return `[PowerPoint file: ${fileName}. Content extraction not fully supported. Please provide text description of the content.]`;

        case "zip":
        case "rar":
          return `[Archive file: ${fileName}. Please extract and provide individual files for content analysis.]`;

        case "png":
        case "jpg":
        case "jpeg":
          return `[Image file: ${fileName}. Please provide a text description of the image content for test case generation.]`;

        default:
          return `[File: ${fileName} (${mimeType}). Content extraction not supported for this file type.]`;
      }
    } catch (error) {
      console.error(`❌ Error extracting text from ${fileName}:`, error);
      return `[Error extracting content from ${fileName}: ${
        error instanceof Error ? error.message : "Unknown error"
      }]`;
    }
  }
}

export default new OpenAIService();
