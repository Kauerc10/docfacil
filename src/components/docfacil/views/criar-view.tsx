"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNav } from "../nav-context";
import { useAuth } from "@/lib/auth-context";
import { getModel } from "@/lib/services/models-service";
import { createDocument } from "@/lib/services/documents-service";
import { normalizarEstado, aplicarComposicaoEndereco } from "@/lib/normalizers";
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

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [clausulasSelecionadas, setClausulasSelecionadas] = useState<string[]>([]);
  const [extrasPorClausula, setExtrasPorClausula] = useState<
    Record<string, Record<string, string>>
  >({});
  const [petMood, setPetMood] = useState<PetMood>("falando");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"perguntas" | "visualizar">("perguntas");
  const [pulseProgress, setPulseProgress] = useState(false);

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // === Load model ===========================================================
  const loadModel = useCallback(async () => {
    setLoading(true);
    try {
      const m = await getModel(slug);
      setModelo(m);
    } catch (e) {
      logger.error("CriarView", "falha ao carregar modelo", e, { slug });
      setModelo(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  // Cleanup pending timers on unmount.
  useEffect(() => {
    return () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    };
  }, []);

  // === etapasEfetivas =======================================================
  // Static model.etapas + dynamic "campo" steps for each selected clause's
  // camposExtras. Recomputed when selection changes.
  const etapasEfetivas: EtapaModelo[] = useMemo(() => {
    if (!modelo?.etapas) return [];
    const out: EtapaModelo[] = [];
    for (const etapa of modelo.etapas) {
      out.push(etapa);
      if (etapa.tipo === "clausulas") {
        for (const clausula of etapa.clausulas) {
          if (
            clausulasSelecionadas.includes(clausula.id) &&
            clausula.camposExtras &&
            clausula.camposExtras.length > 0
          ) {
            for (const extra of clausula.camposExtras) {
              out.push({ tipo: "campo", campo: extra });
            }
          }
        }
      }
    }
    return out;
  }, [modelo, clausulasSelecionadas]);

  const totalEtapas = etapasEfetivas.length;
  const etapaAtual = etapasEfetivas[stepIndex];
  const isLast = stepIndex + 1 >= totalEtapas;

  // Campos opcionais (obrigatorio === false) → viram string vazia no preview
  // em vez de "______________________" quando não preenchidos.
  // Inclui também os campos individuais de endereço (ex.: "_cep", "_rua",
  // "_numero", etc.) — o que aparece no template é a `saidaKey` (composta),
  // não os campos separados.
  const camposOpcionais = useMemo(() => {
    if (!modelo?.etapas) return [];
    const out: string[] = [];
    for (const etapa of modelo.etapas) {
      if (etapa.tipo === "campo_grupo") {
        for (const c of etapa.campos) if (c.obrigatorio === false) out.push(c.key);
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
    }
    return out;
  }, [modelo]);

  // clausulas selecionadas → id:corpo para o preview
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

  // === Composição de endereço =================================================
  // Para cada `campo_grupo` com `endereco` configurado, monta a string final
  // (ex.: "Rua das Flores, 123 - Centro, São Paulo/SP, CEP 01234-567") e
  // atribui à `saidaKey` (ex.: "endereco" ou "imovel"). Essa string é o que
  // o template consome via `{{endereco}}` ou `{{imovel}}`.
  // Aplicada tanto para o PreviewA4 (live preview) quanto para createDocument (save).
  const respostasComEndereco = useMemo(() => {
    if (!modelo) return answers;
    return aplicarComposicaoEndereco(answers, modelo);
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
      setPetMood("falando");
    }
  };

  // Validação: pergunta → obrigatório se campo.obrigatorio !== false
  const validarEtapaAtual = (): string | null => {
    if (!etapaAtual) return null;
    if (etapaAtual.tipo === "campo") {
      const c = etapaAtual.campo;
      const v = (answers[c.key] ?? "").trim();
      if (c.obrigatorio !== false && !v) {
        return "Preencha este campo para avançar.";
      }
    } else if (etapaAtual.tipo === "campo_grupo") {
      for (const c of etapaAtual.campos) {
        const v = (answers[c.key] ?? "").trim();
        if (c.obrigatorio !== false && !v) {
          return `Preencha: ${c.pergunta}`;
        }
      }
    }
    // clausulas: sempre pode avançar (seleção opcional)
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

  const salvarDocumento = async (respostasFinais: Record<string, string>) => {
    if (!modelo) return;
    setSubmitting(true);
    setMostrandoLoading(true);
    setPetMood("pensando");
    // LoadingDocumento animação é 1.5s — esperamos esse tempo mínimo antes
    // de navegar pra sucesso, dando sensação de "preparando seu documento".
    advanceTimer.current = setTimeout(async () => {
      try {
        const userId = user?.uid || "demo";
        const doc = await createDocument({
          modeloSlug: modelo.slug,
          modeloNome: modelo.nome,
          respostas: respostasFinais,
          status: "concluido",
          userId,
        });
        navigate("sucesso", { slug, id: doc.id });
      } catch (e) {
        logger.error("CriarView", "falha ao salvar documento", e, { slug });
        // Não bloqueamos o usuário — navegamos mesmo assim pra que ele não
        // perca o preenchimento. SucessoView lida com fallback.
        setSubmitting(false);
        setMostrandoLoading(false);
        navigate("sucesso", { slug });
      }
    }, 1500);
  };

  const handleAvancar = () => {
    if (!etapaAtual || submitting) return;
    const erro = validarEtapaAtual();
    if (erro) {
      setFieldError(erro);
      setPetMood("atencao");
      return;
    }
    setFieldError(null);
    normalizarEstadoSeAplicavel();

    // progress-pulse ao completar a etapa
    setPulseProgress(true);
    setTimeout(() => setPulseProgress(false), UX_CONFIG.PROGRESS_PULSE_DURATION);

    if (isLast) {
      // Snapshot final: answers + extras de cláusulas achatados no mesmo mapa
      // + composição de endereço (string final em `saidaKey`).
      const respostasFinais: Record<string, string> = { ...respostasComEndereco };
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
  const petText =
    etapaAtual?.tipo === "campo"
      ? etapaAtual.campo.pergunta
      : etapaAtual?.tipo === "campo_grupo"
      ? etapaAtual.tituloGrupo ?? "Preencha os campos abaixo:"
      : etapaAtual?.tipo === "clausulas"
      ? etapaAtual.titulo ?? "Selecione as cláusulas opcionais:"
      : "Vamos começar?";

  const progressPct = totalEtapas > 0 ? (stepIndex / totalEtapas) * 100 : 0;

  // === Render: main split-screen ============================================
  return (
    <CriarLayout
      step={stepIndex}
      total={totalEtapas}
      progressPct={progressPct}
      pulseProgress={pulseProgress}
      mobileTab={mobileTab}
      onMobileTabChange={setMobileTab}
      onVoltar={handleVoltar}
      previewSlot={
        <div className="w-full max-w-[340px] mx-auto">
          <PreviewA4
            titulo={modelo.template.titulo}
            corpo={modelo.template.corpo}
            respostas={respostasComEndereco}
            clausulas={clausulasMap}
            camposOpcionais={camposOpcionais}
          />
        </div>
      }
    >
      {etapaChat && (
        <ChatStep
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
        />
      )}
      {fieldError && (
        <p
          role="alert"
          className="mt-3 text-sm text-[var(--coral)] font-medium pl-1 flex items-center gap-1.5"
        >
          <span aria-hidden="true">⚠</span>
          {fieldError}
        </p>
      )}
    </CriarLayout>
  );
}
