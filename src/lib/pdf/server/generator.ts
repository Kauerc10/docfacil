import "server-only";
import path from "path";
import fs from "fs";
import type { Modelo } from "../../types";
import type { GerarPDFOptions } from "../types";
import { buildDocDefinition } from "../styles";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require("pdfmake");

function resolveFontPath(fontFilename: string): string {
  const candidates = [
    path.join(process.cwd(), "node_modules", "pdfmake", "fonts", "Roboto", fontFilename),
    path.resolve(__dirname, "..", "..", "..", "..", "node_modules", "pdfmake", "fonts", "Roboto", fontFilename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    const pdfmakeRoot = path.dirname(require.resolve("pdfmake/package.json"));
    const resolved = path.join(pdfmakeRoot, "fonts", "Roboto", fontFilename);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  } catch {
    // Fallback to default
  }

  return candidates[0];
}

let configured = false;

function ensureServerFonts(): void {
  if (!configured) {
    if (typeof pdfmake.setUrlAccessPolicy === "function") {
      pdfmake.setUrlAccessPolicy(() => false);
    }
    if (typeof pdfmake.setLocalAccessPolicy === "function") {
      pdfmake.setLocalAccessPolicy(() => true);
    }
    pdfmake.fonts = {
      Roboto: {
        normal: resolveFontPath("Roboto-Regular.ttf"),
        bold: resolveFontPath("Roboto-Medium.ttf"),
        italics: resolveFontPath("Roboto-Italic.ttf"),
        bolditalics: resolveFontPath("Roboto-MediumItalic.ttf"),
      },
    };
    configured = true;
  }
}

export async function generatePdfServer(
  modelo: Modelo,
  respostas: Record<string, string>,
  options?: GerarPDFOptions
): Promise<Buffer> {
  ensureServerFonts();
  const docDefinition = buildDocDefinition(modelo, respostas, options || {});
  const pdfDoc = pdfmake.createPdf(docDefinition);
  return await pdfDoc.getBuffer();
}
