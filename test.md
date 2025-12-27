User: Lia, o fluxo da memoria esta correto? Estou tentando usar o adapter do JSON, mas nao ta criando, como devo usar? Eu tenho que salvar manualmetne, não feito automaticamente pela lib?

GitHub Copilot: Vou verificar a implementação real do adapter JSON para entender o fluxo correto e te ajudar. 

Searched for files matching `**/agents/**/json*.adapter.ts`, 1 match

Searched for files matching `**/agents/**/adapters/**/*.ts`, 5 matches

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/adapters/json-file.adapter.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/core/memory.ts)

Agora vou verificar como o agent usa a memória e se ela é automática: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/core/agent.ts)

Agora vejo o cenário completo. Deixa eu verificar os testes para entender o fluxo de uso correto: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/adapters/json-file.adapter.spec.ts)

Agora tenho o quadro completo! Deixa eu te explicar o fluxo correto:

---

## Resumo: Como usar o `IgniterAgentJSONFileAdapter`

Você está certo em ter dúvidas! O fluxo atual requer que você **conecte manualmente** o adapter antes de usar. Aqui está o uso correto:

### ✅ Uso Correto

```typescript
import { IgniterAgent, IgniterAgentJSONFileAdapter } from '@igniter-js/agents';

// 1. Criar o adapter
const adapter = IgniterAgentJSONFileAdapter.create({
  dataDir: './data/agent-memory',  // pasta onde os arquivos serão criados
  namespace: 'myapp',              // prefixo para isolar dados
  autoSync: true,                  // sincroniza automaticamente após cada operação
  debug: true,                     // (opcional) mostra logs de debug
});

// 2. IMPORTANTE: Conectar o adapter (cria diretórios e carrega dados)
await adapter.connect();

// 3. Usar com o agent
const agent = IgniterAgent.create('my-agent')
  .withMemory({
    provider: adapter,  // Passar o adapter como provider
  })
  .withModel(model)
  .build();

// 4. Ao finalizar, desconectar (sincroniza dados pendentes)
await adapter.disconnect();
```

### O que acontece automaticamente vs manualmente

| Operação | Automático? | Quando? |
|----------|-------------|---------|
| Criar diretórios | ❌ | Após `adapter.connect()` |
| Carregar dados existentes | ❌ | Após `adapter.connect()` |
| Salvar após cada operação | ✅ | Se `autoSync: true` (default) |
| Salvar dados pendentes | ❌ | Após `adapter.disconnect()` ou `adapter.sync()` |

### Problema: O Agent NÃO salva automaticamente

Olhando o código do `IgniterAgentCore`, vejo que ele **não salva as mensagens automaticamente** durante `generate()` ou `stream()`. O `memory` é exposto mas você precisa chamar manualmente:

```typescript
// Após gerar resposta
const result = await agent.generate({
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Salvar manualmente (se necessário)
await agent.memory?.saveMessage({
  chatId: 'chat_123',
  userId: 'user_456',
  role: 'user',
  content: 'Hello!',
  timestamp: new Date(),
});
```

### Working Memory (persistência de contexto)

Para working memory (dados de contexto persistentes), use diretamente:

```typescript
// Salvar contexto
await adapter.updateWorkingMemory({
  scope: 'chat',
  identifier: 'chat_123',
  content: 'User prefers TypeScript. Timezone: UTC-3.',
});

// Recuperar contexto
const memory = await adapter.getWorkingMemory({
  scope: 'chat',
  identifier: 'chat_123',
});

console.log(memory?.content); // 'User prefers TypeScript. Timezone: UTC-3.'
```

---

## Estrutura de arquivos criada

Após usar o adapter, você verá:

```
./data/agent-memory/
├── working-memory.json     # Memória de trabalho/contexto
├── chats.json              # Sessões de chat
└── messages/
    ├── chat_123.json       # Mensagens do chat_123
    └── chat_456.json       # Mensagens do chat_456
```

---

Quer que eu documente isso melhor no AGENTS.md ou crie um exemplo mais completo no código?

User: Então, o ideal é a gente fazer isso automatico, a gente ter uma forma de definir os scopes, igual do package do store, do telemetry, do connectors e ele... Deveria talvez, ter uma forma de passar o chatId, e passar mais de um scope, algo como:

agent.scope('user', '123').sender('123').chat('123').generate() // ou .stream()

Lá na definicao da memory no builder, tem algumas opcoes, pro chat, pro working memory... Se do chat estiver ativo, deve ser feito o upsert do chat(se for novo, cria com um nome generico) e depois, de 5 mensagens, deve ser gerado o titulo automaticamente;

Alem disso, deve expor tools automaticamente pro agente pra ele poder buscar em chats anteriores livremente, alem de ter tools pra ele atualizar o working memory. O working memory deve ser feito o append no systemPrompt do agente pra ele sempre ter no contexto e poder atualizar como quiser. 

Esta parte de ter tools dos chats anteriores é importante pra dar um senso de continuidade... 

Alem disso, devemos espor la no agent tb na api publica, metodos para CRUD de chats e metodos pra pegar o working memory. 

Pensa assim:

agent.scope('user', '123').chats.list() // chats.get('ID'), chats.delete('ID'), chats.update('ID', { title?: string }), chats.search('term'), 
agent.scope('user', '123').memory.get() //memory.set()

Toda a estrutura da memoria, deve permitir fazer isso de forma estruturada, levando em consideracao, todas as possibilidades.

Antes de implementar, consegue me dar uma visão completa da API e de qual seria a melhor forma de fazer isso, inclusive, eu posso estar sugerindo algo inadequado tb... Então, vale pra mim saber. 

Alem disso, se por acaso, alem do working memory que no caso, é com um foco mais especifico, talvez valesse tb ter uma forma do agente ter um sistema onde ele pode armazenar entradas na memoria, atualizar, deletar, tudo com timetracking, podendo ser ativado ou desativado...

No caso, da memory, dos chats, se estiverem ativas as opcoes, o agente deveria ter tools injetadas automaticamente pra ele poder gerenciar tudo isso, sem depender do dev adicionar manualmente.

Todos os adapters devem ser atualizados tb pra garantir que isso vai ser salvo corretamente.

Enfim, oq ue vc sugere?

GitHub Copilot: Excelente pergunta! Vou te dar uma visão arquitetural completa antes de implementar. Deixa eu analisar tudo e propor a melhor abordagem.

---

# Proposta: Sistema de Memória Inteligente para @igniter-js/agents

## 1. Visão Geral da Arquitetura

### 1.1 Conceitos Principais

| Conceito | Descrição | Persistência |
|----------|-----------|--------------|
| **Scope** | Contexto hierárquico (user → sender → chat) | Chave composta |
| **Chat** | Sessão de conversa com histórico de mensagens | Automático |
| **Working Memory** | Contexto persistente do usuário/sender (preferências, etc.) | Automático |
| **Memory Entries** | Notas/aprendizados do agente (com timestamps) | Manual via tools |
| **Messages** | Histórico de mensagens dentro de um chat | Automático |

### 1.2 Hierarquia de Escopo

```
User (obrigatório)
  └── Sender (opcional) - identifica quem está enviando (ex: canal, device)
        └── Chat (opcional) - sessão de conversa específica
```

**Exemplo de chaves geradas:**
```
user:123                           → Working memory do usuário
user:123:sender:web                → Working memory do sender
user:123:sender:web:chat:abc       → Chat específico
user:123:entries                   → Memory entries do usuário
```

---

## 2. API Proposta

### 2.1 Builder API (Configuração)

```typescript
const agent = IgniterAgent.create('assistant')
  .withModel(openai('gpt-4o'))
  .withMemory({
    provider: adapter, // JSON, Redis, Prisma, etc.
    
    // Configuração do Working Memory
    workingMemory: {
      enabled: true,
      scope: 'user', // 'user' | 'sender' | 'chat'
      // Injeta automaticamente no system prompt
      systemPromptPrefix: true,
    },
    
    // Configuração de Chat
    chat: {
      enabled: true,
      // Gera título automaticamente após N mensagens
      autoTitle: { enabled: true, afterMessages: 5 },
      // Limite de mensagens no contexto
      contextLimit: 50,
      // Salva mensagens automaticamente
      autoSave: true,
    },
    
    // Memory Entries (notas do agente)
    entries: {
      enabled: true,
      scope: 'user', // 'user' | 'sender' | 'chat'
      // Limite de entries para injetar no contexto
      contextLimit: 20,
    },
    
    // Tools automáticas injetadas
    tools: {
      // Tools para buscar/navegar chats anteriores
      chatHistory: true,
      // Tools para gerenciar working memory
      workingMemory: true,
      // Tools para gerenciar entries
      memoryEntries: true,
    },
  })
  .build();
```

### 2.2 Runtime API (Fluent Scoping)

```typescript
// Criar escopo encadeado (imutável, retorna nova instância)
const scoped = agent
  .user('user_123')           // Obrigatório: define o usuário
  .sender('web')              // Opcional: identifica origem
  .chat('chat_abc');          // Opcional: chat específico

// Gerar resposta (salva automaticamente se chat.autoSave = true)
const result = await scoped.generate({
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Stream (mesmo comportamento)
const stream = await scoped.stream({
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### 2.3 API de Chats

```typescript
const userScope = agent.user('user_123');

// Listar chats do usuário
const chats = await userScope.chats.list({
  limit: 20,
  cursor: 'next_page_token',
});

// Buscar chats por termo
const results = await userScope.chats.search('typescript');

