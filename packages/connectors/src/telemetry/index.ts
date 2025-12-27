/**
 * @fileoverview Telemetry events for @igniter-js/connectors
 * @module @igniter-js/connectors/telemetry
 *
 * @description
 * Defines telemetry events for connector operations including connections,
 * disconnections, OAuth flows, actions, webhooks, and errors. Events use
 * dot notation namespacing and follow the IgniterTelemetry pattern.
 *
 * ### Important Redaction Rules
 *
 * **NEVER** expose these fields in telemetry attributes:
 * - Connector configurations (may contain API keys, tokens, secrets)
 * - OAuth tokens (accessToken, refreshToken, clientSecret)
 * - Webhook payloads (may contain sensitive user data)
 * - User information (emails, phone numbers, addresses)
 * - Action inputs/outputs (may contain PII or sensitive data)
 *
 * **SAFE** to expose:
 * - Connector keys/provider names (e.g., 'telegram', 'slack')
 * - Action names (e.g., 'sendMessage', 'createRecord')
 * - Scope types (e.g., 'organization', 'user')
 * - Scope identifiers (e.g., 'org_123', 'user_456')
 * - Timestamps and durations
 * - Success/failure states
 * - Error codes and messages (redacted)
 *
 * @example
 * ```typescript
 * import { IgniterConnectorsTelemetryEvents } from '@igniter-js/connectors/telemetry'
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(IgniterConnectorsTelemetryEvents)
 *   .withRedaction({
 *     denylistKeys: [
 *       'config',
 *       'accessToken',
 *       'refreshToken',
 *       'clientSecret',
 *       'apiKey',
 *       'token',
 *       'secret',
 *       'password',
 *       'payload',
 *       'input',
 *       'output',
 *       'userInfo',
 *     ],
 *     hashKeys: ['ctx.identity'],
 *   })
 *   .build()
 * ```
 */

import { IgniterTelemetryEvents } from "@igniter-js/telemetry";
import { z } from "zod";

/**
 * Base attributes present in all connector events.
 * These are safe to expose and provide operational context.
 */
const BaseConnectorAttributesSchema = z.object({
  /**
   * The connector provider key (e.g., 'telegram', 'slack', 'mailchimp').
   * Safe to expose as it's a system identifier.
   */
  "ctx.connector.provider": z.string(),

  /**
   * The scope type for this operation (e.g., 'organization', 'user', 'system').
   * Safe to expose as it's a system identifier.
   */
  "ctx.connector.scope": z.string(),

  /**
   * The scope identifier (e.g., 'org_123', 'user_456').
   * Can be hashed if needed for privacy.
   */
  "ctx.connector.identity": z.string().optional(),
});

/**
 * Attributes for connection lifecycle events.
 * Extended from base attributes with connection-specific fields.
 */
const ConnectionAttributesSchema = BaseConnectorAttributesSchema.extend({
  /**
   * Whether encryption is enabled for this connector.
   */
  "ctx.connector.encrypted": z.boolean().optional(),

  /**
   * The number of encrypted fields in the configuration.
   * Safe to expose as metadata.
   */
  "ctx.connector.encryptedFields": z.number().optional(),
});

/**
 * Attributes for OAuth-related events.
 * Includes OAuth flow metadata without exposing sensitive tokens.
 */
const OAuthAttributesSchema = BaseConnectorAttributesSchema.extend({
  /**
   * The OAuth authorization URL (domain only, no query params).
   * Safe to expose as it's public information.
   */
  "ctx.oauth.authorizationUrl": z.string().optional(),

  /**
   * The OAuth token URL (domain only).
   * Safe to expose as it's public information.
   */
  "ctx.oauth.tokenUrl": z.string().optional(),

  /**
   * Whether PKCE is enabled for this OAuth flow.
   */
  "ctx.oauth.pkce": z.boolean().optional(),

  /**
   * The OAuth scopes requested (comma-separated).
   * Safe to expose as it's public information.
   */
  "ctx.oauth.scopes": z.string().optional(),

  /**
   * The OAuth state parameter (hashed for verification).
   * Not the actual state value, just confirmation it exists.
   */
  "ctx.oauth.hasState": z.boolean().optional(),
});

/**
 * Attributes for action execution events.
 * Includes action metadata without exposing input/output data.
 */
const ActionAttributesSchema = BaseConnectorAttributesSchema.extend({
  /**
   * The action key being executed (e.g., 'sendMessage', 'createRecord').
   * Safe to expose as it's a system identifier.
   */
  "ctx.action.name": z.string(),

  /**
   * Action execution duration in milliseconds.
   */
  "ctx.action.durationMs": z.number().optional(),

  /**
   * Whether the action completed successfully.
   */
  "ctx.action.success": z.boolean().optional(),
});

/**
 * Attributes for webhook events.
 * Includes webhook metadata without exposing payload data.
 */
