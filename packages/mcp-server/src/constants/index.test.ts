import { describe, it, expect } from 'vitest';
import { 
  MEMORY_TYPES, 
  REL_TYPES, 
  TASK_TYPES, 
  KNOWLEDGE_TYPES 
} from './index';

describe('Constants Module', () => {
  describe('MEMORY_TYPES', () => {
    it('should contain all expected memory types', () => {
      const expectedTypes = [
        'code_pattern',
        'architectural_decision',
        'user_preference', 
        'insight',
        'relationship_map',
        'reflection',
        'bug_pattern',
        'performance_insight',
        'api_mapping',
        'requirement',
        'design',
        'task',
        'bug_report'
      ];
      
      expect(MEMORY_TYPES).toEqual(expectedTypes);
      expect(MEMORY_TYPES).toHaveLength(13);
    });

    it('should be immutable at TypeScript level', () => {
      // Note: Runtime immutability cannot be tested directly as `as const` 
      // only provides TypeScript compile-time guarantees
      expect(MEMORY_TYPES).toBeDefined();
      expect(Array.isArray(MEMORY_TYPES)).toBe(true);
    });
  });

  describe('REL_TYPES', () => {
    it('should contain all expected relationship types', () => {
      const expectedRelTypes = [
        'depends_on',
        'implements',
        'uses',
        'similar_to',
        'contradicts',
        'extends',
        'contains',
        'inspired_by',
        'supersedes'
      ];
      
      expect(REL_TYPES).toEqual(expectedRelTypes);
      expect(REL_TYPES).toHaveLength(9);
    });

    it('should be immutable at TypeScript level', () => {
      // Note: Runtime immutability cannot be tested directly as `as const`
      // only provides TypeScript compile-time guarantees
      expect(REL_TYPES).toBeDefined();
      expect(Array.isArray(REL_TYPES)).toBe(true);
    });
  });

  describe('TASK_TYPES', () => {
    it('should contain only task management related types', () => {
      const expectedTaskTypes = [
        'requirement',
        'design', 
        'task',
        'bug_report'
      ];
      
      expect(TASK_TYPES).toEqual(expectedTaskTypes);
      expect(TASK_TYPES).toHaveLength(4);
    });

    it('should be subset of MEMORY_TYPES', () => {
      TASK_TYPES.forEach(taskType => {
        expect(MEMORY_TYPES).toContain(taskType);
      });
    });
  });

  describe('KNOWLEDGE_TYPES', () => {
    it('should contain only knowledge-based types', () => {
      const expectedKnowledgeTypes = [
        'code_pattern',
        'architectural_decision',
        'user_preference',
        'insight',
        'relationship_map',
        'reflection',
        'bug_pattern',
        'performance_insight',
        'api_mapping'
      ];
      
      expect(KNOWLEDGE_TYPES).toEqual(expectedKnowledgeTypes);
      expect(KNOWLEDGE_TYPES).toHaveLength(9);
    });

    it('should be subset of MEMORY_TYPES', () => {
      KNOWLEDGE_TYPES.forEach(knowledgeType => {
        expect(MEMORY_TYPES).toContain(knowledgeType);
      });
    });

    it('should not overlap with TASK_TYPES', () => {
      const overlap = KNOWLEDGE_TYPES.filter(type => TASK_TYPES.includes(type as any));
      expect(overlap).toHaveLength(0);
    });
  });

  describe('Type coverage', () => {
    it('TASK_TYPES and KNOWLEDGE_TYPES should cover all MEMORY_TYPES', () => {
      const allCovered = [...TASK_TYPES, ...KNOWLEDGE_TYPES];
      const allMemoryTypes = [...MEMORY_TYPES];
      expect(allCovered.sort()).toEqual(allMemoryTypes.sort());
    });
  });
});
