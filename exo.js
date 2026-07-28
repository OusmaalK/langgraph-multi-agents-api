require('dotenv').config();
const OpenAI = require('openai');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// 1. Outils avec validation stricte (conçus pour lever des erreurs si mal utilisés)
const toolsLibrary = {
  diviser: (a, b) => {
    if (b === 0) throw new Error("Erreur Outil: Division par zéro impossible !");
    return a / b;
  },
  calculer_somme: (tableau) => {
    if (!Array.isArray(tableau)) {
      throw new Error("Erreur Outil: 'calculer_somme' attend un Tableau (Array), pas une chaîne de caractères ni un nombre !");
    }
    return tableau.reduce((acc, val) => acc + Number(val), 0);
  }
};

// 2. Sandbox d'exécution sécurisé et isolé
async function runCodeModeSandbox(codeScript) {
  try {
    const executedFunction = new Function(
      'outils',
      `
      return (async () => {
        const { diviser, calculer_somme } = outils;
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
    // L'erreur est capturée ici sans faire planter le programme principal
    return { success: false, error: error.message };
  }
}

// 3. Boucle d'Auto-Correction (Self-Correction Loop)
async function main() {
  const MAX_TENTATIVES = 3;

  // Prompt incitant l'agent à envoyer une chaîne au lieu d'un tableau au 1er essai
  const userPrompt = `
    J'ai une liste de nombres sous forme de texte : "10, 20, 30, 40".
    Utilise la fonction 'calculer_somme' pour calculer le total.
  `;

  let messages = [
    {
      role: "system",
      content: `Tu es un agent en Code Mode. Tu écris du code JavaScript asynchrone exécuté dans un sandbox.
      L'objet 'outils' est déjà disponible avec 'diviser(a, b)' et 'calculer_somme(tableau)'.
      N'écris JAMAIS 'const outils = ...'.
      Définis toujours une fonction 'async function executer()' qui retourne le résultat final.
      Réponds UNIQUEMENT par le bloc de code JavaScript.`
    },
    { role: "user", content: userPrompt }
  ];

  console.log("==================================================");
  console.log("   EXERCICE 2 : ISOLATION & AUTO-CORRECTION       ");
  console.log("==================================================\n");

  for (let tentative = 1; tentative <= MAX_TENTATIVES; tentative++) {
    console.log(`--- Tentative n°${tentative} ---`);

    // Génération du code par le LLM
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
    });

    const generatedCode = response.choices[0].message.content || "";
    console.log("[Code généré par l'IA] :\n", generatedCode);

    const cleanCode = generatedCode.replace(/```javascript|```js|```/g, "").trim();

    // Exécution isolée dans le Sandbox
    console.log("\n[Exécution Sandbox...]");
    const executionResult = await runCodeModeSandbox(cleanCode);

    // Analyse du résultat
    if (executionResult.success) {
      console.log("\n✅ SUCCÈS ! L'agent a exécuté le code sans erreur.");
      console.log("Résultat final obtenu :", executionResult.result);
      break;
    } else {
      console.log("\n❌ ÉCHEC DE L'EXÉCUTION dans le Sandbox !");
      console.log("Message d'erreur intercepté :", executionResult.error);

      if (tentative < MAX_TENTATIVES) {
        console.log("\n🔄 Réinjection de l'erreur dans la mémoire de l'agent pour auto-correction...\n");
        
        // Ajout du code erroné et du message d'erreur à l'historique de conversation
        messages.push({ role: "assistant", content: generatedCode });
        messages.push({
          role: "user",
          content: `L'exécution de ton code a échoué dans le Sandbox avec l'erreur suivante :\n"${executionResult.error}"\n\nAnalyse l'erreur, corrige ton code JavaScript et renvoie UNIQUEMENT le nouveau code corrigé.`
        });
      } else {
        console.log("\n🚫 Nombre maximum de tentatives atteint.");
      }
    }
  }
}

main();