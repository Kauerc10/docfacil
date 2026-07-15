/**
 * Informações comerciais centralizadas da empresa proprietária do DocFacil.
 *
 * Mude aqui uma vez e a marca se propaga para:
 *  - Footer (rodapé)
 *  - Metadata (SEO, OpenGraph)
 *  - Páginas legais (Termos, Privacidade, Cookies) — dados exigidos pela LGPD
 *  - Qualquer lugar que importe { COMPANY }
 *
 * Manter num único módulo evita inconsistência entre cópias espalhadas pelo app
 * e facilita white-label futuro.
 *
 * ⚠️ CAMPOS COM // PREENCHER abaixo estão como placeholder e DEVEM ser
 * preenchidos com os dados reais da empresa antes de publicar.
 */
export const COMPANY = {
  name: "K-HUB Soluções Digitais",
  shortName: "K-HUB",
  productName: "DocFacil",
  domain: "khub.com.br",
  url: "https://khub.com.br",
  email: "contato@khub.com.br",

  // --- Dados LGPD/exigências legais — PREENCHER antes de publicar ----------

  /** CNPJ da empresa. Exibir em rodapés e páginas legais (validade formal). */
  cnpj: "00.000.000/0000-00", // PREENCHER
  /** Endereço completo da sede (usado em Termos e Política de Privacidade). */
  enderecoSede: "Rua Exemplo, 123 — Bairro — São Paulo/SP — 00000-000", // PREENCHER
  /**
   * E-mail do Encarregado de Dados (DPO). A LGPD (art. 41) exige um canal
   * de comunicação específico para o encarregado. Deve ser separado do
   * e-mail de contato geral.
   */
  dpoEmail: "dpo@khub.com.br", // PREENCHER — Encarregado LGPD
  /** E-mail de suporte ao cliente. */
  suporteEmail: "suporte@khub.com.br", // PREENCHER
  /** Número real do WhatsApp (formato wa.me/55DDDNNNNNNNNN). */
  whatsappReal: "https://wa.me/5511000000000", // PREENCHER — WhatsApp real

  // ------------------------------------------------------------------------

  whatsapp: "https://wa.me/5511999990000",
  whatsappLabel: "Chama no zap",
  foundedYear: 2026,
  tagline: "Documentos com validade legal.",
  /** Retorna o range de anos para o copyright, ex: "2025–2026". */
  copyrightRange() {
    const now = new Date().getFullYear();
    return now <= this.foundedYear
      ? `${this.foundedYear}`
      : `${this.foundedYear}–${now}`;
  },
} as const;

/**
 * Verdadeiro se os dados da empresa ainda são placeholders.
 * Útil para warning em dev quando os dados reais não foram preenchidos.
 */
export const COMPANY_DATA_IS_PLACEHOLDER =
  COMPANY.cnpj === "00.000.000/0000-00" ||
  COMPANY.whatsappReal === "https://wa.me/5511000000000";
