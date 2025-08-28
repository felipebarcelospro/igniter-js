/**
 * GitHub Integration Tools - Repository interaction, issues, and code search
 */

import { z } from "zod";
import { ToolsetContext } from "./types";

export function registerGitHubTools({ server, octokit }: ToolsetContext) {
  // --- GitHub Integration Tools ---
  server.registerTool("search_github_issues", {
    title: "Search GitHub Issues",
    description: "Search for GitHub issues across repositories",
    inputSchema: {
      query: z.string().describe("Search query for issues"),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. Defaults to 'felipebarcelospro/igniter-js'"),
      state: z.enum(['open', 'closed', 'all']).optional().describe("Issue state filter"),
      labels: z.array(z.string()).optional().describe("Labels to filter by"),
      sort: z.enum(['created', 'updated', 'comments']).optional().describe("Sort order"),
      order: z.enum(['asc', 'desc']).optional().describe("Sort direction"),
      per_page: z.number().min(1).max(100).optional().describe("Number of results per page (max 100)")
    },
  }, async ({ query, repository, state, labels, sort, order, per_page }: { 
    query: string, 
    repository?: string, 
    state?: string,
    labels?: string[],
    sort?: string,
    order?: string,
    per_page?: number
  }) => {
    try {
      const [owner, repo] = (repository || 'felipebarcelospro/igniter-js').split('/');
      
      const searchQuery = `${query} repo:${owner}/${repo}`;
      
      const response = await octokit.rest.search.issuesAndPullRequests({
        q: searchQuery,
        sort: sort as any,
        order: order as any,
        per_page: per_page || 30
      });
      
      const issues = response.data.items.map((issue: any) => ({
        number: issue.number,
        title: issue.title,
        state: issue.state,
        created_at: issue.created_at,
        updated_at: issue.updated_at,
        html_url: issue.html_url,
        user: issue.user?.login,
        labels: issue.labels.map((label: any) => label.name),
        body: issue.body?.substring(0, 500) + (issue.body && issue.body.length > 500 ? '...' : '')
      }));
      
      const result = {
        total_count: response.data.total_count,
        issues
      };
      
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error searching GitHub issues: ${error.message}` }] };
    }
  });

  server.registerTool("create_github_issue", {
    title: "Create GitHub Issue",
    description: "Create a new GitHub issue",
    inputSchema: {
      title: z.string().describe("Issue title"),
      body: z.string().describe("Issue body/description"),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. Defaults to 'felipebarcelospro/igniter-js'"),
      labels: z.array(z.string()).optional().describe("Labels to add to the issue"),
      assignees: z.array(z.string()).optional().describe("Users to assign to the issue")
    },
  }, async ({ title, body, repository, labels, assignees }: { 
    title: string, 
    body: string, 
    repository?: string,
    labels?: string[],
    assignees?: string[]
  }) => {
    try {
      const [owner, repo] = (repository || 'felipebarcelospro/igniter-js').split('/');
      
      const issue = await octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
        assignees
      });
      
      const result = {
        number: issue.data.number,
        title: issue.data.title,
        html_url: issue.data.html_url,
        state: issue.data.state,
        created_at: issue.data.created_at
      };
      
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error creating GitHub issue: ${error.message}` }] };
    }
  });

  server.registerTool("get_github_issue", {
    title: "Get GitHub Issue Details",
    description: "Gets detailed information about a specific GitHub issue.",
    inputSchema: {
      issueNumber: z.number(),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. Defaults to 'felipebarcelospro/igniter-js'")
    },
  }, async ({ issueNumber, repository }: { issueNumber: number, repository?: string }) => {
    try {
      const [owner, repo] = (repository || 'felipebarcelospro/igniter-js').split('/');
      
      const issue = await octokit.rest.issues.get({
        owner,
        repo,
        issue_number: issueNumber
      });
      
      const result = {
        number: issue.data.number,
        title: issue.data.title,
        body: issue.data.body,
        state: issue.data.state,
        created_at: issue.data.created_at,
        updated_at: issue.data.updated_at,
        closed_at: issue.data.closed_at,
        html_url: issue.data.html_url,
        user: issue.data.user?.login,
        assignees: issue.data.assignees?.map((assignee: any) => assignee.login),
        labels: issue.data.labels.map((label: any) => label.name),
        milestone: issue.data.milestone?.title,
        comments: issue.data.comments
      };
      
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error getting GitHub issue: ${error.message}` }] };
    }
  });

  server.registerTool("search_github_code", {
    title: "Search GitHub Code",
    description: "Searches for code patterns across GitHub repositories for learning and integration examples.",
    inputSchema: {
      query: z.string().describe("Code search query"),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. If not specified, searches across GitHub"),
      language: z.string().optional().describe("Programming language filter (typescript, javascript, etc.)"),
      filename: z.string().optional().describe("Filename pattern to search in")
    },
  }, async ({ query, repository, language, filename }: { query: string, repository?: string, language?: string, filename?: string }) => {
    try {
      let searchQuery = query;
      
      if (repository) {
        searchQuery += ` repo:${repository}`;
      }
      if (language) {
        searchQuery += ` language:${language}`;
      }
      if (filename) {
        searchQuery += ` filename:${filename}`;
      }
      
      const response = await octokit.rest.search.code({
        q: searchQuery,
        per_page: 20
      });
      
      const results = response.data.items.map((item: any) => ({
        name: item.name,
        path: item.path,
        repository: item.repository.full_name,
        html_url: item.html_url,
        score: item.score
      }));
      
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error searching GitHub code: ${error.message}` }] };
    }
  });
}
