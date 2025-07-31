# 🚀 Igniter.js: As Novidades que Vão Revolucionar Seu Desenvolvimento Full-Stack

Fala Devs! Felipe Barcelos aqui.

Caramba, que jornada! Quem acompanhou meu [artigo anterior aqui no TabNews](https://www.tabnews.com.br/felipebarcelospro/sumi-por-quase-1-ano-mas-voltei-e-trouxe-um-framework-building-in-public-do-igniter-js) sabe que eu estava "sumido" desenvolvendo o Igniter.js. Pois bem, depois de meses de muito código, refatoração e feedback da comunidade, chegou a hora de compartilhar as novidades que vão fazer vocês babarem! 🤤

E como aqui no TabNews a gente curte transparência e a vibe "building in public", vou contar tudo que rolou nesses últimos meses e mostrar as features que vão mudar a forma como vocês desenvolvem APIs.

## 🔥 O Que Mudou Desde o Último Artigo?

Quando lancei o Igniter.js, a proposta era clara: simplificar a criação de APIs TypeScript com type safety ponta-a-ponta. Mas a comunidade pediu mais, e eu escutei! As principais dores que vocês relataram foram:

- **"Preciso de background jobs para emails e relatórios"**
- **"Cache e Pub/Sub são essenciais para performance"**
- **"Quero sincronização em tempo real sem complicação"**
- **"A CLI poderia ser mais interativa"**
- **"Falta integração com IA"**

E adivinha? Todas essas features estão prontas! 🎉

## 🎯 Igniter Queues: Background Jobs que Funcionam

Uma das maiores dores de quem desenvolve APIs é processar tarefas pesadas sem travar a resposta pro usuário. Emails, relatórios, uploads... tudo isso agora roda em background com type safety total:

```typescript
// Registra um job tipado
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
          // Sua lógica de envio aqui
          await sendEmail(input.email, 'Bem-vindo!');
        }
      })
    }
  })
});

// Agenda o job - 100% tipado!
await igniter.jobs.emails.enqueue({
  task: 'sendWelcome',
  input: {
    userId: '123',
    email: 'user@example.com'
  }
});
```

Baseado em **BullMQ + Redis**, então vocês já sabem que é enterprise-grade! 💪

## 💾 Igniter Store: Cache e Pub/Sub Integrados

Chega de configurar Redis manualmente pra cada projeto. O Igniter Store entrega cache com TTL e Pub/Sub numa API limpa:

```typescript
// Cache com TTL
await store.set('user:123', userData, { ttl: 3600 });
const user = await store.get<User>('user:123');

// Pub/Sub para eventos
await store.publish('user.updated', { userId: '123' });
store.subscribe('user.*', (data) => {
  // Atualiza a UI, dispara webhooks, etc.
});
```

Perfeito pra microserviços, cache de sessão, ou qualquer coisa que precise de comunicação assíncrona.

## ⚡ Igniter Realtime: Sincronização Automática

Essa aqui é minha favorita! Quantas vezes vocês já tiveram que implementar WebSockets ou polling pra manter a UI atualizada? Com o Igniter Realtime, é automático:

```typescript
// Backend: Após criar um post, revalida automaticamente
const createPost = igniter.mutation({
  handler: async ({ context, request, response }) => {
    const newPost = await context.database.posts.create({ data: request.body });
    // Esta linha atualiza TODOS os clientes conectados
    return response.created(newPost).revalidate(['posts.list']);
  },
});

// Frontend: A lista se atualiza sozinha!
function PostsList() {
  const postsQuery = api.posts.list.useQuery();
  // Quando alguém criar um post, esta lista atualiza automaticamente! 🤯
  return (
    <ul>
      {postsQuery.data?.posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

Usando **Server-Sent Events**, então é eficiente e funciona em qualquer lugar. Sua UI nunca mais vai estar desatualizada! 🔄

## 🤖 Igniter MCP: Seu Backend Agora Fala com IA

Essa é pra quem tá ligado no futuro! Com o **Model Context Protocol**, seu Igniter.js vira uma ferramenta nativa para IAs como Claude, Cursor, etc.:

```typescript
// Sua API automaticamente vira tool de IA
const mcp = createMcpAdapter({
  context: () => ({ user: getCurrentUser() }),
  router: igniter.router,
});
```

Imaginem: a IA pode criar usuários, gerar relatórios, enviar emails... tudo através da sua API, com context e permissões! O futuro é AI-native, galera! 🚀

## 🛠️ CLI Interativa: Produtividade no Terminal

A nova CLI traz um dashboard em tempo real que mostra requests, logs e status dos processos:

```bash
# Modo interativo com dashboard
npx @igniter-js/cli@latest dev --interactive

# Gera features completas do Prisma
npx @igniter-js/cli generate feature user --schema prisma:User
```

E os **starters oficiais** pra acelerar qualquer projeto:
- Next.js Full-Stack
- Bun + React SPA  
- Express REST API
- TanStack Start
- Deno REST API

Tudo com arquitetura feature-based e integração completa! ⚡

## 🔌 Sistema de Plugins: Modularidade Máxima

Agora vocês podem criar funcionalidades reutilizáveis:

```typescript
const authPlugin = createIgniterPlugin({
  name: 'auth',
  actions: {
    validateToken: createIgniterPluginAction({
      input: z.object({ token: z.string() }),
      handler: async ({ input }) => {
        // Lógica de validação
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

Em breve teremos um **marketplace de plugins** pra comunidade compartilhar soluções! 🌱

## 🛡️ Type Safety Absoluta: Se Compila, Funciona!

O que sempre foi o diferencial do Igniter.js continua evoluindo:

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

**Zero code generation**, **refactoring seguro**, **IntelliSense perfeito**. Bugs de runtime? Coisa do passado! 🚫

## 🌐 Framework Agnostic: Liberdade Total

Funciona em **Next.js**, **Express**, **Hono**, **Bun**, **Deno**, **Cloudflare Workers**... Mesmo código, qualquer runtime:

```typescript
// Next.js
export { igniter as GET, igniter as POST };

// Express
app.use('/api', igniter.handler);

// Cloudflare Workers
export default igniter;
```

Nunca mais vendor lock-in! 🔓

## 🌟 Building in Public: A Jornada Continua

Essa evolução toda só foi possível porque vocês, a comunidade, não pararam de dar feedback. Cada issue no GitHub, cada sugestão no Discord, cada "seria legal se..." nos comentários moldou essas features.

E o melhor: isso é só o começo! O que vem por aí:

🔮 **GraphQL adapter**  
🔮 **Mais database drivers**  
🔮 **Plugin marketplace**  
🔮 **Visual API designer**  
🔮 **AI code generation**  

## 🚀 Experimente Agora!

Se vocês chegaram até aqui, é porque curtiram as novidades. Que tal testar?

```bash
# Comece em 30 segundos
npx @igniter-js/cli@latest init minha-api
cd minha-api
npm run dev
```

**📚 Recursos úteis:**
- **GitHub:** [github.com/felipebarcelospro/igniter-js](https://github.com/felipebarcelospro/igniter-js)
- **Documentação:** Wiki completa com exemplos
- **Discord:** Comunidade ativa e prestativa
- **Examples:** Starters prontos pra usar

## 💬 Vamos Conversar!

E aí, o que acharam das novidades? Qual feature mais chamou atenção? Têm alguma sugestão pro roadmap?

Compartilhem suas experiências, dúvidas ou ideias nos comentários. A comunidade Igniter.js cresce com cada feedback de vocês!

E se não for incomodar, compartilhem com seus colegas devs que também sofrem com APIs complexas. Vamos espalhar type safety pelo Brasil! 🇧🇷

---

*P.S.: Quem quiser acompanhar o desenvolvimento em tempo real, me sigam no [Threads @vibedev.oficial](https://www.threads.com/@vibedev.oficial) onde compartilho o behind the scenes do projeto!*