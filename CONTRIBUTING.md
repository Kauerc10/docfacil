# Contribuindo com o DocFacil

Esse documento é a bíblia de como a gente trabalha no código. Serve pra
qualquer pessoa que vá mexer no projeto — seja dev da K-HUB, freelancer,
ou vc daqui de 3 meses que esqueceu como funcionava.

---

## 🚀 Setup do ambiente

```bash
git clone git@github.com:Kauerc10/docfacil.git
cd docfacil
bun install
cp .env.example .env   # preencha suas variáveis
bun run dev            # http://localhost:3000
```

Pré-requisitos: **Bun >= 1.1** e **Node >= 20**.

---

## 🌿 Estrutura de branches

A gente usa **Git Flow simplificado**. Três tipos de branch:

| Branch | Pra que serve | Exemplo |
|---|---|---|
| `main` | **Produção.** Sempre estável, sempre deployável. Código que tá no ar. | `main` |
| `develop` | Integração do que vai pro próximo deploy. Não existe ainda — pode ser criada quando o time crescer. | `develop` |
| `feat/*`, `fix/*`, `hotfix/*` | Trabalho em andamento. Sai de `main` e volta via PR. | `feat/editar-documento` |

### Regras de branch

1. **NUNCA** commita direto em `main`. Tudo via Pull Request.
2. Branch nova sai sempre da `main` atualizada:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/sua-feature
   ```
3. Nome da branch começa com o tipo: `feat/`, `fix/`, `hotfix/`, `chore/`, `docs/`, `refactor/`.
4. Uma branch = uma feature/fix. Não mistura 5 coisas na mesma branch.
5. Branches antigas são deletadas depois do merge.

---

## 📝 Conventional Commits

Toda mensagem de commit segue esse formato:

```
<tipo>(<escopo>): <descrição em uma frase>

<corpo opcional explicando o porquê>
```

### Tipos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade (algo que o usuário consegue fazer agora) |
| `fix` | Correção de bug |
| `docs` | Documentação (README, CONTRIBUTING, CHANGELOG, worklog) |
| `style` | Formatação, espaço, ponto e vírgula — não muda lógica |
| `refactor` | Reorganização de código sem mudar comportamento |
| `perf` | Melhoria de performance |
| `test` | Adição ou correção de testes |
| `chore` | Build, deps, configs, CI — nada que o usuário vê |
| `ci` | Mudança no GitHub Actions / pipeline |
| `revert` | Desfaz um commit anterior |

### Escopo (opcional)

É o módulo afetado: `chat`, `pdf`, `seo`, `auth`, `db`, `ui`, `legal`, etc.

### Exemplos

```
feat(chat): adiciona validação de CPF no campo de fiador

fix(pdf): corrige quebra de página em contratos com 4+ signatários

docs(worklog): registra a lapidação do chat e do PDF

refactor(pdf): modulariza o generator.ts em 7 arquivos

chore(deps): atualiza next de 16.1.1 para 16.1.3
```

### Dicas de ouro

- **Escreva no imperativo:** "adiciona validação" ✅ / "adicionado validação" ❌
- **Primeira linha até 72 caracteres.** Detalhe vai no corpo.
- **Um commit = uma ideia lógica.** Não amassa 5 mudanças não-relacionadas num commit só.
- **O corpo explica o PORQUÊ, não o O QUÊ.** O código já mostra o quê.

---

## 🔀 Pull Requests

### Antes de abrir

```bash
bun run lint    # 0 erros
bun run test    # regras do motor de documentos
bun run typecheck # 0 erros de tipo
bun run build   # compila sem erro
```

Testou no browser? Desktop **e** mobile? Então pode abrir.

### Fluxo do PR

1. **Título** = resumo da mudança (mesmo formato do commit).
2. **Descrição** segue o template (o que faz, por quê, como testar, pegadinhas).
3. **Pelo menos 1 approval** é obrigatório (Code Owners são automaticamente requisitados).
4. **CI precisa passar** (testes + lint + build + typecheck rodam automaticamente).
5. **Squash and merge** por padrão — mantém o histórico da main limpo.
6. **Deleta a branch** depois do merge.

### Regra do reviewer

Se vc tá revisando: **leia o código, não só aceite.** Testou a mudança? Fez
pergunta? Apontou risco? Review de verdade, não rubber stamp.

---

## 🏷️ Versionamento e Releases

Seguimos **Semantic Versioning** (`MAJOR.MINOR.PATCH`):

- **PATCH** (`0.1.0` → `0.1.1`): bug fix, nada novo, não quebra nada.
- **MINOR** (`0.1.0` → `0.2.0`): feature nova, compatível com versão anterior.
- **MAJOR** (`0.x` → `1.0.0`): mudança que quebra compatibilidade.

### Como lançar uma versão

1. Confira que a `main` está estável e o CI está verde.
2. Atualize o `CHANGELOG.md` com o que mudou desde a última tag.
3. Crie uma tag anotada:
   ```bash
   git tag -a v0.2.0 -m "Lançamento v0.2.0 — edição de documentos + melhorias de PDF"
   git push origin v0.2.0
   ```
4. A GitHub Action de Release cria automaticamente a **GitHub Release** com as
   notas do CHANGELOG.
5. O deploy para produção é disparado manualmente (ou via Action separada).

---

## 🛡️ Branch Protection (configuração no GitHub)

Essas regras devem estar configuradas em **Settings → Branches → main**:

- [x] **Require a pull request before merging** — pelo menos 1 approval.
- [x] **Require review from Code Owners** — áreas sensíveis têm dono.
- [x] **Require status checks to pass** — CI (lint + build) precisa estar verde.
- [x] **Require branches to be up to date** — PR precisa estar atualizado com main.
- [x] **Do not allow bypassing the above settings** — nem admins pulam.

> ⚠️ Essas configurações são feitas na interface do GitHub, não no código.
> Se vc é admin do repo, vai em Settings → Branches e ativa tudo acima.

---

## 🧪 Qualidade

Antes de qualquer merge, a barreira mínima é:

| Check | Comando | Aceitável |
|---|---|---|
| Lint | `bun run lint` | 0 erros (warnings OK se justificados) |
| Testes | `bun run test` | 0 falhas nos cenários de domínio |
| Build | `bun run build` | Compila sem erro |
| TypeScript | `bun run typecheck` | 0 erros de tipo |
| Browser | teste manual | Desktop + mobile, fluxo crítico funciona |

Os testes unitários do motor de documentos são executados pelo runner nativo do Bun e fazem parte da barreira de CI.

---

## 🤝 Cultura

- **Pequeno e frequente** > grande e raro. PRs de 50 linhas são melhores que de 500.
- **Pergunta** > assume. Se não entendeu, abre issue ou chama no Zap.
- **Documenta a decisão**, não só a implementação. O worklog existe pra isso.
- **Breaking change?** Grita antes. Ninguém gosta de surpresa no deploy.

---

Dúvidas? Abre issue com label `duvida` ou chama o time no WhatsApp.
