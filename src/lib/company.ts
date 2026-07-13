/**
 * Informações comerciais centralizadas da empresa proprietária do DocFacil.
 *
 * Mude aqui uma vez e a marca se propaga para:
 *  - Footer (rodapé)
 *  - Metadata (SEO, OpenGraph)
 *  - Qualquer lugar que importe { COMPANY }
 *
 * Manter num único módulo evita inconsistência entre cópias espalhadas pelo app
 * e facilita white-label futuro.
 */
export const COMPANY = {
  name: "K-HUB Soluções Digitais",
  shortName: "K-HUB",
  productName: "DocFacil",
  domain: "khub.com.br",
  url: "https://khub.com.br",
  email: "contato@khub.com.br",
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
