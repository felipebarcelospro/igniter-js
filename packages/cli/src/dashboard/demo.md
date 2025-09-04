# 🎮 Demo da Nova Dashboard Igniter.js

## 🚀 Como Testar

### 1. Instalar Dependências
```bash
cd packages/cli
npm install
```

### 2. Build do Projeto
```bash
npm run build
```

### 3. Testar em um Projeto Igniter.js
```bash
# Em um projeto Igniter.js existente
igniter dev
```

## 🎯 Interface da Dashboard

### Abas Disponíveis
```
⚡ 1. Framework    🔥 2. Igniter    🌐 3. API    ⚙️ 4. Jobs    📊 5. Telemetry    🤖 6. Lia
```

### Atalhos de Teclado
- **1-6**: Alternar entre abas
- **Tab**: Próxima aba
- **f**: Framework (Next.js, Vite, etc.)
- **i**: Igniter (Schema generation)
- **a**: API (HTTP requests)
- **j**: Jobs (Background jobs)
- **t**: Telemetry (Observability)
- **l**: Lia Dashboard (AI agents)
- **r**: Atualizar dados
- **c**: Limpar logs
- **h**: Ajuda
- **q**: Sair

## 📊 Dashboard da Lia (Aba 6)

### Views Disponíveis
1. **Overview** - Métricas gerais
2. **Tasks** - Gerenciamento de tarefas
3. **Memory** - Exploração de memória
4. **Agents** - Status dos agentes

### Dados Monitorados
- Status de delegação de tarefas
- Progresso de execução
- Métricas de performance
- Estatísticas de memória
- Taxa de sucesso dos agentes

## 🔧 Configuração

### Variáveis de Ambiente
```bash
# Usar dashboard Ink (padrão)
igniter dev

# Usar modo interativo legado
IGNITER_USE_LEGACY_INTERACTIVE=true igniter dev

# Modo não-interativo
igniter dev --no-interactive
```

### Debug
```bash
# Habilitar logs de debug
igniter dev --debug
```

## 🎨 Exemplo de Uso

### 1. Iniciar Dashboard
```bash
igniter dev
```

### 2. Navegar pelas Abas
- Pressione **1** para ver logs do Framework
- Pressione **2** para ver logs do Igniter
- Pressione **3** para monitorar API requests
- Pressione **4** para ver background jobs
- Pressione **5** para telemetria
- Pressione **6** para dashboard da Lia

### 3. Dashboard da Lia
- Pressione **1** para Overview
- Pressione **2** para Tasks
- Pressione **3** para Memory
- Pressione **4** para Agents
- Pressione **r** para atualizar dados
- Pressione **h** para ajuda

## 🐛 Troubleshooting

### Problemas Comuns

1. **Dashboard não carrega**
   ```bash
   npm run build
   npm run test:dashboard
   ```

2. **Dados não aparecem**
   - Verifique se o MCP Server está rodando
   - Execute em um projeto Igniter.js válido

3. **Erro de dependências**
   ```bash
   npm install ink react @types/react
   ```

### Logs de Debug
```bash
# Ver logs detalhados
igniter dev --debug

# Verificar status
igniter status
```

## 🎉 Funcionalidades Implementadas

✅ **Todas as abas da versão anterior**
- Framework (Next.js, Vite, etc.)
- Igniter (Schema generation)
- API (HTTP monitoring)
- Jobs (Background jobs)
- Telemetry (Observability)

✅ **Nova aba da Lia**
- Monitoramento de agentes AI
- Status de delegação de tarefas
- Métricas de performance
- Exploração de memória

✅ **Navegação melhorada**
- Atalhos de teclado intuitivos
- Ícones visuais para cada aba
- Nomes mais claros
- Ajuda integrada

✅ **Integração completa**
- Memory Manager do MCP Server
- Dados em tempo real
- Atualizações automáticas
- Compatibilidade com versão anterior