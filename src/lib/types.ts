/**
 * Tipos compartilhados do DocFacil.
 * Usados por services, views, e o gerador de PDF.
 */

export type Categoria = "Locação" | "Família" | "Comercial" | "Pessoal";

export type TipoCampo = "text" | "textarea" | "date" | "number" | "select" | "lista_pessoas";

/** Regra declarativa para exibir um campo conforme outra resposta. */
export interface VisibilidadeCondicionalCampo {
  campo: string;
  igualA: string | string[];
}

export interface ListaPessoasConfig {
  /** Rótulo singular usado na interface, como "morador" ou "dependente". */
  itemLabel: string;
  /** Limite para preservar uma tela simples e um contrato legível. */
  maxItens: number;
}

export interface CampoModelo {
  /** chave usada no template {{key}} */
  key: string;
  pergunta: string;
  placeholder?: string;
  microcopy?: string;
  tipo?: TipoCampo;
  /** quando tipo === "select", opções disponíveis no dropdown */
  opcoes?: string[];
  /** Configuração do campo repetível de pessoas. */
  listaPessoas?: ListaPessoasConfig;
  /** se true, campo obrigatório (default true) */
  obrigatorio?: boolean;
  /** Condição declarativa para exibir o campo no fluxo de preenchimento. */
  visivelQuando?: VisibilidadeCondicionalCampo;
}

/** Avalia a visibilidade declarada sem conhecer modelo, slug ou regra jurídica. */
export function campoEstaVisivel(
  campo: CampoModelo,
  respostas: Record<string, string>
): boolean {
  const condicao = campo.visivelQuando;
  if (!condicao) return true;

  const esperados = Array.isArray(condicao.igualA)
    ? condicao.igualA
    : [condicao.igualA];
  return esperados.includes(respostas[condicao.campo] ?? "");
}

export interface TemplateModelo {
  titulo: string;
  corpo: string[];
  /**
   * Placeholders preenchidos por regras declaradas de renderização, sem
   * expor uma pergunta adicional no fluxo de criação.
   */
  placeholdersDeRenderizacao?: string[];
  /**
   * Pontos de inserção de cláusulas resolvidos por regras de renderização,
   * sem criar uma cláusula selecionável na interface.
   */
  clausulasDeRenderizacao?: string[];
}

/**
 * Cláusula dinâmica opcional (parágrafo inserido no template quando selecionada).
 * O template usa `{{clausula:id}}` para marcar o ponto de inserção.
 */
export interface ClausulaDinamica {
  /** id único — usado em `{{clausula:id}}` no template */
  id: string;
  titulo: string;
  descricao: string;
  /** corpo injetado no documento quando a cláusula é selecionada */
  corpo: string;
  /** campos extras mostrados quando a cláusula é selecionada */
  camposExtras?: CampoModelo[];
}

/** Tipos de etapa do fluxo /criar. */
export type TipoEtapa = "campo" | "campo_grupo" | "clausulas";

/**
 * Configuração de endereço para um `campo_grupo` — habilita:
 *  - Auto-preenchimento via ViaCEP quando o usuário digita o CEP
 *  - Normalização automática do logradouro (strip/normalização de "Rua"/"Avenida"/"Av." etc.)
 *  - Composição da string final que vai para o template (saidaKey)
 *
 * A string composta tem o formato:
 *   "<logradouro>, <numero> [<complemento>] - <bairro>, <cidade>/<uf>, CEP <cep>"
 * e é atribuída à chave `saidaKey` (ex.: "endereco" ou "imovel") no mapa de
 * respostas enviado ao template. Os campos individuais continuam no mapa
 * para referência, mas o template só consome `saidaKey`.
 */
export interface EnderecoConfig {
  /** chave do campo de CEP (ex.: "cep") */
  cepKey: string;
  /** chave do campo de logradouro/rua (ex.: "rua") */
  logradouroKey: string;
  /** chave do campo de número (ex.: "numero") */
  numeroKey: string;
  /** chave do campo de complemento (opcional, ex.: "complemento") */
  complementoKey?: string;
  /** chave do campo de bairro (ex.: "bairro") */
  bairroKey: string;
  /** chave do campo de cidade (ex.: "cidade") */
  cidadeKey: string;
  /** chave do campo de UF/estado (ex.: "uf") */
  ufKey: string;
  /** chave do campo "virtual" no template que recebe a string composta final */
  saidaKey: string;
}

/**
 * Etapa do fluxo /criar. Cada etapa é um dos três tipos:
 *  - "campo"       = uma única pergunta (1 CampoModelo)
 *  - "campo_grupo" = vários campos relacionados em um único card
 *                    (ex.: endereço com CEP → logradouro → bairro → cidade → UF)
 *                    Quando `endereco` está presente, o grupo ganha auto-fill
 *                    ViaCEP + normalização de logradouro + composição automática.
 *  - "clausulas"   = lista de cláusulas dinâmicas opcionais
 */
export type EtapaModelo =
  | { tipo: "campo"; campo: CampoModelo }
  | { tipo: "campo_grupo"; tituloGrupo?: string; campos: CampoModelo[]; endereco?: EnderecoConfig }
  | { tipo: "clausulas"; titulo?: string; clausulas: ClausulaDinamica[] };

export interface Modelo {
  slug: string;
  nome: string;
  desc: string;
  quandoUsar: string;
  categoria: Categoria;
  minutos: number;
  popular?: boolean;
  icone: "key" | "home" | "handshake" | "family" | "receipt" | "seal";
  /** Etapas do fluxo /criar (source of truth). Quando ausente, o fluxo cai
   *  back para `campos` (1 etapa por campo). */
  etapas?: EtapaModelo[];
  /** Campos derivados das etapas (ou definidos diretamente quando `etapas`
   *  está ausente). */
  campos: CampoModelo[];
  template: TemplateModelo;
  /** timestamps do Firestore (quando vindo do backend) */
  criadoEm?: number;
  atualizadoEm?: number;
}

/** Documento preenchido por um usuário */
export type StatusDocumento = "rascunho" | "concluido";

export interface Documento {
  id: string;
  /** slug do modelo usado */
  modeloSlug: string;
  modeloNome: string;
  /** respostas do usuário (key → valor) */
  respostas: Record<string, string>;
  status: StatusDocumento;
  /** id do usuário dono (uid do Firebase Auth) */
  userId: string;
  criadoEm: number;
  atualizadoEm: number;
}

/** Perfil do usuário no Firestore */
export interface PerfilUsuario {
  uid: string;
  nome: string;
  email: string;
  fotoUrl?: string;
  telefone?: string;
  plano: "gratis" | "avulso" | "pro";
  /** timestamps */
  criadoEm: number;
  atualizadoEm: number;
}

/** Usuário exposto pelo AuthContext */
export interface AppUser {
  uid: string;
  nome: string;
  email: string;
  fotoUrl?: string;
  plano: "gratis" | "avulso" | "pro";
}

export interface Pagamento {
  id: string;
  data: number;
  valor: number;
  plano: "avulso" | "pro";
  status: "pago" | "estornado";
  metodo: "pix" | "cartao";
}
