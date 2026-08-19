/**
 * visual-recipes.ts — Receitas editoriais dos PDFs do DocFácil.
 *
 * Mantém decisões puramente visuais fora do catálogo jurídico dos modelos.
 * Cada documento continua usando uma das três famílias editoriais, mas pode
 * calibrar densidade, ritmo, data, título e cláusulas sem duplicar renderers.
 */

export type PdfLayoutProfile = "declaration" | "contract" | "instrument";
export type PdfDensity = "airy" | "balanced" | "dense";

export interface PdfVisualRecipe {
  profile: PdfLayoutProfile;
  density: PdfDensity;
  pageMarginsCm: [number, number, number, number];
  /** O footer vive na margem física da folha, independente da caixa do corpo. */
  footerHorizontalInsetCm: number;
  footerBottomMarginCm: number;
  bodyFontSize: number;
  bodyLineHeight: number;
  signatureLineHeight: number;
  signatureCharacterSpacing: number;
  titleFontSize: number;
  titleCharacterSpacing: number;
  titleBottomMargin: number;
  dividerBottomMargin: number;
  /** null = largura útil inteira. */
  dividerWidthCm: number | null;
  closingTopMargin: number;
  /** Espaço em branco depois do fechamento, útil em peças destinadas à assinatura física. */
  closingBottomMargin: number;
  paragraphBottomMargin: number;
  firstLineIndentSpaces: number;
  legalQuoteIndent: number;
  legalQuoteLineHeight: number;
  dateAlignment: "left" | "center" | "right";
  dateTopMargin: number;
  dateBottomMargin: number;
  clauseHeadingTopMargin: number;
  clauseHeadingBottomMargin: number;
}

const DEFAULT_CONTRACT_RECIPE: PdfVisualRecipe = {
  profile: "contract",
  density: "balanced",
  pageMarginsCm: [3.15, 3.45, 3.15, 2.6],
  footerHorizontalInsetCm: 2,
  footerBottomMarginCm: 0.55,
  bodyFontSize: 12,
  bodyLineHeight: 1.6,
  signatureLineHeight: 1,
  signatureCharacterSpacing: 0.2,
  titleFontSize: 16,
  titleCharacterSpacing: 1.5,
  titleBottomMargin: 4,
  dividerBottomMargin: 20,
  dividerWidthCm: null,
  closingTopMargin: 15,
  closingBottomMargin: 0,
  paragraphBottomMargin: 10,
  firstLineIndentSpaces: 10,
  legalQuoteIndent: 20,
  legalQuoteLineHeight: 1.5,
  dateAlignment: "right",
  dateTopMargin: 14,
  dateBottomMargin: 14,
  clauseHeadingTopMargin: 13,
  clauseHeadingBottomMargin: 5,
};

/**
 * As nove receitas são explícitas de propósito: o fallback existe para
 * templates futuros/IA, enquanto os modelos oficiais ficam visualmente
 * auditáveis e previsíveis.
 */
