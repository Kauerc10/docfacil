/**
 * Composição de campos — junta campos separados (CEP, rua, número, etc.) em
 * strings únicas que o template consome via `{{key}}`.
 *
 * Centralizado aqui para que PreviewA4, DetalhePreview, gerador de PDF e
 * qualquer outro renderer usem o MESMO formato de saída. Mudou o formato?
 * Muda aqui, todos os renderers acompanham.
 */
import { normalizarEstado } from "../normalizers";
import type { EnderecoConfig, Modelo } from "../types";

/**
 * Compõe a string final de endereço a partir dos campos separados.
 * Formato: "<logradouro>, <numero> [<complemento>] - <bairro>, <cidade>/<uf>, CEP <cep>"
 * Campos vazios são omitidos graciosamente.
 */
export function composeEndereco(
  answers: Record<string, string>,
  config: EnderecoConfig
): string {
  const logradouro = (answers[config.logradouroKey] ?? "").trim();
  const numero = (answers[config.numeroKey] ?? "").trim();
  const complemento = config.complementoKey
    ? (answers[config.complementoKey] ?? "").trim()
    : "";
  const bairro = (answers[config.bairroKey] ?? "").trim();
  const cidade = (answers[config.cidadeKey] ?? "").trim();
  const uf = normalizarEstado(answers[config.ufKey] ?? "").trim();
  const cep = (answers[config.cepKey] ?? "").trim();

  const partes: string[] = [];

  // "Rua das Flores, 123" ou "Rua das Flores, 123, Apto 45"
  if (logradouro) {
    let ini = logradouro;
    if (numero) ini += `, ${numero}`;
    if (complemento) ini += `, ${complemento}`;
    partes.push(ini);
  }

  // "Centro"
  if (bairro) partes.push(bairro);

  // "São Paulo/SP"
  if (cidade && uf) partes.push(`${cidade}/${uf}`);
  else if (cidade) partes.push(cidade);
  else if (uf) partes.push(uf);

  // "CEP 01234-567"
  if (cep) partes.push(`CEP ${cep}`);

  return partes.join(" - ");
}

/**
 * Recebe o mapa de respostas brutas + modelo e devolve um NOVO mapa com as
 * strings de endereço compostas a partir das configurações encontradas nas
 * etapas (campo_grupo com `endereco` configurado).
 *
 * Também compõe separadores para campos opcionais como RG: quando uma parte
 * tem `locador_rg` (opcional), gera `locador_rg_separador` = ", RG <valor>"
 * ou "" — útil para templates inline como:
 *   "portador(a) do CPF {{locador_cpf}}{{locador_rg_separador}}"
 *
 * Aplica composição de TODAS as etapas com `endereco` — funciona para modelos
 * com múltiplas partes (locador, locatário, etc.) e múltiplos endereços
 * (residência, imóvel, etc.).
 *
 * A composição é idempotente: pode ser chamada em respostas já compostas
 * (sobrescreve a `saidaKey` com base nos campos individuais atuais).
 */
export function aplicarComposicaoModelo(
  answers: Record<string, string>,
  modelo: Modelo
): Record<string, string> {
  const next: Record<string, string> = { ...answers };
  if (!modelo.etapas) return next;
  for (const etapa of modelo.etapas) {
    if (etapa.tipo === "campo_grupo") {
      // composição de endereço (quando configurado)
      if (etapa.endereco) {
        next[etapa.endereco.saidaKey] = composeEndereco(next, etapa.endereco);
        // Normaliza o campo UF individual in-place para que
        // {{prefix_uf}} no template (ex.: foro) tenha o valor canonico (SP, RJ, ...)
        const ufRaw = next[etapa.endereco.ufKey] ?? "";
        const ufNorm = normalizarEstado(ufRaw);
        if (ufNorm !== ufRaw) next[etapa.endereco.ufKey] = ufNorm;
      }
      // composição de separadores para campos opcionais comuns (RG)
      // Detecta chaves que terminam em "_rg" ou são exatamente "rg"
      for (const c of etapa.campos) {
        const isRgField = c.key === "rg" || c.key.endsWith("_rg");
        if (isRgField) {
          const prefix = c.key === "rg" ? "" : c.key.slice(0, -3); // remove "_rg"
          const sepKey = prefix ? `${prefix}_rg_separador` : "rg_separador";
          next[sepKey] = composeOptionalField(next[c.key] ?? "", ", portador(a) do RG nº");
        }
      }
    }
  }
  return next;
}

/**
 * Compõe um campo opcional com prefixo: retorna "" se vazio, ou "<prefixo> <valor>" se preenchido.
 * Útil para templates inline onde o campo opcional precisa de separador quando presente.
 *
 * Ex.: composeOptionalField("12.345.678-9", ", portador(a) do RG nº") → ", portador(a) do RG nº 12.345.678-9"
 *      composeOptionalField("", ", portador(a) do RG nº") → ""
 */
export function composeOptionalField(
  valor: string,
  prefixo: string
): string {
  const trim = valor.trim();
  return trim ? `${prefixo} ${trim}` : "";
}

/**
 * Helper genérico para modelos sem `etapas` (ex.: modelos mock em testes).
 * Não faz nada se não houver etapas.
 */
export function aplicarComposicaoEndereco<T extends { etapas?: unknown }>(
  answers: Record<string, string>,
  modelo: T
): Record<string, string> {
  const etapas = (modelo as { etapas?: Array<{ tipo: string; endereco?: EnderecoConfig }> }).etapas;
  if (!etapas) return { ...answers };
  const next: Record<string, string> = { ...answers };
  for (const etapa of etapas) {
    if (etapa.tipo === "campo_grupo" && etapa.endereco) {
      next[etapa.endereco.saidaKey] = composeEndereco(next, etapa.endereco);
    }
  }
  return next;
}

// ============================================================================
// Cláusulas dinâmicas — encode/decode no mapa de respostas
// ============================================================================
//
// As cláusulas selecionadas pelo usuário são persistidas DENTRO do mapa de
// respostas (sem mudar o schema do Documento) usando a convenção:
//
//   `__clausula_${id}` = "true"
//
// Isso é backward-compatible: documentos antigos sem cláusulas simplesmente
// não têm essas chaves. A extração devolve array vazio.

/**
 * Prefixo usado para identificar cláusulas selecionadas no mapa de respostas.
 */
export const CLAUSULA_KEY_PREFIX = "__clausula_";

/**
 * Extrai a lista de IDs de cláusulas selecionadas a partir do mapa de
 * respostas salvo.
 */
export function extractClausulasSelecionadas(
  respostas: Record<string, string>
): string[] {
  return Object.keys(respostas)
    .filter((k) => k.startsWith(CLAUSULA_KEY_PREFIX) && respostas[k] === "true")
    .map((k) => k.slice(CLAUSULA_KEY_PREFIX.length));
}

/**
 * Codifica uma lista de IDs de cláusulas selecionadas como entradas no mapa
 * de respostas (para persistência).
 */
export function encodeClausulasSelecionadas(
  ids: string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const id of ids) {
    out[`${CLAUSULA_KEY_PREFIX}${id}`] = "true";
  }
  return out;
}
