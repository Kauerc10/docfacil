"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNav } from "../nav-context";
import { useAuth } from "@/lib/auth-context";
import { getModel } from "@/lib/services/models-service";
import {
  finalizeDocument,
  saveGuestDraft,
  loadGuestDraft,
  clearGuestDraft,
  getOrCreateFinalizationRequestId,
  clearFinalizationRequestId,
} from "@/lib/documents/client";
import { normalizarEstado } from "@/lib/normalizers";
import { aplicarComposicaoModelo, encodeClausulasSelecionadas } from "@/lib/document-engine";
import { logger } from "@/lib/logger";
import { UX_CONFIG } from "@/lib/constants";
import type { Modelo, EtapaModelo } from "@/lib/types";
import type {
  EtapaModelo as ChatEtapa,
  PetMood,
  RespostasState,
} from "./criar/types";
import { ChatStep } from "./criar/chat-step";
import { PreviewA4 } from "./criar/preview-a4";
import { CriarLayout } from "./criar/layout";
import {
  CriarLoading,
  CriarModeloNaoEncontrado,
} from "./criar/loading-states";
import { LoadingDocumento } from "../loading-documento";
import {
  getProgressLine,
  getErrorLine,
} from "./criar/pet-lines";
import { classifyFinalizationError } from "./criar/finalization-error";
import { FreeLimitPaywall } from "./criar/free-limit-paywall";

/**
 * CriarView — thin orchestrator (~250 lines) for the DocFacil "Concierge" flow.
 *
 * Delegates rendering to extracted subcomponents (ChatStep, PreviewA4,
 * CriarLayout, CriarLoading, CriarModeloNaoEncontrado, LoadingDocumento) and
 * keeps only:
 *  - state (stepIndex, answers, clausulasChecked, petMood, fieldError,
 *    submitting, mostrandoLoading)
 *  - the etapasEfetivas computation (static model.etapas + dynamic clause
 *    extras as separate "campo" steps for each selected clause with extras)
 *  - handleAvancar (validate → normalize estado → advance | save)
 *  - salvarDocumento (LoadingDocumento 1.5s → createDocument → navigate sucesso)
 *
 * Translation model:
 *   modelos.ts EtapaModelo ("campo" | "campo_grupo" | "clausulas")
 *     ↓ traduzirParaChatStep
 *   criar/types.ts EtapaModelo ("pergunta" | "grupo" | "clausulas")
 *
 * The criar/ subcomponents still use the older naming ("pergunta" / "grupo")
 * because ChatStep, CampoPergunta, and GrupoCampos were built before the
 * modelos.ts etapas structure — we translate at the boundary.
 */
