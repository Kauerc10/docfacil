/**
 * Constantes centralizadas do DocFacil.
 */
export const STORAGE_KEYS = {
  DEMO_USER: "docfacil:demo-user",
  DEMO_DOCUMENTS: "docfacil:demo-documents",
  DEMO_CONSENTS: "docfacil:consents",
  DEMO_ORDERS: "docfacil:orders",
  COOKIE_PREFS: "docfacil:cookie-prefs",
} as const;

export const FIRESTORE_COLLECTIONS = {
  USERS: "users", MODELS: "models", DOCUMENTS: "documents",
  CONSENTS: "consents", PAYMENTS: "payments",
} as const;

export const UX_CONFIG = {
  TYPING_SPEED: 22,
  INPUT_FOCUS_DELAY: 400,
  PET_HAPPY_DURATION: 600,
  PET_SPEAK_DURATION: 1500,
  PROGRESS_PULSE_DURATION: 1200,
  SERVICE_TIMEOUT: 10000,
} as const;

export const ERROR_MESSAGES = {
  LOAD_FAILED: "Não foi possível carregar. Tente novamente.",
  SAVE_FAILED: "Não foi possível salvar. Tente novamente.",
  NETWORK_ERROR: "Sem conexão. Verifique sua internet.",
  PDF_FAILED: "Não foi possível gerar o PDF. Tente novamente.",
  AUTH_FAILED: "Falha na autenticação. Tente novamente.",
  NOT_FOUND: "Não encontramos o que você procura.",
} as const;

export const SUCCESS_MESSAGES = {
  DOCUMENT_CREATED: "Documento criado!",
  PDF_GENERATED: "PDF gerado!",
  SAVED: "Salvo com sucesso!",
  CONSENT_RECORDED: "Concordância registrada",
} as const;

export const EXTERNAL_LINKS = {
  WHATSAPP_API: "https://wa.me",
  GOOGLE_FONTS: "https://fonts.google.com",
} as const;
