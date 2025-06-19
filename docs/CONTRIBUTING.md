# Contributing to Igniter.js

Obrigado por considerar contribuir para o Igniter.js! Este documento fornece diretrizes para contribuir com este monorepo.

## 🚀 Primeiros Passos

### Pré-requisitos

- **Node.js**: 18+ 
- **npm**: 9+
- **Git**: Para controle de versão

### Setup do Ambiente de Desenvolvimento

1. **Fork e clone o repositório**:
```bash
git clone https://github.com/SEU_USERNAME/igniter-js.git
cd igniter-js
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Execute os testes**:
```bash
npm run test
```

4. **Execute o linting**:
```bash
npm run lint
```

5. **Build todos os pacotes**:
```bash
npm run build
```

## 🏗️ Estrutura do Projeto

```
igniter-js/
├── packages/
│   ├── core/           # Framework principal
│   └── cli/            # Ferramenta CLI
├── apps/
│   └── example-nextjs/ # Exemplo Next.js
├── tooling/
│   ├── eslint-config/  # Configurações ESLint
│   └── typescript-config/ # Configurações TypeScript
└── docs/               # Documentação
```

## 📝 Processo de Contribuição

### 1. Criando Issues

Antes de começar, verifique se já existe uma issue relacionada. Se não:

- **Bug Reports**: Use o template de bug
- **Feature Requests**: Use o template de feature
- **Questions**: Use Discussions

### 2. Workflow de Desenvolvimento

1. **Crie uma branch**:
```bash
git checkout -b feat/nova-funcionalidade
# ou
git checkout -b fix/correcao-bug
```

2. **Desenvolva e teste**:
```bash
# Modo desenvolvimento
npm run dev

# Executar testes específicos
npm run test --filter=@igniter-js/core

# Build específico
npm run build --filter=@igniter-js/cli
```

3. **Commit suas mudanças**:
```bash
# Adicione um changeset (obrigatório)
npm run changeset

# Commit seguindo Conventional Commits
git commit -m "feat(core): adiciona suporte para middleware personalizado"
```

4. **Push e PR**:
```bash
git push origin feat/nova-funcionalidade
```

### 3. Conventional Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(core): adiciona novo middleware
fix(cli): corrige geração de tipos
docs(readme): atualiza exemplo de uso
test(core): adiciona testes para router
chore(deps): atualiza dependências
```

**Tipos permitidos:**
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `style`: Formatação (não afeta funcionalidade)
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Tarefas de manutenção

**Scopes sugeridos:**
- `core`: Pacote principal
- `cli`: Ferramenta CLI
- `examples`: Aplicações de exemplo
- `docs`: Documentação

## 🧪 Testes

### Executando Testes

```bash
# Todos os testes
npm run test

# Testes específicos
npm run test --filter=@igniter-js/core

# Testes em watch mode
npm run test:watch

# Coverage
npm run test -- --coverage
```

### Escrevendo Testes

- **Unit tests**: Para lógica de negócio
- **Integration tests**: Para fluxos completos
- **E2E tests**: Para cenários reais

Exemplo:
```typescript
import { describe, it, expect } from 'vitest'
import { Igniter } from '../src'

describe('Igniter', () => {
  it('should create router instance', () => {
    const igniter = Igniter.context().create()
    expect(igniter).toBeDefined()
  })
})
```

## 📦 Changesets

Usamos [Changesets](https://github.com/changesets/changesets) para versionamento:

```bash
# Adicionar changeset
npm run changeset

# Versionar pacotes
npm run version-packages

# Publicar (só maintainers)
npm run release
```

**Tipos de changeset:**
- `major`: Breaking changes
- `minor`: Novas funcionalidades
- `patch`: Bug fixes

## 🔍 Code Review

### Checklist do Reviewer

- [ ] Código segue as convenções do projeto
- [ ] Testes adequados foram adicionados
- [ ] Documentação foi atualizada se necessário
- [ ] Changeset foi adicionado
- [ ] Build passa sem erros
- [ ] Performance não foi impactada negativamente

### Checklist do Autor

- [ ] Branch está atualizada com main
- [ ] Todos os testes passam
- [ ] Lint passa sem erros
- [ ] Commit messages seguem convenção
- [ ] Changeset foi adicionado
- [ ] Documentação foi atualizada

## 🛠️ Ferramentas de Desenvolvimento

### VS Code Extensions

Recomendamos:
- ESLint
- Prettier
- TypeScript Importer
- Turbo Console Log
- GitLens

### Configuração

```json
// .vscode/settings.json
{
  "eslint.workingDirectories": ["packages/*", "apps/*"],
  "typescript.preferences.includePackageJsonAutoImports": "on"
}
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **TypeScript errors após pull**:
```bash
npm run clean
npm install
npm run build
```

2. **Cache issues**:
```bash
rm -rf .turbo node_modules
npm install
```

3. **Linting errors**:
```bash
npm run lint:fix
```

## 📞 Suporte

- **Bugs**: Abra uma issue
- **Features**: Abra uma issue
- **Questions**: Use GitHub Discussions
- **Security**: Email privado para maintainers

## 📄 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a licença MIT.

## 🙏 Reconhecimentos

Obrigado a todos os contribuidores que tornaram este projeto possível! 