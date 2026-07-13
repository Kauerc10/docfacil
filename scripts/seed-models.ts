/**
 * Seed script — popula a coleção "models" do Firestore com os 6 modelos locais.
 *
 * Uso:
 *   1. Configure NEXT_PUBLIC_FIREBASE_* no .env
 *   2. bun run seed:models
 *
 * O script usa a Admin SDK via service account (não a client SDK) para ter
 * permissão de escrita. Para isso, baixe a service account key do Firebase
 * Console → Project Settings → Service Accounts → Generate new private key,
 * salve como firebase-service-account.json na raiz, e o script lê ela.
 *
 * Em demo mode (sem Firebase configurado), o script apenas imprime um aviso.
 */
import { MODELOS } from "../src/lib/modelos";

async function main() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId || !apiKey) {
    console.log(
      "\n⚠️  Firebase não configurado. Defina NEXT_PUBLIC_FIREBASE_* no .env para rodar o seed.\n" +
        "   O app já funciona em demo mode com os modelos locais.\n"
    );
    console.log("Modelos que seriam populados:");
    MODELOS.forEach((m) =>
      console.log(`  • ${m.nome} (${m.slug}) — ${m.categoria}, ${m.minutos}min`)
    );
    return;
  }

  try {
    const admin = await import("firebase-admin");
    const serviceAccount = await import("./firebase-service-account.json", {
      with: { type: "json" },
    }).catch(() => null);

    if (!serviceAccount) {
      console.log(
        "\n⚠️  Arquivo firebase-service-account.json não encontrado na raiz.\n" +
          "   Baixe do Firebase Console → Project Settings → Service Accounts →\n" +
          "   Generate new private key, e salve como firebase-service-account.json\n"
      );
      return;
    }

    const cred = admin.credential.cert(
      (serviceAccount as { default: Record<string, unknown> }).default
    );
    if (admin.getApps().length === 0) {
      admin.initializeApp({ credential: cred });
    }
    const db = admin.firestore();

    console.log(`\n🌱 Populando ${MODELOS.length} modelos no Firestore...`);
    for (const m of MODELOS) {
      await db.collection("models").doc(m.slug).set({
        ...m,
        criadoEm: Date.now(),
        atualizadoEm: Date.now(),
      });
      console.log(`  ✓ ${m.nome}`);
    }
    console.log("\n✅ Seed concluído!\n");
  } catch (e) {
    console.error("\n❌ Erro no seed:", e);
    process.exit(1);
  }
}

main();
