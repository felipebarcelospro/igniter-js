---
applyTo: "**"
---

# @igniter-js/bot – Agent Manual (Alpha)

> Status: `alpha` – Public API may still evolve. Maintain backward compatibility where reasonable, but correctness and DX improvements are prioritized during alpha.

## 1. Purpose

`@igniter-js/bot` fornece uma fundação moderna, extensível e totalmente tipada para criação de bots multi‑plataforma dentro do ecossistema Igniter.js.  
Focado em:
- Adaptadores pluggables (Telegram, WhatsApp, futuros: Discord, Slack, Matrix)
- Middleware chain express‑like
- Sistema de comandos com aliases e help
- Hooks de pré e pós processamento
- Logging opcional e padronizado
- Tipagem forte com Zod + TypeScript
- Contratos previsíveis para AI Agents

## 2. Princípios Arquiteturais

1. **Pureza dos Adaptadores**: Nenhum side effect em top‑level; inicialização apenas via `init()`.
2. **Contratos Explícitos**: `IBotAdapter.handle` retorna contexto ou `null` (ignorado). Nada de retornos híbridos (`Response`) dentro do adapter.
3. **Ergonomia DX**: Imports centrais (`import { Bot, telegram } from '@igniter-js/bot'`).
4. **Extensibilidade Horizontal**: Registro dinâmico de adapters, middlewares e comandos.
5. **Falhas Observáveis**: Erros encapsulados em `BotError` com `code` semântico.
6. **Tree-Shaking Friendly**: Exports planos, sem side effects; adapters isolados.
7. **AI-Friendly**: Código altamente comentado, nomenclatura consistente, indexação clara de comandos.

## 3. Superfície Pública (Exports)

Via `@igniter-js/bot`:
- `Bot` (classe principal + `Bot.create`)
- `BotError`, `BotErrorCodes`
- Tipos: `BotContext`, `BotCommand`, `Middleware`, `IBotAdapter`, `BotEvent`, `BotContent` etc.
- Adapters: `telegram`, `whatsapp`
- Namespace `adapters` (atalho): `adapters.telegram`, `adapters.whatsapp`
- `VERSION`

Via `@igniter-js/bot/adapters`:
- `telegram`, `whatsapp`, `builtinAdapters`, `BuiltinAdapterName`

Via `@igniter-js/bot/types`:
- Todos os tipos reexportados (`bot.types.ts`)

## 4. Estrutura Interna

```
src/
  bot.provider.ts        # Classe Bot + runtime registration APIs + errors
  index.ts               # Barrel principal
  adapters/
    telegram/
      telegram.adapter.ts
      telegram.helpers.ts
      telegram.schemas.ts
      index.ts
    whatsapp/
      whatsapp.adapter.ts
      whatsapp.helpers.ts
      whatsapp.schemas.ts
      index.ts
    index.ts             # Barrel de adapters
  types/
    bot.types.ts
    index.ts
  utils/
    try-catch.ts         # Helper utilitário
```

## 5. Classe `Bot` (API Resumida)

### 5.1 Construção

```ts
const bot = Bot.create({
  id: 'my-bot',
  name: 'My Bot',
  adapters: {
    telegram: telegram({ token, webhook: { url, secret } }),
    whatsapp: whatsapp({ token: waToken, phone: phoneNumberId })
  },
  middlewares: [authMw, metricsMw],
  commands: {
    start: {...},
    help: {...}
  },
  on: {
    message: async (ctx) => { /* ... */ },
    error: async (ctx) => { /* ctx.error? */ }
  },
  logger: customLogger // opcional
})
```

### 5.2 Métodos Principais

