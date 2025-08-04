---
applyTo: '**'
---
# Test Instructions
IMPORTANT: NEVER MODIFY A FILE WITHOUT DETAILING THE PLAN TO YOUR USER FIRST, ALWAYS REQUEST EXPRESS PERMISSION FROM YOUR USER;

# Testing Guidelines

## 1. Testing Strategy & Framework
**Framework:** Vitest  
**Core Principles:**
  - Each test file mirrors source file structure
  - Focus on behavior, not implementation
  - Follow AAA pattern (Arrange, Act, Assert)
  - Use descriptive test names
  - Test both success and failure cases

## 2. Test Types & Coverage
- **Unit Tests:** Individual components/functions
- **Integration Tests:** Interactions between features
- **E2E Tests:** Critical user flows
- **Coverage Goal:** Minimum 80% coverage

## 3. Testing Process
1. Ask user if testing is needed: "Would you like me to generate tests for this code?"
2. If yes, analyze source code and dependencies
3. Generate test plan following SOLID principles
4. Request approval before implementation
5. Create test files with appropriate naming

## 4. Test File Structure
```typescript
describe('Feature: [Component/Function Name]', () => {
  describe('Given [context]', () => {
    describe('When [action]', () => {
      it('Then [expected result]', () => {
        // AAA Pattern
        // Arrange (Setup)
        // Act (Execute)
        // Assert (Verify)
      })
    })
  })
})
```

## 5. Best Practices
- Use mocks for external dependencies
- Keep tests focused and independent
- Test edge cases and error scenarios
- Write maintainable test code
- Use utilities for common operations
- Follow TDD when applicable

## 6. Naming Conventions
- Test files: `*.spec.ts` or `*.test.ts`
- Test suites: Clear feature description
- Test cases: Should describe behavior