const WebhookAttributesSchema = BaseConnectorAttributesSchema.extend({
  /**
   * The HTTP method of the webhook request.
   */
  "ctx.webhook.method": z.string().optional(),

  /**
   * The webhook URL path (without query parameters).
   */
  "ctx.webhook.path": z.string().optional(),

  /**
   * The webhook processing duration in milliseconds.
   */
  "ctx.webhook.durationMs": z.number().optional(),

  /**
   * Whether signature verification was performed.
   */
  "ctx.webhook.verified": z.boolean().optional(),
});

/**
 * Attributes for error events.
 * Includes error metadata without exposing sensitive details.
 */
const ErrorAttributesSchema = BaseConnectorAttributesSchema.extend({
  /**
   * The error code (e.g., 'CONNECTOR_NOT_CONNECTED').
   * Safe to expose as it's a system identifier.
   */
  "ctx.error.code": z.string(),

  /**
   * The error message (sanitized, no sensitive data).
   */
  "ctx.error.message": z.string().optional(),

  /**
   * The operation that failed (e.g., 'connect', 'action', 'oauth').
   */
  "ctx.error.operation": z.string().optional(),

  /**
   * The action name if error occurred during action execution.
   */
  "ctx.error.action": z.string().optional(),
});

/**
 * Telemetry events for @igniter-js/connectors.
 *
 * ### Event Naming Convention
 * All events are prefixed with 'igniter.connectors' followed by:
 * - `connector.*` - Connector lifecycle events
 * - `oauth.*` - OAuth flow events
 * - `action.*` - Action execution events
 * - `webhook.*` - Webhook handling events
 * - `error.*` - Error events
 *
 * ### Usage with IgniterConnector
 *
 * These events are automatically emitted when you use `withTelemetry()`:
 *
 * ```typescript
 * import { IgniterConnector } from '@igniter-js/connectors'
 * import { IgniterTelemetry } from '@igniter-js/telemetry'
 * import { IgniterConnectorsTelemetryEvents } from '@igniter-js/connectors/telemetry'
 *
 * const telemetry = IgniterTelemetry.create()
 *   .withService('my-api')
 *   .addEvents(IgniterConnectorsTelemetryEvents)
 *   .withRedaction({
 *     denylistKeys: ['config', 'accessToken', 'refreshToken', 'payload'],
 *     hashKeys: ['ctx.connector.identity'],
 *   })
 *   .build()
 *
 * const connectors = IgniterConnector.create()
 *   .withDatabase(adapter)
 *   .withTelemetry(telemetry) // Events auto-emitted!
 *   .build()
 * ```
 */
