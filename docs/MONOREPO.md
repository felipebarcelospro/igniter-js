# Igniter.js Monorepo

Este repositório foi estruturado como um monorepo usando **Turborepo** para melhor organização, desenvolvimento e manutenção dos pacotes.

## 📦 Estrutura de Pacotes

```
igniter-js/
├── packages/
│   ├── core/           # @igniter-js/core - Framework principal
│   └── cli/            # @igniter-js/cli - Ferramenta CLI
├── apps/
│   └── example-nextjs/ # Exemplo de aplicação Next.js
├── tooling/
│   ├── eslint-config/  # Configurações ESLint compartilhadas
│   └── typescript-config/ # Configurações TypeScript compartilhadas
└── docs/               # Documentação do projeto
```

## 🚀 Comandos Principais

### Desenvolvimento
```bash
# Instalar dependências de todos os pacotes
npm install

# Rodar todos os pacotes em modo desenvolvimento
npm run dev

# Rodar apenas o core em desenvolvimento
npm run dev --filter=@igniter-js/core

# Rodar apenas o CLI em desenvolvimento
npm run dev --filter=@igniter-js/cli
```

### Build e Testing
```bash
# Build de todos os pacotes
npm run build

# Executar testes de todos os pacotes
npm run test

# Executar linting
npm run lint

# Corrigir problemas de lint automaticamente
npm run lint:fix

# Verificar tipos TypeScript
npm run typecheck
```

### Gestão de Versões
```bash
# Adicionar changeset (descrever mudanças)
npm run changeset

# Versionar pacotes baseado nos changesets
npm run version-packages

# Publicar pacotes
npm run release
```

## 🛠️ Configurações Compartilhadas

### ESLint (`@igniter-js/eslint-config`)
- Configuração base para TypeScript
- Configuração específica para React
- Regras de importação e organização de código

### TypeScript (`@igniter-js/typescript-config`)
- Configuração base
- Configuração para Node.js
- Configuração para React/Next.js

## 📋 Fluxo de Desenvolvimento

1. **Instale dependências**: `npm install`
2. **Crie uma branch**: `git checkout -b feature/nova-funcionalidade`
3. **Desenvolva**: `npm run dev`
4. **Teste**: `npm run test`
5. **Lint**: `npm run lint:fix`
6. **Build**: `npm run build`
7. **Changeset**: `npm run changeset` (descreva suas mudanças)
8. **Commit**: Siga [Conventional Commits](https://www.conventionalcommits.org/)
9. **Push e PR**: Crie pull request

## 🔧 Configuração de IDEs

### VS Code
Recomendamos as seguintes extensões:
- ESLint
- Prettier
- TypeScript Importer
- Turbo Console Log

### WebStorm/IntelliJ
- Configure TypeScript service para usar a versão do workspace
- Ative ESLint automatic fix on save
- Configure Prettier como formatter

## 📚 Links Úteis

- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [Conventional Commits](https://www.conventionalcommits.org/)

## ⚡ Performance

O Turborepo utiliza:
- **Caching inteligente**: Builds são cacheados e reutilizados
- **Execução paralela**: Comandos rodam em paralelo quando possível
- **Incremental builds**: Apenas o que mudou é reconstruído
- **Remote caching**: Cache compartilhado entre desenvolvedores (quando configurado)

## 🔍 Troubleshooting

### Problema: "Package not found"
```bash
# Limpe caches e reinstale
npm run clean
rm -rf node_modules package-lock.json
npm install
```

### Problema: "TypeScript errors"
```bash
# Rebuild dependencies
npm run build --filter=@igniter-js/typescript-config
npm run build --filter=@igniter-js/eslint-config
npm run typecheck
```

### Problema: "Build não funciona"
```bash
# Build com debug
npx turbo build --verbosity=2
``` 