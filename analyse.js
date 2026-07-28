require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// 1. Outils de base
const toolsLibrary = {
  recuperer_donnees_brutes: () => {
    const rawData = fs.readFileSync('./analyse.json', 'utf8');
    return JSON.parse(rawData);
  },
  obtenir_taux_change: (devise) => {
    return devise === "USD" ? 0.92 : 1.0;
  }
};

// 2. Sandbox d'exécution sécurisé
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

// 3. Boucle principale
async function main() {
  const MAX_TENTATIVES = 3;

  const userPrompt = `
    Analyse les transactions récupérées via 'recuperer_donnees_brutes()'. 
    Pour chaque transaction :
    1. Convertis le montant en Euros (taux USD = 0.92).
    2. Applique une remise de 5% si le client est VIP ('isVIP' === true).
    
    Ensuite, calcule :
    - Le chiffre d'affaires total net en Euros.
    - La transaction la plus élevée (montant net et nom du client).
    
    Enfin, génère un objet JSON contenant :
    - "chiffreAffairesTotal": le total arrondi à 2 décimales,
    - "meilleurClient": le nom du client ayant généré le plus gros montant net après remise,
    - "analyseTextuelle": un court paragraphe rédigé en français résumant les performances de ces transactions pour le management.
  `;

  let messages = [
    {
      role: "system",
      content: `Tu es un agent expert en Code Mode. Tu écris du code JavaScript asynchrone exécuté dans un sandbox.
      L'objet 'outils' est disponible avec 'recuperer_donnees_brutes()' et 'obtenir_taux_change(devise)'.
      N'écris JAMAIS 'const outils = ...'.
      Définis toujours une fonction 'async function executer()' qui retourne un objet JSON structuré contenant les calculs et le texte d'analyse.
      Réponds UNIQUEMENT par le bloc de code JavaScript.`
    },
    { role: "user", content: userPrompt }
  ];

  console.log("==================================================");
  console.log("   EXERCICE 4 : ANALYSE & RAPPORT TEXTUEL         ");
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
      console.log("\n✅ SUCCÈS ! Analyse et rapport générés.");
      
      const outputPath = './rapport_analyse.json';
      fs.writeFileSync(outputPath, JSON.stringify(executionResult.result, null, 2), 'utf8');
      
      console.log(`📁 Fichier de sortie généré : ${outputPath}`);
      console.log("\nRésultat de l'agent :\n", JSON.stringify(executionResult.result, null, 2));
      break;
    } else {
      console.log("\n❌ ÉCHEC DE L'EXÉCUTION dans le Sandbox !");
      console.log("Message d'erreur intercepté :", executionResult.error);

      if (tentative < MAX_TENTATIVES) {
        console.log("\n🔄 Transmission de l'erreur à l'agent pour auto-correction...\n");
        messages.push({ role: "assistant", content: generatedCode });
        messages.push({
          role: "user",
          content: `L'exécution a échoué dans le Sandbox avec l'erreur :\n"${executionResult.error}"\n\nCorrige ton code et renvoie UNIQUEMENT le code JavaScript corrigé.`
        });
      } else {
        console.log("\n🚫 Nombre maximum de tentatives atteint.");
      }
    }
  }
}

main();