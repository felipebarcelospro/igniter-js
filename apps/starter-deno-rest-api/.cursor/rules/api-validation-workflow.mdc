---
description: |
  Integrates API validation tools (OpenAPI spec retrieval and HTTP request testing) into the development workflow,
  enabling autonomous testing and validation of features. This rule defines when and how to use API validation tools
  for continuous validation, debugging, and quality assurance throughout the development lifecycle.
alwaysApply: true
priority: 2
---

# API Validation Workflow Integration

This rule defines how API validation tools (`get_openapi_spec` and `make_api_request`) should be integrated into the development workflow to enable autonomous testing and continuous validation of implemented features.

## 1. Development Cycle Integration

### 1.1 Workflow Phases with API Validation

```mermaid
graph TB
    A[Requirements Gathering] --> B[Planning]
    B --> C[Waiting Approval]
    C --> D[Work Phase]
    D --> E{Validation Phase}
    E --> F[API Testing]
    F --> G{Tests Pass?}
    G -->|Yes| H[Revise & Document]
    G -->|No| I[Debug & Fix]
    I --> F
    H --> J[Feedback]
    J --> K[Learn & Improve]

    style F fill:#e1f5fe
    style G fill:#fff3e0
```

### 1.2 Mandatory Integration Points

**During Work Phase:**
- After implementing each endpoint
- After modifying API data structures
- Before marking tasks as complete

**During Validation Phase:**
- Complete validation of implemented feature
- Testing success and error scenarios
- API contract validation

**During Revise Phase:**
- Re-testing after fixes
- Regression validation

## 2. Tool Usage Protocols

### 2.1 `get_openapi_spec` Protocol

**When to use:**
- At the beginning of each development session
- After generating or modifying controllers
- Before implementing client/frontend code
- To understand existing API contracts

**Usage workflow:**
```javascript
// 1. Ensure development server is running
await dev({ port: 3000, watch: true });

// 2. Fetch OpenAPI specification
const spec = await get_openapi_spec();

// 3. Analyze available endpoints
// 4. Plan tests based on specification
// 5. Store insights about the API
```

**Knowledge storage:**
- Always store significant API changes as `api_mapping` memories
- Document new endpoints and their responsibilities
- Relate endpoints to features and requirements

### 2.2 `make_api_request` Protocol

**When to use:**
- After implementing any endpoint
- To test success scenarios (happy path)
- To test error scenarios and edge cases
- To validate changes in existing endpoints
- During API problem debugging

**Mandatory test sequence:**

#### 2.2.1 Success Tests (Happy Path)
```javascript
// Basic functionality test
const successTest = await make_api_request({
  method: "POST",
  url: "http://localhost:3000/api/v1/users",
  headers: { "Content-Type": "application/json" },
  body: {
    name: "Test User",
    email: "test@example.com"
  }
});
```

#### 2.2.2 Validation Tests (Boundary Testing)
```javascript
// Test with invalid data
const validationTest = await make_api_request({
  method: "POST",
  url: "http://localhost:3000/api/v1/users",
  headers: { "Content-Type": "application/json" },
  body: {
    name: "", // Required field empty
    email: "invalid-email" // Invalid email
  }
});
```

#### 2.2.3 Authentication/Authorization Tests
```javascript
// Test without authentication (if required)
const authTest = await make_api_request({
  method: "GET",
  url: "http://localhost:3000/api/v1/users/profile"
  // No authentication headers
});
```

#### 2.2.4 Edge Case Tests
```javascript
// Test with very large payload
// Test with special characters
// Test rate limiting boundaries
```

## 3. Task Management Integration

### 3.1 Per-Task Validation Pattern

**For each implemented task:**
1. **Implement** the functionality
2. **Validate** using `get_openapi_spec` to verify endpoint appears correctly
3. **Test** using `make_api_request` with multiple scenarios
4. **Document** test results
5. **Store** discovered patterns and insights
6. **Update** task status only after complete validation

### 3.2 Task Validation Template

```markdown
# Task Validation: {task_name}

## OpenAPI Validation
- [ ] Endpoint appears in OpenAPI specification
- [ ] Request schema is correct
- [ ] Response schema is correct
- [ ] Status codes are documented

## Functional Testing
- [ ] Happy path test passed
- [ ] Validation error test passed
- [ ] Authentication test passed (if applicable)
- [ ] Edge cases tested
- [ ] Error scenarios tested

## Results Summary
- Success tests: X/X passed
- Error tests: X/X passed
- Performance: Response time < XYZms
- Issues found: [list any issues]

## Next Steps
- [ ] Fix any identified issues
- [ ] Store successful patterns
- [ ] Update documentation if needed
```

## 4. Autonomous Testing Patterns

### 4.1 Test Case Generation

**Based on OpenAPI spec, automatically generate:**
- Test cases for all endpoints
- Validation of all status codes
- Tests with valid and invalid data
- Content type tests (JSON, form-data, etc.)

