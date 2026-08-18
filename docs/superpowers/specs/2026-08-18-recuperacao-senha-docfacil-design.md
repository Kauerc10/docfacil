# Design — Recuperação de senha com experiência DocFácil

**Data:** 18/08/2026  
**Branch:** `fix/auth-login-session-hardening`  
**PR:** #18 — `fix(auth): fortalece login e sessão Firebase`

## Contexto

O fluxo atual já envia e-mails reais de redefinição de senha pelo Firebase Authentication, porém a experiência ainda expõe a aparência padrão do provedor:

- assunto e corpo genéricos;
- identificação do projeto técnico no conteúdo;
- link de ação hospedado no domínio padrão do Firebase;
- ausência de uma tela dedicada de recuperação dentro do DocFácil;
- baixa confiança visual e risco de entregabilidade ruim, evidenciado por mensagem real classificada como spam durante validação manual.

O objetivo deste incremento é manter o Firebase Authentication como autoridade de identidade e redefinição de senha, mas colocar toda a experiência percebida pelo usuário sob o domínio, linguagem e identidade visual do DocFácil.

## Decisões de arquitetura

### 1. Não criar infraestrutura própria de senha ou token

O DocFácil continuará usando os mecanismos nativos do Firebase Authentication para:

- emissão do e-mail de recuperação;
- geração e validação do `oobCode`;
- validação da política de senha;
- confirmação da nova senha.

Não serão criados JWT próprio, token de recuperação próprio, tabela adicional de tokens, SMTP próprio ou serviço paralelo de autenticação nesta PR.

### 2. Criar duas superfícies dedicadas de produto

O fluxo passa a ter duas telas próprias:

1. `esqueci-senha`: coleta o e-mail e envia as instruções;
2. `redefinir-senha`: recebe a ação do e-mail, valida o código e permite definir a nova senha.

Como o produto ainda usa o roteador client-side próprio (`NavContext`) a partir da entrada `/`, essas superfícies serão adicionadas ao sistema de `View` existente, preservando a arquitetura atual da aplicação. O handler de e-mail deve aceitar os parâmetros que o Firebase acrescenta ao URL, especialmente `mode`, `oobCode`, `apiKey`, `continueUrl` e `lang`, sem expor esses detalhes na interface.

## Fluxo funcional

### Solicitação de recuperação

```text
/login
  ↓
Esqueci minha senha
  ↓
esqueci-senha
  ↓
informa e-mail
  ↓
requestPasswordReset(email)
  ↓
feedback neutro de sucesso
```

A resposta pública permanece neutra para evitar enumeração de contas:

> Se existir uma conta com esse e-mail, enviaremos as instruções para redefinir sua senha.

Nenhuma diferença visual ou textual deve revelar se o endereço existe no sistema.

### Estado visual de envio concluído

Após o envio, a tela muda de estado sem navegar para uma página genérica. O usuário vê:

- confirmação clara;
- e-mail parcialmente mascarado, quando tecnicamente possível sem aumentar o risco de enumeração;
- botão para voltar ao login;
- ação de reenvio protegida por cooldown visual para evitar cliques repetidos;
- animação discreta do envelope/chave seguindo o DNA visual do DocFácil.

O cooldown é apenas de UX. Controles reais contra abuso continuam sob responsabilidade das proteções do provedor e da aplicação.

### Abertura do link recebido

O e-mail aponta para o handler customizado do DocFácil.

```text
link do e-mail
  ↓
redefinir-senha?mode=resetPassword&oobCode=...
  ↓
verifyPasswordResetCode(auth, oobCode)
  ↓
  ├─ válido → formulário de nova senha
  └─ inválido/expirado → estado de link inválido
```

A interface não mostra `oobCode`, `apiKey`, nomes de SDK, Firebase ou qualquer mensagem técnica.

### Definição da nova senha

A tela solicita:

- nova senha;
- confirmação da nova senha;
- requisitos de senha em linguagem humana.

A política local mínima continua sendo 8 caracteres e a validação complementar continua alinhada à política ativa do provedor através da camada existente `validateSignupPassword`/`validatePassword`, sem citar Firebase na interface.

Ao confirmar:

```text
confirmPasswordReset(auth, oobCode, novaSenha)
  ↓
sucesso
  ↓
CTA "Entrar no DocFácil"
```

Não será feito login automático após redefinir a senha. O usuário retorna conscientemente à tela de login e autentica com a nova credencial.

## Estados da interface

### `esqueci-senha`

Estados previstos:

- formulário inicial;
- enviando;
- instruções enviadas;
- falha operacional genérica.

Copy-base:

**Título:** `Esqueceu sua senha?`  
**Descrição:** `Informe seu e-mail e enviaremos um acesso seguro para criar uma nova senha.`  
**CTA:** `Enviar instruções`  
**Retorno:** `Voltar para entrar`

### `redefinir-senha`

Estados previstos:

- validando link;
- formulário válido;
- salvando nova senha;
- sucesso;
- link inválido ou expirado;
- falha operacional genérica.

Copy-base para link inválido:

> Esse link não é mais válido. Por segurança, links de recuperação têm validade limitada.

CTA:

> Solicitar novo link

## Direção visual e animação

A experiência deve parecer parte nativa do DocFácil, não um widget do fornecedor de autenticação.

Direção aprovada:

