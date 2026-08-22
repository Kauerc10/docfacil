# Document Engine E2E Acceptance Design

## Objetivo

Transformar a homologação manual essencial do Document Engine V1 em uma suíte Playwright confiável, orientada a comportamento real e adequada ao gate de pré-merge.

## Princípios

- Testar fluxos observáveis do usuário, não detalhes internos de implementação.
- Usar Firebase Auth Emulator para cenários autenticados reais; não simular login por `localStorage`.
- Usar Firestore Emulator para perfil/planos e manter os repositórios de documentos em memória quando isso já fizer parte do sandbox E2E.
- Dados sintéticos devem ser estruturalmente válidos (CPF, CEP, datas, valores).
- Interceptar ViaCEP no browser para remover dependência externa e flakiness.
- Não usar `waitForTimeout` como mecanismo de sincronização.
- Cada teste deve ser independente: usuário/e-mail únicos e estado criado pelo próprio cenário.
- Não repetir checkout completo para cada um dos 9 modelos; smoke de modelos valida criação/formulário e geração por um entitlement controlado.
- Visual fino de PDF continua sendo homologação humana; E2E valida geração, navegação, versão, download e ausência de placeholders/erros funcionais.

## Camadas

### 1. Infra autenticada

Playwright inicia Firestore + Auth Emulator. O client Firebase conecta explicitamente aos emuladores somente quando variáveis E2E estiverem presentes. O Admin SDK continua validando o ID token emitido pelo Auth Emulator.

### 2. Helpers de fluxo

`e2e/support/` concentra:

- navegação e cookies;
- criação de conta real no Auth Emulator;
- preenchimento determinístico dos formulários;
- fixture de campos por semântica/ID;
- checkout demo;
- espera por sucesso, magic link e downloads.

Helpers devem favorecer `getByRole`, `getByLabel` e IDs estáveis de campos do Document Engine. Seletores frágeis por posição ficam restritos a casos sem alternativa semântica.

### 3. Cenários profundos

Cobertura obrigatória:

1. Guest avulso, download e reload sem duplicação.
2. Conta Free, primeira geração grátis e segunda tentativa bloqueada por quota.
3. Conta Free em modelo pago, compra avulsa e finalização autenticada.
4. Documento existente, nova versão avulsa após paywall.
5. Upgrade para Pro e nova versão preservando histórico.
6. Rascunho salvo, retomado pela biblioteca e finalizado.
7. Duplicação de documento para novo rascunho.
8. Campos condicionais `Sim -> preencher -> Não` sem vazamento de valor oculto.
9. Moradores adicionais preservando nomes com espaços.

### 4. Smoke dos 9 modelos

Teste parametrizado percorre os 9 slugs oficiais, preenche cada etapa com uma fixture válida e prova que o fluxo chega ao estado de finalização esperado sem travar, sem placeholder órfão e sem erro de validação inesperado.

### 5. Responsividade crítica

Um smoke mobile cobre criação, paywall/checkout e sucesso em viewport de telefone para detectar scroll trap, CTA inacessível e quebra grosseira de layout. Não substitui QA visual humano.

## Critérios de qualidade

- Nenhum teste depende de ordem de execução.
- Nenhum teste depende de internet pública.
- Nenhum teste usa credencial real.
- Falhas deixam trace/screenshot pelo reporter atual.
- Cenários de billing usam apenas provider demo em ambiente de emulator.
- O job final deve permanecer executável por `bun run test:e2e`.
- Se a suíte crescer demais, separar `@smoke` e `@acceptance` sem reduzir cobertura no gate de pré-merge.