// Obter chat específico
const chat = await userScope.chats.get('chat_abc');

// Atualizar título
await userScope.chats.update('chat_abc', { title: 'Nova Conversa' });

// Deletar chat
await userScope.chats.delete('chat_abc');

// Criar novo chat (retorna ID)
const newChatId = await userScope.chats.create({
  title: 'Conversa sobre React',
});

// Obter mensagens de um chat
const messages = await userScope.chats.messages('chat_abc', {
  limit: 50,
  before: 'cursor',
});
```

### 2.4 API de Working Memory

```typescript
const userScope = agent.user('user_123');

// Obter working memory do escopo atual
const memory = await userScope.memory.get();
// { content: 'User prefers TypeScript...', updatedAt: Date }

// Atualizar (substitui completamente)
await userScope.memory.set('User prefers TypeScript. Timezone: UTC-3.');

// Append (adiciona ao final)
await userScope.memory.append('\nUser is interested in AI.');

// Limpar
await userScope.memory.clear();

// Com sender scope
const senderMemory = await userScope.sender('mobile').memory.get();
```

### 2.5 API de Memory Entries (Notas do Agente)

```typescript
const userScope = agent.user('user_123');

// Listar entries
const entries = await userScope.entries.list({
  limit: 50,
  tags: ['preference', 'learned'],
});

// Criar entry
await userScope.entries.create({
  content: 'User mentioned they work at Acme Corp',
  tags: ['context', 'work'],
});

// Atualizar entry
await userScope.entries.update('entry_id', {
  content: 'Updated content',
  tags: ['updated'],
});

// Deletar entry
await userScope.entries.delete('entry_id');

// Buscar entries
const found = await userScope.entries.search('Acme');
```

---

## 3. Tools Automáticas Injetadas

### 3.1 Chat History Tools

```typescript
// Injetadas automaticamente se tools.chatHistory = true

const chatHistoryTools = {
  // Buscar em conversas anteriores
  search_previous_chats: {
    description: 'Search through previous conversations with the user',
    inputSchema: z.object({
      query: z.string().describe('Search term'),
      limit: z.number().optional().default(5),
    }),
    execute: async ({ query, limit }) => {
      // Busca usando o escopo atual
      return await scopedAgent.chats.search(query, { limit });
    },
  },
  
  // Obter contexto de um chat anterior
  get_chat_context: {
    description: 'Get context from a specific previous conversation',
    inputSchema: z.object({
      chatId: z.string().describe('Chat ID'),
      messageLimit: z.number().optional().default(10),
    }),
    execute: async ({ chatId, messageLimit }) => {
      return await scopedAgent.chats.messages(chatId, { limit: messageLimit });
    },
  },
  
  // Listar chats recentes
  list_recent_chats: {
    description: 'List recent conversations with summaries',
    inputSchema: z.object({
      limit: z.number().optional().default(10),
    }),
    execute: async ({ limit }) => {
      return await scopedAgent.chats.list({ limit });
    },
  },
};
```

### 3.2 Working Memory Tools

```typescript
// Injetadas automaticamente se tools.workingMemory = true

const workingMemoryTools = {
  // Atualizar working memory
  update_user_context: {
    description: 'Update persistent context about the user (preferences, facts, etc.)',
    inputSchema: z.object({
      content: z.string().describe('New context to remember'),
      mode: z.enum(['replace', 'append']).default('append'),
    }),
    execute: async ({ content, mode }) => {
      if (mode === 'append') {
        await scopedAgent.memory.append(content);
      } else {
        await scopedAgent.memory.set(content);
      }
      return { success: true };
    },
  },
  
  // Ler working memory
  get_user_context: {
    description: 'Get the current persistent context about the user',
    execute: async () => {
      return await scopedAgent.memory.get();
    },
  },
};
```

### 3.3 Memory Entries Tools

```typescript
// Injetadas automaticamente se tools.memoryEntries = true

