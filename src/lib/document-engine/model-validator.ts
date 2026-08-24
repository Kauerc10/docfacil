import type { Modelo } from "../types";

export interface ModelValidationError {
  code:
    | "UNREGISTERED_VARIABLE"
    | "MISSING_CLAUSE"
    | "DUPLICATE_KEY"
    | "DUPLICATE_CLAUSE_ID"
    | "EMPTY_TEMPLATE";
  message: string;
  field?: string;
  clauseId?: string;
  modelSlug: string;
}

const KNOWN_HELPERS = new Set([
  "valor_extenso",
  "sem_garantia",
  "data de assinatura",
]);

/**
 * Validador estático de integridade de modelos (CI Gate).
 * Garante que nenhum modelo tenha tags órfãs, cláusulas não cadastradas ou chaves duplicadas.
 */
export function validateModel(modelo: Modelo): ModelValidationError[] {
  const errors: ModelValidationError[] = [];
  const slug = modelo.slug || "unknown";

  if (
    !modelo.template ||
    !Array.isArray(modelo.template.corpo) ||
    modelo.template.corpo.length === 0
  ) {
    errors.push({
      code: "EMPTY_TEMPLATE",
      message: `O modelo '${slug}' não possui template ou corpo de template definido.`,
      modelSlug: slug,
    });
    return errors;
  }

  const declaredKeys = new Set<string>();
  const clauseIds = new Set<string>();
  const clauseBodies: string[] = [];
  const renderPlaceholders = new Set(
    modelo.template.placeholdersDeRenderizacao ?? []
  );
  const renderClauseIds = new Set(
    modelo.template.clausulasDeRenderizacao ?? []
  );

  for (const campo of modelo.campos || []) {
    if (declaredKeys.has(campo.key)) {
      errors.push({
        code: "DUPLICATE_KEY",
        message: `Chave de campo duplicada '${campo.key}' no modelo '${slug}'.`,
        field: campo.key,
        modelSlug: slug,
      });
    }
    declaredKeys.add(campo.key);
    if (campo.key.endsWith("_rg") || campo.key === "rg") {
      declaredKeys.add(`${campo.key}_separador`);
    }
  }

  for (const etapa of modelo.etapas || []) {
    if (etapa.tipo === "campo") {
      declaredKeys.add(etapa.campo.key);
      if (etapa.campo.key.endsWith("_rg") || etapa.campo.key === "rg") {
        declaredKeys.add(`${etapa.campo.key}_separador`);
      }
    } else if (etapa.tipo === "campo_grupo") {
      if (etapa.endereco?.saidaKey) {
        declaredKeys.add(etapa.endereco.saidaKey);
      }
      for (const c of etapa.campos) {
        declaredKeys.add(c.key);
        if (c.key.endsWith("_rg") || c.key === "rg") {
          declaredKeys.add(`${c.key}_separador`);
        }
      }
    } else if (etapa.tipo === "clausulas") {
      for (const cl of etapa.clausulas) {
        if (clauseIds.has(cl.id)) {
          errors.push({
            code: "DUPLICATE_CLAUSE_ID",
            message: `ID de cláusula duplicado '${cl.id}' no modelo '${slug}'.`,
            clauseId: cl.id,
            modelSlug: slug,
          });
        }
        clauseIds.add(cl.id);
        clauseBodies.push(cl.corpo);
        for (const extra of cl.camposExtras || []) {
          declaredKeys.add(extra.key);
          if (extra.key.endsWith("_rg") || extra.key === "rg") {
            declaredKeys.add(`${extra.key}_separador`);
          }
        }
      }
    }
  }

  // O CI precisa validar tanto o esqueleto principal quanto o texto que só
  // entra quando uma cláusula é selecionada. Caso contrário, um typo dentro
  // de `clausula.corpo` só apareceria no PDF em runtime.
  const allLines = [
    modelo.template.titulo,
    ...modelo.template.corpo,
    ...clauseBodies,
  ];

  for (const line of allLines) {
    const clauseMatches = line.matchAll(
      /\{\{\s*clausula:([a-zA-Z0-9_-]+)\s*\}\}/g
    );
    for (const match of clauseMatches) {
      const cid = match[1];
      if (!clauseIds.has(cid) && !renderClauseIds.has(cid)) {
        errors.push({
          code: "MISSING_CLAUSE",
          message: `A tag '{{clausula:${cid}}}' no template de '${slug}' não possui cláusula correspondente definida nas etapas.`,
          clauseId: cid,
          modelSlug: slug,
        });
      }
    }

    const varMatches = line.matchAll(/\{\{\s*([^}:][^}]*?)\s*\}\}/g);
    for (const match of varMatches) {
      const rawKey = match[1].trim();
      if (rawKey.startsWith("clausula:")) continue;
      if (KNOWN_HELPERS.has(rawKey)) continue;

      if (!declaredKeys.has(rawKey) && !renderPlaceholders.has(rawKey)) {
        errors.push({
          code: "UNREGISTERED_VARIABLE",
          message: `A tag '{{${rawKey}}}' no template de '${slug}' não foi cadastrada nos campos ou etapas do modelo.`,
          field: rawKey,
          modelSlug: slug,
        });
      }
    }
  }

  return errors;
}

/**
 * Valida todos os modelos de uma lista e retorna array com todos os erros encontrados.
 */
export function validateAllModels(modelos: Modelo[]): ModelValidationError[] {
  const errors: ModelValidationError[] = [];
  const slugs = new Set<string>();

  for (const modelo of modelos) {
    if (slugs.has(modelo.slug)) {
      errors.push({
        code: "DUPLICATE_KEY",
        message: `Slug de modelo duplicado: '${modelo.slug}'.`,
        field: modelo.slug,
        modelSlug: modelo.slug,
      });
    }
    slugs.add(modelo.slug);

    const modelErrors = validateModel(modelo);
    errors.push(...modelErrors);
  }

  return errors;
}
