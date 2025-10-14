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

  server.registerTool("read_github_file", {
    title: "Read GitHub File",
    description: "Reads the raw content of a file from a GitHub repository.",
    inputSchema: {
      owner: z.string().describe("The username or organization that owns the repository."),
      repo: z.string().describe("The name of the repository."),
      path: z.string().describe("The path to the file within the repository (e.g., src/main.ts)."),
      ref: z.string().optional().describe("The branch, tag, or commit SHA. Defaults to the repository's default branch if not provided."),
    },
  }, async ({ owner, repo, path, ref }: { owner: string, repo: string, path: string, ref?: string }) => {
    try {
      const response = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      // The getContent response for a file is an object, for a directory it's an array.
      if (Array.isArray(response.data)) {
        return { content: [{ type: "text", text: `Error: The specified path '${path}' is a directory, not a file.` }] };
      }

      // Ensure the response object is a file and has content.
      if ('content' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return { content: [{ type: "text", text: content }] };
      }

      // This case should ideally not be hit if the path is a file, but it's a safeguard.
      return { content: [{ type: "text", text: "Error: Could not retrieve file content. The path may not be a file or is empty." }] };
    } catch (error: any) {
      // Handle specific API errors based on status codes.
      if (error.status === 404) {
        return { content: [{ type: "text", text: `Error: The repository '${owner}/${repo}' or the file at path '${path}' was not found.` }] };
      }
      if (error.status === 403) {
        return { content: [{ type: "text", text: `Error: Permission denied. Check if you have access to the repository '${owner}/${repo}'.` }] };
      }
      // Generic error for network issues or other problems.
      return { content: [{ type: "text", text: `An unexpected error occurred: ${error.message}` }] };
    }
  });

  server.registerTool("update_github_issue", {
    title: "Update GitHub Issue",
    description: "Updates an existing GitHub issue (title, body, labels, assignees, state, etc.)",
    inputSchema: {
      issueNumber: z.number().describe("The issue number to update"),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. Defaults to 'felipebarcelospro/igniter-js'"),
      title: z.string().optional().describe("New title for the issue"),
      body: z.string().optional().describe("New body/description for the issue"),
      labels: z.array(z.string()).optional().describe("Labels to set on the issue"),
      assignees: z.array(z.string()).optional().describe("Users to assign to the issue"),
      state: z.enum(['open', 'closed']).optional().describe("New state for the issue"),
      milestone: z.number().optional().describe("Milestone number to associate with the issue")
    },
  }, async ({ issueNumber, repository, title, body, labels, assignees, state, milestone }: {
    issueNumber: number,
    repository?: string,
    title?: string,
    body?: string,
    labels?: string[],
    assignees?: string[],
    state?: string,
    milestone?: number
  }) => {
    try {
      const [owner, repo] = (repository || 'felipebarcelospro/igniter-js').split('/');

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (body !== undefined) updateData.body = body;
      if (labels !== undefined) updateData.labels = labels;
      if (assignees !== undefined) updateData.assignees = assignees;
      if (state !== undefined) updateData.state = state;
      if (milestone !== undefined) updateData.milestone = milestone;

      const issue = await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        ...updateData
      });

      const result = {
        number: issue.data.number,
        title: issue.data.title,
        body: issue.data.body,
        state: issue.data.state,
        updated_at: issue.data.updated_at,
        html_url: issue.data.html_url,
        labels: issue.data.labels.map((label: any) => label.name),
        assignees: issue.data.assignees?.map((assignee: any) => assignee.login)
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error updating GitHub issue: ${error.message}` }] };
    }
  });

  server.registerTool("close_github_issue", {
    title: "Close GitHub Issue",
    description: "Closes an open GitHub issue",
    inputSchema: {
      issueNumber: z.number().describe("The issue number to close"),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. Defaults to 'felipebarcelospro/igniter-js'")
    },
  }, async ({ issueNumber, repository }: { issueNumber: number, repository?: string }) => {
    try {
      const [owner, repo] = (repository || 'felipebarcelospro/igniter-js').split('/');

      const issue = await octokit.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: 'closed'
      });

      const result = {
        number: issue.data.number,
        title: issue.data.title,
        state: issue.data.state,
        closed_at: issue.data.closed_at,
        html_url: issue.data.html_url
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error closing GitHub issue: ${error.message}` }] };
    }
  });

  server.registerTool("list_github_issue_comments", {
    title: "List GitHub Issue Comments",
    description: "Lists all comments on a specific GitHub issue",
    inputSchema: {
      issueNumber: z.number().describe("The issue number to get comments for"),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. Defaults to 'felipebarcelospro/igniter-js'"),
      per_page: z.number().min(1).max(100).optional().describe("Number of comments per page (max 100)"),
      page: z.number().min(1).optional().describe("Page number for pagination")
    },
  }, async ({ issueNumber, repository, per_page, page }: {
    issueNumber: number,
    repository?: string,
    per_page?: number,
    page?: number
  }) => {
    try {
      const [owner, repo] = (repository || 'felipebarcelospro/igniter-js').split('/');

      const response = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: issueNumber,
        per_page: per_page || 30,
        page: page || 1
      });

      const comments = response.data.map((comment: any) => ({
        id: comment.id,
        body: comment.body,
        user: comment.user?.login,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
        html_url: comment.html_url
      }));

      return { content: [{ type: "text", text: JSON.stringify(comments, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error listing GitHub issue comments: ${error.message}` }] };
    }
  });

  server.registerTool("create_github_issue_comment", {
    title: "Create GitHub Issue Comment",
    description: "Adds a new comment to a GitHub issue",
    inputSchema: {
      issueNumber: z.number().describe("The issue number to comment on"),
      body: z.string().describe("The comment body"),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. Defaults to 'felipebarcelospro/igniter-js'")
    },
  }, async ({ issueNumber, body, repository }: { issueNumber: number, body: string, repository?: string }) => {
    try {
      const [owner, repo] = (repository || 'felipebarcelospro/igniter-js').split('/');

      const comment = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumber,
        body
      });

      const result = {
        id: comment.data.id,
        body: comment.data.body,
        user: comment.data.user?.login,
        created_at: comment.data.created_at,
        html_url: comment.data.html_url
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error creating GitHub issue comment: ${error.message}` }] };
    }
  });

  server.registerTool("update_github_issue_comment", {
    title: "Update GitHub Issue Comment",
    description: "Updates an existing comment on a GitHub issue",
    inputSchema: {
      commentId: z.number().describe("The comment ID to update"),
      body: z.string().describe("The new comment body"),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. Defaults to 'felipebarcelospro/igniter-js'")
    },
  }, async ({ commentId, body, repository }: { commentId: number, body: string, repository?: string }) => {
    try {
      const [owner, repo] = (repository || 'felipebarcelospro/igniter-js').split('/');

      const comment = await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: commentId,
        body
      });

      const result = {
        id: comment.data.id,
        body: comment.data.body,
        user: comment.data.user?.login,
        updated_at: comment.data.updated_at,
        html_url: comment.data.html_url
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error updating GitHub issue comment: ${error.message}` }] };
    }
  });

  server.registerTool("delete_github_issue_comment", {
    title: "Delete GitHub Issue Comment",
    description: "Deletes a comment from a GitHub issue",
    inputSchema: {
      commentId: z.number().describe("The comment ID to delete"),
      repository: z.string().optional().describe("Repository in format 'owner/repo'. Defaults to 'felipebarcelospro/igniter-js'")
    },
  }, async ({ commentId, repository }: { commentId: number, repository?: string }) => {
    try {
      const [owner, repo] = (repository || 'felipebarcelospro/igniter-js').split('/');

      await octokit.rest.issues.deleteComment({
        owner,
        repo,
        comment_id: commentId
      });

      return { content: [{ type: "text", text: `Comment ${commentId} deleted successfully.` }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `Error deleting GitHub issue comment: ${error.message}` }] };
    }
  });
}
