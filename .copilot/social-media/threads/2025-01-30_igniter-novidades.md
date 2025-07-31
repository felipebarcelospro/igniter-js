# Thread para Threads - Novidades do Igniter.js 🔥


## Post 1 - Introdução
Resumo das principais atualizações do Igniter.js após meses de desenvolvimento. A thread apresenta recursos que facilitam tarefas comuns no backend e frontend, com foco em produtividade, integração e type safety.

#TypeScript #WebDev #IgniterJS #FullStack



## Post 2 - Filas de Background Jobs
Igniter Queues permite processar tarefas assíncronas, como envio de emails, geração de relatórios e uploads, sem bloquear a API. A API garante type safety e integração direta com BullMQ e Redis.

Principais casos de uso:
- Processamento de emails em segundo plano
- Relatórios e tarefas pesadas fora do fluxo principal
- Uploads assíncronos

```typescript
// src/services/jobs.ts

// Cria um conjunto de jobs registrados, usando o método merge para adicionar novos jobs
export const registeredJobs = jobs.merge({
  // Define um grupo de jobs relacionado a emails
  emails: jobs.router({
    jobs: {
      // Registra o job 'sendWelcome'
      sendWelcome: jobs.register({
        name: 'sendWelcome', // Nome do job
        input: z.object({
          message: z.string() // Define o formato do input usando Zod (validação de tipos)
        }),
        handler: async ({ input }) => {
          // Função que será executada quando o job rodar
          console.log(input.message) // Exibe a mensagem recebida no console
        }
      })
    }
  })
})

// Inicializa o Igniter.js com contexto, store, jobs, logger e telemetry
export const igniter = Igniter
  .context(createIgniterAppContext()) // Define o contexto da aplicação
  .store(store) // Define o store (persistência de dados)
  .jobs(registeredJobs) // Adiciona os jobs registrados
  .logger(logger) // Adiciona o logger para logs
  .telemetry(telemetry) // Adiciona o telemetry para monitoramento
  .create() // Cria a instância final do Igniter

// Agenda o job 'sendWelcome' para ser executado, garantindo type safety
await igniter.jobs.emails.enqueue({ 
  task: 'sendWelcome', // Nome do job a ser executado
  input: {
    userId: '123' // Input passado para o job (atenção: o schema espera 'message', não 'userId')
  }
});
```

Baseado em BullMQ + Redis para alta performance e confiabilidade.
---

## Post 3 - Cache e Pub/Sub Integrados
Igniter Store oferece uma API para cache de dados e sistema Pub/Sub, facilitando a redução de consultas ao banco, comunicação entre microserviços e eventos em tempo real.

Funcionalidades:
- Cache com TTL configurável e serialização automática
- Pub/Sub para eventos entre serviços e atualização de UI
- Desacoplamento total

```typescript
// Cache - Armazena dados do usuário com TTL de 1 hora (3600 segundos)
await store.set('user:123', userData, { 
  ttl: 3600 // Tempo de expiração em segundos
});

// Recupera os dados do usuário do cache, já tipados
const user = await store.get<User>('user:123');

// Pub/Sub - Publica um evento de atualização de usuário
await store.publish('user.updated', { 
  userId: '123' // Dados do evento
});

// Assina todos os eventos relacionados a usuário e executa uma função ao receber
store.subscribe('user.*', (data) => {
  // Aqui você trata o evento recebido (ex: atualizar UI, logar, etc)
});
```

Implementado sobre Redis para alta performance.



## Post 4 - Sincronização em Tempo Real
Igniter Realtime permite que a UI do frontend seja atualizada automaticamente quando dados mudam no backend, usando Server-Sent Events. Não requer configuração adicional e é indicado para cenários onde a sincronização de dados é essencial.

Principais recursos:
- Auto-revalidação de dados
- Server-Sent Events para atualização eficiente
- Sem necessidade de configuração manual

