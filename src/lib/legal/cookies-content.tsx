import { COMPANY } from "@/lib/company";
import { ReopenPrefsButton } from "./reopen-prefs-button";

/**
 * CookiesContent — conteúdo da Política de Cookies.
 *
 * 6 seções: o que são, tipos (essenciais, analíticos e marketing), terceiros,
 * gestão de preferências, configurações do navegador e atualizações.
 */
export function CookiesContent() {
  return (
    <>
      <p>
        Esta Política explica o que são cookies e tecnologias semelhantes,
        quais tipos usamos no {COMPANY.productName} e como você pode
        controlá-los. Cookies opcionais, como os analíticos e de marketing,
        permanecem desativados até que você faça uma escolha expressa no
        banner. Continuar navegando, por si só, não ativa essas categorias.
      </p>

      <h2>1. O que são cookies</h2>
      <p>
        Cookies são pequenos arquivos de texto armazenados no seu navegador
        quando você visita um site. Tecnologias de armazenamento local também
        podem ser usadas para manter preferências e informações necessárias ao
        funcionamento da aplicação. Cookies não são programas e não podem
        executar código malicioso no seu dispositivo.
      </p>

      <h2>2. Tipos que usamos</h2>
      <p>
        O banner do {COMPANY.productName} trabalha com três categorias. Apenas
        as <strong>essenciais</strong> ficam sempre ativas; analíticos e
        marketing dependem da sua escolha.
      </p>
      <ul>
        <li>
          <strong>Essenciais (sempre ativos):</strong> recursos necessários
          para autenticação, sessão, segurança e funcionalidades básicas da
          plataforma.
        </li>
        <li>
          <strong>Analíticos:</strong> métricas de uso e desempenho que ajudam
          a entender como o produto é utilizado. Só são ativados quando você
          autoriza essa categoria.
        </li>
        <li>
          <strong>Marketing:</strong> tecnologias usadas para mensuração de
          campanhas e publicidade. Só são ativadas com seu aceite explícito.
        </li>
      </ul>

      <h2>3. Serviços de terceiros</h2>
      <p>
        Dependendo da configuração vigente da plataforma, podemos utilizar
        serviços de terceiros para finalidades específicas:
      </p>
      <ul>
        <li>
          <strong>Google Firebase Auth</strong> (essencial): autenticação e
          manutenção da sessão da conta.
        </li>
        <li>
          <strong>Google Analytics 4</strong> (analítico, quando configurado):
          métricas de uso da plataforma, ativadas somente após autorização.
        </li>
        <li>
          <strong>Meta Pixel</strong> (marketing, quando configurado):
          mensuração de campanhas, ativada somente após autorização.
        </li>
      </ul>
      <p>
        Cada terceiro trata os dados conforme sua própria política. O
        {COMPANY.productName} não carrega os scripts opcionais de analytics ou
        marketing antes da escolha correspondente no banner.
      </p>

      <h2>4. Gestão de preferências</h2>
      <p>
        Você define suas preferências no banner. A escolha fica salva neste
        navegador e vinculada à versão vigente desta Política. Se a versão
        mudar, pediremos uma nova decisão. Para revisar ou alterar sua escolha
        a qualquer momento, clique no botão abaixo.
      </p>
      <p>
        <ReopenPrefsButton />
      </p>
      <p className="text-sm">
        (Isso remove a chave <code>docfacil:cookie-prefs</code> do armazenamento
        local e recarrega a página para que o banner reapareça.)
      </p>

      <h2>5. Configurações no navegador</h2>
      <p>
        Além do nosso banner, você pode bloquear ou apagar cookies diretamente
        no navegador. Veja como nos navegadores mais usados:
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
        Bloquear tecnologias essenciais pode impedir o funcionamento correto
        de recursos como login e outras funções da plataforma.
      </p>

      <h2>6. Atualizações desta Política</h2>
      <p>
        Esta Política pode ser atualizada para refletir mudanças nos serviços
        que usamos ou em exigências legais. Quando a versão for alterada, a
        preferência salva deixa de valer para a nova versão e o banner volta a
        pedir sua escolha.
      </p>
      <p>
        Em caso de dúvida, escreva para{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>
    </>
  );
}
