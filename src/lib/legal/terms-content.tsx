import { COMPANY } from "@/lib/company";
import { PLAN_PRICES, formatBRL } from "@/lib/pricing";
import { LegalLink } from "./legal-link";

/**
 * TermsContent — conteúdo dos Termos de Uso (versão 1.0).
 *
 * Componente server-compatible (sem `"use client"`) que renderiza apenas o
 * `<article>` — o wrapper visual é fornecido por:
 *  - `LegalLayout` (client, na SPA via `termos-view.tsx`)
 *  - `LegalPageWrapper` (server, na rota `/termos`)
 *
 * Ambos consomem este mesmo conteúdo — zero duplicação. O `onNavigate` opcional
 * troca os links internos (Privacidade, Cookies) entre `<Link>` (SSR) e
 * `<button>` (SPA).
 *
 * Versão 1.0, 13 de julho de 2026.
 * 14 seções: aceitação, descrição do serviço, limitação de responsabilidade
 * (teto = últimos 30 dias pagos), validade, obrigações do usuário, contas,
 * pagamentos, PI, privacidade, suspensão, alterações, arbitragem, foro SP,
 * disposições finais.
 */
export function TermsContent({
  onNavigate,
}: {
  onNavigate?: (view: string) => void;
} = {}) {
  return (
    <>
      <p>
        Estes Termos de Uso (&quot;Termos&quot;) regem o acesso e a utilização da
        plataforma <strong>{COMPANY.productName}</strong>, operada pela{" "}
        <strong>{COMPANY.name}</strong> (&quot; nós&quot;, &quot;nosso&quot; ou{" "}
        &quot;DocFacil&quot;). Ao criar conta, navegar ou gerar qualquer
        documento, você (&quot;usuário&quot; ou &quot;você&quot;) concorda com
        estes Termos.
      </p>

      <h2>1. Aceitação dos Termos</h2>
      <p>
        O uso do {COMPANY.productName} implica a aceitação integral destes
        Termos e da nossa{" "}
        <LegalLink
          view="privacidade"
          onNavigate={onNavigate}
          className="text-[var(--blue-royal)] underline"
        >
          Política de Privacidade
        </LegalLink>{" "}
        e da nossa{" "}
        <LegalLink
          view="cookies"
          onNavigate={onNavigate}
          className="text-[var(--blue-royal)] underline"
        >
          Política de Cookies
        </LegalLink>
        . Se você discorda de qualquer cláusula, não utilize a plataforma.
        Mantemos um registro de concordância (com prova de tempo, IP e
        user-agent) para sua segurança e a nossa.
      </p>

      <h2>2. Descrição do Serviço</h2>
      <p>
        O {COMPANY.productName} é um serviço online de geração de documentos
        jurídicos a partir de modelos pré-aprovados e orientados por
        conversa. O sistema entrega um PDF formatado conforme a estrutura
        exigida para instrumentos particulares.
      </p>
      <p>
        <strong>
          O {COMPANY.productName} NÃO substitui a orientação de um advogado
        </strong>
        . Não prestamos consultoria jurídica, não opinamos sobre o mérito do
        seu caso e não participamos da assinatura ou do registro do
        documento. Para decisões com impacto financeiro, patrimonial ou
        familiar relevante, consulte um advogado de confiança ou a Defensoria
        Pública.
      </p>

      <h2>3. Limitação de Responsabilidade</h2>
      <p>
        Na máxima extensão permitida pela lei, o {COMPANY.productName} não se
        responsabiliza por danos diretos, indiretos, lucros cessantes ou
        perda de dados decorrentes do uso (ou da impossibilidade de uso) da
        plataforma, do conteúdo gerado ou de decisões tomadas com base em
        documentos aqui produzidos.
      </p>
      <p>
        Em qualquer hipótese, a responsabilidade agregada da {COMPANY.name} em
        relação a qualquer reclamação ficará limitada ao{" "}
        <strong>
          valor efetivamente pago pelo usuário ao {COMPANY.productName} nos
          últimos 30 (trinta) dias
        </strong>{" "}
        anteriores ao evento gerador. Esta cláusula não afasta
        responsabilidades que a lei não permita limitar (p. ex. dolo ou
        violação intencional).
      </p>

      <h2>4. Validade Jurídica dos Documentos</h2>
      <p>
        Os documentos gerados seguem a estrutura exigida para instrumentos
        particulares e podem ser assinados digitalmente. A força executiva
        (capacidade de cobrar em juízo sem reconhecimento prévio de firma)
        depende, em regra, de assinatura eletrônica qualificada (ICP-Brasil)
        ou de reconhecimento de firma em cartório. O {COMPANY.productName}
        oferece orientações sobre estes passos, mas não os executa.
      </p>

      <h2>5. Obrigações do Usuário</h2>
      <p>Você se compromete a:</p>
      <ul>
        <li>
          Fornecer informações verdadeiras, completas e atualizadas ao
          preencher qualquer documento.
        </li>
        <li>
          Não utilizar a plataforma para fins ilegais, fraudulentos ou que
          violem direitos de terceiros.
        </li>
        <li>
          Não tentar burlar limites do plano, compartilhar conta de forma
          indevida ou automatizar o acesso sem autorização.
        </li>
        <li>
          Manter a confidencialidade da sua conta e senha, sendo responsável
          por toda atividade realizada com suas credenciais.
        </li>
      </ul>

      <h2>6. Contas de Usuário</h2>
      <p>
        A criação de conta exige e-mail e senha (ou login social via Google).
        É permitida uma conta por pessoa física. Contas corporativas devem
        ser contratadas separadamente. Você pode encerrar sua conta a
        qualquer momento pelo painel &quot;Meu Perfil&quot;; o encerramento
        não cancela automaticamente uma assinatura ativa, que continuará
        vigente até o fim do período pago.
      </p>

      <h2>7. Pagamentos</h2>
      <p>
        Oferecemos dois planos pagos:
      </p>
      <ul>
        <li>
          <strong>Documento Avulso</strong> — {formatBRL(PLAN_PRICES.avulso)}{" "}
          por documento, sem necessidade de conta. Inclui PDF sem marca
          d&apos;água e download imediato.
        </li>
        <li>
          <strong>Plano Pro (mensal)</strong> — {formatBRL(PLAN_PRICES.pro)}
          /mês, com documentos ilimitados, edição, histórico salvo e
          prioridade no atendimento. Renovação automática; cancele quando
          quiser, sem fidelidade.
        </li>
      </ul>
      <p>
        O pagamento é processado por gateways brasileiros (cartão de
        crédito, Pix ou boleto). Em caso de falha na cobrança, reservamo-nos
        o direito de suspender o acesso pago até a regularização.
      </p>
      <p>
        <strong>
          Reembolso (Direito de Arrependimento — CDC, art. 49):
        </strong>{" "}
        você pode solicitar o reembolso integral em até{" "}
        <strong>7 (sete)</strong> dias corridos contados da contratação ou do
        recebimento do produto, sem necessidade de justificativa. Para
        solicitar, envie um e-mail para{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> com o número
        do pedido. Após os 7 dias, o plano Pro não é reembolsável
        proporcionalmente, mas pode ser cancelado a qualquer momento para
        não renovar.
      </p>

      <h2>8. Propriedade Intelectual</h2>
      <p>
        A marca {COMPANY.productName}, o código-fonte da plataforma, os
        modelos de documento, os textos de interface e os elementos visuais
        (incluindo o &quot;selo&quot; notarial) são protegidos por direitos
        autorais e de propriedade industrial. Você não pode copiar,
        modificar, distribuir ou criar obras derivadas sem autorização
        expressa.
      </p>
      <p>
        Os documentos que você gera a partir das suas respostas são seus;
        você detém os direitos sobre o conteúdo inserido. Ao usar a
        plataforma, você concede à {COMPANY.name} uma licença não exclusiva
        para processar essas informações com o único fim de gerar e
        entregar o documento solicitado.
      </p>

      <h2>9. Privacidade</h2>
      <p>
        O tratamento dos seus dados pessoais está descrito em detalhe na{" "}
        <LegalLink
          view="privacidade"
          onNavigate={onNavigate}
          className="text-[var(--blue-royal)] underline"
        >
          Política de Privacidade
        </LegalLink>
        , incorporada a estes Termos por referência.
      </p>

      <h2>10. Suspensão e Encerramento</h2>
      <p>
        Podemos suspender ou encerrar o acesso imediatamente, sem aviso
        prévio, em caso de: (i) violação destes Termos; (ii) uso fraudulento
        ou abusivo; (iii) suspeita de atividade ilegal; (iv) inadimplência
        superior a 15 (quinze) dias. Em casos não urgentes, faremos o
        possível para notificar e dar prazo razoável para regularização.
      </p>

      <h2>11. Alterações dos Termos</h2>
      <p>
        Podemos alterar estes Termos a qualquer tempo. Alterações
        materiais serão comunicadas pelo e-mail cadastrado ou por banner na
        plataforma, com pelo menos 15 (quinze) dias de antecedência. O uso
        continuado após a entrada em vigor equivale à aceitação tácita. A
        versão vigente é sempre a disponível nesta página, com data no
        cabeçalho.
      </p>

      <h2>12. Arbitragem</h2>
      <p>
        Eventuais litígios serão resolvidos, preferencialmente, por{" "}
        <strong>mediação</strong>. Persistindo o conflito, será dirimido por{" "}
        <strong>arbitragem</strong>, nos termos da{" "}
        <strong>Lei nº 9.307/96</strong> (Lei de Arbitragem), administrada
        pela <strong>Câmara de Arbitragem de São Paulo</strong> (outra
        câmara de comum acordo), regida por seu regulamento. A arbitragem
        será em língua portuguesa e sede em São Paulo/SP. Esta cláusula não
        impede o usuário de recorrer aos órgãos de defesa do consumidor
        (Procon, Reclame Aqui) ou à Justiça Especial Cível para causas de
        menor complexidade, no que for incontroverso.
      </p>

      <h2>13. Foro</h2>
      <p>
        Fica eleito o foro da Comarca de <strong>São Paulo/SP</strong> como
        competente para dirimir quaisquer questões não submetidas à
        arbitragem (cláusula 12), ressalvadas as competências legais
        irrenunciáveis do Código de Defesa do Consumidor.
      </p>

      <h2>14. Disposições Finais</h2>
      <p>
        Estes Termos constituem o acordo integral entre você e a{" "}
        {COMPANY.name} quanto ao uso do {COMPANY.productName}, substituindo
        quaisquer acordos anteriores. Se qualquer cláusula for considerada
        inválida ou inexequível, as demais permanecerão em vigor. A
        omissão eventual na exigência de qualquer cláusula não configura
        renúncia. Os links externos a sites de terceiros são oferecidos por
        conveniência e não implicam endosso.
      </p>
      <p>
        Em caso de dúvida, escreva para{" "}
        <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
      </p>

      <h2>15. Identificação da Operadora</h2>
      <p>
        {COMPANY.productName} é operado por{" "}
        <strong>{COMPANY.name}</strong>, inscrita no CNPJ sob o nº{" "}
        <strong>{COMPANY.cnpj}</strong>, com sede na{" "}
        {COMPANY.enderecoSede}. Para questões de proteção de dados (LGPD),
        fale com o nosso Encarregado (DPO) pelo e-mail{" "}
        <a href={`mailto:${COMPANY.dpoEmail}`}>{COMPANY.dpoEmail}</a>.
      </p>
    </>
  );
}
