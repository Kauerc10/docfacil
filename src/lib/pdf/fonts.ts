/**
 * fonts.ts — Configuração de fontes e VFS do pdfmake.
 *
 * O pdfmake é distribuído com a fonte Roboto empacotada em `vfs_fonts`.
 * Este módulo é defensivo: procura pelas variantes (Regular/Medium/Bold/
 * Italic/MediumItalic/BoldItalic), cria aliases quando uma variante falta,
 * e lança erro apenas se NENHUMA fonte Roboto existir.
 *
 * Extraído do monolito `generator.ts` para isolar a lógica de fontes —
 * se um dia trocarmos Roboto por uma fonte serifada (ex.: EB Garamond),
 * basta editar este arquivo.
 */

/**
 * Extrai o VFS (Virtual File System) do módulo pdfmake, procurando em
 * múltiplas formas possíveis (pdfMake.vfs, default.vfs, etc.) para
 * tolerar diferentes bundlers e versões.
 */
export function extractVfs(moduleValue: any): Record<string, string> | undefined {
  const candidates = [
    moduleValue?.pdfMake?.vfs,
    moduleValue?.default?.pdfMake?.vfs,
    moduleValue?.vfs,
    moduleValue?.default?.vfs,
    moduleValue?.default,
    moduleValue,
  ];

  return candidates.find(
    (candidate) =>
      candidate &&
      typeof candidate === "object" &&
      Object.keys(candidate).some((key) => /\.ttf$/i.test(key))
  );
}

/**
 * Cria um alias para uma fonte que falta, apontando para a primeira fonte
 * disponível na lista de fallback. Mutaciona o VFS in-place.
 */
export function aliasFont(vfs: Record<string, string>, target: string, sources: string[]) {
  if (vfs[target]) return;
  const source = sources.find((candidate) => vfs[candidate]);
  if (source) {
    vfs[target] = vfs[source];
  }
}

/**
 * Configura as fontes Roboto no contexto do pdfmake.
 *
 * Estratégia:
 * 1. Merge do VFS bundulado com o VFS já configurado no pdfmake.
 * 2. Cria aliases para variantes que faltam (Regular←Medium←Bold, etc.).
 * 3. Se NENHUMA fonte Roboto existir, lança erro.
 * 4. Registra o mapeamento `pdfMake.fonts.Roboto = { normal, bold, italics, bolditalics }`.
 */
export function configurePdfMakeFonts(pdfMake: any, pdfFontsModule: any): void {
  const bundledVfs = extractVfs(pdfFontsModule);
  const mergedVfs = {
    ...(pdfMake.vfs || {}),
    ...(bundledVfs || {}),
  };

  const hasRegular = Boolean(mergedVfs["Roboto-Regular.ttf"]);
  const hasMedium = Boolean(mergedVfs["Roboto-Medium.ttf"]);
  const hasBold = Boolean(mergedVfs["Roboto-Bold.ttf"]);
  const hasItalic = Boolean(mergedVfs["Roboto-Italic.ttf"]);
  const hasMediumItalic = Boolean(mergedVfs["Roboto-MediumItalic.ttf"]);
  const hasBoldItalic = Boolean(mergedVfs["Roboto-BoldItalic.ttf"]);

  aliasFont(mergedVfs, "Roboto-Regular.ttf", ["Roboto-Regular.ttf", "Roboto-Medium.ttf", "Roboto-Bold.ttf"]);
  aliasFont(mergedVfs, "Roboto-Medium.ttf", ["Roboto-Medium.ttf", "Roboto-Bold.ttf", "Roboto-Regular.ttf"]);
  aliasFont(mergedVfs, "Roboto-Italic.ttf", ["Roboto-Italic.ttf", "Roboto-Regular.ttf"]);
  aliasFont(mergedVfs, "Roboto-MediumItalic.ttf", [
    "Roboto-MediumItalic.ttf",
    "Roboto-BoldItalic.ttf",
    "Roboto-Italic.ttf",
    "Roboto-Regular.ttf",
  ]);

  if (!hasRegular && !hasMedium && !hasBold && !mergedVfs["Roboto-Regular.ttf"]) {
    throw new Error("Nenhuma fonte Roboto foi carregada no VFS do pdfmake.");
  }

  const regularFile = mergedVfs["Roboto-Regular.ttf"] ? "Roboto-Regular.ttf" : hasMedium ? "Roboto-Medium.ttf" : "Roboto-Bold.ttf";
  const boldFile = hasMedium ? "Roboto-Medium.ttf" : hasBold ? "Roboto-Bold.ttf" : regularFile;
  const italicFile = hasItalic ? "Roboto-Italic.ttf" : regularFile;
  const boldItalicFile = hasMediumItalic
    ? "Roboto-MediumItalic.ttf"
    : hasBoldItalic
      ? "Roboto-BoldItalic.ttf"
      : italicFile;

  pdfMake.vfs = mergedVfs;
  pdfMake.fonts = {
    ...(pdfMake.fonts || {}),
    Roboto: {
      normal: regularFile,
      bold: boldFile,
      italics: italicFile,
      bolditalics: boldItalicFile,
    },
  };
}
