---
description: Establishes a persistent memory protocol for capturing and retrieving knowledge, including storage strategies, context retrieval, and proactive memory management for continuous learning.
globs: []
alwaysApply: true
---

# Memory & Context Management

## 1. Persistent Memory Protocol

### 1.1 Memory Storage Strategy
**ALWAYS store memories for:**
- User preferences and communication styles
- Successful workflows and patterns discovered
- Architectural decisions and their rationales
- Bug patterns and their solutions
- Performance insights and optimizations
- Project-specific conventions and standards
- User corrections and feedback

**Memory Types & Usage:**
- `user_preference`: Communication style, technical preferences, workflow likes/dislikes
- `architectural_decision`: System design choices, technology selections, integration patterns
- `code_pattern`: Reusable code structures, development workflows, best practices
- `bug_pattern`: Common errors, debugging approaches, solution patterns
- `performance_insight`: Optimization techniques, bottlenecks identified, measurement results
- `insight`: General learnings, observations, connections between concepts
- `relationship_map`: How different components/concepts relate to each other

### 1.2 Context Retrieval Strategy
**Before ANY significant task:**
1. Search memories with relevant tags/keywords
2. Check for similar patterns or past solutions
3. Review user preferences for this type of work
4. Look for architectural decisions that might impact the approach

**Search Patterns:**
- Use broad keywords first, then narrow down
- Search by type when looking for specific kinds of information
- Use tag combinations for precise filtering
- Check confidence levels to prioritize reliable information

### 1.3 Memory Relationships & Evolution
- **ALWAYS create relationships** between related memories using `mcp_igniter-mcp_relate_memories`
- Use relationship types: `implements`, `uses`, `extends`, `contradicts`, `similar_to`, `depends_on`
- Update existing memories when new information contradicts or extends them
- Build knowledge graphs that show how concepts connect

## 2. Proactive Memory Management

### 2.1 Memory Triggers (When to Store)
**Explicit Signals:**
- User says: "remember this", "next time", "always do", "don't do this again"
- User provides corrections or alternative approaches
- User explains their preferences or workflow

**Implicit Signals:**
- Novel solutions discovered during problem-solving
- Successful completion of complex tasks
- Performance improvements achieved
- Architectural patterns that work well together
- Integration approaches that solve compatibility issues

### 2.2 Memory Quality Guidelines
**High-Quality Memories Include:**
- Clear, actionable content
- Relevant tags for discoverability
- Appropriate confidence levels (0.8+ for well-tested patterns)
- Context about when/why the pattern applies
- Specific examples or implementation details

**Tags Should Be:**
- Consistent across similar memories
- Specific enough to be useful
- Include both technical and contextual tags
- Use project-specific terminology when relevant

## 3. Knowledge Graph Development

### 3.1 Building Connections
- When storing new memories, identify related existing memories
- Create explicit relationships between connected concepts
- Use `mcp_igniter-mcp_visualize_memory_graph` to understand knowledge structure
- Look for patterns and gaps in the knowledge graph

### 3.2 Knowledge Evolution
- Regularly search for related memories when working on similar tasks
- Update confidence levels based on repeated success/failure
- Supersede old memories with better approaches
- Document when and why approaches change

## 4. Context-Aware Decision Making

### 4.1 Pre-Task Memory Check
**MANDATORY before starting any task:**
1. Search for memories related to the current task
2. Check user preferences that might affect approach
3. Review past solutions to similar problems
4. Identify architectural constraints or decisions
5. Look for performance considerations or patterns

### 4.2 Memory-Informed Responses
- Reference past decisions when making new ones
- Explain connections to previous work
- Build incrementally on established patterns
- Respect user preferences consistently
- Apply lessons learned from past mistakes

## 5. Continuous Learning

### 5.1 Success Pattern Recognition
- Document what works well and why
- Tag successful approaches for easy retrieval
- Create relationships between successful patterns
- Build confidence in proven approaches

### 5.2 Failure Pattern Avoidance
- Store failed approaches with analysis of why they failed
- Tag with specific failure modes
- Create relationships to better alternatives
- Use lower confidence for unreliable patterns

### 5.3 User Feedback Integration
- Always store user corrections with high confidence
- Tag corrections with "user_correction" for priority
- Update related memories when user provides better approaches
- Learn from user preferences to improve future suggestions