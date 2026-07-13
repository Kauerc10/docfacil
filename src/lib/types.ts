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

export interface Modelo {
  slug: string;
  nome: string;
  desc: string;
  quandoUsar: string;
  categoria: Categoria;
  minutos: number;
  popular?: boolean;
  icone: "key" | "home" | "handshake" | "family" | "receipt" | "seal";
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
