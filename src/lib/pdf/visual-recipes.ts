/**
 * visual-recipes.ts — Receitas editoriais dos PDFs do DocFácil.
 *
 * Mantém decisões puramente visuais fora do catálogo jurídico dos modelos.
 * Cada documento continua usando uma das três famílias editoriais, mas pode
 * calibrar densidade, ritmo, data, título e cláusulas sem duplicar renderers.
 */

export type PdfLayoutProfile = "declaration" | "contract" | "instrument";
export type PdfDensity = "airy" | "balanced" | "dense";
export type PdfContractVariant = "standard" | "dense" | "formal" | "property";

export interface PdfVisualRecipe {
  profile: PdfLayoutProfile;
  density: PdfDensity;
  /** Preset reutilizável da família contract; documentos não contratuais não o definem. */
  contractVariant?: PdfContractVariant;
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
  /** Tom principal do corpo; declarações preservam seu azul atual. */
  bodyColor?: string;
  /** Cabeçalho editorial; o padrão mantém o comportamento histórico. */
  headerStyle?: "standard" | "formal";
  /** Alguns documentos formais usam somente o filete do cabeçalho. */
  showTitleDivider?: boolean;
}

/**
 * Moldura editorial comum aos contratos DocFácil. Variações posteriores
 * ajustam apenas o ritmo de leitura; não podem voltar ao layout legado.
 */
const CONTRACT_FORMAL_BASE_RECIPE: PdfVisualRecipe = {
  profile: "contract",
  density: "balanced",
  contractVariant: "standard",
  pageMarginsCm: [2, 2.3, 2, 2],
  footerHorizontalInsetCm: 2,
  footerBottomMarginCm: 0.55,
  bodyFontSize: 10.5,
  bodyLineHeight: 1.3,
  signatureLineHeight: 1,
  signatureCharacterSpacing: 0.2,
  titleFontSize: 15,
  titleCharacterSpacing: 0.2,
  titleBottomMargin: 3,
  dividerBottomMargin: 8,
  dividerWidthCm: null,
  closingTopMargin: 12,
  closingBottomMargin: 0,
  paragraphBottomMargin: 6,
  firstLineIndentSpaces: 0,
  legalQuoteIndent: 0,
  legalQuoteLineHeight: 1.26,
  dateAlignment: "right",
  dateTopMargin: 14,
  dateBottomMargin: 14,
  clauseHeadingTopMargin: 10,
  clauseHeadingBottomMargin: 4,
  bodyColor: "#181818",
  headerStyle: "formal",
  showTitleDivider: false,
};

const DEFAULT_CONTRACT_RECIPE: PdfVisualRecipe = {
  ...CONTRACT_FORMAL_BASE_RECIPE,
  contractVariant: "standard",
  density: "balanced",
  bodyLineHeight: 1.34,
  paragraphBottomMargin: 7,
  closingTopMargin: 14,
};

const CONTRACT_DENSE_RECIPE: PdfVisualRecipe = {
  ...CONTRACT_FORMAL_BASE_RECIPE,
  contractVariant: "dense",
  density: "dense",
  bodyLineHeight: 1.27,
  paragraphBottomMargin: 6,
  clauseHeadingTopMargin: 11,
  clauseHeadingBottomMargin: 4,
  closingTopMargin: 13,
};

const CONTRACT_FORMAL_RECIPE: PdfVisualRecipe = {
  ...CONTRACT_FORMAL_BASE_RECIPE,
  contractVariant: "formal",
  density: "dense",
  bodyLineHeight: 1.26,
};

const CONTRACT_PROPERTY_RECIPE: PdfVisualRecipe = {
  ...CONTRACT_FORMAL_BASE_RECIPE,
  contractVariant: "property",
  density: "balanced",
  bodyLineHeight: 1.32,
  paragraphBottomMargin: 7,
  clauseHeadingTopMargin: 12,
  clauseHeadingBottomMargin: 5,
  closingTopMargin: 16,
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
    ...CONTRACT_FORMAL_RECIPE,
  },
  "contrato-locacao-comercial": CONTRACT_DENSE_RECIPE,
  "contrato-compra-venda-imovel": CONTRACT_PROPERTY_RECIPE,
  comodato: {
    ...DEFAULT_CONTRACT_RECIPE,
    bodyLineHeight: 1.59,
    paragraphBottomMargin: 9,
    clauseHeadingTopMargin: 12,
    clauseHeadingBottomMargin: 5,
  },
  "compra-venda": CONTRACT_FORMAL_RECIPE,
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
