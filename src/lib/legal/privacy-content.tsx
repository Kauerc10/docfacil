import { COMPANY } from "@/lib/company";
import { LegalLink } from "./legal-link";

/**
 * PrivacyContent — conteúdo da Política de Privacidade (LGPD), versão 1.0.
 *
 * Componente server-compatible que renderiza apenas o `<article>`.
 * Compatível entre `LegalLayout` (SPA) e `LegalPageWrapper` (SSR).
 *
 * 13 seções: introdução, dados coletados, base legal (art. 7º), finalidades
 * (incluindo art. 20 — decisões automatizadas), compartilhamento, direitos
 * do titular (art. 18º, 10 direitos), cookies, segurança, retenção,
 * transferência internacional, DPO, alterações, contato.
 *
 * Links internos (Cookies) trocam entre `<Link>` (SSR) e `<button>` (SPA)
 * conforme `onNavigate`.
 */
export function PrivacyContent({
  onNavigate,
}: {
  onNavigate?: (view: string) => void;
} = {}) {
  return (
    <>
      <p>
        A sua privacidade é levada a sério no {COMPANY.productName}. Esta
        Política descreve quais dados pessoais coletamos, por quê, com quem
        compartilhamos e como você pode exercer seus direitos como titular,
        em conformidade com a{" "}
        <strong>
          Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)
        </strong>
        . Ao utilizar a plataforma, você concorda com o tratamento descrito
        aqui.
      </p>

      <h2>1. Introdução</h2>
      <p>
        O <strong>controlador</strong> dos dados é a {COMPANY.name}, com sede
        em São Paulo/SP, responsável por decidir o que é coletado e como é
        usado. Você pode entrar em contato a qualquer momento pelo{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ou pelo DPO
        indicado na seção 12.
      </p>

      <h2>2. Dados Coletados</h2>
      <p>Coletamos as seguintes categorias de dados pessoais:</p>
      <ul>
        <li>
          <strong>De identificação:</strong> nome completo, e-mail, foto (se
          login via Google).
        </li>
        <li>
          <strong>De contato:</strong> telefone (opcional, se você informar
          no perfil).
        </li>
        <li>
          <strong>De uso:</strong> documentos gerados, datas, endereço IP,
          user-agent, eventos de clique (analíticos, se aceitos).
        </li>
        <li>
          <strong>De pagamento:</strong> dados de cobrança processados pelos
          gateways (não armazenamos número de cartão).
        </li>
        <li>
          <strong>De consentimento:</strong> registro de aceite de Termos
          (tempo, IP, versão aceita).
        </li>
      </ul>

      <h2>3. Base Legal (art. 7º, LGPD)</h2>
      <p>
        Tratamos seus dados com fundamento nas seguintes bases legais:
      </p>
      <ul>
        <li>
          <strong>Consentimento (art. 7º, I):</strong> para marketing e
          cookies analíticos opcionais — você pode revogar a qualquer
          momento.
        </li>
        <li>
          <strong>Execução de contrato (art. 7º, V):</strong> para gerar e
          entregar os documentos solicitados, processar pagamentos e cumprir
          o que foi contratado.
        </li>
        <li>
          <strong>Obrigação legal (art. 7º, II):</strong> para manter
          registros fiscais e contábeis exigidos por lei.
        </li>
        <li>
          <strong>Legítimo interesse (art. 7º, IX):</strong> para segurança
          da plataforma, prevenção a fraudes e melhoria do serviço — sempre
          balanceado com seus direitos.
        </li>
      </ul>

      <h2>4. Finalidades</h2>
      <p>Seus dados são usados para:</p>
      <ul>
        <li>Identificar e autenticar você na plataforma.</li>
        <li>Gerar, armazenar e entregar os documentos solicitados.</li>
        <li>Processar pagamentos e emitir notas fiscais.</li>
        <li>Oferecer suporte pelo WhatsApp e e-mail.</li>
        <li>
          Cumprir obrigações legais, fiscais e regulatórias (incluindo
          comprovação de consentimento).
        </li>
        <li>
          Melhorar a usabilidade (analytics) e comunicar novidades —
          somente com seu consentimento.
        </li>
      </ul>
      <p>
        <strong>Decisões automatizadas (art. 20, LGPD):</strong> O{" "}
        {COMPANY.productName} pode utilizar recursos automatizados para
        auxiliar a montagem de documentos a partir das respostas que você
        fornece. Esses recursos{" "}
        <strong>
          não tomam decisões que produzam efeitos jurídicos significativos
        </strong>{" "}
        sobre você sem sua participação — o documento final é revisado e
        confirmado por você antes da geração. Você pode solicitar revisão
        humana de qualquer resultado escrevendo para o nosso{" "}
        <a href={`mailto:${COMPANY.dpoEmail}`}>Encarregado (DPO)</a>.
      </p>

      <h2>5. Compartilhamento</h2>
      <p>
        Não vendemos nem alugamos seus dados. Compartilhamos somente:
      </p>
      <ul>
        <li>
          <strong>Gateways de pagamento</strong> (p. ex. Kirvano, Stripe) —
          apenas dados necessários à cobrança, sob contratos de processador.
        </li>
        <li>
          <strong>Provedores de infraestrutura</strong> (hosting, banco de
          dados, e-mail transacional) — com contratos e cláusulas LGPD.
        </li>
        <li>
          <strong>Autoridades públicas</strong> — quando determinado por
          ordem judicial ou exigência legal.
        </li>
      </ul>

      <h2>6. Direitos do Titular (art. 18º, LGPD)</h2>
      <p>
        Você tem direito a solicitar, a qualquer momento:
      </p>
      <ul>
        <li>Confirmação de que tratamos seus dados;</li>
        <li>Acesso aos dados tratados;</li>
        <li>Correção de dados incompletos ou inexatos;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade dos dados a outro fornecedor;</li>
        <li>Eliminação dos dados pessoais tratados com consentimento;</li>
        <li>Informação sobre compartilhamento;</li>
        <li>Revogação do consentimento;</li>
        <li>
          Revisão de decisões automatizadas (não usamos decisão
          exclusivamente automatizada com efeito relevante);
        </li>
        <li>Oposição ao tratamento, nos casos permitidos.</li>
      </ul>
      <p>
        Para exercer qualquer direito, escreva para{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> com o assunto
        &quot;LGPD — solicitação&quot;. Respondemos em até 15 (quinze) dias
        corridos.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Usamos cookies e tecnologias similares para autenticar sessões,
        lembrar preferências e, com seu consentimento, medir uso. Os detalhes
        estão na{" "}
        <LegalLink
          view="cookies"
          onNavigate={onNavigate}
          className="text-[var(--blue-royal)] underline"
        >
          Política de Cookies
        </LegalLink>
        . Você pode ajustar preferências pelo banner inicial ou pelas
        configurações do seu navegador.
      </p>

      <h2>8. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais razoáveis para proteger
        seus dados: criptografia em trânsito (TLS), criptografia em repouso,
        controle de acesso baseado em função, registro de logs
        administrativos e monitoramento. Nenhum sistema é 100% seguro; em
        caso de incidente que possa causar risco ou dano relevante,
        comunicaremos você e a ANPD nos termos do art. 48 da LGPD.
      </p>

      <h2>9. Retenção</h2>
      <p>
        Mantemos seus dados pelo tempo necessário às finalidades descritas:
      </p>
      <ul>
        <li>
          <strong>Conta ativa:</strong> enquanto a conta existir.
        </li>
        <li>
          <strong>Documentos:</strong> enquanto você não os excluir (e por
          90 dias após, em lixeira recuperável).
        </li>
        <li>
          <strong>Registros de pagamento e fiscais:</strong> por 5 (cinco)
          anos, conforme exigência fiscal.
        </li>
        <li>
          <strong>Logs de consentimento:</strong> por 5 (cinco) anos, para
          prova em eventual litígio.
        </li>
        <li>
          <strong>Após o prazo:</strong> anonimizados (sem possibilidade de
          reidentificação) ou eliminados.
        </li>
      </ul>

      <h2>10. Transferência Internacional</h2>
      <p>
        Alguns provedores (p. ex. Google Firebase, Stripe) podem processar
        dados fora do Brasil. Em todos os casos exigimos contratos com
        cláusulas-padrão de proteção e/ou adesão ao{" "}
        <strong>Global Cross-Border Privacy Rules (CBPR)</strong>,
        garantindo nível adequado de proteção previsto no art. 33 da LGPD.
      </p>

      <h2>11. DPO (Encarregado)</h2>
      <p>
        Nosso Encarregado pelo Tratamento de Dados Pessoais (DPO) está
        disponível para receber reclamações e comunicações:
      </p>
      <ul>
        <li>
          E-mail do Encarregado:{" "}
          <a href={`mailto:${COMPANY.dpoEmail}`}>{COMPANY.dpoEmail}</a>
        </li>
        <li>
          Você também pode reclamar à <strong>ANPD</strong> (Autoridade
          Nacional de Proteção de Dados) em{" "}
          <a
            href="https://www.gov.br/anpd"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.gov.br/anpd
          </a>
          .
        </li>
      </ul>

      <h2>12. Alterações desta Política</h2>
      <p>
        Esta Política pode ser atualizada para refletir mudanças na
        legislação ou em nossos serviços. Alterações relevantes serão
        comunicadas pelo e-mail cadastrado ou por banner na plataforma, com
        antecedência mínima de 15 (quinze) dias. A versão vigente é sempre a
        publicada nesta página, com data no cabeçalho.
      </p>

      <h2>13. Contato e Identificação do Controlador</h2>
      <p>
        Para qualquer dúvida sobre privacidade, escreva para{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> ou pelo
        WhatsApp{" "}
        <a
          href={COMPANY.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
        >
          {COMPANY.whatsappLabel}
        </a>
        .
      </p>
      <p>
        <strong>Controlador do tratamento de dados:</strong> {COMPANY.name},
        CNPJ {COMPANY.cnpj}, sede na {COMPANY.enderecoSede}.
      </p>
    </>
  );
}