| Método | Descrição |
|--------|-----------|
| `start()` | Inicializa todos os adapters (webhooks, comandos remotos) |
| `handle(provider, request)` | Processa um webhook HTTP e retorna `Response` |
| `send({ provider, channel, content })` | Envia mensagem |
| `on(event, handler)` | Registra listener (`start`, `message`, `error`) |
| `emit(event, ctx)` | Emite evento manualmente |
| `use(middleware)` | Adiciona middleware dinamicamente |
| `registerCommand(name, command)` | Adiciona comando após instância criada |
| `registerAdapter(key, adapter)` | Adiciona adapter dinamicamente |
| `onPreProcess(hook)` | Hook antes do pipeline de middleware |
| `onPostProcess(hook)` | Hook após sucesso de processamento |

### 5.3 Pipeline de Processamento

1. `preProcessHooks`
2. `middlewares` (sequencial)
3. `listeners` do evento
4. Execução de comando (se `message` + `content.type === 'command'`)
5. `postProcessHooks`

Erros de middleware ou comando disparam evento `error`.

### 5.4 Sistema de Comandos

Cada comando:
```ts
const startCommand: BotCommand = {
  name: 'start',
  aliases: ['hello', 'hi'],
  description: 'Saudação inicial',
  help: 'Use /start para iniciar.',
  async handle(ctx, params) {
    await ctx.bot.send({
      provider: ctx.provider,
      channel: ctx.channel.id,
      content: { type: 'text', content: '👋 Olá!' }
    })
  }
}
```
Index interno garante resolução O(1) por alias (case-insensitive).

### 5.5 Eventos

| Evento | Quando |
|--------|--------|
| `start` | (Reservado para futura emissão manual) |
| `message` | Mensagem válida interpretada por adapter |
| `error` | Erro em middleware, comando ou execução |

## 6. Adaptadores

### 6.1 Contrato `IBotAdapter<TConfig>`

```ts
{
  name: string
  parameters: ZodObject<any>
  init(params: { config: TypeOf<TConfig>; commands: BotCommand[] }): Promise<void>
  send(params: BotSendParams<TypeOf<TConfig>>): Promise<void>
  handle(params: { request: Request; config: TypeOf<TConfig> }): Promise<Omit<BotContext,'bot'> | null>
}
```

### 6.2 Regras de Implementação

1. **Nunca** retornar `Response` em `handle` – retornar `null` para ignorar update ou contexto válido.
2. Sincronizar comandos remotos (quando a plataforma suportar) dentro de `init`.
3. Validar payloads com Zod (`*.schemas.ts`).
4. Operações HTTP com `fetch` interno; se falhar, lançar erro sem engolir stack.
5. Nenhum side effect em `import` top-level (somente dentro de funções).

### 6.3 Exemplo Simplificado de Adapter Customizado

```ts
const MyAdapterParams = z.object({ apiKey: z.string() })

export const myPlatform = Bot.adapter({
  name: 'my-platform',
  parameters: MyAdapterParams,
  async init({ config, commands }) {
    // Opcional: registrar comandos remotamente
  },
  async send({ channel, content, config }) {
    await fetch('https://api.example.com/send', {
      method: 'POST',
      headers: { 'X-API-Key': config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, text: content.content })
    })
  },
  async handle({ request, config }) {
    const body = await request.json()
    if (!body.message) return null
    return {
      event: 'message',
      provider: 'my-platform',
      channel: { id: body.channelId, name: body.channelName, isGroup: body.isGroup },
      message: {
        content: { type: 'text', content: body.message, raw: body.message },
        author: { id: body.userId, name: body.userName, username: body.userHandle },
        isMentioned: true
      }
    }
  }
})
```

## 7. Middleware

Assinatura:
```ts
type Middleware = (ctx: BotContext, next: () => Promise<void>) => Promise<void>
```

Boas práticas:
- Sempre `await next()` salvo em casos de bloqueio intencional.
- Tratar erros locais e permitir emissão de logs.
- Nunca modificar estrutura base de `ctx` de forma destrutiva.

Exemplo:
```ts
const metricsMw: Middleware = async (ctx, next) => {
  const t0 = Date.now()
  await next()
  console.log('[metrics] event=%s latency=%dms', ctx.event, Date.now() - t0)
}
```

