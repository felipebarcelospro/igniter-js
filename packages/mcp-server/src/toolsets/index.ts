/**
 * Toolsets Registry - Centralized registration of all MCP tools
 */

import { ToolsetContext } from "./types";
import { registerCliTools } from "./cli";
import { registerApiValidationTools } from "./api-validation";
import { registerDocumentationTools } from "./documentation";
import { registerGitHubTools } from "./github";
import { registerFileAnalysisTools } from "./file-analysis";
import { registerCodeInvestigationTools } from "./code-investigation";
import { registerMemoryTools } from "./memory";
import { registerTaskManagementTools } from "./task-management";
import { registerAgentDelegationTools } from "./agent-delegation";
import { registerDebuggingTools } from "./debugging";

/**
 * Register all toolsets with the MCP server
 */
export function registerAllToolsets(context: ToolsetContext) {
  // Development and project management
  registerCliTools(context);

  // API development and testing
  registerApiValidationTools(context);

  // Research and documentation
  registerDocumentationTools(context);
  registerGitHubTools(context);

  // Code analysis and investigation
  registerFileAnalysisTools(context);
  registerCodeInvestigationTools(context);
  registerDebuggingTools(context);

  // Knowledge and task management
  registerMemoryTools(context);
  registerTaskManagementTools(context);

  // Agent delegation and automation
  registerAgentDelegationTools(context);
}

// Export individual toolset registrars for selective registration
export {
  registerCliTools,
  registerApiValidationTools,
  registerDocumentationTools,
  registerGitHubTools,
  registerFileAnalysisTools,
  registerCodeInvestigationTools,
  registerDebuggingTools,
  registerMemoryTools,
  registerTaskManagementTools,
  registerAgentDelegationTools
};
