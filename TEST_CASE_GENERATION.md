# Test Case Generation with OpenAI

This document explains how to set up and use the AI-powered test case generation feature in the PerfectAI application.

## Features

- **AI-Powered Test Generation**: Generate comprehensive test cases using OpenAI GPT-3.5-turbo
- **File Upload Support**: Upload various file types (.txt, .docx, .pdf, .xlsx, .png, .jpg, etc.) for context
- **Priority-Based Sorting**: Test cases are automatically sorted by priority (P1 > P2 > P3)
- **Pagination**: Initially generates 10 test cases, with "Load More" functionality (max 30 total per session)
- **Session Limits**: Maximum 30 test cases per user session to prevent abuse
- **Real-time Generation**: Generate test cases from user prompts and uploaded files

## Setup Instructions

### 1. Backend Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install openai mammoth pdf-parse xlsx
   ```

2. **Environment Configuration**:
   Add the following to your `backend/.env` file:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key-here
   OPENAI_MODEL=gpt-3.5-turbo
   OPENAI_MAX_TOKENS=4000
   ```

3. **Get OpenAI API Key**:
   - Visit [OpenAI Platform](https://platform.openai.com/)
   - Create an account and get your API key
   - Add it to your `.env` file

### 2. Frontend Setup

The frontend is already configured and ready to use. No additional setup required.

## Usage

### 1. Generate Test Cases from Prompt

1. Navigate to the Test Data section
2. Enter your test case generation prompt in the text area
3. Click "Process Data" to generate test cases
4. View the generated test cases in the table below

**Example Prompts**:
- "Generate test cases for user login functionality"
- "Create test cases for OTP verification in mobile app"
- "Test cases for e-commerce checkout process"

### 2. Generate Test Cases from Files

1. Upload relevant files using drag & drop or file browser
2. Supported file types:
   - **Documents**: .txt, .docx, .pdf, .doc
   - **Spreadsheets**: .xls, .xlsx
   - **Presentations**: .ppt, .pptx
   - **Images**: .png, .jpg, .jpeg
   - **Archives**: .zip, .rar
3. Enter a prompt describing what test cases you want
4. Click "Process Data" to generate test cases based on file content

### 3. Load More Test Cases

1. After initial generation, click "Load More (30 more tests)" button
2. Additional test cases will be appended to the existing list
3. Continue loading more until you reach the maximum of 30 test cases per session

## Test Case Structure

Each generated test case includes:

- **ID**: Sequential number
- **Summary**: Brief description of the test
- **Precondition**: Conditions that must be met before testing
- **Steps**: Detailed, numbered test steps
- **Expected Result**: What should happen when the test passes
- **Priority**: P1 (High), P2 (Medium), or P3 (Low)

## Priority System

- **P1 (High Priority)**: Core functionality, critical user flows, security, data integrity
- **P2 (Medium Priority)**: Secondary features, edge cases, performance scenarios  
- **P3 (Low Priority)**: Nice-to-have features, cosmetic issues, minor edge cases

Test cases are automatically sorted with P1 first, then P2, then P3.

## API Endpoints

### Generate Test Cases
```
POST /api/test-generation/generate
```

**Request Body**:
```json
{
  "prompt": "Generate test cases for login functionality",
  "fileIds": ["file-id-1", "file-id-2"],
  "count": 10,
  "offset": 0
}
```

**Response**:
```json
{
  "success": true,
  "testCases": [...],
  "totalGenerated": 10,
  "hasMore": true,
  "message": "Successfully generated 10 test cases"
}
```

## File Content Extraction

The system automatically extracts text content from uploaded files:

- **PDF**: Full text extraction
- **Word Documents**: Text content extraction
- **Excel Files**: Sheet data extraction
- **Text Files**: Direct content reading
- **Images**: Placeholder for manual description

## Error Handling

- **Invalid API Key**: Check your OpenAI API key configuration
- **Rate Limiting**: OpenAI API has rate limits; requests may be throttled
- **File Processing Errors**: Some files may not be processable; errors are logged
- **Network Issues**: Connection problems are handled gracefully

## Troubleshooting

### Common Issues

1. **"OpenAI API Error"**:
   - Verify your API key is correct
   - Check if you have sufficient OpenAI credits
   - Ensure the API key has proper permissions

2. **"No test cases generated"**:
   - Check your prompt is clear and specific
   - Verify file uploads completed successfully
   - Check browser console for detailed error messages

3. **"File content extraction failed"**:
   - Some file types may not be supported
   - Try converting files to supported formats
   - Check file size limits (10MB max)

### Debug Mode

Enable debug logging by setting `DEBUG=true` in your backend `.env` file.

## Security Considerations

- API keys are stored securely in environment variables
- File uploads are validated and sanitized
- Rate limiting prevents API abuse
- User authentication required for test generation

## Performance Tips

- Use specific, focused prompts for better results
- Upload relevant files to provide context
- Generate test cases in batches (10 initial, 20 for load more) with a maximum of 30 per session
- Clear browser cache if experiencing issues

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your OpenAI API key and credits
3. Ensure all dependencies are installed correctly
4. Check the backend logs for detailed error information
