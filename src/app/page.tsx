"use client";

import { NavProvider, useNav } from "@/components/docfacil/nav-context";
import { Header } from "@/components/docfacil/header";
import { Hero } from "@/components/docfacil/hero";
import { Catalog } from "@/components/docfacil/catalog";
import { HowItWorks } from "@/components/docfacil/how-it-works";
import { AIBanner } from "@/components/docfacil/ai-banner";
import { SocialProof } from "@/components/docfacil/social-proof";
import { SuccessShowcase } from "@/components/docfacil/success-showcase";
import { Footer } from "@/components/docfacil/footer";
import { WhatsAppButton } from "@/components/docfacil/whatsapp-button";
import { GsapSafety } from "@/components/docfacil/gsap-safety";
import { ModelosView } from "@/components/docfacil/views/modelos-view";
import { ModeloDetalheView } from "@/components/docfacil/views/modelo-detalhe-view";
import { CriarView } from "@/components/docfacil/views/criar-view";
import { SucessoView } from "@/components/docfacil/views/sucesso-view";
import { IAView } from "@/components/docfacil/views/ia-view";
import { PlanosView } from "@/components/docfacil/views/planos-view";
import { DashboardView } from "@/components/docfacil/views/dashboard-view";
import { DocumentoDetalheView } from "@/components/docfacil/views/documento-detalhe-view";
import { PerfilView } from "@/components/docfacil/views/perfil-view";
import { AjudaView } from "@/components/docfacil/views/ajuda-view";
import { LoginView } from "@/components/docfacil/views/login-view";
import { CadastroView } from "@/components/docfacil/views/cadastro-view";

function HomeView() {
  return (
    <>
      <Hero />
      <Catalog />
      <HowItWorks />
      <AIBanner />
      <SocialProof />
      <SuccessShowcase />
    </>
  );
}

function CurrentView() {
  const { view } = useNav();
  switch (view) {
    case "home":
      return <HomeView />;
    case "modelos":
      return <ModelosView />;
    case "modelo-detalhe":
      return <ModeloDetalheView />;
    case "criar":
      return <CriarView />;
    case "sucesso":
      return <SucessoView />;
    case "ia":
      return <IAView />;
    case "planos":
      return <PlanosView />;
    case "dashboard":
      return <DashboardView />;
    case "documento-detalhe":
      return <DocumentoDetalheView />;
    case "perfil":
      return <PerfilView />;
    case "ajuda":
      return <AjudaView />;
    case "login":
      return <LoginView />;
    case "cadastro":
      return <CadastroView />;
    default:
      return <HomeView />;
  }
}

export default function Home() {
  return (
    <NavProvider>
      <div className="relative min-h-screen flex flex-col bg-paper">
        <GsapSafety />
        <Header />
        <main className="flex-1">
          <CurrentView />
        </main>
        <Footer />
        <WhatsAppButton />
      </div>
    </NavProvider>
  );
}
