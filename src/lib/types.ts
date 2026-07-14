/**
 * Tipos compartilhados do DocFacil.
 * Usados por services, views, e o gerador de PDF.
 */

export type Categoria = "Locação" | "Família" | "Comercial" | "Pessoal";

export type TipoCampo = "text" | "textarea" | "date" | "number";

export interface CampoModelo {
  /** chave usada no template {{key}} */
  key: string;
  pergunta: string;
  placeholder?: string;
  microcopy?: string;
  tipo?: TipoCampo;
  /** se true, campo obrigatório (default true) */
  obrigatorio?: boolean;
}

export interface TemplateModelo {
  titulo: string;
  corpo: string[];
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
 * Etapa do fluxo /criar. Cada etapa é um dos três tipos:
 *  - "campo"       = uma única pergunta (1 CampoModelo)
 *  - "campo_grupo" = vários campos relacionados em um único card
 *                    (ex.: endereço com CEP → logradouro → bairro → cidade → UF)
 *  - "clausulas"   = lista de cláusulas dinâmicas opcionais
 */
export type EtapaModelo =
  | { tipo: "campo"; campo: CampoModelo }
  | { tipo: "campo_grupo"; tituloGrupo?: string; campos: CampoModelo[] }
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
