"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNav } from "../nav-context";
import { useAuth } from "@/lib/auth-context";
import { getModel } from "@/lib/services/models-service";
import { duplicateDocument } from "@/lib/services/documents-service";
import {
  finalizeDocument,
  createDocumentVersion,
  saveGuestDraft,
  loadGuestDraft,
  clearGuestDraft,
  saveAccountDraft,
  getAccountDraft,
  deleteAccountDraft,
  getOrCreateFinalizationRequestId,
  clearFinalizationRequestId,
} from "@/lib/documents/client";
import { normalizarEstado } from "@/lib/normalizers";
import { aplicarComposicaoModelo, hasInvalidMoradoresAutorizados } from "@/lib/document-engine";
import { logger } from "@/lib/logger";
import { UX_CONFIG } from "@/lib/constants";
import { campoEstaVisivel, type Modelo, type EtapaModelo } from "@/lib/types";
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
import { getProgressLine, getErrorLine } from "./criar/pet-lines";
import { classifyFinalizationError } from "./criar/finalization-error";
import {
  FreeLimitPaywall,
  type AccessPaywallReason,
} from "./criar/free-limit-paywall";

export function CriarView() {
  const { params, navigate } = useNav();
  const slug = params.slug ?? "";
  const requestedDocumentId = params.id;
  const requestedDraftId = params.draftId;
  const { user } = useAuth();

  const [modelo, setModelo] = useState<Modelo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mostrandoLoading, setMostrandoLoading] = useState(false);
  const [accessPaywallReason, setAccessPaywallReason] = useState<AccessPaywallReason | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | undefined>(requestedDraftId);
  const [activeDocumentId, setActiveDocumentId] = useState<string | undefined>(requestedDocumentId);

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [clausulasSelecionadas, setClausulasSelecionadas] = useState<string[]>([]);
  const [extrasPorClausula, setExtrasPorClausula] = useState<Record<string, Record<string, string>>>({});
  const [petMood, setPetMood] = useState<PetMood>("falando");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [petOverride, setPetOverride] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"perguntas" | "visualizar">("perguntas");
  const [pulseProgress, setPulseProgress] = useState(false);

  const loadModel = useCallback(async () => {
    setLoading(true);
    setAnswers({});
    setClausulasSelecionadas([]);
    setExtrasPorClausula({});
    setStepIndex(0);
    setActiveDocumentId(requestedDocumentId);
    setActiveDraftId(requestedDraftId);

    try {
      const m = await getModel(slug);
      setModelo(m);
      if (!m || !slug) return;

      if (user && requestedDocumentId) {
        const editable = await duplicateDocument(requestedDocumentId);
        if (!editable || editable.modeloSlug !== slug) {
          throw new Error("Não foi possível carregar as respostas deste documento.");
        }
        setAnswers(editable.respostas || {});
        setClausulasSelecionadas(editable.clausulasSelecionadas || []);
        setExtrasPorClausula(editable.extrasPorClausula || {});
        setActiveDocumentId(requestedDocumentId);
        setActiveDraftId(undefined);
        return;
      }

      if (user && requestedDraftId) {
        const draft = await getAccountDraft(requestedDraftId);
        if (!draft || draft.modeloSlug !== slug) {
          throw new Error("Rascunho não encontrado ou incompatível com este modelo.");
        }
        setAnswers(draft.respostas || {});
        setClausulasSelecionadas(draft.clausulasSelecionadas || []);
        setExtrasPorClausula(draft.extrasPorClausula || {});
        setStepIndex(Math.max(0, draft.stepIndex || 0));
        setActiveDraftId(draft.id);
        setActiveDocumentId(draft.sourceDocumentId);
        return;
      }

      const localDraft = loadGuestDraft(slug);
      if (localDraft) {
        setAnswers(localDraft.answers || {});
        setClausulasSelecionadas(localDraft.clausulasSelecionadas || []);
        setExtrasPorClausula(localDraft.extrasPorClausula || {});
        setStepIndex(Math.max(0, localDraft.stepIndex || 0));
      }
    } catch (e) {
      logger.error("CriarView", "falha ao carregar modelo ou estado editável", e, {
        slug,
        documentId: requestedDocumentId,
        draftId: requestedDraftId,
      });
      setModelo(null);
    } finally {
      setLoading(false);
    }
  }, [slug, requestedDocumentId, requestedDraftId, user?.uid]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadModel();
  }, [loadModel]);

  const etapasEfetivas: EtapaModelo[] = useMemo(() => {
    if (!modelo?.etapas) return [];
    return [...modelo.etapas];
  }, [modelo]);

  const totalEtapas = etapasEfetivas.length;
  const etapaAtual = etapasEfetivas[stepIndex];
  const isLast = stepIndex + 1 >= totalEtapas;

  const camposOpcionais = useMemo(() => {
    if (!modelo?.etapas) return [];
    const out: string[] = [];
    for (const etapa of modelo.etapas) {
      if (etapa.tipo === "campo_grupo") {
        for (const c of etapa.campos) {
          if (c.obrigatorio === false || !campoEstaVisivel(c, answers)) out.push(c.key);
          if (c.key === "rg" || c.key.endsWith("_rg")) {
            const prefix = c.key === "rg" ? "" : c.key.slice(0, -3);
            out.push(prefix ? `${prefix}_rg_separador` : "rg_separador");
          }
        }
        if (etapa.endereco) {
          const e = etapa.endereco;
          out.push(e.cepKey, e.logradouroKey, e.numeroKey, e.bairroKey, e.cidadeKey, e.ufKey);
          if (e.complementoKey) out.push(e.complementoKey);
        }
      } else if (etapa.tipo === "campo" && etapa.campo.obrigatorio === false) {
        out.push(etapa.campo.key);
      }
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

  const respostasComEndereco = useMemo(() => {
    if (!modelo) return answers;
    return aplicarComposicaoModelo(answers, modelo);
  }, [answers, modelo]);

  const respostas: RespostasState = useMemo(
    () => ({ campos: answers, clausulasSelecionadas }),
    [answers, clausulasSelecionadas]
  );

  const handleInputChange = (key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (fieldError) {
      setFieldError(null);
      setPetOverride(null);
      setPetMood("falando");
    }
  };

  const handleGrupoFieldChange = (_grupoKey: string, fieldKey: string, value: string) => {
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

  const validarEtapaAtual = (): string | null => {
    if (!etapaAtual) return null;
    if (etapaAtual.tipo === "campo") {
      const v = (answers[etapaAtual.campo.key] ?? "").trim();
      if (
        etapaAtual.campo.tipo === "lista_pessoas" &&
        hasInvalidMoradoresAutorizados(v)
      ) {
        return "Informe o nome completo de cada morador adicional.";
      }
      if (etapaAtual.campo.obrigatorio !== false && !v) {
        return `Preencha: ${etapaAtual.campo.pergunta}`;
      }
    }
    if (etapaAtual.tipo === "campo_grupo") {
      for (const c of etapaAtual.campos) {
        if (!campoEstaVisivel(c, answers)) continue;
        const v = (answers[c.key] ?? "").trim();
        if (c.obrigatorio !== false && !v) {
          return `Preencha: ${c.pergunta}`;
        }
      }
    }
    return null;
  };

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

  const persistCurrentDraft = async (): Promise<string | undefined> => {
    if (!modelo || !slug) return undefined;

    if (user) {
      const saved = await saveAccountDraft({
        draftId: activeDraftId,
        modeloSlug: slug,
        sourceDocumentId: activeDocumentId,
        respostas: answers,
        stepIndex,
        clausulasSelecionadas,
        extrasPorClausula,
      });
      setActiveDraftId(saved.id);
      return saved.id;
    }

    const requestId = getOrCreateFinalizationRequestId(modelo.slug);
    saveGuestDraft(slug, {
      requestId,
      modeloSlug: slug,
      answers,
      stepIndex,
      clausulasSelecionadas,
      extrasPorClausula,
    });
    return undefined;
  };

  const removeCurrentAccountDraft = async () => {
    if (!activeDraftId) return;
    try {
      await deleteAccountDraft(activeDraftId);
      setActiveDraftId(undefined);
    } catch (error) {
      logger.warn("CriarView", "documento gerado, mas rascunho não foi removido", {
        draftId: activeDraftId,
        error,
      });
    }
  };

  const salvarDocumento = async (respostasFinais: Record<string, string>) => {
    if (!modelo) return;
    setSubmitting(true);
    setMostrandoLoading(true);
    setPetMood("pensando");

    try {
      if (user) {
        const requestId = getOrCreateFinalizationRequestId(modelo.slug);

        if (activeDocumentId) {
          const result = await createDocumentVersion(activeDocumentId, {
            requestId,
            respostas: respostasFinais,
            clausulasSelecionadas,
          });
          clearFinalizationRequestId(modelo.slug);
          await removeCurrentAccountDraft();
          clearGuestDraft(slug);
          navigate("sucesso", { slug, id: result.document.id });
          return;
        }

        const result = await finalizeDocument({
          requestId,
          modeloSlug: modelo.slug,
          respostas: respostasFinais,
          clausulasSelecionadas,
        });
        clearFinalizationRequestId(modelo.slug);
        await removeCurrentAccountDraft();
        clearGuestDraft(slug);
        navigate("sucesso", { slug, id: result.document.id });
      } else {
        await persistCurrentDraft();
        navigate("sucesso", { slug });
      }
    } catch (e) {
      const kind = classifyFinalizationError(e);
      if (kind !== "generic") {
        try {
          await persistCurrentDraft();
        } catch (draftError) {
          logger.warn("CriarView", "falha ao preservar rascunho antes do paywall", draftError);
        }

        const reason: AccessPaywallReason =
          kind === "model_not_free"
            ? "model_not_free"
            : kind === "pro_required"
              ? "pro_required"
              : "monthly_limit";

        setSubmitting(false);
        setMostrandoLoading(false);
        setFieldError(null);
        setPetMood("atencao");
        setPetOverride(
          reason === "model_not_free"
            ? "Este modelo não está na seleção grátis deste mês, mas seu preenchimento está salvo."
            : reason === "pro_required"
              ? "Suas alterações estão prontas. Para gerar uma nova versão deste documento, você precisa do Pro."
              : "Sua geração grátis do mês já foi usada. Seu preenchimento está salvo para você decidir como concluir."
        );
        setAccessPaywallReason(reason);
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
      setFieldError(erro);
      setPetMood("atencao");
      setPetOverride(getErrorLine());
      return;
    }
    setFieldError(null);
    setPetOverride(null);
    normalizarEstadoSeAplicavel();

    setPulseProgress(true);
    setTimeout(() => setPulseProgress(false), UX_CONFIG.PROGRESS_PULSE_DURATION);

    if (isLast) {
      setPetMood("feliz");
      const respostasFinais: Record<string, string> = {
        ...respostasComEndereco,
      };
      for (const extraMap of Object.values(extrasPorClausula)) {
        for (const [key, value] of Object.entries(extraMap)) respostasFinais[key] = value;
      }
      void salvarDocumento(respostasFinais);
      return;
    }

    setPetMood("feliz");
    setPetOverride(null);
    setTimeout(() => setPetMood("falando"), UX_CONFIG.PET_HAPPY_DURATION);
    setStepIndex((i) => Math.min(i + 1, totalEtapas - 1));
  };

  const handleVoltar = () => {
    if (activeDocumentId) {
      navigate("documento-detalhe", { id: activeDocumentId });
      return;
    }
    if (activeDraftId || requestedDraftId) {
      navigate("dashboard");
      return;
    }
    navigate("modelo-detalhe", { slug });
  };

  if (loading) return <CriarLoading />;
  if (!modelo) return <CriarModeloNaoEncontrado onVoltar={() => navigate("modelos")} />;
  if (mostrandoLoading) return <LoadingDocumento nomeModelo={modelo.nome} />;

  const etapaChat: ChatEtapa | null = etapaAtual
    ? etapaAtual.tipo === "campo"
      ? { tipo: "pergunta", campo: etapaAtual.campo }
      : etapaAtual.tipo === "campo_grupo"
        ? { tipo: "grupo", titulo: etapaAtual.tituloGrupo, campos: etapaAtual.campos, endereco: etapaAtual.endereco }
        : { tipo: "clausulas", titulo: etapaAtual.titulo, clausulas: etapaAtual.clausulas }
    : null;

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
  const petText = petOverride ?? petTextBase;
  const progressPct = totalEtapas > 0 ? (stepIndex / totalEtapas) * 100 : 0;

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

      {accessPaywallReason && (
        <FreeLimitPaywall
          reason={accessPaywallReason}
          documentName={modelo.nome}
          onChoosePro={() => {
            void (async () => {
              try {
                const draftId = await persistCurrentDraft();
                navigate("checkout", { plan: "pro", slug, draftId });
              } catch {
                toast.error("Não foi possível salvar o rascunho antes de abrir o checkout.");
              }
            })();
          }}
          onChooseSingle={() => {
            void (async () => {
              try {
                const draftId = await persistCurrentDraft();
                navigate("checkout", { plan: "avulso", slug, draftId });
              } catch {
                toast.error("Não foi possível salvar o rascunho antes de abrir o checkout.");
              }
            })();
          }}
          onSaveDraft={() => {
            void (async () => {
              try {
                await persistCurrentDraft();
                setAccessPaywallReason(null);
                setPetMood("feliz");
                setPetOverride("Rascunho salvo na sua conta. Você pode retomá-lo em Meus Documentos quando quiser.");
                toast.success("Rascunho salvo em Meus Documentos.");
              } catch {
                toast.error("Não foi possível salvar o rascunho. Tente novamente.");
              }
            })();
          }}
          onContinueEditing={() => {
            setAccessPaywallReason(null);
            setPetMood("falando");
            setPetOverride(null);
          }}
        />
      )}
    </>
  );
}
