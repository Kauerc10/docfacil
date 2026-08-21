/**
 * visual-recipes.ts — Receitas editoriais dos PDFs do DocFácil.
 *
 * Mantém decisões puramente visuais fora do catálogo jurídico dos modelos.
 * Todos os documentos oficiais compartilham a mesma shell editorial, enquanto
 * cada família calibra densidade, ritmo, data, título e fechamento sem duplicar
 * renderers ou introduzir condicionais por slug no compositor.
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
  /** Tom principal do corpo do documento. */
  bodyColor?: string;
  /** Shell editorial usada pelo renderer. */
  headerStyle?: "standard" | "formal";
  /** A shell formal usa o filete do cabeçalho em vez do divisor legado do título. */
  showTitleDivider?: boolean;
}

type PdfVisualBaseRecipe = Omit<
  PdfVisualRecipe,
  "profile" | "density" | "contractVariant"
>;

/**
 * Identidade editorial comum do DocFácil.
 *
 * A base não conhece a natureza jurídica do documento. Declarações, contratos
 * e instrumentos herdam a mesma geometria, header, cores e tratamento de
 * título; os presets de família abaixo alteram somente ritmo e densidade.
 */
const DOCUMENT_FORMAL_BASE_RECIPE: PdfVisualBaseRecipe = {
  pageMarginsCm: [2, 2.3, 2, 2],
  footerHorizontalInsetCm: 2,
  footerBottomMarginCm: 0.55,
  bodyFontSize: 10.5,
  bodyLineHeight: 1.3,
  signatureLineHeight: 1,
  signatureCharacterSpacing: 0.2,
  titleFontSize: 15,
  titleCharacterSpacing: 0.2,
  // Mantém os números já aprovados nos contratos; famílias mais arejadas
  // sobrescrevem apenas o ritmo necessário.
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

const DECLARATION_AIRY_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "declaration",
  density: "airy",
  bodyFontSize: 11.25,
  bodyLineHeight: 1.55,
  signatureLineHeight: 1.08,
  titleBottomMargin: 8,
  closingTopMargin: 15,
  closingBottomMargin: 24,
  paragraphBottomMargin: 10,
  legalQuoteLineHeight: 1.45,
  dateAlignment: "center",
  dateTopMargin: 16,
  dateBottomMargin: 26,
};

const DECLARATION_BALANCED_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "declaration",
  density: "balanced",
  bodyFontSize: 11.1,
  bodyLineHeight: 1.48,
  signatureLineHeight: 1.06,
  titleBottomMargin: 8,
  closingTopMargin: 14,
  closingBottomMargin: 18,
  paragraphBottomMargin: 8,
  legalQuoteLineHeight: 1.42,
  dateAlignment: "center",
  dateTopMargin: 14,
  dateBottomMargin: 22,
};

/**
 * Moldura editorial dos contratos. O objeto preserva os valores que já estavam
 * aprovados na família contract e apenas herda a identidade global.
 */
const CONTRACT_FORMAL_BASE_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "contract",
  density: "balanced",
  contractVariant: "standard",
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

const INSTRUMENT_AIRY_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "instrument",
  density: "airy",
  bodyFontSize: 11.25,
  bodyLineHeight: 1.5,
  signatureLineHeight: 1.06,
  closingTopMargin: 20,
  paragraphBottomMargin: 9,
  legalQuoteLineHeight: 1.44,
  dateAlignment: "right",
  dateTopMargin: 18,
  dateBottomMargin: 16,
};

const INSTRUMENT_BALANCED_RECIPE: PdfVisualRecipe = {
  ...DOCUMENT_FORMAL_BASE_RECIPE,
  profile: "instrument",
  density: "balanced",
  bodyFontSize: 11.1,
  bodyLineHeight: 1.42,
  signatureLineHeight: 1.04,
  closingTopMargin: 17,
  paragraphBottomMargin: 8,
  legalQuoteLineHeight: 1.4,
  dateAlignment: "right",
  dateTopMargin: 16,
  dateBottomMargin: 14,
};

/**
 * As nove receitas são explícitas de propósito: o fallback existe para
 * templates futuros/IA, enquanto os modelos oficiais ficam visualmente
 * auditáveis e previsíveis.
 */
export const PDF_VISUAL_RECIPES: Record<string, PdfVisualRecipe> = {
  "declaracao-residencia": DECLARATION_AIRY_RECIPE,
  "declaracao-residencia-terceiro": DECLARATION_BALANCED_RECIPE,
  "contrato-locacao": CONTRACT_FORMAL_RECIPE,
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
  "uniao-estavel": INSTRUMENT_AIRY_RECIPE,
  "procuracao-simples": INSTRUMENT_BALANCED_RECIPE,
};

export function getPdfVisualRecipe(modelo: { slug: string }): PdfVisualRecipe {
  return PDF_VISUAL_RECIPES[modelo.slug] ?? DEFAULT_CONTRACT_RECIPE;
}

export function getPdfLayoutProfile(modelo: { slug: string }): PdfLayoutProfile {
  return getPdfVisualRecipe(modelo).profile;
}
