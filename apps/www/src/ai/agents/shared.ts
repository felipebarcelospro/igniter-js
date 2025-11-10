import { Agent } from "@ai-sdk-tools/agents";
import { UpstashProvider } from "@ai-sdk-tools/memory/upstash";
import { Redis } from "@upstash/redis";
import type { LanguageModel, Tool } from "ai";
import { google } from "@ai-sdk/google";

// Memory Provider using Upstash Redis
export const memoryProvider = new UpstashProvider(
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  }),
);

// Agent Provider Type
export type AgentProvider = 'website' | 'telegram' | 'discord' | 'whatsapp';

// Application Context Interface
export interface AppContext extends Record<string, unknown> {
  userId: string;
  chatId: string;
  provider: AgentProvider;
  currentPage?: string;
  attachedPages: string[];
  timezone: string;
  locale: string;
  userName?: string;
}

// Agent Configuration Interface
interface AgentConfig<TContext extends Record<string, unknown>> {
  name: string;
  model: LanguageModel;
  instructions: string | ((context: TContext) => string);
  system?: string | ((context: TContext) => string);
  tools?: Record<string, Tool<any, any>>;
}

// Build App Context helper
export function buildAppContext(params: {
  userId: string;
  chatId: string;
  provider: 'website' | 'telegram' | 'discord' | 'whatsapp';
  currentPage?: string;
  attachedPages?: string[];
  timezone?: string;
  locale?: string;
  userName?: string;
}): AppContext {
  return {
    userId: params.userId,
    chatId: params.chatId,
    provider: params.provider,
    currentPage: params.currentPage,
    attachedPages: params.attachedPages || [],
    timezone: params.timezone || "UTC",
    locale: params.locale || "en-US",
    userName: params.userName,
  };
}

// Common Agent Rules
export const COMMON_AGENT_RULES = `<behavior_rules>
1. ALWAYS respond in the same language as the user's question
2. Be concise but helpful - provide clear explanations
3. When referencing documentation, always provide the source URL
4. If you don't know something, admit it and suggest where to find the information
5. Use markdown formatting for better readability
6. Provide code examples when relevant
7. Be proactive in suggesting related topics or next steps
8. If user is not on website, keep your responses short and concise.
9. If user is not on website, don't use markdown formatting.
10. If user is not on website, don't send code examples in your responses, send them as a link to the documentation.
</behavior_rules>`;

// Format Context for LLM
export function formatContextForLLM(context: AppContext): string {
  return `
<user_context>
- User ID: ${context.userId}
- Chat ID: ${context.chatId}
- Provider: ${context.provider}
- User Name: ${context.userName || "Unknown"}
- Current Page: ${context.currentPage || "Homepage"}
- Attached Pages: ${context.attachedPages.length > 0 ? context.attachedPages.join(", ") : "None"}
- Timezone: ${context.timezone}
- Locale: ${context.locale}
</user_context>
  `.trim();
}

// Create Agent Factory
export const createAgent = <TContext extends AppContext>(
  config: AgentConfig<TContext>
) => {
  return new Agent({
    modelSettings: {
      parallel_tool_calls: true,
    },
    ...config,
    memory: {
      provider: memoryProvider,
      history: {
        enabled: true,
        limit: 20, // Keep last 20 messages in context
      },
      workingMemory: {
        enabled: true,
        scope: "user",
      },
      chats: {
        enabled: true,
        generateTitle: {
          model: google("gemini-flash-lite-latest"),
          instructions: `Generate a concise, descriptive title (max 6 words) that captures the user's main question or intent about Igniter.js. Only plain text, no markdown.`,
        },
        generateSuggestions: {
          enabled: true,
          model: google("gemini-flash-lite-latest"),
          limit: 3,
          instructions: `Generate 3 short, relevant follow-up questions (max 50 chars each) based on the conversation about Igniter.js. Only plain text, no markdown.`,
        },
      },
    },
  });
};

// Default Gemini Model
export const getDefaultModel = () => google("gemini-flash-latest");