export const PDF_VISUAL_RECIPES: Record<string, PdfVisualRecipe> = {
  "declaracao-residencia": {
    profile: "declaration",
    density: "airy",
    pageMarginsCm: [3.2, 3.05, 3.2, 1.85],
    footerHorizontalInsetCm: 1.8,
    footerBottomMarginCm: 0.4,
    bodyFontSize: 12.25,
    bodyLineHeight: 1.82,
    signatureLineHeight: 1.12,
    signatureCharacterSpacing: 0.9,
    titleFontSize: 16.5,
    titleCharacterSpacing: 1.5,
    titleBottomMargin: 8,
    dividerBottomMargin: 28,
    dividerWidthCm: 4.8,
    closingTopMargin: 12,
    closingBottomMargin: 42,
    paragraphBottomMargin: 12,
    firstLineIndentSpaces: 10,
    legalQuoteIndent: 22,
    legalQuoteLineHeight: 1.6,
    dateAlignment: "center",
    dateTopMargin: 15,
    dateBottomMargin: 32,
    clauseHeadingTopMargin: 14,
    clauseHeadingBottomMargin: 6,
  },
  "declaracao-residencia-terceiro": {
    profile: "declaration",
    density: "balanced",
    pageMarginsCm: [3.2, 3.15, 3.2, 1.85],
    footerHorizontalInsetCm: 1.8,
    footerBottomMarginCm: 0.4,
    bodyFontSize: 12.1,
    bodyLineHeight: 1.72,
    signatureLineHeight: 1.1,
    signatureCharacterSpacing: 0.8,
    titleFontSize: 16.25,
    titleCharacterSpacing: 1.4,
    titleBottomMargin: 8,
    dividerBottomMargin: 25,
    dividerWidthCm: 5.2,
    closingTopMargin: 14,
    closingBottomMargin: 34,
    paragraphBottomMargin: 10,
    firstLineIndentSpaces: 9,
    legalQuoteIndent: 20,
    legalQuoteLineHeight: 1.56,
    dateAlignment: "center",
    dateTopMargin: 12,
    dateBottomMargin: 28,
    clauseHeadingTopMargin: 13,
    clauseHeadingBottomMargin: 5,
  },
  "contrato-locacao": {
    ...DEFAULT_CONTRACT_RECIPE,
    bodyLineHeight: 1.62,
    clauseHeadingTopMargin: 14,
    clauseHeadingBottomMargin: 6,
  },
  "contrato-locacao-comercial": {
    ...DEFAULT_CONTRACT_RECIPE,
    density: "dense",
    bodyLineHeight: 1.56,
    paragraphBottomMargin: 8,
    clauseHeadingTopMargin: 11,
    clauseHeadingBottomMargin: 4,
    closingTopMargin: 13,
  },
  "contrato-compra-venda-imovel": {
    ...DEFAULT_CONTRACT_RECIPE,
    density: "balanced",
    bodyLineHeight: 1.61,
    titleBottomMargin: 6,
    dividerBottomMargin: 22,
    clauseHeadingTopMargin: 14,
    clauseHeadingBottomMargin: 6,
    closingTopMargin: 18,
  },
  comodato: {
    ...DEFAULT_CONTRACT_RECIPE,
    bodyLineHeight: 1.59,
    paragraphBottomMargin: 9,
    clauseHeadingTopMargin: 12,
    clauseHeadingBottomMargin: 5,
  },
  "compra-venda": {
    ...DEFAULT_CONTRACT_RECIPE,
    density: "dense",
    bodyLineHeight: 1.57,
    paragraphBottomMargin: 8,
    clauseHeadingTopMargin: 11,
    clauseHeadingBottomMargin: 4,
  },
  "uniao-estavel": {
    profile: "instrument",
    density: "airy",
    pageMarginsCm: [3.15, 3.65, 3.15, 2.7],
    footerHorizontalInsetCm: 2,
    footerBottomMarginCm: 0.55,
    bodyFontSize: 12,
    bodyLineHeight: 1.72,
    signatureLineHeight: 1.06,
    signatureCharacterSpacing: 0.25,
    titleFontSize: 16,
    titleCharacterSpacing: 1.5,
    titleBottomMargin: 6,
    dividerBottomMargin: 24,
    dividerWidthCm: null,
    closingTopMargin: 22,
    closingBottomMargin: 0,
    paragraphBottomMargin: 11,
    firstLineIndentSpaces: 10,
    legalQuoteIndent: 20,
    legalQuoteLineHeight: 1.54,
    dateAlignment: "right",
    dateTopMargin: 18,
    dateBottomMargin: 16,
    clauseHeadingTopMargin: 13,
    clauseHeadingBottomMargin: 5,
  },
  "procuracao-simples": {
    profile: "instrument",
    density: "balanced",
    pageMarginsCm: [3.15, 3.65, 3.15, 2.7],
    footerHorizontalInsetCm: 2,
    footerBottomMarginCm: 0.55,
    bodyFontSize: 12,
    bodyLineHeight: 1.62,
    signatureLineHeight: 1.06,
    signatureCharacterSpacing: 0.2,
    titleFontSize: 16,
    titleCharacterSpacing: 1.5,
    titleBottomMargin: 6,
    dividerBottomMargin: 22,
    dividerWidthCm: null,
    closingTopMargin: 20,
    closingBottomMargin: 0,
    paragraphBottomMargin: 9,
    firstLineIndentSpaces: 9,
    legalQuoteIndent: 18,
    legalQuoteLineHeight: 1.5,
    dateAlignment: "right",
    dateTopMargin: 16,
    dateBottomMargin: 14,
    clauseHeadingTopMargin: 12,
    clauseHeadingBottomMargin: 5,
  },
};

export function getPdfVisualRecipe(modelo: { slug: string }): PdfVisualRecipe {
  return PDF_VISUAL_RECIPES[modelo.slug] ?? DEFAULT_CONTRACT_RECIPE;
}

export function getPdfLayoutProfile(modelo: { slug: string }): PdfLayoutProfile {
  return getPdfVisualRecipe(modelo).profile;
}
