/**
 * @fileoverview Tests for IgniterJobsScopeUtils
 */

import { describe, it, expect } from "vitest";
import { IgniterJobsScopeUtils } from "./scope";
import type { IgniterJobsScopeEntry } from "../types/scope";

describe("IgniterJobsScopeUtils", () => {
  describe("SCOPE_METADATA_KEY", () => {
    it("has the correct key value", () => {
      expect(IgniterJobsScopeUtils.SCOPE_METADATA_KEY).toBe(
        "__igniter_jobs_scope"
      );
    });
  });

  describe("mergeMetadataWithScope()", () => {
    it("returns undefined when no scope is provided", () => {
      const result = IgniterJobsScopeUtils.mergeMetadataWithScope(
        undefined,
        undefined
      );

      expect(result).toBeUndefined();
    });

    it("returns original metadata when no scope is provided", () => {
      const metadata = { userId: "user_123", traceId: "trace_456" };

      const result = IgniterJobsScopeUtils.mergeMetadataWithScope(
        metadata,
        undefined
      );

      expect(result).toBe(metadata);
    });

    it("creates metadata with scope when metadata is undefined", () => {
      const scope: IgniterJobsScopeEntry = { type: "organization", id: "org_1" };

      const result = IgniterJobsScopeUtils.mergeMetadataWithScope(
        undefined,
        scope
      );

      expect(result).toEqual({
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: scope,
      });
    });

    it("merges scope into existing metadata", () => {
      const metadata = { userId: "user_123", traceId: "trace_456" };
      const scope: IgniterJobsScopeEntry = { type: "organization", id: "org_1" };

      const result = IgniterJobsScopeUtils.mergeMetadataWithScope(
        metadata,
        scope
      );

      expect(result).toEqual({
        userId: "user_123",
        traceId: "trace_456",
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: scope,
      });
    });

    it("does not mutate original metadata", () => {
      const metadata = { userId: "user_123" };
      const scope: IgniterJobsScopeEntry = { type: "organization", id: "org_1" };

      const result = IgniterJobsScopeUtils.mergeMetadataWithScope(
        metadata,
        scope
      );

      expect(metadata).not.toHaveProperty(
        IgniterJobsScopeUtils.SCOPE_METADATA_KEY
      );
      expect(result).not.toBe(metadata);
    });

    it("overwrites existing scope in metadata", () => {
      const existingScope: IgniterJobsScopeEntry = {
        type: "user",
        id: "user_old",
      };
      const metadata = {
        userId: "user_123",
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: existingScope,
      };
      const newScope: IgniterJobsScopeEntry = {
        type: "organization",
        id: "org_new",
      };

      const result = IgniterJobsScopeUtils.mergeMetadataWithScope(
        metadata,
        newScope
      );

      expect(result?.[IgniterJobsScopeUtils.SCOPE_METADATA_KEY]).toEqual(
        newScope
      );
    });

    it("handles numeric scope id", () => {
      const scope: IgniterJobsScopeEntry = { type: "tenant", id: 12345 };

      const result = IgniterJobsScopeUtils.mergeMetadataWithScope(
        undefined,
        scope
      );

      expect(result?.[IgniterJobsScopeUtils.SCOPE_METADATA_KEY]).toEqual(scope);
    });

    it("handles empty metadata object", () => {
      const scope: IgniterJobsScopeEntry = { type: "organization", id: "org_1" };

      const result = IgniterJobsScopeUtils.mergeMetadataWithScope({}, scope);

      expect(result).toEqual({
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: scope,
      });
    });
  });

  describe("extractScopeFromMetadata()", () => {
    it("returns undefined when metadata is undefined", () => {
      const result = IgniterJobsScopeUtils.extractScopeFromMetadata(undefined);

      expect(result).toBeUndefined();
    });

    it("returns undefined when metadata has no scope key", () => {
      const metadata = { userId: "user_123", traceId: "trace_456" };

      const result = IgniterJobsScopeUtils.extractScopeFromMetadata(metadata);

      expect(result).toBeUndefined();
    });

    it("returns undefined when scope value is not an object", () => {
      const metadata = {
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: "invalid",
      };

      const result = IgniterJobsScopeUtils.extractScopeFromMetadata(metadata);

      expect(result).toBeUndefined();
    });

    it("returns undefined when scope value is null", () => {
      const metadata = {
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: null,
      };

      const result = IgniterJobsScopeUtils.extractScopeFromMetadata(metadata);

      expect(result).toBeUndefined();
    });

    it("returns undefined when scope is missing type property", () => {
      const metadata = {
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: { id: "org_1" },
      };

      const result = IgniterJobsScopeUtils.extractScopeFromMetadata(metadata);

      expect(result).toBeUndefined();
    });

    it("returns undefined when scope is missing id property", () => {
      const metadata = {
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: { type: "organization" },
      };

      const result = IgniterJobsScopeUtils.extractScopeFromMetadata(metadata);

      expect(result).toBeUndefined();
    });

    it("extracts valid scope from metadata", () => {
      const scope: IgniterJobsScopeEntry = { type: "organization", id: "org_1" };
      const metadata = {
        userId: "user_123",
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: scope,
      };

      const result = IgniterJobsScopeUtils.extractScopeFromMetadata(metadata);

      expect(result).toEqual(scope);
    });

    it("extracts scope with numeric id", () => {
      const scope: IgniterJobsScopeEntry = { type: "tenant", id: 12345 };
      const metadata = {
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: scope,
      };

      const result = IgniterJobsScopeUtils.extractScopeFromMetadata(metadata);

      expect(result).toEqual(scope);
    });

    it("extracts scope with additional properties (ignores them)", () => {
      const scopeWithExtra = {
        type: "organization",
        id: "org_1",
        extraProp: "should be included",
      };
      const metadata = {
        [IgniterJobsScopeUtils.SCOPE_METADATA_KEY]: scopeWithExtra,
      };

      const result = IgniterJobsScopeUtils.extractScopeFromMetadata(metadata);

      expect(result).toBeDefined();
      expect(result?.type).toBe("organization");
      expect(result?.id).toBe("org_1");
    });

    it("handles empty metadata object", () => {
      const result = IgniterJobsScopeUtils.extractScopeFromMetadata({});

      expect(result).toBeUndefined();
    });
  });

  describe("round-trip (merge then extract)", () => {
    it("can extract scope that was merged", () => {
      const originalScope: IgniterJobsScopeEntry = {
        type: "organization",
        id: "org_123",
      };
      const metadata = { userId: "user_456" };

      const merged = IgniterJobsScopeUtils.mergeMetadataWithScope(
        metadata,
        originalScope
      );
      const extracted = IgniterJobsScopeUtils.extractScopeFromMetadata(merged);

      expect(extracted).toEqual(originalScope);
    });

    it("handles multiple merge operations", () => {
      const scope1: IgniterJobsScopeEntry = { type: "user", id: "user_1" };
      const scope2: IgniterJobsScopeEntry = { type: "organization", id: "org_1" };

      const merged1 = IgniterJobsScopeUtils.mergeMetadataWithScope(
        undefined,
        scope1
      );
      const merged2 = IgniterJobsScopeUtils.mergeMetadataWithScope(
        merged1,
        scope2
      );

      const extracted = IgniterJobsScopeUtils.extractScopeFromMetadata(merged2);

      // Last scope wins
      expect(extracted).toEqual(scope2);
    });
  });
});