```typescript
// Backend: Após criar um novo post, revalide automaticamente a lista de posts
const createPost = igniter.mutation({
  handler: async ({ context, request, response }) => {
    const newPost = await context.database.posts.create({ data: request.body });
    // Esta linha dispara a atualização automática para todos os clientes conectados
    return response.created(newPost).revalidate('posts.list');
    // return response.created(newPost).revalidate('posts.list', { scopes: ['user::123'] }); // Para controlar quem deve receber
  },
});

// Frontend: A lista de posts se atualiza automaticamente após qualquer alteração
import { api } from '@/igniter.client';

function PostsList() {
  const postsQuery = api.posts.list.useQuery();

  if (postsQuery.isLoading) return <div>Carregando posts...</div>;
  if (postsQuery.isError) return <div>Erro: {postsQuery.error.message}</div>;

  return (
    <ul>
      {postsQuery.data.posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}

// ✨ Basta alterar dados no backend e a UI reflete instantaneamente, sem precisar de código extra para sincronização!
// Sua UI nunca mais vai estar desatualizada! 🔄
```

Alterações no backend são refletidas automaticamente na interface, sem necessidade de lógica extra para sincronização.


---

## Post 5 - Igniter MCP
🤖 **IGNITER MCP**: Seu Backend Agora Fala com IA!

Model Context Protocol = Seu Igniter.js vira uma ferramenta nativa para IAs!

🧠 **Integração com Cursor, Claude, etc.**
🧠 **APIs viram tools automáticos**
🧠 **Context-aware AI operations**
🧠 **Streaming responses nativo**

```typescript
// Sua API automaticamente vira tool de IA
const mcp = createMcpAdapter({
  context: () => ({ user: getCurrentUser() })
  router: igniter.router,
});
```

O futuro é AI-native, e o Igniter.js já está lá! 🚀
---

## Post 6 - CLI Interativa

🎉 **IGNITER CLI**: Produtividade no Terminal!

A nova CLI do Igniter.js traz um menu interativo para criar e gerenciar projetos com facilidade:

🖥️ **Dashboard em tempo real**
🖥️ **Monitoramento de requests**
🖥️ **Hot reload inteligente**
🖥️ **Configuração guiada**

```bash
# Inicie o modo interativo
npx @igniter-js/cli@latest dev --interactive

# Veja status dos processos, logs e requests em tempo real!
```

De zero a produção com uma experiência de desenvolvimento moderna e eficiente! ⚡

---

## Post 7 - Scaffolding Automático com `igniter generate`

🛠️ **IGNITER GENERATE**: Crie features completas em segundos!

A CLI agora permite gerar toda a estrutura de uma feature, controllers e schemas tipados, direto do seu modelo Prisma:

✅ **`igniter generate feature user --schema prisma:User`**  
✅ **`igniter generate feature dashboard`**  
✅ **`igniter generate schema`**  

Tudo já integrado ao seu projeto, com type safety garantida e arquitetura feature-sliced pronta para escalar!

```bash
# Gere uma feature completa baseada no modelo Prisma 'User'
npx @igniter-js/cli generate feature user --schema prisma:User

# Gere uma feature manual, para lógica customizada
npx @igniter-js/cli generate feature dashboard

# Gere o client schema tipado para o frontend
npx @igniter-js/cli generate schema
```

---

## Post 7 - Plugins Ecosystem
🔌 **SISTEMA DE PLUGINS**: Modularidade Máxima!

Crie funcionalidades reutilizáveis:

⚡ **Self-contained modules**
⚡ **Type-safe por design**
⚡ **Compartilháveis entre projetos**
⚡ **Marketplace de plugins (Em breve)**

```typescript
import { createIgniterPlugin, createIgniterPluginAction } from 'igniter-js';

const authPlugin = createIgniterPlugin({
  name: 'auth',
  actions: {
    validateToken: createIgniterPluginAction({
      name: 'validateToken',
      description: 'Valida o token JWT do usuário',
      input: z.object({ token: z.string() }),
      handler: async ({ context, input }) => {
        // lógica de validação
        return { userId: '123', valid: true };
      }
    })
  },
  controllers: {
    login: {
      path: '/login',
      method: 'POST',
      body: z.object({ email: z.string(), password: z.string() }),
      handler: async ({ self, request, response }) => {
        const result = await self.actions.validateToken({ token: 'abc' });
        return response.ok(result);
      }
    }
  },  
});

const igniter = Igniter
  .context<AppContext>()
  .plugins({ auth: authPlugin })
  .create();
```

