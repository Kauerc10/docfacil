"use client";

import { LegalLayout } from "./legal-layout";
import { COMPANY } from "@/lib/company";
import { COOKIE_PREFS_KEY } from "@/lib/services/consent-service";

/**
 * CookiesView — Política de Cookies.
 * Versão 1.0.
 *
 * 6 seções: o que são, tipos (essenciais, funcionais, analíticos,
 * marketing), terceiros, gestão de preferências (botão "Reabrir
 * preferências" que limpa o localStorage e recarrega a página),
 * links para navegadores, atualizações.
 *
 * A chave localStorage é a mesma do consent-service (STORAGE_KEYS.COOKIE_PREFS
 * == "docfacil:cookie-prefs"), então o banner reaparece após o clique.
 */
export function CookiesView() {
  function reopenPreferences() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(COOKIE_PREFS_KEY);
    } catch {
      /* ignore */
    }
    window.location.reload();
  }

  return (
    <LegalLayout
      title="Política de Cookies"
      subtitle="Como e por que usamos cookies. Você escolhe o que aceitar."
      lastUpdated="13 de julho de 2026"
      version="1.0"
    >
      <p>
        Esta Política explica o que são cookies, quais tipos usamos no{" "}
        {COMPANY.productName} e como você pode controlá-los. Ao continuar
        navegando após o banner, você concorda com a utilização descrita
        aqui — exceto pelos cookies opcionais, que dependem da sua escolha
        expressa.
      </p>

      <h2>1. O que são cookies</h2>
      <p>
        Cookies são pequenos arquivos de texto armazenados no seu
        navegador quando você visita um site. Eles permitem que o site
        &quot;lembre&quot; suas ações e preferências ao longo do tempo, sem
        precisar pedir a mesma informação toda hora. Cookies não são
        programas e não podem executar código malicioso no seu dispositivo.
      </p>

      <h2>2. Tipos de cookies que usamos</h2>
      <p>
        Classificamos os cookies em quatro categorias. Apenas as{" "}
        <strong>essenciais</strong> são obrigatórias; as demais dependem
        do seu consentimento.
      </p>
      <ul>
        <li>
          <strong>Essenciais (sempre ativos):</strong> mantêm você
          autenticado, preservam itens no carrinho e permitem que a
          plataforma funcione. Sem eles, o {COMPANY.productName} não
          consegue abrir uma sessão ou gerar um documento.
        </li>
        <li>
          <strong>Funcionais:</strong> lembram preferências como idioma e
          tema, oferecendo uma experiência mais personalizada.
        </li>
        <li>
          <strong>Analíticos:</strong> coletam métricas agregadas
          (páginas mais visitadas, tempo na tela, taxa de saída) para
          melhorarmos o produto. Nenhum dado identifica você
          individualmente.
        </li>
        <li>
          <strong>Marketing:</strong> usados para mostrar anúncios
          relevantes em outros sites e medir a performance de campanhas.
          Ativam somente com o seu aceite explícito.
        </li>
      </ul>

      <h2>3. Cookies de terceiros</h2>
      <p>
        Alguns cookies são definidos por serviços de terceiros que usamos:
      </p>
      <ul>
        <li>
          <strong>Google Analytics / Firebase Analytics</strong>{" "}
          (analíticos): métricas de uso agregadas.
        </li>
        <li>
          <strong>Google Firebase Auth</strong> (essencial): mantém sua
          sessão de login.
        </li>
        <li>
          <strong>Gateways de pagamento</strong> (essencial durante o
          checkout): segurança da transação.
        </li>
        <li>
          <strong>Meta / Google Ads</strong> (marketing, opcional):
          mensuração de campanhas.
        </li>
      </ul>
      <p>
        Cada terceiro trata os dados conforme sua própria política. Sempre
        que possível, usamos versões &quot;consent mode&quot; que respeitam
        a sua escolha no banner.
      </p>

      <h2>4. Gestão de preferências</h2>
      <p>
        Você definiu suas preferências ao ver o banner de cookies pela
        primeira vez. Para revisar ou alterar a qualquer momento, clique
        no botão abaixo — ele limpa a escolha salva e recarrega a página
        para o banner reaparecer.
      </p>
      <p>
        <button
          type="button"
          onClick={reopenPreferences}
          className="inline-flex items-center justify-center rounded-xl bg-[var(--blue-royal)] px-5 py-3 text-sm font-semibold text-white hover:bg-[var(--navy)] transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--blue-soft)]"
        >
          Reabrir preferências
        </button>
      </p>
      <p className="text-sm">
        (Isso remove a chave <code>docfacil:cookie-prefs</code> do
        armazenamento local e recarrega a página.)
      </p>

      <h2>5. Configurações no navegador</h2>
      <p>
        Além do nosso banner, você pode bloquear ou apagar cookies
        diretamente no navegador. Veja como nos navegadores mais usados:
      </p>
      <ul>
        <li>
          <a
            href="https://support.google.com/chrome/answer/95647"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Chrome
          </a>
        </li>
        <li>
          <a
            href="https://support.mozilla.org/pt-BR/kb/ative-e-desative-os-cookies-que-os-sites-usam"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mozilla Firefox
          </a>
        </li>
        <li>
          <a
            href="https://support.apple.com/pt-br/guide/safari/sfri11471/mac"
            target="_blank"
            rel="noopener noreferrer"
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href="https://support.microsoft.com/pt-br/microsoft-edge/excluir-cookies-no-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
            target="_blank"
            rel="noopener noreferrer"
          >
            Microsoft Edge
          </a>
        </li>
      </ul>
      <p>
        Bloquear cookies essenciais pode quebrar funcionalidades do{" "}
        {COMPANY.productName} (login, geração de PDF, checkout).
      </p>

      <h2>6. Atualizações desta Política</h2>
      <p>
        Esta Política pode ser atualizada para refletir mudanças nos
        serviços que usamos ou em exigências legais. Alterações relevantes
        serão comunicadas por banner na plataforma ou por e-mail, com a
        data no cabeçalho indicando a versão vigente.
      </p>
      <p>
        Em caso de dúvida, escreva para{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </LegalLayout>
  );
}
