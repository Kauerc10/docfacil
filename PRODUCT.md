# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Pessoas físicas no Brasil resolvendo situações cotidianas e formais do dia a dia (locação de imóveis, declarações de residência, procurações, comodato, compra e venda de bens). O perfil típico possui pouca ou nenhuma familiaridade com termos técnicos jurídicos e busca segurança sem fricção ou burocracia desnecessária. Pequenos empreendedores e autônomos são público secundário conforme os modelos disponíveis.

## Product Purpose
O DocFácil transforma informações cotidianas em documentos formais e organizados em PDF por meio de perguntas simples e preenchimento guiado. Sucesso significa o usuário sair de uma situação de incerteza documental e obter um PDF pronto para assinar ou imprimir em poucos minutos, sem juridiquês.

## Positioning
"Documento difícil? Nunca mais."
Diferente de repositórios de templates estáticos ou formulários burocráticos genéricos, o DocFácil oferece uma condução passo a passo com a Corujinha oficial explicando o motivo de cada pergunta, prévia em tempo real e geração server-side segura.

## Operating Context
- Acesso prioritário via web (navegadores mobile em smartphones 320–390px e computadores desktop).
- Documentos voltados à realidade brasileira (Lei do Inquilinato, declarações formais, termos de compromisso, autorizações).
- O PDF gerado precisa ser legível, pronto para impressão em papel A4 ou assinatura física/eletrônica.

## Capabilities and Constraints
- Catálogo de modelos com perguntas guiadas e validações em tempo real.
- Motor de geração de PDF seguro no backend (Node.js + pdfmake + Cloudflare R2).
- Modelo de Acesso: 1 geração gratuita por mês com marca d'água entre modelos selecionados (exige criação de conta para salvar rascunho ou gerar).
- Disclaimer Legal Obrigatório: O DocFácil não substitui advogado, assessoria jurídica ou atos privativos de cartório quando o caso envolver litígio, partilha complexa ou exigência de escritura pública.
- Não promete validade jurídica universal irrestrita.

## Brand Commitments
- Nome: DocFácil.
- Mascote Oficial: A Corujinha azul (Pet), atuando como guia pedagógica, acolhedora e amigável que traduz juridiquês em linguagem simples, sem agir como advogada nem representante de suporte humano.
- Tom de voz: Português brasileiro claro, adulto, acolhedor, transparente e preciso. Sem alarmismo jurídico, sem urgência artificial e sem jargões desnecessários.
- DNA Visual: Azul marinho profissional, azul royal (`var(--blue-royal)`), verde esmeralda de validação e confiança, estética de documentos físicos timbrados e folhas em profundidade.

## Evidence on Hand
- Catálogo de modelos ativos e testados (`src/lib/catalog/public-models.ts`).
- Assets oficiais da Corujinha em WebP otimizado (`public/mascotes/*.webp`) e acervo de poses.
- Arquitetura de backend com persistência segura (`docs/backend-architecture.md`).
- Ausências que NÃO devem ser inventadas: Proibido inventar depoimentos fakes, métricas infladas (+50k usuários, notas fictícias) ou gerador aberto por IA como produto comercial ativo antes de auditoria real.

## Product Principles
1. **Zero Juridiquês**: Se o usuário precisa de um dicionário para responder à pergunta da etapa, a pergunta falhou.
2. **Private-by-Default**: Documentos pessoais e contratos não são públicos; links de download são temporários e pré-assinados (300s).
3. **Transparência Absoluta**: A regra de gratuidade e marca d'água é informada antes do preenchimento; sem surpresas na entrega.
4. **Respeito aos Limites Legais**: A plataforma é um facilitador documental de apoio, jamais um substituto da advocacia ou da fé pública cartorial.
5. **Mobile-First & Acessibilidade**: Toda a experiência de preenchimento, revisão e geração deve ser impecável em telas de 320–390px.

## Accessibility & Inclusion
- Contraste visual mínimo WCAG 2.2 AA.
- Alvos de toque com pelo menos 44px de altura/largura.
- Compatibilidade com navegação por teclado e leitores de tela (landmarks semânticos, `aria-hidden` em ilustrações puramente decorativas).
- Suporte a `prefers-reduced-motion` para usuários sensíveis a movimento.
