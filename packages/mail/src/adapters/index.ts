/**
 * Mail adapters barrel export.
 *
 * Import from '@igniter-js/mail/adapters' for tree-shaking optimization.
 */

// Adapter types
export type * from "../types/adapter";

// Provider adapters
export * from "./postmark.adapter";
export * from "./resend.adapter";
export * from "./sendgrid.adapter";
export * from "./smtp.adapter";
export * from "./mock.adapter";