### 4.2 Regression Testing

**After any API changes:**
1. Re-run basic test suite
2. Validate that existing endpoints weren't broken
3. Verify that new endpoints work correctly
4. Compare before/after performance

### 4.3 Error Pattern Recognition

**Identify and document error patterns:**
- Common validation errors
- Authentication problems
- Serialization/deserialization issues
- Performance problems

## 5. Agent Delegation Integration

### 5.1 Test Delegation

**Tasks that can be delegated:**
- Execution of extensive test suites
- Performance/load testing
- Test result documentation
- Automatic test case creation

**Delegation example:**
```javascript
await delegate_to_agent({
  task_id: "api-validation-comprehensive",
  agent_type: "gemini", // Systematic testing specialist
  execution_config: {
    sandbox_enabled: true,
    network_access: true, // Required for API calls
    timeout_minutes: 30
  },
  context: {
    instructions: "Execute comprehensive API validation using get_openapi_spec and make_api_request tools",
    constraints: [
      "Test all endpoints in the OpenAPI spec",
      "Include success and error scenarios",
      "Document all findings",
      "Store patterns as memories"
    ],
    working_directory: "src/"
  }
});
```

### 5.2 Delegated Validation Monitoring

```javascript
await monitor_agent_tasks({
  agent_type: "gemini",
  include_logs: true,
  task_filter: "api-validation"
});
```

## 6. Quality Gates and Exit Criteria

### 6.1 Task Completion Criteria

**A task can only be marked as "done" if:**
- [ ] Endpoint appears correctly in OpenAPI spec
- [ ] Happy path test returns 2xx status
- [ ] Error cases return appropriate status codes
- [ ] Validation tests block invalid data
- [ ] Performance is within acceptable limits
- [ ] Test results are documented

### 6.2 Feature Validation Checklist

**Before considering a feature complete:**
- [ ] All feature endpoints tested
- [ ] Integration between endpoints validated
- [ ] End-to-end use case scenarios tested
- [ ] API documentation updated
- [ ] Test patterns stored for reuse

## 7. Error Handling and Recovery

### 7.1 Common Failure Scenarios

**Server not running:**
```javascript
try {
  const spec = await get_openapi_spec();
} catch (error) {
  // Automatically try to start server
  await dev({ port: 3000 });
  // Wait for initialization and try again
}
```

**Request timeouts:**
```javascript
const result = await make_api_request({
  method: "POST",
  url: "/api/v1/heavy-operation",
  timeout: 30000, // Increase timeout for heavy operations
  body: data
});
```

### 7.2 Debugging Pattern

**When tests fail:**
1. **Analyze** `make_api_request` response
2. **Check** development server logs
3. **Review** OpenAPI spec for contracts
4. **Investigate** endpoint code using `analyze_file`
5. **Store** solution as `bug_pattern` memory

## 8. Performance and Optimization

### 8.1 Test Execution Strategy

**To avoid overload:**
- Execute basic tests after each change
- Run complete suites periodically
- Use appropriate timeouts for different test types
- Cache results for unchanged tests

### 8.2 Parallel Testing

**With agent delegation:**
- Divide tests by features/controllers
- Execute different test types in parallel
- Consolidate results at the end
- Validate no conflicts between parallel tests

## 9. Memory Storage Patterns

### 9.1 Test Results Storage

```javascript
// Store successful test results
await store_memory({
  type: "api_mapping",
  title: "User API Validation Results",
  content: `# API Validation Results

  ## Endpoints Tested
  - POST /api/v1/users - ✅ 201 Created
  - GET /api/v1/users/:id - ✅ 200 OK
  - PUT /api/v1/users/:id - ✅ 200 OK

  ## Test Cases
  - Valid data creation: PASS
  - Invalid email validation: PASS
  - Authentication required: PASS`,
  tags: ["api", "validation", "user-feature", "testing"],
  confidence: 0.9
});
```

### 9.2 Pattern Recognition

```javascript
// Store identified error patterns
await store_memory({
  type: "bug_pattern",
  title: "Common validation error pattern",
  content: `# Pattern: Zod validation errors return 400

  When request body doesn't match Zod schema:
  - Status: 400 Bad Request
  - Body contains detailed field-level errors
  - Error format: { field: string, message: string }[]`,
  tags: ["validation", "error-handling", "zod", "pattern"]
});
```

## 10. Best Practices Summary

1. **Always start dev server** before API validation
2. **Get OpenAPI spec first** to understand available endpoints
3. **Test happy path and error cases** for every endpoint
4. **Store successful patterns** for reuse
5. **Document failure scenarios** for debugging
6. **Use appropriate timeouts** for different operations
7. **Delegate comprehensive testing** to specialized agents
8. **Validate before marking tasks complete**
9. **Monitor delegated validation work** regularly
10. **Build regression test patterns** for critical paths

This integration of API validation tools ensures that Lia can autonomously test her implementations, quickly identify problems, and maintain API quality without depending on manual user intervention.
