# OpenAI Token Usage Tracking System

A comprehensive guide to the OpenAI token usage tracking system with admin access for monitoring API consumption.

## Overview

This system automatically tracks OpenAI API token usage for each user and provides admin endpoints to monitor token consumption, costs, and usage patterns. It's designed to help administrators understand how much OpenAI API is being used and by whom.

## How It Works

### 1. Automatic Token Tracking
When users make requests that use OpenAI API (like test generation), the system automatically:
- Captures token usage from OpenAI API responses
- Calculates approximate costs based on token consumption
- Stores the data in MongoDB with user attribution
- Tracks operation type (e.g., "test_generation")

### 2. Database Storage
All token usage data is stored in the `openai_token_usage` collection with the following structure:

```typescript
{
  userId: ObjectId,           // Reference to the user
  userEmail: string,          // User's email for easy identification
  modelName: string,          // AI model used (e.g., 'gpt-3.5-turbo')
  promptTokens: number,        // Input tokens consumed
  completionTokens: number,    // Output tokens generated
  totalTokens: number,        // Total tokens used
  cost: number,              // Calculated cost in USD
  operation: string,          // Type of operation (e.g., 'test_generation')
  timestamp: Date,           // When the usage occurred
  date: string,              // Date in YYYY-MM-DD format
  month: string,             // Month in YYYY-MM format
  year: number,              // Year
  isActive: boolean          // Whether the record is active
}
```

### 3. Cost Calculation
The system calculates costs using approximate OpenAI pricing:
- **GPT-3.5-turbo**: $0.00003 per input token, $0.00006 per output token

## Admin Access Endpoints

All admin endpoints require user authentication and are accessible at `/admin/openai/*`:

### 1. Dashboard Statistics
**Endpoint**: `GET /admin/openai/dashboard`

Get overall usage statistics across all users.

**Query Parameters**:
- `startDate` (optional): Start date for filtering (YYYY-MM-DD)
- `endDate` (optional): End date for filtering (YYYY-MM-DD)

**Example Request**:
```bash
GET /admin/openai/dashboard?startDate=2024-01-01&endDate=2024-01-31
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "totalTokens": 15000,
    "totalCost": 0.45,
    "totalRequests": 25,
    "uniqueUsers": 5
  },
  "message": "OpenAI usage statistics retrieved successfully"
}
```

### 2. Top Users by Token Usage
**Endpoint**: `GET /admin/openai/top-users`

Get users ranked by their token usage.

**Query Parameters**:
- `limit` (optional): Number of users to return (default: 10)
- `startDate` (optional): Start date for filtering
- `endDate` (optional): End date for filtering

**Example Request**:
```bash
GET /admin/openai/top-users?limit=5&startDate=2024-01-01&endDate=2024-01-31
```

**Example Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "user123",
      "userEmail": "john@example.com",
      "totalTokens": 5000,
      "totalCost": 0.15,
      "totalRequests": 10
    },
    {
      "_id": "user456",
      "userEmail": "jane@example.com",
      "totalTokens": 3000,
      "totalCost": 0.09,
      "totalRequests": 8
    }
  ],
  "message": "Top 5 users retrieved successfully"
}
```

### 3. User-Specific Statistics
**Endpoint**: `GET /admin/openai/user/:userId/stats`

Get detailed statistics for a specific user.

**Path Parameters**:
- `userId`: The user's ID

**Query Parameters**:
- `startDate` (optional): Start date for filtering
- `endDate` (optional): End date for filtering

**Example Request**:
```bash
GET /admin/openai/user/user123/stats?startDate=2024-01-01&endDate=2024-01-31
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "totalTokens": 2000,
    "totalCost": 0.06,
    "totalRequests": 5
  },
  "message": "Usage statistics for user user123 retrieved successfully"
}
```

### 4. User Usage History
**Endpoint**: `GET /admin/openai/user/:userId/history`

Get detailed usage history for a specific user with pagination.

**Path Parameters**:
- `userId`: The user's ID

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 50)

**Example Request**:
```bash
GET /admin/openai/user/user123/history?page=1&limit=10
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "_id": "usage123",
        "userId": "user123",
        "userEmail": "john@example.com",
        "modelName": "gpt-3.5-turbo",
        "promptTokens": 100,
        "completionTokens": 50,
        "totalTokens": 150,
        "cost": 0.0045,
        "operation": "test_generation",
        "timestamp": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "totalPages": 3
  },
  "message": "Usage history for user user123 retrieved successfully"
}
```

## Authentication

All admin endpoints require:
1. **Valid JWT Token**: User must be authenticated
2. **Authorization Header**: `Authorization: Bearer <token>`

**Example Authentication**:
```bash
curl -H "Authorization: Bearer your-jwt-token" \
     "http://localhost:3000/admin/openai/dashboard"
