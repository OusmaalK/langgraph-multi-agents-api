require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// 1. Définition des outils disponibles en arrière-plan
const toolsLibrary = {
  recuperer_donnees_brutes: () => {
    const rawData = fs.readFileSync('./transactions.json', 'utf8');
    return JSON.parse(rawData);
  },
  obtenir_taux_change: (devise) => {
    return devise === "USD" ? 0.92 : 1.0;
  }
};

// 2. Sandbox d'exécution sécurisé et isolé
async function runCodeModeSandbox(codeScript) {
  try {
    const executedFunction = new Function(
      'outils',
      `
      return (async () => {
        const { recuperer_donnees_brutes, obtenir_taux_change } = outils;
        ${codeScript}
        if (typeof executer === 'function') {
          return await executer();
        }
      })();
    `
    );
    const result = await executedFunction(toolsLibrary);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 3. Boucle principale avec Auto-Correction et export JSON
async function main() {
  const MAX_TENTATIVES = 3;

  const userPrompt = `
    Traite les transactions récupérées via 'recuperer_donnees_brutes()'. 
    Pour chaque transaction :
    1. Convertis le montant en Euros en utilisant le taux de change 'obtenir_taux_change(devise)'.
    2. Si le client 'isVIP' est vrai, applique une remise de 5% sur son montant converti.
    3. Construis et retourne un objet JSON structuré contenant :
       - "nombreTotalTransactions": le nombre total de transactions traitées,
       - "chiffreAffairesTotalEUR": le chiffre d'affaires total net arrondi à 2 décimales,
       - "details": un tableau reprenant chaque transaction avec son montant initial, sa devise, le statut VIP et le montant final net en Euros.
  `;

  let messages = [
    {
      role: "system",
      content: `Tu es un agent en Code Mode. Tu écris du code JavaScript asynchrone exécuté dans un sandbox.
      L'objet 'outils' est déjà disponible avec 'recuperer_donnees_brutes()' et 'obtenir_taux_change(devise)'.
      N'écris JAMAIS 'const outils = ...'.
      Définis toujours une fonction 'async function executer()' qui retourne un objet JSON (ou un objet JavaScript) structuré.
      Attention : les montants dans les données peuvent contenir des virgules ou des espaces. Pense à bien les nettoyer (remplacer les espaces, remplacer ',' par '.') et les convertir en nombres (parseFloat).
      Réponds UNIQUEMENT par le bloc de code JavaScript.`
    },
    { role: "user", content: userPrompt }
  ];

  console.log("==================================================");
  console.log("   SCÉNARIO RÉEL : EXPORT RÉSULTAT JSON           ");
  console.log("==================================================\n");

  for (let tentative = 1; tentative <= MAX_TENTATIVES; tentative++) {
    console.log(`--- Tentative n°${tentative} ---`);

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
    });

    const generatedCode = response.choices[0].message.content || "";
    console.log("[Code généré par l'IA] :\n", generatedCode);

    const cleanCode = generatedCode.replace(/```javascript|```js|```/g, "").trim();

    console.log("\n[Exécution Sandbox...]");
    const executionResult = await runCodeModeSandbox(cleanCode);

    if (executionResult.success) {
      console.log("\n✅ SUCCÈS ! Traitement financier terminé.");
      
      // Sauvegarde du résultat dans un fichier JSON de sortie
      const outputPath = './resultat_reconciliation.json';
      fs.writeFileSync(outputPath, JSON.stringify(executionResult.result, null, 2), 'utf8');
      
      console.log(`📁 Fichier JSON de sortie généré avec succès : ${outputPath}`);
      console.log("\nContenu du résultat :", JSON.stringify(executionResult.result, null, 2));
      break;
    } else {
      console.log("\n❌ ÉCHEC DE L'EXÉCUTION dans le Sandbox !");
      console.log("Message d'erreur intercepté :", executionResult.error);

      if (tentative < MAX_TENTATIVES) {
        console.log("\n🔄 Réinjection de l'erreur dans la mémoire de l'agent pour auto-correction...\n");
        messages.push({ role: "assistant", content: generatedCode });
        messages.push({
          role: "user",
          content: `L'exécution de ton code a échoué dans le Sandbox avec l'erreur :\n"${executionResult.error}"\n\nCorrige ton code JavaScript et renvoie UNIQUEMENT le code corrigé.`
        });
      } else {
        console.log("\n🚫 Nombre maximum de tentatives atteint.");
      }
    }
  }
}

main();