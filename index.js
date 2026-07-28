require('dotenv').config();
const OpenAI = require('openai');

// Initialisation du client configuré pour Groq
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Bibliothèque d'outils disponibles en arrière-plan
const toolsLibrary = {
  calculer_tva: (prix, taux) => prix * (1 + taux / 100),
  obtenir_taux_change: (devise) => (devise === "USD" ? 0.92 : 1.0),
};

// Fonction d'exécution en mode sandbox
async function runCodeModeSandbox(codeScript) {
    try {
      const executedFunction = new Function(
        'outils',
        `
        return (async () => {
          const { calculer_tva, obtenir_taux_change } = outils;
          ${codeScript}
          // Si le script a déclaré calculerPrixFinal, on l'exécute et retourne son résultat
          if (typeof calculerPrixFinal === 'function') {
            return await calculerPrixFinal();
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

async function main() {
  const prompt = `
    Je veux acheter 5 articles à 150 USD chacun, convertis en Euros (taux USD), 
    puis appliquer une TVA de 20%. 
    Écris un script JavaScript utilisant les fonctions 'obtenir_taux_change' et 'calculer_tva' 
    pour calculer le prix final total, et retourne le résultat final.
  `;

  console.log("--- Envoi de la requête à l'agent (via Groq) ---");

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `Tu es un agent en Code Mode. Un objet nommé 'outils' contenant déjà les fonctions 'obtenir_taux_change(devise)' et 'calculer_tva(prix, taux)' est *déjà disponible* dans ton contexte d'exécution. 
        N'écris JAMAIS de "const outils = ...". Utilise directement l'objet 'outils' existant.
        Écris un bloc de code JavaScript asynchrone qui résout le problème et retourne le résultat final. Réponds uniquement par le code dans un bloc markdown.`
      },
      { role: "user", content: prompt }
    ]
  });

  const generatedCode = response.choices[0].message.content || "";
  console.log("\n[Code généré par l'IA] :\n", generatedCode);

  const cleanCode = generatedCode.replace(/```javascript|```js|```/g, "").trim();

  console.log("\n--- Exécution du code dans le Sandbox ---");
  const executionResult = await runCodeModeSandbox(cleanCode);
  console.log("Résultat de l'exécution :", executionResult);
}

main();