Ecossistema que cresce com a comunidade! 🌱

---

## Post 8 - Developer Experience
💎 **DX QUE IMPRESSIONA**: Tudo Pensado Para Você!

🎯 **CLI interativo**: `npx @igniter/cli init my-project` e pronto!
🎯 **Feature-based architecture**
🎯 **Hot reload inteligente**
🎯 **Error handling robusto**
🎯 **Documentação auto-gerada**
🎯 **Starters prontos para qualquer stack**

```bash
# Um comando, projeto completo
npx @igniter-js/cli@latest init meu-projeto

# Escolha suas features:
✅ Igniter Queues
✅ Igniter Store  
✅ Igniter Realtime
✅ Database + Docker
```

🚀 **Starters oficiais para acelerar seu projeto:**
- **Next.js Full-Stack** (`starter-nextjs`)
- **Bun + React SPA** (`starter-bun-react-app`)
- **Bun REST API** (`starter-bun-rest-api`)
- **Express REST API** (`starter-express-rest-api`)
- **TanStack Start Full-Stack** (`starter-tanstack-start`)
- **Deno REST API** (`starter-deno-rest-api`)

Cada starter já vem com arquitetura feature-based, integração com Prisma, Redis, background jobs, cache, realtime e muito mais. Basta escolher, instalar e começar a construir!

De zero a produção em minutos! ⚡

---

## Post 9 - Type Safety
🛡️ **TYPE SAFETY ABSOLUTA**: Se Compila, Funciona!

O que torna o Igniter.js único:

🔒 **End-to-end type safety**
🔒 **Zero code generation**
🔒 **Refactoring seguro**
🔒 **IntelliSense perfeito**

```typescript
// Define no backend
const userController = igniter.controller({
  path: '/users',
  actions: {
    list: igniter.query({ /* ... */ })
  }
});

// Use no frontend - 100% tipado!
const users = api.users.list.useQuery();
//    ^? User[] - IntelliSense completo!
```

Bugs de runtime? Coisa do passado! 🚫

---

## Post 10 - Framework Agnostic
🌐 **FUNCIONA EM QUALQUER LUGAR**: Liberdade Total!

Built on Web Standards:

✅ **Next.js**
✅ **Express**
✅ **Hono**
✅ **Bun**
✅ **Deno**
✅ **Cloudflare Workers**

```typescript
// Mesmo código, qualquer runtime!
const igniter = Igniter
  .context<AppContext>()
  .create();

// Next.js
export { igniter as GET, igniter as POST };

// Express
app.use('/api', igniter.handler);
```

Nunca mais vendor lock-in! 🔓

---

## Post 12 - Comunidade e Futuro
🌟 **COMUNIDADE CRESCENDO**: Junte-se a Nós!

O que vem por aí:

🔮 **GraphQL adapter**
🔮 **Mais database drivers**
🔮 **Plugin marketplace**
🔮 **Visual API designer**
🔮 **AI code generation**

📚 **Recursos**:
- GitHub: github.com/felipebarcelospro/igniter-js
- Docs: Wiki completa
- Discord: Comunidade ativa
- Examples: Starters prontos

Vamos construir o futuro do TypeScript juntos! 🤝

---

## Post 13 - Call to Action
🔥 **EXPERIMENTE AGORA**: Sua Próxima API Merece o Melhor!

```bash
# Comece em 30 segundos
npx @igniter-js/cli@latest init minha-api
cd minha-api
npm run dev
```

🎯 **Por que escolher Igniter.js?**
- Type safety sem compromissos
- DX que acelera desenvolvimento
- Features enterprise built-in
- Comunidade apaixonada
- Futuro AI-native

**Marque um amigo dev que precisa conhecer isso!** 👥

**Compartilhe se curtiu a thread!** 🔄

**Perguntas? Comenta aí!** 💬

#IgniterJS #TypeScript #WebDev #FullStack #OpenSource

---

## Hashtags Sugeridas
#IgniterJS #TypeScript #WebDev #FullStack #NodeJS #React #NextJS #OpenSource #DeveloperExperience #API #Backend #Frontend #RealTime #Queues #Cache #AI #MCP #OpenTelemetry #Performance #ModernWeb