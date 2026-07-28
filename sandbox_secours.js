require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');
const { z } = require('zod');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const outputSchema = z.object({
  chiffreAffairesTotal: z.number().positive(),
  meilleurClient: z.string().min(1),
  analyseTextuelle: z.string().min(10)
});

// 🛠️ Boîte à outils enrichie avec un outil d'API externe (Taux de change en direct)
const toolsLibrary = {
  recuperer_donnees_brutes: () => {
    const rawData = fs.readFileSync('./transactions.json', 'utf8');
    return JSON.parse(rawData);
  },
  
  // 🌍 Outil asynchrone d'API externe (Ex: taux de change réel via une API publique gratuite)
  obtenir_taux_change_api: async (deviseCible) => {
    try {
      // Utilisation d'une API publique de taux de change (ex: open.er-api.com)
      const response = await fetch(`https://open.er-api.com/v6/latest/USD`);
      if (!response.ok) throw new Error("Erreur lors de l'appel à l'API de change");
      
      const data = await response.json();
      // Retourne le taux par rapport à l'USD ou à l'EUR selon les besoins
      return data.rates[deviseCible] || 0.92;
    } catch (error) {
      console.warn("⚠️ API externe injoignable, repli sur le taux fixe (0.92)");
      return 0.92; // Valeur de repli (fallback)
    }
  },

  sauvegarder_rapport: (nomFichier, contenu) => {
    const cheminSecurise = `./${nomFichier.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const donneesFinales = typeof contenu === 'string' ? contenu : JSON.stringify(contenu, null, 2);
    
    fs.writeFileSync(cheminSecurise, donneesFinales, 'utf8');
    return { success: true, message: `Rapport sauvegardé avec succès dans ${cheminSecurise}` };
  }
};

// 🛡️ SANDBOX SÉCURISÉ (autorise l'async pour les API)
async function runSecureSandbox(codeScript) {
    try {
      const isolatedFunction = new Function(
        'outils',
        'require',
        'process',
        'global',
        'Buffer',
        `
        'use strict';
        return (async () => {
          ${codeScript}
          if (typeof executer === 'function') {
            return await executer();
          }
          throw new Error("La fonction 'executer' est introuvable.");
        })();
        `
      );
 
      const rawResult = await isolatedFunction(toolsLibrary, undefined, undefined, undefined, undefined);
 
      const validationResult = outputSchema.safeParse(rawResult);
      if (!validationResult.success) {
        const issuesList = validationResult.error.issues || validationResult.error.errors || [];
        const errorMessage = issuesList.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Zod Validation Error -> ${errorMessage}`);
      }
 
      return { success: true, result: validationResult.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
}

async function main() {
  const MAX_TENTATIVES = 3;

  const userPrompt = `
    Analyse les transactions récupérées via 'outils.recuperer_donnees_brutes()'.
    
    Pour chaque transaction :
    1. Convertis le montant en nombre avec parseFloat().
    2. Si la devise est 'USD', utilise l'outil asynchrone 'await outils.obtenir_taux_change_api("EUR")' pour obtenir le taux de change en direct du marché.
    3. Applique une remise de 5% si 'isVIP' est true.
    
    Retourne un objet JSON valide avec :
    - "chiffreAffairesTotal": nombre total (arrondi avec toFixed(2) puis converti en nombre via parseFloat).
    - "meilleurClient": le nom du client (ou 'Inconnu' si absent).
    - "analyseTextuelle": un texte de résumé d'au moins 10 caractères mentionnant l'utilisation du taux en direct.
    
    Sauvegarde le rapport final via 'outils.sauvegarder_rapport("rapport_api.json", resultat)' avant de le retourner.
  `;

  let messages = [
    {
      role: "system",
      content: `Tu es un agent en Code Mode fonctionnant dans un sandbox sécurisé.
      Tu disposes d'un outil asynchrone 'outils.obtenir_taux_change_api(devise)'. Tu dois utiliser 'await' pour l'appeler.
      Définis une fonction 'async function executer()' qui retourne l'objet JSON attendu.
      Réponds UNIQUEMENT par le bloc de code JavaScript.`
    },
    { role: "user", content: userPrompt }
  ];

  console.log("==================================================");
  console.log("    EXERCICE 7 : AGENT AVEC API EXTERNE           ");
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

    console.log("\n[Exécution dans le Sandbox Isolé avec Appel API...]");
    const executionResult = await runSecureSandbox(cleanCode);

    if (executionResult.success) {
      console.log("\n✅ SUCCÈS ! L'agent a interrogé l'API externe et validé le tout.");
      
      const outputPath = './rapport_api_externe.json';
      fs.writeFileSync(outputPath, JSON.stringify(executionResult.result, null, 2), 'utf8');
      
      console.log(`📁 Fichier de sortie généré : ${outputPath}`);
      console.log("\nRésultat final :\n", JSON.stringify(executionResult.result, null, 2));
      break;
    } else {
      console.log("\n❌ ÉCHEC DE L'EXÉCUTION !");
      console.log("Message d'erreur intercepté :", executionResult.error);

      if (tentative < MAX_TENTATIVES) {
        messages.push({ role: "assistant", content: generatedCode });
        messages.push({
          role: "user",
          content: `Ton code a échoué avec l'erreur :\n"${executionResult.error}"\nCorrige le code en pensant à utiliser 'await' pour les fonctions asynchrones de l'objet 'outils'. Renvoie UNIQUEMENT le code corrigé.`
        });
      } else {
        console.log("\n🚫 Nombre maximum de tentatives atteint.");
      }
    }
  }
}

main();