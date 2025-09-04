# Igniter.js Ink Dashboard

Este diretório contém a implementação da nova dashboard interativa do Igniter.js usando Ink (React para terminal).

## 🎯 Funcionalidades

### Dashboard da Lia
- **Overview**: Visão geral das métricas da Lia, tarefas, agentes e memória
- **Tasks**: Monitoramento de tarefas com status, progresso e delegação
- **Memory**: Exploração da memória do MCP Server com busca e filtros
- **Agents**: Status dos subagentes e métricas de performance

### Integração com Memory Manager
- Conexão direta com o MCP Server
- Monitoramento em tempo real de tarefas delegadas
- Visualização de status de delegação (`queued`, `running`, `completed`, `failed`, `cancelled`)
- Métricas de performance e sucesso dos agentes

## 🏗️ Arquitetura

```
dashboard/
├── components/           # Componentes React para terminal
│   ├── lia-dashboard-tab.tsx    # Aba principal da dashboard da Lia
│   ├── ink-dashboard.tsx        # Dashboard principal com abas
│   └── status-overview.tsx      # Componente de visão geral
├── hooks/               # Hooks para gerenciamento de dados
│   ├── use-dashboard-data.ts    # Hook para dados gerais
│   ├── use-tasks.ts            # Hook para tarefas
│   └── use-memory.ts           # Hook para memória
├── services/            # Serviços de integração
│   └── mcp-client.ts           # Cliente para MCP Server
├── types/               # Tipos TypeScript
│   └── index.ts                # Definições de tipos
└── adapters/            # Adaptadores
    └── ink-process-manager.ts  # Gerenciador de processos Ink
```

## 🚀 Como Usar

### Comando Dev com Dashboard
```bash
# Usar a nova dashboard Ink (padrão)
igniter dev

# Usar o modo interativo legado
IGNITER_USE_LEGACY_INTERACTIVE=true igniter dev

# Modo não-interativo (concorrente)
igniter dev --no-interactive
```

### Navegação na Dashboard
- **1-4**: Alternar entre abas de processos
- **Tab**: Próxima aba
- **l**: Ir direto para a dashboard da Lia
- **j**: Ir para aba de Jobs
- **s**: Ir para aba de Store/API
- **t**: Ir para aba de Telemetry
- **r**: Atualizar dados
- **c**: Limpar logs/filtros
- **h**: Ajuda
- **q**: Sair

### Dashboard da Lia
- **1-4**: Alternar entre views (Overview, Tasks, Memory, Agents)
- **r**: Atualizar todos os dados
- **c**: Limpar filtros
- **h**: Ajuda

## 🔧 Desenvolvimento

### Instalar Dependências
```bash
npm install ink react @types/react ink-text-input ink-select-input ink-spinner ink-table ink-progress-bar
```

### Build
```bash
npm run build
```

### Teste
```bash
npm run test:dashboard
```

### Estrutura de Dados

#### TaskSummary
```typescript
interface TaskSummary {
  id: string;
  title: string;
  status: TaskStatus;
  delegationStatus?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress?: string;
  agent?: string;
  startedAt?: string;
  completedAt?: string;
  priority: TaskPriority;
  estimatedHours?: number;
  actualHours?: number;
}
```

#### AgentStatus
```typescript
interface AgentStatus {
  name: string;
  isActive: boolean;
  currentTask?: string;
  lastActivity?: string;
  successRate: number;
  totalTasks: number;
  completedTasks: number;
}
```

## 🔌 Integração com MCP Server

A dashboard se conecta diretamente ao MCP Server através do `MemoryManager`:

```typescript
import { createDefaultMemoryManager } from '@igniter-js/mcp-server';

const memoryManager = createDefaultMemoryManager();
await memoryManager.initializeProject();

// Buscar tarefas
const tasks = await memoryManager.listByType('task');

// Buscar memórias
const memories = await memoryManager.search({
  type: 'task',
  includeSensitive: false
});
```

## 📊 Monitoramento em Tempo Real

A dashboard atualiza automaticamente a cada 3 segundos e monitora:

- Status de delegação de tarefas
- Progresso de execução
- Métricas de performance dos agentes
- Estatísticas de memória
- Taxa de sucesso e tempo médio de execução

## 🎨 Personalização

### Temas
A dashboard suporta diferentes temas (implementação futura):
- `default`: Tema padrão
- `dark`: Tema escuro
- `light`: Tema claro

### Configuração
```typescript
interface DashboardConfig {
  refreshInterval: number;        // Intervalo de atualização (ms)
  maxTasksDisplay: number;        // Máximo de tarefas exibidas
  showCompletedTasks: boolean;    // Mostrar tarefas concluídas
  autoRefresh: boolean;           // Atualização automática
  theme: 'default' | 'dark' | 'light';
}
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Dashboard não carrega**
   - Verifique se o MCP Server está rodando
   - Execute `npm run build` para compilar os componentes

2. **Dados não aparecem**
   - Verifique a conexão com o MCP Server
   - Execute `igniter dev` em um projeto Igniter.js válido

3. **Erro de dependências**
   - Execute `npm install` para instalar as dependências do Ink
   - Verifique se o TypeScript está configurado corretamente

### Logs de Debug
```bash
# Habilitar logs de debug
igniter dev --debug

# Verificar status do MCP Server
igniter status
```

## 🔮 Roadmap

- [ ] Implementar filtros avançados para tarefas e memória
- [ ] Adicionar gráficos de performance
- [ ] Suporte a temas personalizáveis
- [ ] Exportação de dados da dashboard
- [ ] Integração com mais tipos de agentes
- [ ] Dashboard web complementar