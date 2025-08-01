# Igniter.js: Evolução de um Framework TypeScript para APIs Type-Safe

Olá, comunidade TabNews! Felipe Barcelos aqui.

Após quase um ano desenvolvendo o Igniter.js de forma solo, chegou o momento de compartilhar as principais evoluções do framework. Para quem acompanhou meu [artigo anterior](https://www.tabnews.com.br/felipebarcelospro/sumi-por-quase-1-ano-mas-voltei-e-trouxe-um-framework-building-in-public-do-igniter-js), este é um update técnico sobre as funcionalidades implementadas e os problemas que elas resolvem.

Tenho usado o Igniter.js em todos os meus projetos durante este período, o que me permitiu identificar gaps reais e implementar soluções práticas. Compartilho toda essa jornada nas minhas redes sociais (Instagram, Threads, YouTube) para manter a transparência do processo de desenvolvimento.

## Principais Evoluções Implementadas

O Igniter.js nasceu com o objetivo de simplificar a criação de APIs TypeScript mantendo type safety end-to-end. Durante este ano de desenvolvimento e uso intensivo, identifiquei limitações práticas que precisavam ser endereçadas:

- **Background Jobs**: Processamento assíncrono para tarefas pesadas (emails, relatórios, uploads)
- **Cache e Pub/Sub**: Gerenciamento de estado distribuído e comunicação entre serviços
- **Sincronização em Tempo Real**: Atualização automática de interfaces sem polling manual
- **Tooling Avançado**: CLI mais robusta para scaffolding e desenvolvimento
- **Integração com IA**: Suporte nativo ao Model Context Protocol

Todas essas funcionalidades foram implementadas mantendo os princípios fundamentais do framework: type safety, developer experience e performance.

## Igniter Queues: Sistema de Background Jobs Type-Safe

O processamento assíncrono é fundamental para APIs que precisam lidar com tarefas pesadas sem impactar a latência das respostas. O Igniter Queues resolve este problema mantendo type safety completa:

```typescript
// Definição de jobs com validação de entrada
export const registeredJobs = jobs.merge({
  emails: jobs.router({
    jobs: {
      sendWelcome: jobs.register({
        name: 'sendWelcome',
        input: z.object({
          userId: z.string(),
          email: z.string()
        }),
        handler: async ({ input }) => {
          // Lógica de processamento
          await sendEmail(input.email, 'Bem-vindo!');
        }
      })
    }
  })
});

// Enfileiramento com validação automática
await igniter.jobs.emails.enqueue({
  task: 'sendWelcome',
  input: {
    userId: '123',
    email: 'user@example.com'
  }
});
```

**Arquitetura**: Construído sobre BullMQ + Redis, oferecendo recursos enterprise como retry automático, dead letter queues, rate limiting e monitoramento de performance.

## Igniter Store: Gerenciamento de Estado Distribuído

O Igniter Store abstrai a complexidade de configuração do Redis, oferecendo uma API unificada para cache e pub/sub:

```typescript
// Cache com TTL configurável
await store.set('user:123', userData, { ttl: 3600 });
const user = await store.get<User>('user:123');

// Sistema de eventos distribuído
await store.publish('user.updated', { userId: '123' });
store.subscribe('user.*', (data) => {
  // Processamento de eventos em tempo real
  console.log('User updated:', data);
});
```

**Casos de uso**: Cache de sessões, invalidação distribuída, comunicação entre microserviços, sincronização de estado em aplicações multi-instância.

## Igniter Realtime: Invalidação Automática de Cache

O Igniter Realtime implementa um sistema de invalidação inteligente que mantém interfaces sincronizadas automaticamente, eliminando a necessidade de polling manual ou WebSockets complexos:

```typescript
// Backend: Invalidação declarativa após mutações
const createPost = igniter.mutation({
  handler: async ({ context, request, response }) => {
    const newPost = await context.database.posts.create({ data: request.body });
    // Invalida automaticamente queries relacionadas em todos os clientes
    return response.created(newPost).revalidate(['posts.list']);
  },
});

// Frontend: Sincronização transparente
function PostsList() {
  const postsQuery = api.posts.list.useQuery();
  // A lista é atualizada automaticamente quando posts.list é invalidado
  return (
    <ul>
      {postsQuery.data?.posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**Implementação**: Utiliza Server-Sent Events para comunicação unidirecional eficiente, mantendo conexões persistentes com baixo overhead. Compatible com edge functions e serverless environments.

## Igniter MCP: Integração Nativa com Model Context Protocol

O Igniter MCP implementa suporte ao Model Context Protocol, permitindo que LLMs interajam diretamente com APIs Igniter.js de forma type-safe:

```typescript
// Exposição automática da API para LLMs
const mcp = createMcpAdapter({
  context: () => ({ user: getCurrentUser() }),
  router: igniter.router,
});
```

**Funcionalidades**: LLMs podem executar operações CRUD, gerar relatórios, processar dados e interagir com business logic através da API, respeitando contexto de autenticação e permissões. Útil para automação, análise de dados e integração com ferramentas de desenvolvimento assistido por IA.

## CLI Avançada: Tooling para Desenvolvimento

A CLI do Igniter.js oferece ferramentas robustas para scaffolding e monitoramento durante o desenvolvimento:

```bash
# Servidor de desenvolvimento com dashboard interativo
npx @igniter-js/cli@latest dev --interactive

# Geração automática de features baseada em schemas
npx @igniter-js/cli generate feature user --schema prisma:User
```

**Starters disponíveis**:
- Next.js Full-Stack
- Bun + React SPA  
- Express REST API
- TanStack Start
- Deno REST API

Todos os starters implementam arquitetura feature-based com configuração otimizada para produção.

## Sistema de Plugins: Arquitetura Modular

O sistema de plugins permite criar funcionalidades reutilizáveis e distribuíveis:

```typescript
const authPlugin = createIgniterPlugin({
  name: 'auth',
  actions: {
    validateToken: createIgniterPluginAction({
      input: z.object({ token: z.string() }),
      handler: async ({ input }) => {
        // Implementação da validação
        return { userId: '123', valid: true };
      }
    })
  },
  controllers: {
    login: {
      path: '/login',
      method: 'POST',
      handler: async ({ self, response }) => {
        const result = await self.actions.validateToken({ token: 'abc' });
        return response.ok(result);
      }
    }
  }
});
```

**Roadmap**: Desenvolvimento de um marketplace de plugins para compartilhamento de soluções comunitárias.

## Type Safety End-to-End: Garantias em Tempo de Compilação

O sistema de tipos do Igniter.js oferece garantias de type safety desde a definição da API até o consumo no frontend:

```typescript
// Definição no backend
const userController = igniter.controller({
  path: '/users',
  actions: {
    list: igniter.query({ /* ... */ })
  }
});

// Consumo no frontend com tipos inferidos
const users = api.users.list.useQuery();
//    ^? User[] - Tipos automaticamente sincronizados
```

**Benefícios**: Eliminação de code generation, refactoring seguro com rename automático, IntelliSense completo e detecção de breaking changes em tempo de compilação.

## Compatibilidade Universal: Runtime Agnostic

O Igniter.js é projetado para funcionar em qualquer runtime JavaScript moderno:

- **Node.js** (Express, Fastify, Koa)
- **Bun** (performance otimizada)
- **Deno** (runtime seguro)
- **Cloudflare Workers** (edge computing)
- **Vercel Edge** (serverless functions)
- **AWS Lambda** (cloud functions)

```typescript
// Next.js
export { igniter as GET, igniter as POST };

// Express
app.use('/api', igniter.handler);

// Cloudflare Workers
export default igniter;
```

**Arquitetura**: Sistema de adapters permite migração entre runtimes sem alteração do código de negócio, apenas mudando o adapter de deployment.

## Desenvolvimento Solo e Transparente

Estou mantendo o Igniter.js como projeto solo há aproximadamente um ano, utilizando-o em todos os meus projetos pessoais e profissionais. Esta experiência prática tem sido fundamental para identificar pain points reais e implementar soluções efetivas.

**Compartilhamento da jornada**:
- **Instagram**: [@feldbarcelospro](https://instagram.com/feldbarcelospro) - Documentação diária do processo de desenvolvimento
- **Threads**: [@feldbarcelospro](https://threads.net/@feldbarcelospro) - Insights técnicos e decisões arquiteturais
- **YouTube**: [Felipe Barcelos](https://youtube.com/@felipebarcelospro) - Tutoriais detalhados e análises técnicas

O desenvolvimento transparente permite que a comunidade acompanhe cada decisão técnica e contribua com feedback valioso.

## Roadmap Técnico

Próximas implementações planejadas:

- **Igniter Auth**: Sistema de autenticação modular com suporte a múltiplos providers
- **Igniter Files**: Gerenciamento de uploads com storage plugável
- **Igniter Analytics**: Coleta e análise de métricas de performance
- **Marketplace de Plugins**: Distribuição de extensões comunitárias
- **Igniter Studio**: Interface visual para design de APIs  

## Implementação e Recursos

Para implementar o Igniter.js em projetos:

```bash
# Criação de projeto com template
npx @igniter-js/cli@latest create my-app --template nextjs

# Instalação em projeto existente
npm install @igniter-js/core
```

**Recursos disponíveis:**
- **Documentação**: [igniter-js.vercel.app](https://igniter-js.vercel.app) - Guias técnicos e API reference
- **Discord**: Comunidade para discussões técnicas e suporte
- **GitHub**: Repositório open-source com issues e pull requests
- **Templates**: Starters otimizados para diferentes stacks

## Contribuição e Feedback

O projeto busca feedback da comunidade para validação de funcionalidades:

1. **Testing**: Implementação em projetos reais para identificar edge cases
2. **Code Review**: Contribuições via [GitHub](https://github.com/igniter-js/igniter-js)
3. **Feature Requests**: Sugestões baseadas em necessidades reais
4. **Documentation**: Melhoria da documentação técnica

O objetivo é construir uma ferramenta que resolva problemas reais de desenvolvimento full-stack TypeScript.

---

**Recursos**:
- 📖 [Documentação](https://igniter-js.vercel.app)
- 🐙 [GitHub](https://github.com/igniter-js/igniter-js)
- 💬 [Discord](https://discord.gg/igniter-js)
- 🐦 [Twitter](https://twitter.com/IgniterJs)

Feedback e contribuições são fundamentais para a evolução do projeto.