export function CriarView() {
  const { params, navigate } = useNav();
  const slug = params.slug ?? "";
  const { user } = useAuth();

  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mostrandoLoading, setMostrandoLoading] = useState(false);
  const [showFreeLimitPaywall, setShowFreeLimitPaywall] = useState(false);

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [clausulasSelecionadas, setClausulasSelecionadas] = useState<string[]>([]);
  const [extrasPorClausula, setExtrasPorClausula] = useState<
    Record<string, Record<string, string>>
  >({});
  const [petMood, setPetMood] = useState<PetMood>("falando");
  const [fieldError, setFieldError] = useState<string | null>(null);
  // Override da fala do pet (usado para falas contextuais de erro/progresso).
  // Quando null, o pet diz a pergunta da etapa.
  const [petOverride, setPetOverride] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"perguntas" | "visualizar">("perguntas");
  const [pulseProgress, setPulseProgress] = useState(false);

  // === Load model ===========================================================
  const loadModel = useCallback(async () => {
    setLoading(true);
    try {
      const m = await getModel(slug);
      setModelo(m);
      if (slug) {
        const draft = loadGuestDraft(slug);
        if (draft) {
          if (draft.answers && Object.keys(draft.answers).length > 0) {
            setAnswers(draft.answers);
          }
          if (draft.clausulasSelecionadas && draft.clausulasSelecionadas.length > 0) {
            setClausulasSelecionadas(draft.clausulasSelecionadas);
          }
          if (draft.extrasPorClausula) {
            setExtrasPorClausula(draft.extrasPorClausula);
          }
          if (typeof draft.stepIndex === "number" && draft.stepIndex >= 0) {
            setStepIndex(draft.stepIndex);
          }
        }
      }
    } catch (e) {
      logger.error("CriarView", "falha ao carregar modelo", e, { slug });
      setModelo(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadModel();
  }, [loadModel]);

  // === etapasEfetivas =======================================================
  // Static model.etapas — as cláusulas selecionadas NÃO geram etapas extras
  // porque seus campos extras já são preenchidos inline no ClausulaCard
  // (quando o usuário marca a cláusula, os campos extras aparecem abaixo).
  // Isso evita pedir os mesmos dados duas vezes.
  const etapasEfetivas: EtapaModelo[] = useMemo(() => {
    if (!modelo?.etapas) return [];
    return [...modelo.etapas];
  }, [modelo]);

  const totalEtapas = etapasEfetivas.length;
  const etapaAtual = etapasEfetivas[stepIndex];
  const isLast = stepIndex + 1 >= totalEtapas;

  // Campos opcionais (obrigatorio === false) → viram string vazia no preview
  // em vez de "______________________" quando não preenchidos.
  // Inclui também os campos individuais de endereço (ex.: "_cep", "_rua",
  // "_numero", etc.) e separadores de RG — o que aparece no template é a
  // `saidaKey` (composta) e `<prefix>_rg_separador`, não os campos separados.
  const camposOpcionais = useMemo(() => {
    if (!modelo?.etapas) return [];
    const out: string[] = [];
    for (const etapa of modelo.etapas) {
      if (etapa.tipo === "campo_grupo") {
        for (const c of etapa.campos) {
          if (c.obrigatorio === false) out.push(c.key);
          // separadores de RG são opcionais ("" quando RG vazio)
          if (c.key === "rg" || c.key.endsWith("_rg")) {
            const prefix = c.key === "rg" ? "" : c.key.slice(0, -3);
            out.push(prefix ? `${prefix}_rg_separador` : "rg_separador");
          }
        }
        // campos individuais de endereço NÃO vão para o template — só a
        // string composta (saidaKey). Marcamos como opcionais para que, se
        // aparecerem em algum template, viram "" em vez de "______".
        if (etapa.endereco) {
          const e = etapa.endereco;
          out.push(e.cepKey, e.logradouroKey, e.numeroKey, e.bairroKey, e.cidadeKey, e.ufKey);
          if (e.complementoKey) out.push(e.complementoKey);
        }
      } else if (etapa.tipo === "campo" && etapa.campo.obrigatorio === false) {
        out.push(etapa.campo.key);
      }
      // clausula extras: se a cláusula não foi selecionada, os campos extras
      // não têm valor — marcamos como opcionais para virarem "" no template
      if (etapa.tipo === "clausulas") {
        for (const cl of etapa.clausulas) {
          if (!clausulasSelecionadas.includes(cl.id) && cl.camposExtras) {
            for (const ex of cl.camposExtras) out.push(ex.key);
          }
        }
      }
    }
    return out;
  }, [modelo, clausulasSelecionadas]);

  // clausulas selecionadas → id:corpo para o preview (legacy map, ainda usado
  // em alguns lugares; pode ser removido quando a migração estiver completa)
  const clausulasMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!modelo?.etapas) return map;
    for (const etapa of modelo.etapas) {
      if (etapa.tipo === "clausulas") {
        for (const cl of etapa.clausulas) {
          if (clausulasSelecionadas.includes(cl.id)) map[cl.id] = cl.corpo;
        }
      }
    }
    return map;
  }, [modelo, clausulasSelecionadas]);

  // === Composição de endereço + separadores RG ==============================
  // O motor em lib/document-engine cuida de tudo: para cada `campo_grupo` com
  // `endereco` configurado, monta a string final e atribui à `saidaKey`. Para
  // campos RG opcionais, gera `<prefix>_rg_separador` = ", RG <valor>" ou "".
  // Aplicada tanto para o PreviewA4 (live preview) quanto para createDocument (save).
  const respostasComEndereco = useMemo(() => {
    if (!modelo) return answers;
    return aplicarComposicaoModelo(answers, modelo);
  }, [answers, modelo]);

  // === Pet mood cycle =======================================================
  // "falando" por padrão (initial state), "feliz" por 600ms ao avançar,
  // "atencao" em erro de validação, "pensando" enquanto salva.
  // Gerenciado manualmente nos handlers — sem useEffect (evita cascading
  // renders e respeita a regra react-hooks/set-state-in-effect).

  // === Respostas state (campos + clausulas) ================================
  const respostas: RespostasState = useMemo(
    () => ({ campos: answers, clausulasSelecionadas }),
    [answers, clausulasSelecionadas]
  );

  // === Handlers =============================================================
  const handleInputChange = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (fieldError) {
      setFieldError(null);
      setPetOverride(null);
      setPetMood("falando");
    }
  };

  const handleGrupoFieldChange = (
    _grupoKey: string,
    fieldKey: string,
    value: string
  ) => {
    setAnswers((prev) => ({ ...prev, [fieldKey]: value }));
    if (fieldError) {
      setFieldError(null);
      setPetOverride(null);
      setPetMood("falando");
    }
  };

  const handleClausulaFieldChange = (
    clausulaId: string,
    payload:
      | { tipo: "toggle"; selecionada: boolean }
      | { tipo: "extra"; fieldKey: string; value: string }
  ) => {
    if (payload.tipo === "toggle") {
      setClausulasSelecionadas((prev) =>
        payload.selecionada
          ? [...prev, clausulaId]
          : prev.filter((id) => id !== clausulaId)
      );
    } else {
      setExtrasPorClausula((prev) => ({
        ...prev,
        [clausulaId]: {
          ...(prev[clausulaId] ?? {}),
          [payload.fieldKey]: payload.value,
        },
      }));
    }
    if (fieldError) {
      setFieldError(null);
      setPetOverride(null);
      setPetMood("falando");
    }
  };

  // Validação: campo obrigatório vazio bloqueia o avanço.
  const validarEtapaAtual = (): string | null => {
    if (!etapaAtual) return null;
    if (etapaAtual.tipo === "campo") {
      const v = (answers[etapaAtual.campo.key] ?? "").trim();
      if (etapaAtual.campo.obrigatorio !== false && !v) {
        return `Preencha: ${etapaAtual.campo.pergunta}`;
      }
    }
    if (etapaAtual.tipo === "campo_grupo") {
      for (const c of etapaAtual.campos) {
        const v = (answers[c.key] ?? "").trim();
        if (c.obrigatorio !== false && !v) {
          return `Preencha: ${c.pergunta}`;
        }
      }
    }
    return null;
  };

  // Normaliza campos de estado (SP, São Paulo, sp → SP) no avatar atual.
  const normalizarEstadoSeAplicavel = () => {
    if (!etapaAtual) return;
    const camposParaNormalizar: { key: string; pergunta: string }[] = [];
    if (etapaAtual.tipo === "campo") {
      camposParaNormalizar.push(etapaAtual.campo);
    } else if (etapaAtual.tipo === "campo_grupo") {
      camposParaNormalizar.push(...etapaAtual.campos);
    }
    setAnswers((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const c of camposParaNormalizar) {
        if (/estado|uf/i.test(c.key) || /estado|uf/i.test(c.pergunta)) {
          const norm = normalizarEstado(next[c.key] ?? "");
          if (norm !== (next[c.key] ?? "")) {
            next[c.key] = norm;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  };

  const persistCurrentDraft = () => {
    if (!modelo || !slug) return;
    const requestId = getOrCreateFinalizationRequestId(modelo.slug);
    saveGuestDraft(slug, {
      requestId,
      modeloSlug: slug,
      answers,
      stepIndex,
      clausulasSelecionadas,
      extrasPorClausula,
    });
  };

  const salvarDocumento = async (respostasFinais: Record<string, string>) => {
    if (!modelo) return;
    setSubmitting(true);
    setMostrandoLoading(true);
    setPetMood("pensando");

    try {
      if (user) {
        const requestId = getOrCreateFinalizationRequestId(modelo.slug);
        const result = await finalizeDocument({
          requestId,
          modeloSlug: modelo.slug,
          respostas: respostasFinais,
          clausulasSelecionadas,
        });
        clearFinalizationRequestId(modelo.slug);
        clearGuestDraft(slug);
        navigate("sucesso", { slug, id: result.document.id });
      } else {
        persistCurrentDraft();
        navigate("sucesso", { slug });
      }
    } catch (e) {
      if (classifyFinalizationError(e) === "free_limit") {
        // Limite é um estado comercial esperado, não uma falha de geração.
        // Preservamos o preenchimento antes de oferecer Pro/avulso/rascunho.
        persistCurrentDraft();
        setSubmitting(false);
        setMostrandoLoading(false);
        setFieldError(null);
        setPetMood("atencao");
        setPetOverride("Seu documento está pronto. Você só chegou ao limite gratuito deste mês; escolha como prefere concluir.");
        setShowFreeLimitPaywall(true);
        return;
      }

      logger.error("CriarView", "falha ao finalizar documento", e, { slug });
      setSubmitting(false);
      setMostrandoLoading(false);
      setFieldError("Não foi possível salvar e gerar o documento. Seus dados continuam aqui; tente novamente em instantes.");
      setPetMood("atencao");
      setPetOverride("Não consegui concluir o salvamento com segurança. Tente novamente e eu continuo daqui.");
    }
  };

  const handleAvancar = () => {
    if (!etapaAtual || submitting) return;
    const erro = validarEtapaAtual();
    if (erro) {
      // Empatia no erro: usa fala contextual em vez de mensagem genérica,
      // mas mantém a mensagem técnica no fieldError para clareza.
      setFieldError(erro);
      setPetMood("atencao");
      setPetOverride(getErrorLine());
      return;
    }
    setFieldError(null);
    setPetOverride(null);
    normalizarEstadoSeAplicavel();

    // progress-pulse ao completar a etapa
    setPulseProgress(true);
    setTimeout(() => setPulseProgress(false), UX_CONFIG.PROGRESS_PULSE_DURATION);

    if (isLast) {
      // Comemoração: pet fica feliz e "fala" a celebração antes de gerar.
      setPetMood("feliz");
      // Snapshot final:
      // 1. respostasComEndereco (campos individuais + composições de endereço + separadores RG)
      // 2. clausulasSelecionadas codificadas como __clausula_${id} = "true" (para persistência)
      // 3. extras de cláusulas achatados no mesmo mapa
      const respostasFinais: Record<string, string> = {
        ...respostasComEndereco,
        ...encodeClausulasSelecionadas(clausulasSelecionadas),
      };
      for (const extraMap of Object.values(extrasPorClausula)) {
        for (const [k, v] of Object.entries(extraMap)) {
          respostasFinais[k] = v;
        }
      }
      void salvarDocumento(respostasFinais);
      return;
    }

    // Pet fica feliz brevemente ao avançar, depois volta a "falando".
    setPetMood("feliz");
    setPetOverride(null);
    setTimeout(() => setPetMood("falando"), UX_CONFIG.PET_HAPPY_DURATION);
    setStepIndex((i) => Math.min(i + 1, totalEtapas - 1));
  };

  const handleVoltar = () => {
    navigate("modelo-detalhe", { slug });
  };

  // === Render: loading / not found / loading-documento ======================
  if (loading) return <CriarLoading />;

  if (!modelo) return <CriarModeloNaoEncontrado onVoltar={() => navigate("modelos")} />;

  if (mostrandoLoading) return <LoadingDocumento nomeModelo={modelo.nome} />;

  // === Tradução modelos.ts EtapaModelo → criar/types.ts EtapaModelo =========
  // Passa o `endereco` (EnderecoConfig) adiante para o GrupoCampos habilitar
  // auto-fill ViaCEP + normalização de logradouro + composição no preview.
  const etapaChat: ChatEtapa | null = etapaAtual
    ? etapaAtual.tipo === "campo"
      ? { tipo: "pergunta", campo: etapaAtual.campo }
      : etapaAtual.tipo === "campo_grupo"
      ? { tipo: "grupo", titulo: etapaAtual.tituloGrupo, campos: etapaAtual.campos, endereco: etapaAtual.endereco }
      : { tipo: "clausulas", titulo: etapaAtual.titulo, clausulas: etapaAtual.clausulas }
    : null;

  // Texto que o pet "fala" (digitado progressivamente) — por etapa.
  // Combina fala de progresso (meio/quase-fim) com a pergunta da etapa,
  // dando personalidade sem esconder a informação que o usuário precisa.
  const perguntaAtual =
    etapaAtual?.tipo === "campo"
      ? etapaAtual.campo.pergunta
      : etapaAtual?.tipo === "campo_grupo"
      ? etapaAtual.tituloGrupo ?? "Preencha os campos abaixo:"
      : etapaAtual?.tipo === "clausulas"
      ? etapaAtual.titulo ?? "Selecione as cláusulas opcionais:"
      : "Vamos começar?";

  const progressLine = getProgressLine(stepIndex, totalEtapas);
  const petTextBase = progressLine ? `${progressLine} ${perguntaAtual}` : perguntaAtual;
  // Override tem prioridade (erro/contexto emocional), senão usa a base.
  const petText = petOverride ?? petTextBase;

  const progressPct = totalEtapas > 0 ? (stepIndex / totalEtapas) * 100 : 0;

  // === Render: main split-screen ============================================
  return (
    <>
      <CriarLayout
        step={stepIndex}
        total={totalEtapas}
        progressPct={progressPct}
        pulseProgress={pulseProgress}
        mobileTab={mobileTab}
        onMobileTabChange={setMobileTab}
        onVoltar={handleVoltar}
        onStepClick={(target) => {
          // Permite revisar etapas anteriores sem perder o progresso.
          setStepIndex(Math.max(0, Math.min(target, stepIndex)));
          setFieldError(null);
          setPetOverride(null);
          setPetMood("falando");
        }}
        previewSlot={
          <div className="w-full max-w-[340px] mx-auto">
            <PreviewA4
              titulo={modelo.template.titulo}
              corpo={modelo.template.corpo}
              respostas={respostasComEndereco}
              clausulasSelecionadas={clausulasSelecionadas}
              modelo={modelo}
              camposOpcionais={camposOpcionais}
            />
          </div>
        }
      >
        {etapaChat && (
          <ChatStep
            key={stepIndex}
            petText={petText}
            petMood={petMood}
            etapa={etapaChat}
            stepIndex={stepIndex}
            totalEtapas={totalEtapas}
            respostas={respostas}
            onInputChange={handleInputChange}
            onGrupoFieldChange={handleGrupoFieldChange}
            onClausulaFieldChange={handleClausulaFieldChange}
            onAvancar={handleAvancar}
            isLast={isLast}
            submitting={submitting}
            fieldError={fieldError}
            extrasPorClausula={extrasPorClausula}
          />
        )}
        {fieldError && etapaAtual?.tipo === "clausulas" && (
          <p
            role="alert"
            className="mt-3 text-sm text-[var(--coral)] font-medium pl-1 flex items-center gap-1.5"
          >
            <span aria-hidden="true">⚠</span>
            {fieldError}
          </p>
        )}
      </CriarLayout>

      {showFreeLimitPaywall && (
        <FreeLimitPaywall
          documentName={modelo.nome}
          onChoosePro={() => {
            persistCurrentDraft();
            navigate("checkout", { plan: "pro", slug });
          }}
          onChooseSingle={() => {
            persistCurrentDraft();
            navigate("checkout", { plan: "avulso", slug });
          }}
          onSaveDraft={() => {
            persistCurrentDraft();
            setShowFreeLimitPaywall(false);
            setPetMood("feliz");
            setPetOverride("Rascunho salvo neste navegador. Você pode continuar daqui quando quiser.");
          }}
          onContinueEditing={() => {
            setShowFreeLimitPaywall(false);
            setPetMood("falando");
            setPetOverride(null);
          }}
        />
      )}
    </>
  );
}