export const IgniterConnectorsTelemetryEvents = IgniterTelemetryEvents.namespace(
  "igniter.connectors",
)
  // ============================================================================
  // CONNECTOR LIFECYCLE EVENTS
  // ============================================================================
  .group("connector", (g) =>
    g
      /**
       * Emitted when a connector is successfully connected.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Encryption metadata
       *
       * **Redacted Attributes:**
       * - Configuration values (may contain secrets)
       */
      .event("connected", ConnectionAttributesSchema)

      /**
       * Emitted when a connector is disconnected.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       */
      .event("disconnected", BaseConnectorAttributesSchema)

      /**
       * Emitted when a connector is enabled.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       */
      .event("enabled", BaseConnectorAttributesSchema)

      /**
       * Emitted when a connector is disabled.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       */
      .event("disabled", BaseConnectorAttributesSchema)

      /**
       * Emitted when a connector configuration is updated.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Encryption metadata
       *
       * **Redacted Attributes:**
       * - Old and new configuration values
       */
      .event("updated", ConnectionAttributesSchema),
  )

  // ============================================================================
  // OAUTH FLOW EVENTS
  // ============================================================================
  .group("oauth", (g) =>
    g
      /**
       * Emitted when an OAuth flow is initiated.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - OAuth provider URLs (domain only)
       * - PKCE enabled flag
       * - Scopes requested
       *
       * **Redacted Attributes:**
       * - Client credentials
       * - State parameter value
       * - Redirect URLs (may contain internal paths)
       */
      .event("started", OAuthAttributesSchema)

      /**
       * Emitted when an OAuth flow completes successfully.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - OAuth provider URLs
       *
       * **Redacted Attributes:**
       * - Access tokens
       * - Refresh tokens
       * - User info returned by provider
       */
      .event("completed", OAuthAttributesSchema)

      /**
       * Emitted when an OAuth token is refreshed.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       *
       * **Redacted Attributes:**
       * - Old and new tokens
       */
      .event("refreshed", BaseConnectorAttributesSchema)

      /**
       * Emitted when an OAuth flow fails.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Error code
       * - Error message (sanitized)
       *
       * **Redacted Attributes:**
       * - State parameter
       * - Error descriptions with sensitive data
       */
      .event(
        "failed",
        OAuthAttributesSchema.extend({
          "ctx.error.code": z.string(),
          "ctx.error.message": z.string().optional(),
        }),
      ),
  )

  // ============================================================================
  // ACTION EXECUTION EVENTS
  // ============================================================================
  .group("action", (g) =>
    g
      /**
       * Emitted when an action starts execution.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Action name
       *
       * **Redacted Attributes:**
       * - Action input parameters
       */
      .event("started", ActionAttributesSchema)

      /**
       * Emitted when an action completes successfully.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Action name
       * - Execution duration
       *
       * **Redacted Attributes:**
       * - Action input parameters
       * - Action output/result data
       */
      .event("completed", ActionAttributesSchema)

      /**
       * Emitted when an action fails.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Action name
       * - Execution duration
       * - Error code
       * - Error message (sanitized)
       *
       * **Redacted Attributes:**
       * - Action input parameters
       * - Error details with sensitive data
       */
      .event(
        "failed",
        ActionAttributesSchema.extend({
          "ctx.error.code": z.string(),
          "ctx.error.message": z.string().optional(),
        }),
      ),
  )

  // ============================================================================
  // WEBHOOK EVENTS
  // ============================================================================
  .group("webhook", (g) =>
    g
      /**
       * Emitted when a webhook is received.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - HTTP method
       * - URL path (without params)
       * - Verification status
       *
       * **Redacted Attributes:**
       * - Webhook payload
       * - HTTP headers (may contain signatures)
       * - Query parameters
       */
      .event("received", WebhookAttributesSchema)

      /**
       * Emitted when webhook processing completes.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Processing duration
       *
       * **Redacted Attributes:**
       * - Webhook payload
       * - Processing result
       */
      .event("processed", WebhookAttributesSchema)

      /**
       * Emitted when webhook processing fails.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Error code
       * - Error message (sanitized)
       *
       * **Redacted Attributes:**
       * - Webhook payload
       * - Error details
       */
      .event(
        "failed",
        WebhookAttributesSchema.extend({
          "ctx.error.code": z.string(),
          "ctx.error.message": z.string().optional(),
        }),
      ),
  )

  // ============================================================================
  // ADAPTER EVENTS
  // ============================================================================
  .group("adapter", (g) =>
    g
      /**
       * Emitted when adapter fetches a connector from database.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Fetch duration
       */
      .event(
        "get",
        BaseConnectorAttributesSchema.extend({
          "ctx.adapter.durationMs": z.number().optional(),
          "ctx.adapter.found": z.boolean().optional(),
        }),
      )

      /**
       * Emitted when adapter lists connectors from database.
       *
       * **Safe Attributes:**
       * - Scope type and identity
       * - List duration
       * - Result count
       */
      .event(
        "list",
        BaseConnectorAttributesSchema.extend({
          "ctx.adapter.durationMs": z.number().optional(),
          "ctx.adapter.count": z.number().optional(),
        }),
      )

      /**
       * Emitted when adapter upserts a connector to database.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Upsert duration
       * - Whether it was an insert or update
       *
       * **Redacted Attributes:**
       * - Connector data being saved
       */
      .event(
        "upsert",
        ConnectionAttributesSchema.extend({
          "ctx.adapter.durationMs": z.number().optional(),
          "ctx.adapter.inserted": z.boolean().optional(),
        }),
      )

      /**
       * Emitted when adapter updates a connector in database.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Update duration
       *
       * **Redacted Attributes:**
       * - Connector data being updated
       */
      .event(
        "update",
        ConnectionAttributesSchema.extend({
          "ctx.adapter.durationMs": z.number().optional(),
        }),
      )

      /**
       * Emitted when adapter deletes a connector from database.
       *
       * **Safe Attributes:**
       * - Connector provider key
       * - Scope type and identity
       * - Delete duration
       */
      .event(
        "delete",
        BaseConnectorAttributesSchema.extend({
          "ctx.adapter.durationMs": z.number().optional(),
        }),
      ),
  )

  // ============================================================================
  // ERROR EVENTS
  // ============================================================================
  .group("error", (g) =>
    g
      /**
       * Emitted when a general connector error occurs.
       *
       * **Safe Attributes:**
       * - Connector provider key (if available)
       * - Scope type and identity (if available)
       * - Error code
       * - Error message (sanitized)
       * - Operation that failed
       *
       * **Redacted Attributes:**
       * - Error stack traces with sensitive data
       * - Configuration that caused error
       */
      .event("occurred", ErrorAttributesSchema),
  )
  .build();

/**
 * Type export for the events descriptor.
 * Use this type when registering with IgniterTelemetry.
 */
export type IgniterConnectorsTelemetryEvents =
  typeof IgniterConnectorsTelemetryEvents.$Infer.registry;