- card central consistente com login/cadastro;
- ícone de envelope e chave para recuperação;
- movimento vertical discreto e orbital suave;
- transições entre estados sem flashes bruscos;
- respeito a `prefers-reduced-motion`;
- animações decorativas nunca bloqueiam interação;
- mobile e desktop totalmente utilizáveis;
- nenhuma animação contínua agressiva.

A implementação deve reaproveitar os tokens visuais existentes do produto e evitar introduzir uma biblioteca de animação apenas para esse fluxo se CSS/GSAP já presente no projeto for suficiente.

## E-mail de recuperação

### Responsabilidade do código

A aplicação continuará chamando `sendPasswordResetEmail()` usando a infraestrutura nativa de Authentication.

Quando necessário para preservar o retorno ao produto, o envio pode usar `ActionCodeSettings` com uma URL autorizada do DocFácil.

### Responsabilidade de configuração no console

A aparência e entregabilidade do e-mail não devem ser resolvidas com HTML hard-coded no frontend.

A configuração operacional inclui:

- nome de remetente `DocFácil`;
- assunto de recuperação em linguagem de produto;
- corpo do template sem nome interno do projeto;
- domínio personalizado de autenticação;
- URL de ação customizada apontando para o handler do DocFácil;
- registros DNS exigidos pelo Firebase para verificação do domínio;
- SPF ajustado sem criar múltiplos registros SPF conflitantes.

O Firebase suporta domínio personalizado no campo `From` e nos links de ação dos e-mails. A verificação usa os registros TXT/CNAME fornecidos pelo console.

### Conteúdo recomendado

**Assunto:** `Redefina sua senha do DocFácil`

Corpo conceitual:

```text
DocFácil

Redefina sua senha

Recebemos uma solicitação para alterar a senha da sua conta.

[ Redefinir minha senha ]

Se você não fez esse pedido, pode ignorar este e-mail com segurança.

Equipe DocFácil
```

A URL técnica não deve ser exibida como elemento principal quando o template permitir CTA textual.

## Entregabilidade e spam

Esta PR pode melhorar a experiência e preparar o projeto para domínio próprio, porém código sozinho não garante entrega em caixa de entrada.

A redução do risco de spam depende também de configuração operacional:

- domínio próprio validado;
- DNS correto;
- identidade de remetente consistente;
- reputação do domínio/remetente;
- conteúdo não genérico;
- volume e comportamento de envio.

Não será prometido `100% inbox`.

## Segurança e privacidade

Requisitos obrigatórios:

- resposta de recuperação neutra para e-mail existente ou inexistente;
- nunca registrar `oobCode` em logs de produção;
- não persistir o código no Firestore/localStorage;
- não mostrar parâmetros técnicos na interface;
- link inválido/expirado recebe mensagem genérica e CTA para novo pedido;
- nova senha validada antes de `confirmPasswordReset`;
- nenhuma alteração em JWT/session architecture;
- nenhuma verificação de e-mail adicionada nesta PR.

## Alterações previstas

Arquivos/componentes esperados:

- `src/components/docfacil/nav-context.tsx` — novas views;
- `src/components/docfacil/views/login-view.tsx` — navegar para recuperação;
- nova view de solicitação de recuperação;
- nova view de redefinição de senha;
- integração dessas views no renderer principal da aplicação;
- `src/lib/auth-context.tsx` — manter envio e, se necessário, aceitar `ActionCodeSettings`;
- `src/lib/auth/password-policy.ts` — reaproveitar validação existente;
- testes de contrato/UX/auth correspondentes.

A configuração de domínio e template no Console Firebase é uma etapa operacional documentada, não uma mutação automatizada do repositório.

## Testes

Implementação seguirá TDD.

Cobertura mínima esperada:

- login navega para a view de recuperação;
- envio exige e-mail válido;
- feedback de envio permanece neutro;
- nenhuma copy pública contém `Firebase` nesse fluxo;
- link sem `oobCode` é rejeitado com estado amigável;
- `verifyPasswordResetCode` válido libera o formulário;
- código inválido/expirado mostra estado correto;
- senhas diferentes são bloqueadas localmente;
- senha abaixo do mínimo é bloqueada;
- requisitos complementares são apresentados em linguagem humana;
- `confirmPasswordReset` só é chamado após validação;
- sucesso oferece retorno ao login;
- componentes respeitam estado de loading e evitam submit duplicado;
- regressões existentes de auth continuam verdes.

Gates finais da PR:

- unitários;
- Firestore Rules;
- integração Firestore existente;
- ESLint;
- TypeScript;
- Next build;
- Guest E2E;
- preview Vercel `READY`;
- teste manual de e-mail real e redefinição real no projeto Firebase.

## Fora de escopo

- verificação de e-mail;
- login por código;
- magic link para login normal;
- MFA;
- SMTP próprio;
- Resend/Postmark nesta V1;
- JWT próprio;
- refresh token próprio;
- alteração da política de cookies;
- faxina geral de copy pública identificada na auditoria anterior.

Essa última frente será tratada em branch/PR separada após a conclusão da #18.

## Critério de aceite

O fluxo é considerado concluído quando uma pessoa consegue:

1. sair do login para uma tela DocFácil de recuperação;
2. solicitar o reset sem descobrir se a conta existe;
3. receber o e-mail real;
4. abrir um link que leva à experiência DocFácil, e não à tela genérica do provedor;
5. definir uma nova senha válida;
6. retornar ao login;
7. entrar com a nova senha;
8. não encontrar nomes técnicos do provedor nas telas do fluxo.
