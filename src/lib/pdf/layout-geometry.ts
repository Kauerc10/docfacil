import type { PdfVisualRecipe } from "./visual-recipes";

export const CM_TO_PT = 28.3464566929;
export const A4_WIDTH = cm(21);

export function cm(value: number): number {
  return Number((value * CM_TO_PT).toFixed(2));
}

export interface PdfLayoutGeometry {
  pageMargins: [number, number, number, number];
  contentWidth: number;
  frameWidth: number;
}

export function getPdfLayoutGeometry(recipe: PdfVisualRecipe): PdfLayoutGeometry {
  const pageMargins = recipe.pageMarginsCm.map(cm) as [number, number, number, number];

  return {
    pageMargins,
    contentWidth: A4_WIDTH - pageMargins[0] - pageMargins[2],
    frameWidth: A4_WIDTH - cm(4),
  };
}
