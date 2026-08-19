# E-mail de redefinição de senha — configuração operacional

## Objetivo

Fazer o e-mail de recuperação usar a identidade do DocFácil, melhorar confiança/entregabilidade e abrir a experiência própria em `/redefinir-senha` em vez da página genérica do provedor.

O código da aplicação já cuida de:

- solicitar a recuperação;
- validar o código recebido pelo link;
- permitir a definição de uma nova senha;
- tratar link inválido/expirado;
- manter mensagens públicas sem detalhes técnicos.

A identidade do remetente, o domínio e o template são configuração operacional no Console.

## 1. Personalizar o template de Password reset

No Console Firebase:

1. Abrir **Security > Authentication > Templates**.
2. Editar **Password reset**.
3. Configurar a identidade de produto:
   - **Sender name:** `DocFácil`
   - **Subject:** `Redefina sua senha do DocFácil`
   - idioma do template: `pt-BR`
4. Usar texto curto, direto e sem nome interno do projeto.

Conteúdo recomendado:

```text
DocFácil

Redefina sua senha

Recebemos uma solicitação para alterar a senha da sua conta.

[ Redefinir minha senha ]

Se você não fez esse pedido, pode ignorar este e-mail com segurança.

Equipe DocFácil
```

Não exibir a URL técnica como elemento principal quando o editor permitir CTA textual.

## 2. Configurar o handler de ação

Ainda em **Authentication > Templates**, usar **Customize action URL** e informar:

```text
https://SEU_DOMINIO/redefinir-senha
```

O Firebase acrescenta os parâmetros necessários ao link. A rota do DocFácil valida a ação e nunca deve exibir esses parâmetros na interface.

### Atenção: a action URL é compartilhada

A documentação atual informa que, depois de salva, a URL customizada é usada pelos templates de ação do projeto. Nesta V1 isso é aceitável porque o DocFácil não habilita fluxo próprio de verificação de e-mail nem alteração de endereço por e-mail.

Antes de introduzir `verifyEmail` ou `recoverEmail`, ampliar o handler para tratar esses modos. Não ativar esses fluxos apontando para uma rota que só sabe redefinir senha.

## 3. Adicionar domínio personalizado aos e-mails

Em **Security > Authentication > Templates**:

1. Editar o template.
2. Selecionar **Customize domain**.
3. Informar o domínio de envio escolhido.
4. Copiar exatamente os registros DNS apresentados pelo Console.

O objetivo é remover a aparência de domínio genérico e manter a mesma identidade entre site e e-mails de gerenciamento da conta.

## 4. Verificar o domínio no DNS

O Console fornece os registros que devem ser criados. Não inventar valores e não copiar registros de outro projeto.

1. Criar os registros **TXT/CNAME** apresentados no Console.
2. Não apagar registros existentes necessários para outros serviços do domínio.
3. Verificar o SPF atual antes de adicionar qualquer entrada.
4. Manter **um único registro SPF** no domínio. Se houver mais de um serviço de envio, consolidar os mecanismos no mesmo `v=spf1 ...`.
5. Aguardar a verificação do domínio no Console.
6. Quando aparecer **Verification complete**, clicar em **Apply custom domain**.

A verificação pode levar até 24 horas por causa de propagação/cache DNS.

## 5. Domínios autorizados

Confirmar em **Authentication > Settings > Authorized domains** que o domínio público usado pelo DocFácil está autorizado.

Para produção, não depender de `localhost` ou de domínio descartável de preview como destino definitivo do e-mail.

## 6. Checklist de teste manual

Usar uma conta real de teste:

1. Abrir `/esqueci-senha`.
2. Solicitar recuperação.
3. Confirmar que a UI mostra feedback neutro.
4. Conferir **Caixa de entrada** e **Spam**.
5. Confirmar assunto e nome do remetente.
6. Confirmar que o conteúdo não mostra nome numérico/interno do projeto.
7. Abrir o CTA do e-mail.
8. Confirmar que o link abre `/redefinir-senha` no domínio do DocFácil.
9. Definir uma nova senha válida.
10. Confirmar a tela de sucesso.
11. Voltar ao login e entrar com a senha nova.
12. Confirmar que a senha antiga não autentica mais.

## 7. Diagnóstico de entregabilidade

Domínio personalizado e template profissional reduzem sinais de baixa confiança, mas não garantem 100% de entrega na caixa de entrada.

Se mensagens continuarem indo para Spam, revisar:

- domínio efetivamente verificado e aplicado;
- SPF consolidado e válido;
- identidade consistente do remetente;
- conteúdo do template;
- reputação do domínio/remetente;
- volume e padrão de envios;
- resultados de testes em Gmail e outros provedores.

Não migrar para SMTP/Resend/Postmark apenas para mascarar uma configuração de domínio incorreta. Um provedor de e-mail próprio deve ser uma decisão posterior, caso a necessidade de entregabilidade/templates transacionais justifique a nova infraestrutura.
