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

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      <GsapSafety />
      <Header />
      <main className="flex-1">
        <Hero />
        <Catalog />
        <HowItWorks />
        <AIBanner />
        <SocialProof />
        <SuccessShowcase />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