const memoryEntriesTools = {
  // Criar nota/aprendizado
  remember: {
    description: 'Store a note or learning about the user for future reference',
    inputSchema: z.object({
      content: z.string().describe('What to remember'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
    }),
    execute: async ({ content, tags }) => {
      return await scopedAgent.entries.create({ content, tags });
    },
  },
  
  // Buscar notas
  recall: {
    description: 'Search through stored notes and learnings',
    inputSchema: z.object({
      query: z.string().describe('Search term'),
      limit: z.number().optional().default(10),
    }),
    execute: async ({ query, limit }) => {
      return await scopedAgent.entries.search(query, { limit });
    },
  },
  
  // Atualizar nota
  update_memory: {
    description: 'Update an existing memory entry',
    inputSchema: z.object({
      entryId: z.string(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }),
    execute: async ({ entryId, content, tags }) => {
      return await scopedAgent.entries.update(entryId, { content, tags });
    },
  },
  
  // Deletar nota
  forget: {
    description: 'Remove a stored memory entry',
    inputSchema: z.object({
      entryId: z.string(),
    }),
    execute: async ({ entryId }) => {
      return await scopedAgent.entries.delete(entryId);
    },
  },
};
```

---

## 4. System Prompt Injection

Quando `workingMemory.systemPromptPrefix = true`, o agente automaticamente injeta contexto:

```typescript
// System prompt gerado automaticamente
const systemPrompt = `
${userInstructions}

<user_context>
${workingMemoryContent}
</user_context>

<memory_entries>
${recentEntriesFormatted}
</memory_entries>

<available_tools>
You have access to memory tools to:
- Search previous conversations
- Update user context
- Store/recall notes and learnings
</available_tools>
`;
```

---

## 5. Fluxo Automático de Chat

```
generate() chamado
    │
    ├─► Se chat.enabled && chatId definido:
    │       │
    │       ├─► Buscar ou criar chat (upsert)
    │       │       Se novo → título genérico "New Chat - {date}"
    │       │
    │       ├─► Carregar mensagens anteriores (até contextLimit)
    │       │
    │       └─► Após resposta:
    │               ├─► Salvar mensagens (user + assistant)
    │               └─► Se messageCount >= autoTitle.afterMessages && sem título customizado:
    │                       └─► Gerar título via LLM (async, não bloqueia)
    │
    └─► Se workingMemory.enabled:
            │
            ├─► Carregar working memory do escopo
            │
            └─► Injetar no system prompt
```

---

## 6. Estrutura do Adapter

### 6.1 Interface Atualizada

```typescript
interface IgniterAgentMemoryProvider {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Working Memory
  getWorkingMemory(scope: MemoryScope): Promise<WorkingMemory | null>;
  setWorkingMemory(scope: MemoryScope, content: string): Promise<void>;
  appendWorkingMemory(scope: MemoryScope, content: string): Promise<void>;
  clearWorkingMemory(scope: MemoryScope): Promise<void>;
  
  // Chats
  createChat(scope: MemoryScope, data: CreateChatInput): Promise<string>;
  getChat(scope: MemoryScope, chatId: string): Promise<Chat | null>;
  updateChat(scope: MemoryScope, chatId: string, data: UpdateChatInput): Promise<void>;
  deleteChat(scope: MemoryScope, chatId: string): Promise<void>;
  listChats(scope: MemoryScope, params: ListParams): Promise<PaginatedResult<Chat>>;
  searchChats(scope: MemoryScope, query: string, params?: SearchParams): Promise<Chat[]>;
  
  // Messages
  saveMessage(scope: MemoryScope, chatId: string, message: Message): Promise<void>;
  saveMessages(scope: MemoryScope, chatId: string, messages: Message[]): Promise<void>;
  getMessages(scope: MemoryScope, chatId: string, params: ListParams): Promise<Message[]>;
  
  // Memory Entries
  createEntry(scope: MemoryScope, data: CreateEntryInput): Promise<string>;
  getEntry(scope: MemoryScope, entryId: string): Promise<MemoryEntry | null>;
  updateEntry(scope: MemoryScope, entryId: string, data: UpdateEntryInput): Promise<void>;
  deleteEntry(scope: MemoryScope, entryId: string): Promise<void>;
  listEntries(scope: MemoryScope, params: ListEntriesParams): Promise<MemoryEntry[]>;
  searchEntries(scope: MemoryScope, query: string, params?: SearchParams): Promise<MemoryEntry[]>;
}

interface MemoryScope {
  userId: string;
  senderId?: string;
  chatId?: string;
}

interface MemoryEntry {
  id: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 7. Comparação: Sua Sugestão vs Proposta

| Aspecto | Sua Sugestão | Proposta | Motivo |
|---------|--------------|----------|--------|
| `agent.scope('user', '123')` | ✅ | `agent.user('123')` | Mais legível e type-safe |
| `agent.sender('123')` | ✅ | `agent.user('x').sender('y')` | Hierarquia clara |
| `agent.chat('123')` | ✅ | `agent.user('x').chat('y')` | Chat sempre dentro de user |
| Auto-save de mensagens | ✅ | ✅ | Essencial |
| Auto-title após 5 msgs | ✅ | Configurável | Flexibilidade |
| Tools automáticas | ✅ | ✅ | Essencial |
| Working memory no prompt | ✅ | ✅ | Essencial |
| Memory entries | ✅ Sugerido | ✅ Expandido | Tags + timestamps |
| CRUD de chats | ✅ | ✅ | Essencial |

---

## 8. Pontos de Atenção / Trade-offs

### 8.1 ⚠️ Custo de Contexto

Injetar working memory + entries + histórico aumenta tokens. Recomendo:
- Limites configuráveis (`contextLimit`)
- Summarização opcional de histórico longo
- Compressão de entries antigas

### 8.2 ⚠️ Geração de Título

- Fazer async (não bloquear resposta)
- Usar modelo mais barato para isso
- Cachear para evitar re-gerações

### 8.3 ⚠️ Tools vs Autonomia

Se o agente tem tools para modificar memória, ele pode:
- ✅ Aprender e melhorar
- ⚠️ Sobrescrever informações importantes

**Sugestão:** Modo `append-only` para entries críticos.

### 8.4 ⚠️ Segurança de Escopo

- User NUNCA deve acessar dados de outro user
- Validar escopo em TODAS as operações do adapter

---

## 9. Estrutura de Arquivos Proposta

```
packages/agents/src/
├── core/
│   ├── agent.ts                  # IgniterAgentCore (atualizado)
│   ├── scoped-agent.ts           # NEW: IgniterAgentScopedCore
│   ├── memory.ts                 # Atualizado
│   └── auto-tools.ts             # NEW: Tools automáticas
├── builders/
│   ├── agent.builder.ts          # Atualizado
│   └── memory.builder.ts         # NEW: Builder de config de memória
├── types/
│   ├── memory.ts                 # Atualizado com novos tipos
│   ├── scope.ts                  # NEW: Tipos de escopo
│   └── adapter.ts                # Atualizado
├── adapters/
│   ├── json-file.adapter.ts      # Atualizado
│   ├── memory.adapter.ts         # Atualizado
│   └── types.ts                  # Interface do adapter
└── utils/
    └── title-generator.ts        # NEW: Geração de títulos
```

---

## 10. Minha Recomendação

1. **Implementar em fases:**
   - Fase 1: Scoping fluente + auto-save de mensagens
   - Fase 2: Working memory injection + tools
   - Fase 3: Memory entries + search tools
   - Fase 4: Auto-title generation

2. **Começar pelo adapter interface** para garantir que todos os adapters suportem as operações.

3. **Manter retrocompatibilidade** com a API atual.

---

O que você acha dessa proposta? Algo que você gostaria de mudar ou adicionar antes de começarmos a implementação?

User: No caso, alem disso, o scope, deveria ser dinamico, igual do packages/store, pois pensa, pode ser um workspace, pode ser um user, pode ser um org, entao devemos estar preparado para otodos os cenarios... O sender, no caso é pra identificar quem enviou, pode ser um id de um user ou pode inclusive ser um identificador de um evento, pensa que pode ser recebido um webhook(valeria ter um metodo especial pra isso tb alem do generate e do stream)

GitHub Copilot: Ótimo ponto! Deixa eu ver como o store implementa o scoping dinâmico para alinharmos: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/store/src/core/manager.ts)

Agora entendi o padrão do `store`. Vou verificar também o builder para ver como os escopos são definidos: 

Searched for text `addScope` (`**/packages/store/src/**/*.ts`), 20 results

Perfeito! Agora tenho o contexto completo. Vou atualizar a proposta com escopos dinâmicos como o `store`, incluindo o método para webhooks:

---

# Proposta Atualizada: Sistema de Memória com Escopos Dinâmicos

## 1. Builder API com Escopos Dinâmicos

```typescript
const agent = IgniterAgent.create('assistant')
  .withModel(openai('gpt-4o'))
  
  // Definir escopos dinâmicos (igual ao store)
  .addScope('organization', { required: true, description: 'Organization tenant' })
  .addScope('workspace', { required: false })
  .addScope('user', { required: true })
  .addScope('sender', { required: false, description: 'Origin identifier (user, webhook, etc.)' })
  .addScope('chat', { required: false, description: 'Conversation session' })
  
  .withMemory({
    provider: adapter,
    
    // Working Memory - contexto persistente
    workingMemory: {
      enabled: true,
      // Determina em qual nível de escopo salvar
      // 'deepest' = salva no escopo mais profundo definido
      // 'user' = sempre salva no escopo do user (independente dos sub-escopos)
      scope: 'deepest', // ou 'user' | 'organization' | 'workspace' | etc.
      systemPromptPrefix: true,
    },
    
    // Chat - sessões de conversa
    chat: {
      enabled: true,
      autoTitle: { enabled: true, afterMessages: 5 },
      contextLimit: 50,
    },
    
    // Entries - notas/aprendizados do agente
    entries: {
      enabled: true,
      scope: 'user',
      contextLimit: 20,
    },
    
    // Tools automáticas
    tools: {
      chatHistory: true,
      workingMemory: true,
      memoryEntries: true,
    },
  })
  .build();
```

## 2. Runtime API com Escopos Encadeados

```typescript
// Scoping fluente - retorna nova instância imutável a cada chamada
const scoped = agent
  .scope('organization', 'org_acme')      // Escopo organização
  .scope('workspace', 'ws_dev')           // Escopo workspace
  .scope('user', 'user_123')              // Escopo usuário
  .scope('sender', 'web-app')             // Origem (app, webhook, etc.)
  .scope('chat', 'chat_abc');             // Chat específico

// Gerar resposta (usa todos os escopos acumulados)
const result = await scoped.generate({
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Stream
const stream = await scoped.stream({
  messages: [{ role: 'user', content: 'Hello!' }],
});

// Webhook handler (novo método!)
const webhookResult = await agent
  .scope('organization', 'org_acme')
  .scope('user', 'user_123')
  .scope('sender', 'stripe-webhook')
  .webhook({
    event: 'payment.success',
    payload: { amount: 100, currency: 'USD' },
    // Configurações específicas de webhook
    options: {
      // Criar novo chat automaticamente para este evento
      createChat: true,
      // Título do chat gerado
      chatTitle: 'Payment Success Notification',
      // System prompt override para contexto de webhook
      systemPromptOverride: 'You are processing a webhook event...',
    },
  });
```

## 3. Método `webhook()` - Para Eventos Externos

```typescript
interface WebhookParams<TPayload = unknown> {
  /** Nome/tipo do evento */
  event: string;
  
  /** Payload do webhook */
  payload: TPayload;
  
  /** Configurações específicas */
  options?: {
    /** Criar chat automaticamente para este evento */
    createChat?: boolean;
    
    /** Título do chat (se createChat = true) */
    chatTitle?: string;
    
    /** Override do system prompt para contexto de webhook */
    systemPromptOverride?: string;
    
    /** Prompt inicial para o agente processar o evento */
    prompt?: string;
    
    /** Se deve gerar resposta ou apenas registrar */
    generateResponse?: boolean;
  };
}

// Exemplo de uso
const result = await agent
  .scope('organization', 'org_123')
  .scope('user', 'user_456')
  .scope('sender', 'github-webhook')
  .webhook({
    event: 'pull_request.opened',
    payload: {
      action: 'opened',
      pull_request: { title: 'Fix bug', number: 42 },
    },
    options: {
      createChat: true,
      chatTitle: 'GitHub: PR #42 Opened',
      prompt: 'A new pull request was opened. Analyze and suggest review focus areas.',
      generateResponse: true,
    },
  });
```

## 4. API de Chats (Scoped)

```typescript
// Listar chats dentro do escopo atual
const orgScope = agent.scope('organization', 'org_123');

// Chats da organização inteira
const orgChats = await orgScope.chats.list({ limit: 20 });

// Chats de um usuário específico
const userChats = await orgScope
  .scope('user', 'user_456')
  .chats.list({ limit: 20 });

// Buscar chats
const results = await orgScope.chats.search('typescript');

// CRUD
const chat = await orgScope.chats.get('chat_id');
await orgScope.chats.update('chat_id', { title: 'New Title' });
await orgScope.chats.delete('chat_id');

// Criar chat (retorna ID e escopo com chat)
const { chatId, scoped } = await orgScope
  .scope('user', 'user_456')
  .chats.create({ title: 'New Conversation' });

// Usar o escopo com chat já definido
await scoped.generate({ messages: [...] });

// Mensagens de um chat
const messages = await orgScope.chats.messages('chat_id', { limit: 50 });
```

## 5. API de Working Memory (Scoped)

```typescript
const userScope = agent
  .scope('organization', 'org_123')
  .scope('user', 'user_456');

// Obter working memory do escopo atual
const memory = await userScope.memory.get();

// Atualizar (substitui)
await userScope.memory.set('User prefers TypeScript. Works at Acme Corp.');

// Append
await userScope.memory.append('\nTimezone: UTC-3');

// Limpar
await userScope.memory.clear();

// Memory de um sender específico
const senderMemory = await userScope
  .scope('sender', 'mobile-app')
  .memory.get();
```

## 6. API de Memory Entries (Scoped)

```typescript
const userScope = agent
  .scope('organization', 'org_123')
  .scope('user', 'user_456');

// Listar entries
const entries = await userScope.entries.list({
  limit: 50,
  tags: ['preference', 'learned'],
});

// CRUD
const entryId = await userScope.entries.create({
  content: 'User mentioned they work remotely',
  tags: ['context', 'work'],
});

await userScope.entries.update(entryId, {
  content: 'User works remotely from Brazil',
  tags: ['context', 'work', 'location'],
});

await userScope.entries.delete(entryId);

// Buscar
const found = await userScope.entries.search('Brazil');
```

## 7. Estrutura de Chaves no Adapter

```
# Pattern: {prefix}:{scope1}:{id1}:{scope2}:{id2}:...:{type}:{key}

# Working Memory
igniter:agent:org:org_123:user:user_456:memory:working
igniter:agent:org:org_123:user:user_456:sender:mobile:memory:working

# Chats
igniter:agent:org:org_123:user:user_456:chats:chat_abc
igniter:agent:org:org_123:user:user_456:chats:chat_abc:messages

# Memory Entries
igniter:agent:org:org_123:user:user_456:entries:entry_xyz
igniter:agent:org:org_123:user:user_456:entries:_index

# Índices para busca
igniter:agent:org:org_123:user:user_456:chats:_index
igniter:agent:org:org_123:user:user_456:entries:_tags:preference
```

## 8. Interface do Adapter Atualizada

```typescript
interface IgniterAgentMemoryScope {
  /** Chain de escopos aplicados */
  chain: Array<{ key: string; identifier: string }>;
  
  /** Helper para construir chave */
  buildKey(...parts: string[]): string;
}

interface IgniterAgentMemoryProvider {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sync(): Promise<void>;
  clear(): Promise<void>;
  
  // Working Memory
  getWorkingMemory(scope: IgniterAgentMemoryScope): Promise<WorkingMemory | null>;
  setWorkingMemory(scope: IgniterAgentMemoryScope, content: string): Promise<void>;
  appendWorkingMemory(scope: IgniterAgentMemoryScope, content: string): Promise<void>;
  clearWorkingMemory(scope: IgniterAgentMemoryScope): Promise<void>;
  
  // Chats
  createChat(scope: IgniterAgentMemoryScope, data: CreateChatInput): Promise<string>;
  getChat(scope: IgniterAgentMemoryScope, chatId: string): Promise<Chat | null>;
  updateChat(scope: IgniterAgentMemoryScope, chatId: string, data: UpdateChatInput): Promise<void>;
  deleteChat(scope: IgniterAgentMemoryScope, chatId: string): Promise<void>;
  listChats(scope: IgniterAgentMemoryScope, params: ListParams): Promise<PaginatedResult<Chat>>;
  searchChats(scope: IgniterAgentMemoryScope, query: string, params?: SearchParams): Promise<Chat[]>;
  
  // Messages
  saveMessage(scope: IgniterAgentMemoryScope, chatId: string, message: Message): Promise<void>;
  saveMessages(scope: IgniterAgentMemoryScope, chatId: string, messages: Message[]): Promise<void>;
  getMessages(scope: IgniterAgentMemoryScope, chatId: string, params: ListParams): Promise<Message[]>;
  
  // Memory Entries
  createEntry(scope: IgniterAgentMemoryScope, data: CreateEntryInput): Promise<string>;
  getEntry(scope: IgniterAgentMemoryScope, entryId: string): Promise<MemoryEntry | null>;
  updateEntry(scope: IgniterAgentMemoryScope, entryId: string, data: UpdateEntryInput): Promise<void>;
  deleteEntry(scope: IgniterAgentMemoryScope, entryId: string): Promise<void>;
  listEntries(scope: IgniterAgentMemoryScope, params: ListEntriesParams): Promise<MemoryEntry[]>;
  searchEntries(scope: IgniterAgentMemoryScope, query: string, params?: SearchParams): Promise<MemoryEntry[]>;
}
```

## 9. Tipos para Escopo Dinâmico

```typescript
// Definição de escopo (no builder)
interface IgniterAgentScopeDefinition {
  required?: boolean;
  description?: string;
}

// Builder state acumula os escopos definidos
interface IgniterAgentBuilderState<
  TScopes extends string = never,
  // ... outros tipos
> {
  scopeDefinitions: Record<TScopes, IgniterAgentScopeDefinition>;
  // ...
}

// Runtime: escopo atual
interface IgniterAgentScopedCore<TScopes extends string> {
  /** Adiciona um escopo ao chain */
  scope<TScopeKey extends TScopes>(
    key: [TScopes] extends [never] ? string : TScopeKey,
    identifier: string,
  ): IgniterAgentScopedCore<TScopes>;
  
  /** Gerar resposta */
  generate(params: GenerateParams): Promise<GenerateResult>;
  
  /** Stream de resposta */
  stream(params: StreamParams): Promise<StreamResult>;
  
  /** Processar webhook */
  webhook(params: WebhookParams): Promise<WebhookResult>;
  
  /** API de chats */
  chats: ChatsAPI;
  
  /** API de working memory */
  memory: MemoryAPI;
  
  /** API de entries */
  entries: EntriesAPI;
}
```

## 10. Fluxo Completo de Execução

```
1. agent.scope('org', 'org_123').scope('user', 'user_456').scope('chat', 'chat_abc')
   │
   └─► Cria IgniterAgentScopedCore com scopeChain = [
         { key: 'org', identifier: 'org_123' },
         { key: 'user', identifier: 'user_456' },
         { key: 'chat', identifier: 'chat_abc' }
       ]

2. scoped.generate({ messages: [...] })
   │
   ├─► Validar escopos obrigatórios definidos
   │
   ├─► Se chat.enabled && chat scope definido:
   │     ├─► Upsert chat (criar se não existe)
   │     └─► Carregar mensagens anteriores
   │
   ├─► Se workingMemory.enabled:
   │     └─► Carregar e injetar no system prompt
   │
   ├─► Se entries.enabled:
   │     └─► Carregar entries recentes e injetar
   │
   ├─► Injetar tools automáticas (se configuradas)
   │
   ├─► Executar generate() do AI
   │
   ├─► Se chat.autoSave:
   │     ├─► Salvar mensagem do user
   │     ├─► Salvar resposta do assistant
   │     └─► Se messageCount >= autoTitle.afterMessages && !customTitle:
   │           └─► Gerar título (async)
   │
   └─► Retornar resultado
```

## 11. Exemplo Completo de Uso

```typescript
import { 
  IgniterAgent, 
  IgniterAgentJSONFileAdapter 
} from '@igniter-js/agents';
import { openai } from '@ai-sdk/openai';

// 1. Criar adapter
const adapter = IgniterAgentJSONFileAdapter.create({
  dataDir: './data/agent-memory',
});

// 2. Configurar agent com escopos
const agent = IgniterAgent.create('customer-support')
  .withModel(openai('gpt-4o'))
  
  // Escopos dinâmicos
  .addScope('organization', { required: true })
  .addScope('user', { required: true })
  .addScope('sender', { required: false })
  .addScope('chat', { required: false })
  
  .withMemory({
    provider: adapter,
    workingMemory: {
      enabled: true,
      scope: 'user',
      systemPromptPrefix: true,
    },
    chat: {
      enabled: true,
      autoTitle: { enabled: true, afterMessages: 5 },
      contextLimit: 50,
      autoSave: true,
    },
    entries: {
      enabled: true,
      scope: 'user',
      contextLimit: 20,
    },
    tools: {
      chatHistory: true,
      workingMemory: true,
      memoryEntries: true,
    },
  })
  
  .withSystemPrompt(`
    You are a helpful customer support agent.
    Use the available memory tools to remember important information about the user.
    You can search previous conversations for context.
  `)
  
  .build();

// 3. Conectar adapter
await adapter.connect();

// 4. Usar em uma API route
async function handleUserMessage(
  orgId: string,
  userId: string,
  chatId: string | null,
  message: string,
) {
  // Criar escopo base
  let scoped = agent
    .scope('organization', orgId)
    .scope('user', userId)
    .scope('sender', 'web-app');
  
  // Se tem chatId, usar; senão, criar novo
  if (chatId) {
    scoped = scoped.scope('chat', chatId);
  } else {
    const { chatId: newChatId, scoped: chatScoped } = await scoped.chats.create({
      title: 'New Conversation',
    });
    scoped = chatScoped;
    chatId = newChatId;
  }
  
  // Gerar resposta (tudo é salvo automaticamente)
  const result = await scoped.generate({
    messages: [{ role: 'user', content: message }],
  });
  
  return {
    chatId,
    response: result.text,
  };
}

// 5. Processar webhook
async function handleStripeWebhook(orgId: string, event: any) {
  const result = await agent
    .scope('organization', orgId)
    .scope('user', event.customer_id)
    .scope('sender', 'stripe-webhook')
    .webhook({
      event: event.type,
      payload: event.data,
      options: {
        createChat: true,
        chatTitle: `Stripe: ${event.type}`,
        prompt: 'Process this payment event and generate a summary for the user.',
        generateResponse: true,
      },
    });
  
  return result;
}

// 6. Listar histórico do usuário
async function getUserChatHistory(orgId: string, userId: string) {
  return agent
    .scope('organization', orgId)
    .scope('user', userId)
    .chats.list({ limit: 20 });
}

// 7. Cleanup
await adapter.disconnect();
```

---

## Resumo das Diferenças da Proposta Anterior

| Aspecto | Proposta Anterior | Proposta Atualizada |
|---------|-------------------|---------------------|
| Escopos | Fixos (user, sender, chat) | Dinâmicos via `addScope()` |
| API de escopo | `.user().sender().chat()` | `.scope(key, id)` encadeado |
| Hierarquia | Implícita | Explícita e flexível |
| Webhook | Não tinha | `webhook()` dedicado |
| Tipos | Menos flexíveis | Type-safe com generics |

---

Quer que eu comece a implementação? Sugiro a seguinte ordem:

1. **Fase 1:** Tipos e interfaces base (`types/scope.ts`, memory.ts)
2. **Fase 2:** Builder com `addScope()` e config de memória
3. **Fase 3:** `IgniterAgentScopedCore` com APIs de chats/memory/entries
4. **Fase 4:** Atualizar adapters (JSON, InMemory)
5. **Fase 5:** Tools automáticas injetadas
6. **Fase 6:** Testes e documentação

User: Beleza! E quais tools vc preve pro agente? O ideal seria que tudo pudesse ser extremamente parametrizado(excecao do auto save do chat, isso é padrao se ta enabled), mas pensa, no webhook posso querer sempre disparar no mesmo chat, se for um chat novo, posso querer que o agente defina o title(este seria o melhor como default), enfim, consegue em dar uma nova visao completa pra eu ver?

GitHub Copilot: Vou te dar uma visão completa e ultra-parametrizada. Preparei tudo pensando em flexibilidade máxima:

---

# Proposta Completa: Sistema de Memória Inteligente v3

## 1. Configuração do Builder (Ultra-Parametrizado)

```typescript
const agent = IgniterAgent.create('assistant')
  .withModel(openai('gpt-4o'))
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ESCOPOS DINÂMICOS
  // ═══════════════════════════════════════════════════════════════════════════
  .addScope('organization', { required: true })
  .addScope('workspace')
  .addScope('user', { required: true })
  .addScope('sender')  // Origem: 'web', 'mobile', 'webhook:stripe', etc.
  .addScope('chat')
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO DE MEMÓRIA
  // ═══════════════════════════════════════════════════════════════════════════
  .withMemory({
    provider: adapter,
    
    // ─────────────────────────────────────────────────────────────────────────
    // WORKING MEMORY - Contexto persistente sobre o usuário
    // ─────────────────────────────────────────────────────────────────────────
    workingMemory: {
      enabled: true,
      
      // Em qual escopo salvar o working memory
      scope: 'user', // 'organization' | 'workspace' | 'user' | 'sender' | 'deepest'
      
      // Injetar automaticamente no system prompt
      injection: {
        enabled: true,
        position: 'after-instructions', // 'before-instructions' | 'after-instructions'
        template: `
<user_context>
{{content}}
</user_context>
        `,
      },
      
      // Limite de caracteres (para evitar context overflow)
      maxLength: 4000,
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // CHAT - Sessões de conversa
    // ─────────────────────────────────────────────────────────────────────────
    chat: {
      enabled: true,
      
      // Auto-save de mensagens (sempre ativo se chat.enabled)
      // Não é configurável - é o comportamento padrão
      
      // Geração automática de título
      title: {
        // 'agent' = o agente gera via tool (RECOMENDADO)
        // 'auto' = geração automática após N mensagens
        // 'manual' = nunca gera automaticamente
        mode: 'agent', 
        
        // Se mode = 'auto', após quantas mensagens gerar
        autoAfterMessages: 5,
        
        // Título padrão para chats novos (até ser definido)
        default: 'New Conversation',
        
        // Prompt para geração de título (se mode = 'auto')
        generationPrompt: 'Generate a short, descriptive title (max 50 chars) for this conversation based on the messages.',
      },
      
      // Quantas mensagens carregar no contexto
      contextLimit: 50,
      
      // Estratégia quando excede o limite
      contextStrategy: 'recent', // 'recent' | 'summarize' | 'sliding-window'
      
      // Se 'summarize', configurações adicionais
      summarization: {
        enabled: false,
        // Resumir mensagens mais antigas que N
        olderThan: 20,
        // Prompt de resumo
        prompt: 'Summarize the key points of this conversation so far.',
      },
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // MEMORY ENTRIES - Notas e aprendizados do agente
    // ─────────────────────────────────────────────────────────────────────────
    entries: {
      enabled: true,
      
      // Em qual escopo salvar entries
      scope: 'user',
      
      // Limite de entries para injetar no contexto
      contextLimit: 20,
      
      // Ordenação para injeção
      contextOrder: 'recent', // 'recent' | 'relevance' | 'importance'
      
      // Template de injeção
      injection: {
        enabled: true,
        position: 'after-working-memory',
        template: `
<memory_entries>
{{#each entries}}
- [{{createdAt}}] {{content}} {{#if tags}}(tags: {{tags}}){{/if}}
{{/each}}
</memory_entries>
        `,
      },
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // TOOLS AUTOMÁTICAS
    // ─────────────────────────────────────────────────────────────────────────
    tools: {
      // ═══════════════════════════════════════════════════════════════════════
      // WORKING MEMORY TOOLS
      // ═══════════════════════════════════════════════════════════════════════
      workingMemory: {
        read: {
          enabled: true,
          name: 'get_user_context',
          description: 'Get the current persistent context about the user.'
        },
        update: {
          enabled: true,
          name: 'update_user_context',
          description: 'Update the persistent context about the user.'
        },
        append: {
          enabled: true,
          name: 'add_to_user_context',
          description: 'Add new information to the existing user context.'
        },
        clear: {
          enabled: true,
          name: 'clear_user_context',
          description: 'Clear all user context (use with caution).'
        }
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // MEMORY ENTRIES TOOLS
      // ═══════════════════════════════════════════════════════════════════════
      memoryEntries: {
        create: {
          enabled: true,
          name: 'remember',
          description: 'Store a new memory/note about the user for future reference.',
        },
        read: {
          enabled: true,
          name: 'recall_entry',
          description: 'Read a specific memory entry by ID.',
        },
        update: {
          enabled: true,
          name: 'update_memory',
          description: 'Update an existing memory entry.',
        },
        delete: {
          enabled: false,
          name: 'forget',
          description: 'Remove a memory entry.',
        },
        search: {
          enabled: true,
          name: 'search_memories',
          description: 'Search through stored memories.',
        },
        list: {
          enabled: true,
          name: 'list_memories',
          description: 'List recent memories.',
        },
        
        // Schema de tags permitidas (opcional)
        allowedTags: ['preference', 'fact', 'context', 'important', 'temporary'],
        
        // Limite de entries que o agente pode criar por sessão
        maxCreatesPerSession: 10,
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // CHAT HISTORY TOOLS
      // ═══════════════════════════════════════════════════════════════════════
      chatHistory: {
        search: {
          enabled: true,
          name: 'search_conversations',
          description: 'Search through previous conversations with the user.',
        },
        list: {
          enabled: true,
          name: 'list_conversations',
          description: 'List recent conversations.',
        },
        getMessages: {
          enabled: true,
          name: 'get_conversation_messages',
          description: 'Get messages from a specific conversation.',
        },
        getContext: {
          enabled: false,
          name: 'get_conversation_context',
          description: 'Get a summary/context of a specific conversation.',
        },
        
        // Limite de resultados por busca
        searchLimit: 10,
        messagesLimit: 20,
      },
      
      // ═══════════════════════════════════════════════════════════════════════
      // CHAT MANAGEMENT TOOLS
      // ═══════════════════════════════════════════════════════════════════════
      chatManagement: {
        setTitle: {
          enabled: true,
          name: 'set_conversation_title',
          description: 'Set a descriptive title for the current conversation.',
        }
      },
    },
  })
  .build();
```

## 2. Todas as Tools Previstas

### 2.1 Working Memory Tools

| Tool | Descrição | Parâmetros | Retorno |
|------|-----------|------------|---------|
| `get_user_context` | Lê o working memory atual | - | `{ content: string, updatedAt: Date }` |
| `update_user_context` | Substitui o working memory | `{ content: string }` | `{ success: boolean }` |
| `add_to_user_context` | Adiciona ao working memory | `{ content: string }` | `{ success: boolean }` |
| `clear_user_context` | Limpa o working memory | - | `{ success: boolean }` |

```typescript
// Implementação interna
const workingMemoryTools = {
  get_user_context: {
    description: config.descriptions.read,
    inputSchema: z.object({}),
    execute: async () => {
      return await scopedAgent.memory.get();
    },
  },
  
  update_user_context: {
    description: config.descriptions.update,
    inputSchema: z.object({
      content: z.string().describe('The new user context to store'),
    }),
    execute: async ({ content }) => {
      await scopedAgent.memory.set(content);
      return { success: true };
    },
  },
  
  add_to_user_context: {
    description: config.descriptions.append,
    inputSchema: z.object({
      content: z.string().describe('Additional context to add'),
    }),
    execute: async ({ content }) => {
      await scopedAgent.memory.append(content);
      return { success: true };
    },
  },
};
```

### 2.2 Memory Entries Tools

| Tool | Descrição | Parâmetros | Retorno |
|------|-----------|------------|---------|
| `remember` | Cria uma nova entry | `{ content, tags?, importance? }` | `{ id: string }` |
| `recall_entry` | Lê uma entry por ID | `{ id }` | `MemoryEntry` |
| `update_memory` | Atualiza uma entry | `{ id, content?, tags? }` | `{ success: boolean }` |
| `forget` | Deleta uma entry | `{ id }` | `{ success: boolean }` |
| `search_memories` | Busca em entries | `{ query, limit?, tags? }` | `MemoryEntry[]` |
| `list_memories` | Lista entries recentes | `{ limit?, tags? }` | `MemoryEntry[]` |

```typescript
const memoryEntriesTools = {
  remember: {
    description: 'Store a new memory about the user for future reference.',
    inputSchema: z.object({
      content: z.string().describe('What to remember'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      importance: z.enum(['low', 'medium', 'high']).optional().default('medium'),
    }),
    execute: async ({ content, tags, importance }) => {
      const id = await scopedAgent.entries.create({ content, tags, importance });
      return { id, success: true };
    },
  },
  
  search_memories: {
    description: 'Search through stored memories and notes.',
    inputSchema: z.object({
      query: z.string().describe('Search term'),
      limit: z.number().optional().default(10),
      tags: z.array(z.string()).optional().describe('Filter by tags'),
    }),
    execute: async ({ query, limit, tags }) => {
      return await scopedAgent.entries.search(query, { limit, tags });
    },
  },
  
  list_memories: {
    description: 'List recent memories.',
    inputSchema: z.object({
      limit: z.number().optional().default(10),
      tags: z.array(z.string()).optional(),
    }),
    execute: async ({ limit, tags }) => {
      return await scopedAgent.entries.list({ limit, tags });
    },
  },
};
```

### 2.3 Chat History Tools

| Tool | Descrição | Parâmetros | Retorno |
|------|-----------|------------|---------|
| `search_conversations` | Busca em chats | `{ query, limit? }` | `ChatSummary[]` |
| `list_conversations` | Lista chats recentes | `{ limit? }` | `ChatSummary[]` |
| `get_conversation_messages` | Lê mensagens de um chat | `{ chatId, limit? }` | `Message[]` |
| `get_conversation_context` | Resumo de um chat | `{ chatId }` | `{ summary, keyPoints }` |

```typescript
const chatHistoryTools = {
  search_conversations: {
    description: 'Search through previous conversations with the user.',
    inputSchema: z.object({
      query: z.string().describe('Search term'),
      limit: z.number().optional().default(5),
    }),
    execute: async ({ query, limit }) => {
      const chats = await scopedAgent.chats.search(query, { limit });
      return chats.map(c => ({
        id: c.chatId,
        title: c.title,
        preview: c.lastMessage?.content?.slice(0, 100),
        messageCount: c.messageCount,
        updatedAt: c.updatedAt,
      }));
    },
  },
  
  list_conversations: {
    description: 'List recent conversations.',
    inputSchema: z.object({
      limit: z.number().optional().default(10),
    }),
    execute: async ({ limit }) => {
      const chats = await scopedAgent.chats.list({ limit });
      return chats.map(c => ({
        id: c.chatId,
        title: c.title,
        messageCount: c.messageCount,
        updatedAt: c.updatedAt,
      }));
    },
  },
  
  get_conversation_messages: {
    description: 'Get messages from a specific conversation.',
    inputSchema: z.object({
      chatId: z.string().describe('Conversation ID'),
      limit: z.number().optional().default(20),
    }),
    execute: async ({ chatId, limit }) => {
      return await scopedAgent.chats.messages(chatId, { limit });
    },
  },
  
  get_conversation_context: {
    description: 'Get a summary of a specific conversation.',
    inputSchema: z.object({
      chatId: z.string().describe('Conversation ID'),
    }),
    execute: async ({ chatId }) => {
      const chat = await scopedAgent.chats.get(chatId);
      const messages = await scopedAgent.chats.messages(chatId, { limit: 10 });
      return {
        title: chat?.title,
        messageCount: chat?.messageCount,
        recentMessages: messages,
        createdAt: chat?.createdAt,
        updatedAt: chat?.updatedAt,
      };
    },
  },
};
```

### 2.4 Chat Management Tools

| Tool | Descrição | Parâmetros | Retorno |
|------|-----------|------------|---------|
| `set_conversation_title` | Define título do chat | `{ title }` | `{ success: boolean }` |

```typescript
const chatManagementTools = {
  set_conversation_title: {
    description: 'Set a descriptive title for the current conversation based on its content.',
    inputSchema: z.object({
      title: z.string().max(100).describe('A short, descriptive title'),
    }),
    execute: async ({ title }) => {
      const chatId = getCurrentChatId(); // Do escopo atual
      if (!chatId) {
        return { success: false, error: 'No active conversation' };
      }
      await scopedAgent.chats.update(chatId, { title });
      return { success: true };
    },
  },
};
```

## 3. API de generate/stream/webhook (Parametrizada)

### 3.1 `generate()` e `stream()`

```typescript
interface GenerateOptions {
  messages: Message[];
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPÇÕES DE CHAT
  // ═══════════════════════════════════════════════════════════════════════════
  chat?: {
    // Usar um chat específico (opcional - pode vir do scope)
    id?: string;
    
    // Criar novo chat se não existir ID
    createIfNotExists?: boolean; // default: true se chat.enabled
    
    // Configuração de título para novo chat
    title?: {
      // Valor inicial (ou deixar para o agente definir)
      value?: string;
      
      // Forçar o agente a definir título nesta mensagem
      // (injeta instrução especial no prompt)
      askAgentToSet?: boolean;
    };
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPÇÕES DE CONTEXTO
  // ═══════════════════════════════════════════════════════════════════════════
  context?: {
    // Override do working memory (não salva, só usa nesta request)
    workingMemoryOverride?: string;
    
    // Entries adicionais para injetar (não salvas)
    additionalEntries?: Array<{ content: string; tags?: string[] }>;
    
    // Mensagens de sistema adicionais
    additionalSystemMessages?: string[];
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPÇÕES DE TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  tools?: {
    // Desabilitar tools específicas para esta request
    disabled?: string[];
    
    // Habilitar apenas estas tools
    enabled?: string[];
    
    // Tools adicionais só para esta request
    additional?: ToolSet;
  };
}

// Uso
const result = await agent
  .scope('organization', 'org_123')
  .scope('user', 'user_456')
  .scope('chat', 'chat_789') // Ou deixar sem para criar novo
  .generate({
    messages: [{ role: 'user', content: 'Hello!' }],
    chat: {
      title: {
        askAgentToSet: true, // Agente vai definir o título
      },
    },
  });
```

### 3.2 `webhook()` (Ultra-Parametrizado)

```typescript
interface WebhookOptions<TPayload = unknown> {
  // ═══════════════════════════════════════════════════════════════════════════
  // IDENTIFICAÇÃO DO EVENTO
  // ═══════════════════════════════════════════════════════════════════════════
  event: {
    // Tipo/nome do evento (ex: 'payment.success', 'pr.opened')
    type: string;
    
    // Payload do webhook
    payload: TPayload;
    
    // Metadados do evento
    metadata?: {
      source?: string;      // 'stripe', 'github', etc.
      timestamp?: Date;
      idempotencyKey?: string;
    };
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO DE CHAT
  // ═══════════════════════════════════════════════════════════════════════════
  chat: {
    // Estratégia de chat
    strategy: 
      | 'new'           // Sempre criar novo chat
      | 'existing'      // Usar chat existente (requer id)
      | 'find-or-create' // Buscar por critério ou criar
      | 'dedicated';    // Chat dedicado para este tipo de evento
    
    // ID do chat (obrigatório se strategy = 'existing')
    id?: string;
    
    // Critério de busca (se strategy = 'find-or-create')
    findBy?: {
      // Buscar por tag
      tag?: string;
      // Buscar por título (partial match)
      title?: string;
      // Buscar pelo mais recente do sender
      latestFromSender?: boolean;
    };
    
    // Título do chat
    title?: {
      // Modo de definição
      mode: 'fixed' | 'template' | 'agent';
      
      // Se mode = 'fixed', valor fixo
      value?: string;
      
      // Se mode = 'template', template com variáveis
      // Variáveis: {{event.type}}, {{event.source}}, {{date}}, etc.
      template?: string;
      
      // Se mode = 'agent', prompt para o agente gerar
      agentPrompt?: string;
    };
    
    // Tags para o chat (útil para find-or-create)
    tags?: string[];
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO DE PROCESSAMENTO
  // ═══════════════════════════════════════════════════════════════════════════
  processing: {
    // Gerar resposta do agente?
    generateResponse: boolean;
    
    // Prompt para o agente processar o evento
    prompt?: string;
    
    // Template de prompt (com variáveis do evento)
    promptTemplate?: string;
    
    // System prompt adicional/override
    systemPrompt?: {
      mode: 'append' | 'prepend' | 'override';
      content: string;
    };
    
    // Salvar o evento como mensagem de sistema?
    saveEventAsMessage?: boolean;
    
    // Formato da mensagem do evento
    eventMessageTemplate?: string;
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO DE MEMÓRIA
  // ═══════════════════════════════════════════════════════════════════════════
  memory?: {
    // Criar entry automática sobre este evento?
    createEntry?: {
      enabled: boolean;
      content?: string;           // Conteúdo fixo
      contentTemplate?: string;   // Template com variáveis
      tags?: string[];
    };
    
    // Atualizar working memory?
    updateWorkingMemory?: {
      enabled: boolean;
      mode: 'append' | 'replace';
      content?: string;
      contentTemplate?: string;
    };
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPÇÕES DE TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  tools?: {
    disabled?: string[];
    enabled?: string[];
    additional?: ToolSet;
  };
}
```

### 3.3 Exemplos de Uso do `webhook()`

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// EXEMPLO 1: Stripe Payment - Novo chat com título fixo
// ═══════════════════════════════════════════════════════════════════════════
await agent
  .scope('organization', 'org_123')
  .scope('user', customerId)
  .scope('sender', 'stripe-webhook')
  .webhook({
    event: {
      type: 'payment.success',
      payload: stripeEvent.data,
      metadata: { source: 'stripe' },
    },
    chat: {
      strategy: 'new',
      title: {
        mode: 'template',
        template: 'Payment: ${{payload.amount}} - {{date}}',
      },
      tags: ['payment', 'stripe'],
    },
    processing: {
      generateResponse: true,
      saveEventAsMessage: true,
      promptTemplate: `
        A payment of ${{payload.amount}} was successful.
        Transaction ID: {{payload.transaction_id}}
        
        Generate a friendly confirmation message for the user.
      `,
    },
    memory: {
      createEntry: {
        enabled: true,
        contentTemplate: 'User made a payment of ${{payload.amount}} on {{date}}',
        tags: ['transaction', 'payment'],
      },
    },
  });

// ═══════════════════════════════════════════════════════════════════════════
// EXEMPLO 2: GitHub PR - Chat dedicado por repo
// ═══════════════════════════════════════════════════════════════════════════
await agent
  .scope('organization', 'org_123')
  .scope('user', 'github-bot')
  .scope('sender', 'github-webhook')
  .webhook({
    event: {
      type: 'pull_request.opened',
      payload: githubEvent,
      metadata: { source: 'github' },
    },
    chat: {
      strategy: 'find-or-create',
      findBy: {
        tag: `repo:${githubEvent.repository.full_name}`,
      },
      title: {
        mode: 'template',
        template: 'GitHub: {{payload.repository.name}}',
      },
      tags: [`repo:${githubEvent.repository.full_name}`, 'github'],
    },
    processing: {
      generateResponse: true,
      promptTemplate: `
        New PR opened: #{{payload.number}} - {{payload.title}}
        
        Analyze the PR and provide:
        1. Summary of changes
        2. Potential issues to review
        3. Suggested reviewers
      `,
    },
  });

// ═══════════════════════════════════════════════════════════════════════════
// EXEMPLO 3: Support Ticket - Chat existente
// ═══════════════════════════════════════════════════════════════════════════
await agent
  .scope('organization', 'org_123')
  .scope('user', ticketEvent.customer_id)
  .scope('sender', 'zendesk-webhook')
  .webhook({
    event: {
      type: 'ticket.updated',
      payload: ticketEvent,
    },
    chat: {
      strategy: 'existing',
      id: ticketEvent.chat_id, // Chat já existe
    },
    processing: {
      generateResponse: true,
      prompt: 'The support ticket was updated. Acknowledge the update and provide next steps.',
    },
  });

// ═══════════════════════════════════════════════════════════════════════════
// EXEMPLO 4: Cron Job - Chat dedicado, título definido pelo agente
// ═══════════════════════════════════════════════════════════════════════════
await agent
  .scope('organization', 'org_123')
  .scope('sender', 'cron:daily-report')
  .webhook({
    event: {
      type: 'cron.daily-report',
      payload: { date: new Date(), metrics: dailyMetrics },
    },
    chat: {
      strategy: 'dedicated', // Sempre o mesmo chat para este sender
      title: {
        mode: 'agent',
        agentPrompt: 'Generate a title for this daily report chat',
      },
    },
    processing: {
      generateResponse: true,
      promptTemplate: `
        Daily metrics report for {{payload.date}}:
        {{JSON.stringify(payload.metrics)}}
        
        Analyze the metrics and provide insights.
      `,
    },
  });
```

## 4. Defaults Inteligentes

### 4.1 Defaults Globais

```typescript
const DEFAULT_MEMORY_CONFIG = {
  workingMemory: {
    enabled: true,
    scope: 'user',
    injection: {
      enabled: true,
      position: 'after-instructions',
    },
    maxLength: 4000,
  },
  
  chat: {
    enabled: true,
    title: {
      mode: 'agent', // Agente define o título - MELHOR DEFAULT
      default: 'New Conversation',
    },
    contextLimit: 50,
    contextStrategy: 'recent',
  },
  
  entries: {
    enabled: true,
    scope: 'user',
    contextLimit: 20,
    contextOrder: 'recent',
  },
  
  tools: {
    workingMemory: {
      enabled: true,
      operations: { read: true, update: true, append: true, clear: false },
    },
    memoryEntries: {
      enabled: true,
      operations: { create: true, read: true, update: true, delete: false, search: true, list: true },
    },
    chatHistory: {
      enabled: true,
      operations: { search: true, list: true, getMessages: true, getContext: true },
    },
    chatManagement: {
      enabled: true,
      operations: { setTitle: true },
    },
  },
};
```

### 4.2 Defaults por Método

```typescript
// generate() / stream() defaults
const DEFAULT_GENERATE_OPTIONS = {
  chat: {
    createIfNotExists: true,
    title: {
      // Se não tem título, agente deve definir na primeira interação
      askAgentToSet: true,
    },
  },
};

// webhook() defaults
const DEFAULT_WEBHOOK_OPTIONS = {
  chat: {
    strategy: 'new',
    title: {
      mode: 'agent', // Agente define
    },
  },
  processing: {
    generateResponse: true,
    saveEventAsMessage: true,
  },
};
```

## 5. System Prompt Injection (Automático)

Quando tools estão habilitadas, o agente recebe instruções no system prompt:

```typescript
const generateSystemPromptSuffix = (config: MemoryConfig) => {
  const sections: string[] = [];
  
  // Working Memory
  if (config.tools.workingMemory.enabled) {
    sections.push(`
## User Context Management
You have access to a persistent user context. Use the following tools:
- \`${config.tools.workingMemory.read.name}\`: Read current user context
- \`${config.tools.workingMemory.append.name}\`: Add new information to context
- \`${config.tools.workingMemory.update.name}\`: Replace entire context (use sparingly)

Store important information like:
- User preferences and settings
- Important facts about the user
- Context that should persist across conversations
    `);
  }
  
  // Memory Entries
  if (config.tools.memoryEntries.enabled) {
    sections.push(`
## Memory System
You can store and recall specific memories:
- \`${config.tools.memoryEntries.create.name}\`: Store a new memory with tags
- \`${config.tools.memoryEntries.search.name}\`: Search stored memories
- \`${config.tools.memoryEntries.list.name}\`: List recent memories

Use memories to remember:
- Specific facts mentioned by the user
- Important dates or events
- Preferences that might change
    `);
  }
  
  // Chat History
  if (config.tools.chatHistory.enabled) {
    sections.push(`
## Conversation History
You can search and reference previous conversations:
- \`${config.tools.chatHistory.search.name}\`: Search past conversations
- \`${config.tools.chatHistory.list.name}\`: List recent conversations
- \`${config.tools.chatHistory.getMessages.name}\`: Read messages from a conversation

Use this to provide continuity and reference previous discussions.
    `);
  }
  
  // Chat Title
  if (config.chat.title.mode === 'agent' && config.tools.chatManagement.enabled) {
    sections.push(`
## Conversation Title
If this is a new conversation without a title, use \`${config.tools.chatManagement.names.setTitle}\` to set a descriptive title based on the conversation topic.
    `);
  }
  
  return sections.join('\n\n');
};
```

## 6. Resumo das Tools

| Categoria | Tool | Operação | Default |
|-----------|------|----------|---------|
| **Working Memory** | `get_user_context` | read | ✅ |
| | `update_user_context` | update | ✅ |
| | `add_to_user_context` | append | ✅ |
| | `clear_user_context` | clear | ❌ |
| **Memory Entries** | `remember` | create | ✅ |
| | `recall_entry` | read | ✅ |
| | `update_memory` | update | ✅ |
| | `forget` | delete | ❌ |
| | `search_memories` | search | ✅ |
| | `list_memories` | list | ✅ |
| **Chat History** | `search_conversations` | search | ✅ |
| | `list_conversations` | list | ✅ |
| | `get_conversation_messages` | getMessages | ✅ |
| | `get_conversation_context` | getContext | ✅ |
| **Chat Management** | `set_conversation_title` | setTitle | ✅ |

---

O que você acha? Está alinhado com o que você imagina? Posso ajustar qualquer parte antes de começarmos a implementação!

User: Beleza estou de acordo, só um ponto, nas configs das tools, podemos fazer tools.update.name, tools.update.description, nao precisa fazer dois objetos separados que pode confundir, agora de resto, estou de acordo. Estuda o estado atual do agents e cria um plano detalhado, minucioso, com o passo a passo por favor antes de implementar... Faca toda a pesquisa antes de criar o plano, se quiser, delega pra um agente a pesquisa pra te poupar contexto.

GitHub Copilot: Vou delegar a pesquisa para um subagente analisar o estado atual do package agents completamente. 

Research agents package state

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/AGENTS.md#1-1), lines 1 to 2000

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/index.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/core)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/adapters)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/main.builder.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/index.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/core/agent.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/core/memory.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/core/manager.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/adapter.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/memory.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/builder.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/adapters/memory.adapter.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/adapters/json-file.adapter.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/telemetry/index.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/store/src/builders/main.builder.ts)

Searched for regex `scope\(.*\).*IgniterStoreManager|createScopedInstance|scopeChain` (`**/packages/store/src/**/*.ts`), 20 results

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/store/src/core/manager.ts#1-1), lines 1 to 151

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/store/src/core/manager.ts#270-270), lines 270 to 350

Agora vou aprofundar a pesquisa com mais detalhes específicos: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/adapter.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/index.ts)

Agora vou ver os tipos de memória atuais: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/memory.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src)

Summarized conversation historyAgora vou analisar o agent.ts e o padrão de scoping do store para finalizar a pesquisa: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/core/agent.ts)

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/store/src/builders/main.builder.ts)

Agora vou ver o manager do store para entender o padrão do método `.scope()`: 

Searched for text `scope\(key: TScopes` (`**/packages/store/src/core/manager.ts`), no results

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/store/src/core/manager.ts#1-1), lines 1 to 201

Searched for regex `scope\(key:` (`**/packages/store/src/core/manager.ts`), no results

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/store/src/core/manager.ts#200-200), lines 200 to 500

Perfeito! Agora tenho contexto suficiente. Vou criar o plano detalhado.

---

## Plan: Scoped Memory System for @igniter-js/agents

Implementar um sistema de memória com escopo dinâmico (similar ao `@igniter-js/store`), persistência automática de chats, working memory injetada no system prompt, ferramentas automáticas para o agente gerenciar memória, e suporte a webhooks.

### Steps

1. **Criar novos tipos de escopo e configuração em src/types/scope.ts**  
   - Definir `IgniterAgentScopeOptions`, `IgniterAgentScopeEntry`, e `IgniterAgentScopedMemoryConfig` para suportar escopos dinâmicos com descrição, required flag, e encadeamento.

2. **Criar tipos de configuração de tools automáticas em src/types/memory-tools.ts**  
   - Definir `IgniterAgentMemoryToolConfig` com estrutura consolidada (`tools.update.name`, `tools.update.description`, etc.) para cada ferramenta: `update`, `createEntry`, `updateEntry`, `deleteEntry`, `listEntries`, `createChat`, `updateTitle`, `deleteChat`.

3. **Estender `IgniterAgentBuilderState` em src/types/builder.ts**  
   - Adicionar `scopeDefinitions: Record<TScopes, IgniterAgentScopeOptions>` ao estado do builder para acumulação de tipos.

4. **Adicionar método `addScope()` no builder src/builders/agent.builder.ts**  
   - Implementar padrão imutável igual ao `@igniter-js/store`: `addScope<TKey extends string>(key: TKey, options?)` que retorna `IgniterAgentBuilder<..., TScopes | TKey>` para acumular tipos.

5. **Criar classe `IgniterAgentScopedCore` em src/core/agent-scoped.ts**  
   - Nova classe wrapper que mantém `scopeChain[]` e delega para `IgniterAgentCore`; método `scope<TKey extends TScopes>(key, id)` retorna nova instância com escopo acumulado; injeta working memory no system prompt automaticamente.

6. **Atualizar método `build()` para retornar `IgniterAgentScopedCore` em src/builders/agent.builder.ts**  
   - Mudar retorno de `IgniterAgentCore` para `IgniterAgentScopedCore<..., TScopes>` que expõe API completa mais `.scope()`.

7. **Criar builder de tools automáticas em src/builders/memory-tools.builder.ts**  
   - Construir toolset `igniter:memory` com as 8 tools, cada uma respeitando `enabled`, `name`, `description` da config consolidada.

8. **Estender adapters para suportar scoped keys em src/adapters/json-file.adapter.ts e src/adapters/redis.adapter.ts**  
   - Métodos devem aceitar `scopeChain` para construir chaves como `igniter:agent:[agentName]:scope:[key]:[id]:...` automaticamente; adicionar métodos para entries (notes/learnings).

9. **Estender `IgniterAgentMemoryProvider` em src/types/adapter.ts**  
   - Adicionar métodos `getEntries()`, `saveEntry()`, `updateEntry()`, `deleteEntry()` para memory entries com `tags[]` e `timestamp`.

10. **Implementar método `webhook()` em `IgniterAgentScopedCore` src/core/agent-scoped.ts**  
    - Expor `agent.webhook({ event, payload, signature? })` que permite eventos externos atualizarem memória ou triggerarem ações.

11. **Adicionar telemetry events para memory operations em src/telemetry/index.ts**  
    - Grupo `memory.*` com eventos: `working.get.started/success/error`, `working.update.*`, `entry.create.*`, `entry.update.*`, `entry.delete.*`, `chat.save.*`, etc.

12. **Atualizar exports em src/index.ts**  
    - Exportar novos tipos (`IgniterAgentScopeOptions`, `IgniterAgentMemoryToolConfig`), classes (`IgniterAgentScopedCore`), e builders.

### Further Considerations

1. **Breaking Change no retorno do `build()`?** A mudança de `IgniterAgentCore` para `IgniterAgentScopedCore` pode quebrar código existente. **Recomendação:** `IgniterAgentScopedCore` deve `extends IgniterAgentCore` para manter compatibilidade.

2. **Auto-save de mensagens:** Deve ser opt-in ou opt-out? **Recomendação:** Opt-in via `history: { enabled: true, autoSave: true }` para não quebrar comportamento existente.

3. **Geração de título por tool vs. automática:** O agent deve ter uma tool `updateTitle` ou título deve ser gerado automaticamente? **Proposta atual:** Tool `updateTitle` dá controle ao agente; manter `generateTitle` config como fallback automático.

User: 1: O que for mais simples, não temos problemas com breaking changes, afinal nao divulgamos o package ainda;

2: Auto-save é automatico, nao se preocupe com compatibilidade, so garanta funcionando;

3: Geracao de titulo pode ser por tool pra simplificar. 

Pode implementar, mas vale ser estrategico no que faz sentido delegar pra te poupar contexto.

GitHub Copilot: Created 11 todos

Created [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/scope.ts)

Starting: *Criar tipos de memory tools* (2/11)

Created [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/memory-tools.ts)

Created 11 todos

Agora preciso ver o builder state atual para estendê-lo: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/builder.ts)

O arquivo builder.ts contém tipos para o resultado do builder, não o estado interno. Preciso verificar onde está o estado do builder no `agent.builder.ts`: 

Searched for text `private readonly _config` (`**/packages/agents/src/builders/agent.builder.ts`), 1 result

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts#160-160), lines 160 to 410

Agora preciso ver a interface `IgniterAgentConfig` que é usada como estado: 

Searched for text `IgniterAgentConfig` (`**/packages/agents/src/types/**`), 2 results

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/common.ts#190-190), lines 190 to 340

Agora entendo a estrutura. Preciso adicionar `scopeDefinitions` ao `IgniterAgentConfig`. Vou fazer as alterações necessárias: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/common.ts#1-1), lines 1 to 101

Agora vou fazer as modificações necessárias no arquivo common.ts para adicionar suporte a scopes e memory tools: 

Using "Replace String in File"


```

```
Agora preciso adicionar os campos de scope ao `IgniterAgentConfig`. Vou ler a parte relevante: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/types/common.ts#260-260), lines 260 to 360

Using "Replace String in File"


```

```


Starting: *Adicionar addScope() no builder* (4/11)

Agora vou adicionar o método `addScope()` no builder. Preciso ver mais do arquivo para encontrar o melhor lugar: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts#1-1), lines 1 to 101

Agora preciso ver mais do builder para adicionar o import e o método `addScope()`. Vou ler mais: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts#40-40), lines 40 to 140

Agora vou adicionar os imports e o método `addScope()` ao builder: 

Using "Replace String in File"

Agora preciso adicionar o `TAgentScopes` ao generic do builder e o método `addScope()`. Vou ler a declaração da classe: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts#155-155), lines 155 to 205

Preciso adicionar `TAgentScopes` aos generics. Vou fazer a modificação: 

Using "Replace String in File"


```

```
Agora preciso atualizar o constructor e o método `create()` para incluir o novo type parameter: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts#195-195), lines 195 to 275

Using "Replace String in File"


```

```
Agora preciso atualizar todos os outros métodos do builder para incluir `TAgentScopes` no retorno. Vou buscar os métodos e atualizá-los: 

Searched for text `TAgentContextSchema` (`**/packages/agents/src/builders/agent.builder.ts`), 20 results

Vou ler mais partes do arquivo para entender a estrutura dos métodos e fazer uma substituição em massa: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts#290-290), lines 290 to 440

Vejo que há muitos métodos que retornam `IgniterAgentBuilder` sem `TAgentScopes`. Vou fazer um replace em massa. Primeiro vou contar quantos métodos precisam ser atualizados: 

Ran terminal command: grep -c "TAgentContextSchema\s*>" /Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts

Made changes.

User: Prossiga!

GitHub Copilot: Ran terminal command: cd /Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents && sed -i '' 's/TAgentContextSchema\s*>/TAgentContextSchema, TAgentScopes>/g' src/builders/agent.builder.ts

User: Prossiga

GitHub Copilot: Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts#300-300), lines 300 to 700

Vou fazer substituições em massa para adicionar `TAgentScopes` em todos os métodos. Preciso usar um approach mais eficiente: 

Ran terminal command: cd /Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders && sed -i '' 's/TAgentContextSchema\s*>/TAgentContextSchema, TAgentScopes>/g' agent.builder.ts

Agora preciso adicionar o método `addScope()` e `withMemoryTools()`. Vou encontrar um bom lugar para adicioná-los: 

Read [](file:///Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts#400-400), lines 400 to 500

Vejo que o sed não aplicou corretamente. Vou verificar e aplicar a correção: 

Ran terminal command: grep "TAgentContextSchema>" /Users/felipebarcelospro/Sandbox/igniter-js/igniter-js/packages/agents/src/builders/agent.builder.ts | head -5

User: Calma! Pra que o withMemory tools? 

GitHub Copilot: Boa pergunta! Você tem razão em questionar.

A configuração de memory tools pode ficar **dentro** do próprio `withMemory()`:

```typescript
.withMemory({
  provider: adapter,
  tools: {
    enabled: true,
    update: { name: 'updateMemory' },
    createEntry: { enabled: true }
  }
})
```

Assim não precisamos de um método `withMemoryTools()` separado. É mais simples e coeso.

**Devo manter assim (tools dentro do withMemory)?**