```

## File Structure

```
backend/src/
├── models/
│   └── openaiTokenUsage.ts          # Database model for OpenAI tokens
├── services/
│   └── openaiTokenService.ts        # Business logic for token operations
├── controllers/
│   └── openaiAdminController.ts     # Admin endpoint handlers
├── routes/
│   └── openaiAdmin.ts               # Route definitions
├── middlewares/
│   └── openaiTokenTracking.ts       # Automatic token tracking
└── config/
    └── databaseIndexes.ts           # Database optimization indexes
```

## Database Indexes

The system includes optimized indexes for efficient querying:
- `userId + timestamp` - User queries by time
- `userEmail + timestamp` - Email-based queries
- `modelName + timestamp` - Model-specific queries
- `date + userId` - Daily user usage
- `month + userId` - Monthly user usage
- `year + userId` - Yearly user usage
- `operation + timestamp` - Operation-specific queries
- `isActive + timestamp` - Active records only

## Automatic Tracking Integration

The system automatically tracks tokens when:
1. Users make requests to `/api/test-generation`
2. The request is successful (HTTP 200-399)
3. The user is authenticated
4. The OpenAI API response contains usage information

**Example Integration**:
```typescript
// In test generation controller
const result = await openaiService.generateTestCases({
  prompt: userPrompt,
  fileContent: fileContent,
  count: 10
});

// Token usage is automatically tracked if result.usage exists
if (result.usage && req.user) {
  // System automatically records:
  // - promptTokens: result.usage.prompt_tokens
  // - completionTokens: result.usage.completion_tokens
  // - totalTokens: result.usage.total_tokens
  // - cost: calculated based on tokens
  // - user: req.user
  // - operation: 'test_generation'
}
```

## Cost Monitoring

### Key Metrics to Monitor
1. **Total Token Usage**: Overall platform consumption
2. **Cost Analysis**: Spending across users and operations
3. **User Behavior**: Identify heavy users and usage patterns
4. **Model Usage**: Track which AI models are being used
5. **Operation Analysis**: Understand which features consume most tokens

### Cost Thresholds
Consider setting up alerts for:
- High token usage by individual users (>10,000 tokens/day)
- Unusual usage patterns (sudden spikes)
- Cost thresholds (>$10/day per user)
- Model-specific usage (GPT-4 vs GPT-3.5)

## Troubleshooting

### Common Issues

1. **No Token Data Appearing**
   - Check if OpenAI API is returning usage information
   - Verify user authentication is working
   - Ensure database connection is established

2. **Incorrect Cost Calculations**
   - Verify cost per token values in the code
   - Check if using correct model pricing
   - Update pricing if OpenAI changes rates

3. **Missing User Attribution**
   - Ensure `req.user` is properly set in requests
   - Check authentication middleware is working
   - Verify user ID is being passed correctly

4. **Database Performance Issues**
   - Check if indexes are created properly
   - Monitor database query performance
   - Consider data retention policies

### Debug Steps

1. **Check Server Logs**:
   ```bash
   # Look for tracking messages
   grep "OpenAI usage tracked" logs/app.log
   ```

2. **Verify Database Connection**:
   ```bash
   # Check MongoDB connection
   mongo your-database --eval "db.openai_token_usage.count()"
   ```

3. **Test Admin Endpoints**:
   ```bash
   # Test with authentication
   curl -H "Authorization: Bearer <token>" \
        "http://localhost:3000/admin/openai/dashboard"
   ```

4. **Check OpenAI API Response**:
   ```bash
   # Verify OpenAI returns usage data
   # Check if completion.usage exists in responses
   ```

## Security Considerations

1. **Data Privacy**: Token usage data contains sensitive information
2. **Access Control**: Only authenticated users can access admin endpoints
3. **Data Retention**: Consider implementing data retention policies
4. **Audit Logging**: Log all admin access to usage data

## Performance Optimization

1. **Database Indexes**: Optimized for common query patterns
2. **Pagination**: Large datasets are paginated for performance
3. **Aggregation**: Uses MongoDB aggregation for complex analytics
4. **Caching**: Consider caching frequently accessed statistics

## Future Enhancements

1. **Real-time Dashboard**: Live usage monitoring
2. **Usage Limits**: Set per-user token limits
3. **Alerts**: Notifications for high usage
4. **Export**: CSV export functionality
5. **Analytics**: Advanced usage patterns and trends
6. **Rate Limiting**: Dynamic limits based on usage patterns

## Support

For issues or questions:
1. Check server logs for error messages
2. Verify database connectivity
3. Ensure proper authentication setup
4. Review the API documentation
5. Test endpoints with proper authentication headers

This system provides comprehensive monitoring of OpenAI token usage while maintaining simplicity and ease of use for administrators.
