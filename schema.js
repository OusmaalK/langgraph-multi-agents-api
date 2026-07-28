require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const { z } = require('zod'); // Importation de Zod pour le schéma

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// 1. Définition du Schéma de Sortie Attendu (schema.js / schema structuré)
const outputSchema = z.object({
  chiffreAffairesTotal: z.number().positive("Le chiffre d'affaires doit être un nombre positif"),
  meilleurClient: z.string().min(1, "Le nom du meilleur client ne doit pas être vide ou undefined"),
  analyseTextuelle: z.string().min(10, "L'analyse textuelle est trop courte")
});

// 2. Outils de base
const toolsLibrary = {
  recuperer_donnees_brutes: () => {
    const rawData = fs.readFileSync('./analyse.json', 'utf8');
    return JSON.parse(rawData);
  },
  obtenir_taux_change: (devise) => {
    return devise === "USD" ? 0.92 : 1.0;
  }
};

// 3. Sandbox et Validation Stricte
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
    const rawResult = await executedFunction(toolsLibrary);

    // ÉTAPE CLÉ : Validation du résultat par rapport au Schéma Zod
    const validationResult = outputSchema.safeParse(rawResult);
    if (!validationResult.success) {
      // Si le schéma n'est pas respecté (ex: champ undefined ou mauvais type), on lève une erreur explicite
      const errorMessage = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`Erreur de Schéma de Sortie -> ${errorMessage}`);
    }

    return { success: true, result: validationResult.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 4. Boucle principale avec Auto-Correction sur Schéma
async function main() {
  const MAX_TENTATIVES = 3;

  const userPrompt = `
    Analyse les transactions récupérées via 'recuperer_donnees_brutes()'. 
    Pour chaque transaction :
    1. Convertis le montant en Euros (taux USD = 0.92).
    2. Applique une remise de 5% si le client est VIP ('isVIP' === true).
    
    Retourne un objet JSON valide respectant strictement ces clés :
    - "chiffreAffairesTotal" (number)
    - "meilleurClient" (string, attention le champ s'appelle 'client' dans les données brutes, pas nomClient !)
    - "analyseTextuelle" (string)
  `;

  let messages = [
    {
      role: "system",
      content: `Tu es un agent expert en Code Mode. Tu écris du code JavaScript asynchrone exécuté dans un sandbox.
      L'objet 'outils' est disponible avec 'recuperer_donnees_brutes()' et 'obtenir_taux_change(devise)'.
      N'écris JAMAIS 'const outils = ...'.
      Définis toujours une fonction 'async function executer()' qui retourne un objet JSON correspondant exactement au schéma attendu.
      Réponds UNIQUEMENT par le bloc de code JavaScript.`
    },
    { role: "user", content: userPrompt }
  ];

  console.log("==================================================");
  console.log("   EXERCICE 5 : VALIDATION STRICTE PAR SCHÉMA     ");
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

    console.log("\n[Exécution Sandbox & Validation du Schéma...]");
    const executionResult = await runCodeModeSandbox(cleanCode);

    if (executionResult.success) {
      console.log("\n✅ SUCCÈS ! Le code et le schéma de sortie sont validés.");
      
      const outputPath = './rapport_valide.json';
      fs.writeFileSync(outputPath, JSON.stringify(executionResult.result, null, 2), 'utf8');
      
      console.log(`📁 Fichier de sortie généré : ${outputPath}`);
      console.log("\nRésultat validé :\n", JSON.stringify(executionResult.result, null, 2));
      break;
    } else {
      console.log("\n❌ ÉCHEC DE LA VALIDATION !");
      console.log("Message d'erreur intercepté :", executionResult.error);

      if (tentative < MAX_TENTATIVES) {
        console.log("\n🔄 Transmission de l'erreur de schéma à l'agent pour auto-correction...\n");
        messages.push({ role: "assistant", content: generatedCode });
        messages.push({
          role: "user",
          content: `Ton code a échoué à la validation du schéma de sortie avec l'erreur suivante :\n"${executionResult.error}"\n\nCorrige ton code JavaScript (vérifie bien le nom des propriétés de l'objet, comme 'client' au lieu de 'nomClient') et renvoie UNIQUEMENT le code corrigé.`
        });
      } else {
        console.log("\n🚫 Nombre maximum de tentatives atteint.");
      }
    }
  }
}

main();