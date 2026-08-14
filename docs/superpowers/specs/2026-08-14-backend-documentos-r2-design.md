# Design e Arquitetura: Backend de Documentos e Cloudflare R2

## 1. Visão Geral
Este documento consolida a arquitetura técnica, decisões de design (ADRs) e modelo de segurança do DocFácil implementados no backend server-side com armazenamento privado no Cloudflare R2.

## 2. Princípios de Segurança e Governança
1. **Zero Client Trust**: O cliente (browser) nunca grava diretamente nas coleções de `documents`, `orders`, `access_links` ou `generation_requests`.
2. **Server-Side Enforcement**: Toda geração de PDF, resolução de entitlement (grátis / avulso / pro) e controle de versão ocorrem em runtime Node.js no servidor.
3. **Fail-Closed Storage**: O armazenamento em memória só é permitido em ambiente de testes ou desenvolvimento com flag explícita `ALLOW_IN_MEMORY_ARTIFACT_STORAGE=true`. Em produção, credenciais ausentes ou incompletas do R2 bloqueiam operações com erro 500 (`SERVER_MISCONFIGURED`).
4. **Idempotência Estável**: Todo pedido de finalização possui um `requestId` persistente gerado no início do fluxo do usuário. Retries ou reenvios reutilizam o mesmo `requestId` sem duplicar artefatos ou cobranças.
5. **Reserva Atômica de Pedidos**: Compras avulsas passam por transação Firestore (`reservePaidOrder`) associando `reservedByRequestId` antes da geração. Em caso de falha a jusante, a reserva é liberada (`releaseReservedOrder`); no sucesso, é consumida (`consumeReservedOrder`).

## 3. Planos e Preços Canônicos
- **Grátis**: R$ 0,00 (1 documento mensal sem marca d'água ou ilimitado com marca d'água).
- **Avulso**: R$ 9,90 (990 centavos) por documento final sem marca d'água.
- **Pro**: R$ 24,90 (2490 centavos) por mês com regenerações e histórico completos.

## 4. Endpoints e Contratos de API
- `POST /api/documents/finalize`: Recebe respostas do formulário, valida modelo, reserva entitlement/order, gera PDF via pdf-lib, faz upload para o R2 e promove versão.
- `GET /api/documents`: Lista resumos de documentos do usuário autenticado (`DocumentSummaryDto[]`).
- `GET /api/documents/:id`: Retorna detalhes e metadados de versões do documento (`DocumentDetailDto`).
- `DELETE /api/documents/:id`: Revoga links de acesso, purga artefatos do R2 e marca o documento como deletado (com `pendingPurge: true` em caso de instabilidade no storage).
- `POST /api/documents/:id/duplicate`: Carrega respostas canônicas do documento original para reabertura no formulário sem gravar no Firestore.
- `POST /api/documents/:id/share`: Cria link de compartilhamento com token seguro de 32 bytes (armazenado em hash SHA-256).
- `POST /api/access/download`: Valida token de acesso ativo e não expirado, incrementa contador de uso e gera URL assinada temporária (S3 Pre-signed URL) de 5 minutos.
- `POST /api/checkout/demo`: Cria ou simula pagamento em ambiente de testes/desenvolvimento. Rejeita requisições em produção.

## 5. Regras de Segurança do Firestore
- `rules_version = '2'`.
- `/users/{uid}`: Criação exige `plano == 'gratis'`. Atualização restrita via whitelist `hasOnly(['nome', 'telefone', 'fotoUrl', 'atualizadoEm'])`. Mutações em `plano`, `email`, `role` ou `subscription` são proibidas para o cliente.
- Coleções `documents`, `orders`, `access_links`, `generation_requests`: Escrita proibida para clientes (`allow write: if false;`). Leitura de `documents` restrita ao proprietário autenticado.
