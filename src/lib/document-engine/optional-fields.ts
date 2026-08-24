/**
 * Computa a lista de chaves de campos opcionais de um modelo.
 *
 * Centralizado aqui (single source of truth) para evitar duplicação entre:
 *  - `lib/pdf/generator.ts` (geração de PDF)
 *  - `components/docfacil/views/documento-detalhe-view.tsx` (prévia do salvo)
 *  - qualquer outro renderer que precise saber quais campos são opcionais.
 *
 * Inclui:
 *  - Campos com `obrigatorio === false`
 *  - Campos individuais de endereço (cepKey, logradouroKey, etc.)
 *  - Separadores de RG (`<prefix>_rg_separador`)
 *  - Extras de cláusulas NÃO selecionadas (devem virar "" no template)
 */
import { campoEstaVisivel, type Modelo } from "@/lib/types";

export function computeCamposOpcionais(
  modelo: Modelo,
  clausulasSelecionadas: string[] = [],
  respostas: Record<string, string> = {}
): string[] {
  const out: string[] = [];
  if (!modelo.etapas) return out;
  for (const etapa of modelo.etapas) {
    if (etapa.tipo === "campo_grupo") {
      for (const c of etapa.campos) {
        if (c.obrigatorio === false || !campoEstaVisivel(c, respostas)) out.push(c.key);
        if (c.key === "rg" || c.key.endsWith("_rg")) {
          const prefix = c.key === "rg" ? "" : c.key.slice(0, -3);
          out.push(prefix ? `${prefix}_rg_separador` : "rg_separador");
        }
      }
      if (etapa.endereco) {
        const e = etapa.endereco;
        out.push(e.cepKey, e.logradouroKey, e.numeroKey, e.bairroKey, e.cidadeKey, e.ufKey);
        if (e.complementoKey) out.push(e.complementoKey);
      }
    } else if (
      etapa.tipo === "campo" &&
      (etapa.campo.obrigatorio === false || !campoEstaVisivel(etapa.campo, respostas))
    ) {
      out.push(etapa.campo.key);
    } else if (etapa.tipo === "clausulas") {
      for (const cl of etapa.clausulas) {
        // Quando chamado sem clausulasSelecionadas (ex.: detalhe-view não
        // sabe a priori), marca TODOS os extras como opcionais — o motor
        // já filtra cláusulas não selecionadas (corpo inteiro vira "").
        // Com clausulasSelecionadas (ex.: generator), só marca extras de
        // cláusulas NÃO selecionadas.
        const selecionada = clausulasSelecionadas.includes(cl.id);
        const deveMarcar = clausulasSelecionadas.length === 0 || !selecionada;
        if (deveMarcar && cl.camposExtras) {
          for (const ex of cl.camposExtras) out.push(ex.key);
        }
      }
    }
  }
  return out;
}