## 8. Hooks

| Hook | Uso |
|------|-----|
| `onPreProcess(cb)` | Carregar sessão / enrich antes do pipeline |
| `onPostProcess(cb)` | Auditar / persistir estado após execução normal |

## 9. Erros

### 9.1 Tipos

`BotError` expõe:
- `code`: valor de `BotErrorCodes`
- `message`
- `meta` (opcional)

### 9.2 Códigos

| Código | Significado |
|--------|-------------|
| `PROVIDER_NOT_FOUND` | Adapter ausente |
| `COMMAND_NOT_FOUND` | Comando/alias inexistente |
| `INVALID_COMMAND_PARAMETERS` | Falha na execução do comando (parâmetros inválidos) |
| `ADAPTER_HANDLE_RETURNED_NULL` | (Uso interno para diagnósticos futuros) |

### 9.3 Tratamento

Escutar evento `error`:
```ts
bot.on('error', async (ctx) => {
  // @ts-expect-error - campo 'error' injetado internamente
  const err = ctx.error
  console.warn('[bot-error]', err?.code || err?.message)
})
```

## 10. Utilitário `tryCatch`

Arquivo: `src/utils/try-catch.ts`

Fornece:
- `tryCatch(promise|fn)`
- `unwrapOrThrow(result)`
- `withFallback(result, fallback)`
- `mapSuccess(result, mapper)`
- `andThen(result, next)`
- `normalizeError(err)`

Uso:
```ts
const { data, error } = await tryCatch(fetch(...))
if (error) { /* ... */ }
```

## 11. Pads para AI Agents

1. Antes de criar novo adapter → estudar `telegram.adapter.ts` como referência.
2. Antes de adicionar novo tipo de conteúdo → atualizar `BotContent` + todos os adapters (garantir coerência).
3. Modificações na assinatura de `Bot` → Verificar impactos no README + testes (quando adicionados).
4. Evitar duplicar lógica de parsing → centralizar helpers por adapter.
5. Adicionar sempre JSDoc em métodos públicos novos.

## 12. Checklist para Contribuições

| Item | OK? |
|------|-----|
| `adapter` sem side effects top-level | |
| Zod schemas criados | |
| `handle` retorna contexto ou `null` | |
| Comandos sincronizados (se aplicável) | |
| Ajuda (`help`) em comandos complexos | |
| Middleware testado localmente | |
| Erros envoltos em `BotError` quando apropriado | |
| README atualizado se API pública mudou | |
| Barrel exports revisados | |

## 13. Roadmap (Alpha)

| Feature | Status |
|---------|--------|
| Discord adapter | Planned |
| Slack adapter | Planned |
| Session storage interface | Planned |
| Rate limiting middleware oficial | Planned |
| Scheduled tasks / cron plugin | Research |
| Interactive components (buttons) | Research |
| Test coverage oficial | Pending |

## 14. Exemplos de Uso Rápido

### 14.1 Bot Básico

```ts
import { Bot, telegram } from '@igniter-js/bot'

const bot = Bot.create({
  id: 'demo',
  name: 'Demo Bot',
  adapters: {
    telegram: telegram({
      token: process.env.TELEGRAM_TOKEN!,
      webhook: { url: process.env.TELEGRAM_WEBHOOK_URL!, secret: process.env.TELEGRAM_SECRET }
    })
  },
  commands: {
    ping: {
      name: 'ping',
      aliases: [],
      description: 'Latency check',
      help: 'Use /ping para medir latência',
      async handle(ctx) {
        await ctx.bot.send({
          provider: ctx.provider,
          channel: ctx.channel.id,
          content: { type: 'text', content: 'pong 🏓' }
        })
      }
    }
  },
  on: {
    message: async (ctx) => {
      if (ctx.message.content?.type === 'text') {
        console.log('Texto recebido:', ctx.message.content.content)
      }
    }
  }
})

await bot.start() // registra webhook / comandos

export async function POST(req: Request) {
  return bot.handle('telegram', req)
}
```

