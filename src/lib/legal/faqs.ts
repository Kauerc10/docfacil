/**
 * FAQs centralizadas — compartilhadas entre a view SPA (ajuda-view) e a
 * rota file-based (/ajuda) para SEO.
 *
 * Também consumidas pelo JSON-LD `FAQPage` (schema.org) renderizado na rota
 * estática, para rich results no Google.
 */

export type FAQ = { q: string; a: string };

export const HELP_FAQS: FAQ[] = [
  {
    q: "O documento gerado tem validade jurídica?",
    a: "Sim. Os modelos do DocFacil seguem os requisitos formais do Código Civil e da legislação específica de cada tipo de documento. Quando preenchido corretamente com os dados das partes, o documento tem a mesma validade de um elaborado em cartório. Para alguns casos (inventário, divórcio com bens, testamento), a lei exige registro em cartório — sinalizamos isso com clareza durante o preenchimento.",
  },
  {
    q: "Preciso registrar em cartório?",
    a: "Depende do tipo. Documentos como contratos de aluguel, recibos e declarações simples dispensam registro. Já escrituras, inventários, divórcios e testamentos exigem registro em cartório ou homologação judicial. O DocFacil te avisa no passo a passo sempre que o registro for necessário.",
  },
  {
    q: "Como faço para editar um documento depois?",
    a: "Entre na sua conta, vá em “Meus documentos” e clique no documento que deseja ajustar. Você pode editar os campos, gerar um novo PDF e baixar quantas vezes quiser — sem custo extra dentro do seu plano.",
  },
  {
    q: "Quais formas de pagamento aceitam?",
    a: "Cartão de crédito (Visa, Mastercard, Elo, Amex), Pix e boleto bancário. No Plano Pro você escolhe entre cobrança mensal ou anual com desconto.",
  },
  {
    q: "Posso cancelar o plano Pro quando quiser?",
    a: "Sim, a qualquer momento, direto pelo seu perfil — sem ligação, sem fila de espera, sem multa. Você mantém o acesso até o fim do período já pago.",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim. Usamos criptografia TLS em toda a navegação e armazenamento, servidores em data center certificado no Brasil (LGPD) e nunca compartilhamos seus dados com terceiros. Você pode solicitar a exclusão dos seus dados a qualquer momento pelo e-mail de contato.",
  },
  {
    q: "E se eu travar no meio do preenchimento?",
    a: "Seu progresso é salvo automaticamente a cada campo. Você pode sair e voltar quando quiser — o documento fica no “rascunho” da sua conta. Se preferir, nossa equipe atende pelo WhatsApp de segunda a sábado, das 8h às 20h, sem robô.",
  },
  {
    q: "Funciona para qualquer tipo de documento?",
    a: "O DocFacil cobre hoje mais de 80 modelos entre contratos, declarações, recibos, procurações e documentos de família. Se o que você precisa não está no catálogo, fale com a gente pelo WhatsApp — avaliamos incluir novos modelos.",
  },
];

/**
 * FAQs da página de planos (diferentes das da ajuda).
 * Também usadas para JSON-LD em /planos se desejado.
 */
export const PRICING_FAQS: FAQ[] = [
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim. O plano Pro é mês a mês, sem fidelidade. Você cancela com um clique dentro do seu painel e continua usando até o fim do período já pago.",
  },
  {
    q: "O PDF tem validade jurídica?",
    a: "O documento gerado segue a estrutura exigida para instrumentos particulares e pode ser assinado digitalmente. Para força executiva, recomendamos reconhecimento de firma ou assinatura eletrônica qualificada — te ajudamos nesse passo.",
  },
  {
    q: "Preciso de conta para usar?",
    a: "Não. No plano Grátis você gera até 3 documentos por mês sem cadastro. Para salvar o histórico e baixar PDFs sem marca d'água, aí sim pedimos uma conta rápida (e-mail e senha).",
  },
  {
    q: "E se eu precisar de mais de um documento por mês?",
    a: "Compensa migrar para o Pro: por menos de R$ 1 por dia você tem documentos ilimitados, edição quando quiser e prioridade no WhatsApp. O Avulso é bom só para uma necessidade pontual.",
  },
];
