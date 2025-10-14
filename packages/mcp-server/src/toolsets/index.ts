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
  if (process.env.ENABLE_CLI_TOOLS !== 'false') {
    registerCliTools(context);
  }

  // API development and testing
  if (process.env.ENABLE_API_VALIDATION_TOOLS !== 'false') {
    registerApiValidationTools(context);
  }

  // Research and documentation
  if (process.env.ENABLE_DOCUMENTATION_TOOLS !== 'false') {
    registerDocumentationTools(context);
  }
  if (process.env.ENABLE_GITHUB_TOOLS !== 'false') {
    registerGitHubTools(context);
  }

  // Code analysis and investigation
  if (process.env.ENABLE_FILE_ANALYSIS_TOOLS !== 'false') {
    registerFileAnalysisTools(context);
  }
  if (process.env.ENABLE_CODE_INVESTIGATION_TOOLS !== 'false') {
    registerCodeInvestigationTools(context);
  }
  if (process.env.ENABLE_DEBUGGING_TOOLS !== 'false') {
    registerDebuggingTools(context);
  }

  // Knowledge and task management
  if (process.env.ENABLE_MEMORY_TOOLS !== 'false') {
    registerMemoryTools(context);
  }
  if (process.env.ENABLE_TASK_MANAGEMENT_TOOLS !== 'false') {
    registerTaskManagementTools(context);
  }

  // Agent delegation and automation
  if (process.env.ENABLE_AGENT_DELEGATION_TOOLS !== 'false') {
    registerAgentDelegationTools(context);
  }
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