### 14.2 Registro Dinâmico Pós-Criação

```ts
bot.registerCommand('echo', {
  name: 'echo',
  aliases: ['repeat'],
  description: 'Repete a mensagem',
  help: '/echo <texto>',
  async handle(ctx, params) {
    await ctx.bot.send({
      provider: ctx.provider,
      channel: ctx.channel.id,
      content: { type: 'text', content: params.join(' ') || '(vazio)' }
    })
  }
})
```

## 15. Padrões de Logging

Logger injetado deve seguir interface leve:
```ts
{
  debug?: (...args:any[]) => void
  info?: (...args:any[]) => void
  warn?: (...args:any[]) => void
  error?: (...args:any[]) => void
}
```
Não forçamos dependência externa.

## 16. Boas Práticas de Segurança

| Área | Prática |
|------|---------|
| Tokens | Nunca versionar valores reais |
| Webhooks | Validar `secret` (Telegram) / verify token (WhatsApp) |
| Sanitização | Escapar MarkdownV2 no Telegram (`escapeMarkdownV2`) |
| Rate limiting | Implementar via middleware (futuro pacote oficial) |
| Logs | Evitar imprimir tokens / segredos |

## 17. Extensões Futuras

- Plugin system baseado em composição (ex: `bot.use(plugin())`)
- Persistência de sessões / contexto conversacional
- Integrador com Prometheus / OpenTelemetry (telemetria de eventos)
- Adaptação para fluxos interativos (botões / menus inline)

## 18. Convenções de Código

| Elemento | Convenção |
|----------|-----------|
| Nomes de adapters | `lowercase` |
| Arquivos adapter | `{platform}.adapter.ts` |
| Helpers por plataforma | `{platform}.helpers.ts` |
| Schemas | `{platform}.schemas.ts` |
| Exports públicos | Barrel central (`index.ts`) |
| Comentários | JSDoc em API pública / blocos complexos |
| Tipos internos | Evitar exportar acidentalmente via wildcard |

## 19. Processo de Evolução

1. Criar issue descrevendo mudança (se pública).
2. Atualizar `bot.provider.ts` ou adapter alvo.
3. Revisar impactos nos exports / README.
4. Gerar build local e inspecionar `dist/`.
5. (Quando testes existirem) rodar `npm test --filter @igniter-js/bot`.

## 20. Referência Rápida de Import Paths

| Objetivo | Import |
|----------|--------|
| Tudo principal | `@igniter-js/bot` |
| Apenas tipos | `@igniter-js/bot/types` |
| Todos adapters | `@igniter-js/bot/adapters` |
| Adapter Telegram direto | `@igniter-js/bot/adapters/telegram` |
| Adapter WhatsApp direto | `@igniter-js/bot/adapters/whatsapp` |

## 21. Perguntas Frequentes (FAQ)

**Q:** Posso retornar `Response` em `handle`?  
**A:** Não. Retorne contexto ou `null`. O `Bot.handle` encapsula a resposta HTTP.

**Q:** Como ignoro um update silenciosamente?  
**A:** Retorne `null` em `handle`.

**Q:** Como diferenciar comandos de texto normal?  
**A:** Adapter já faz parsing (`/prefix`). Conteúdo virá como `BotCommandContent`.

**Q:** Posso modificar `ctx.message.content` em middleware?  
**A:** Pode, mas preserve a forma tipada e não elimine campos críticos usados por downstream.

---

## 22. Contato / Suporte

- Website: https://igniterjs.com
- Issues: GitHub (monorepo principal)
- Canal futuro: Discord / Telegram comunidade

---

Mantenha este arquivo sincronizado com mudanças públicas para facilitar colaboração de agentes e humanos.

> Fim do documento.