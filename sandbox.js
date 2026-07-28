require('dotenv').config();
const OpenAI = require('openai');
const fs = require('fs');

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// 🛠️ Notre bibliothèque d'outils exposée proprement à l'agent
const toolsLibrary = {
  recuperer_donnees_brutes: () => {
    console.log("🛠️ [Outil exécuté] -> Récupération des transactions...");
    const rawData = fs.readFileSync('./transactions.json', 'utf8');
    return JSON.parse(rawData);
  },
  obtenir_taux_change: (devise) => {
    console.log(`🛠️ [Outil exécuté] -> Récupération du taux pour ${devise}...`);
    return devise === "USD" ? 0.92 : 1.0;
  },
  sauvegarder_rapport: (nomFichier, contenu) => {
    console.log(`🛠️ [Outil exécuté] -> Sauvegarde du rapport dans ${nomFichier}...`);
    const cheminSecurise = `./${nomFichier.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
    const donneesFinales = typeof contenu === 'string' ? contenu : JSON.stringify(contenu, null, 2);
    fs.writeFileSync(cheminSecurise, donneesFinales, 'utf8');
    return { success: true, message: `Rapport sauvegardé avec succès dans ${cheminSecurise}` };
  }
};

async function runReActAgent() {
  console.log("==================================================");
  console.log("    EXERCICE 8 : BOUCLE MULTI-ÉTAPES (ReAct)      ");
  console.log("==================================================\n");

  // Historique des messages pour guider l'agent pas à pas
  let messages = [
    {
      role: "system",
      content: `Tu es un agent autonome fonctionnant en boucle ReAct (Reasoning, Action, Observation).
      Tu disposes d'outils que tu peux appeler. 
      Pour appeler un outil, réponds UNIQUEMENT au format JSON strict suivant :
      {
        "action": "nom_de_l_outil",
        "args": [parametre1, parametre2]
      }
      
      Si tu as terminé ton travail et que tu souhaites donner le résultat final, réponds au format JSON :
      {
        "terminee": true,
        "resultat": { ... }
      }
      
      Les outils disponibles sont :
      - "recuperer_donnees_brutes()" (aucun argument)
      - "obtenir_taux_change(devise)" (ex: "USD")
      - "sauvegarder_rapport(nomFichier, contenu)" (ex: "rapport_react.json", objetResultat)
      
      Sois méthodique : fais une action à la fois, attends l'observation, puis continue.`
    },
    {
      role: "user",
      content: "Analyse les transactions, calcule le chiffre d'affaires total (en appliquant les taux USD et les remises VIP de 5%), trouve le meilleur client (ou 'Inconnu'), sauvegarde le rapport via l'outil de sauvegarde, puis donne-moi le résultat final."
    }
  ];

  let maxIterations = 5;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`\n--- Itération ReAct n°${iteration} ---`);

    // 1. Demande à l'IA (Reasoning)
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
      response_format: { type: "json_object" } // Force le format JSON pour l'agent
    });

    const rawContent = response.choices[0].message.content;
    console.log(`[Pensée / Action de l'Agent] :\n${rawContent}`);

    let parsedAction;
    try {
      parsedAction = JSON.parse(rawContent);
    } catch (e) {
      console.error("❌ Erreur : L'agent n'a pas renvoyé un JSON valide.");
      break;
    }

    // 2. Vérifier si l'agent a terminé
    if (parsedAction.terminee) {
      console.log("\n✅ L'agent a terminé sa mission avec succès !");
      console.log("Résultat final :", JSON.stringify(parsedAction.resultat, null, 2));
      break;
    }

    // 3. Exécuter l'action demandée par l'agent (Action & Observation)
    const toolName = parsedAction.action;
    const toolArgs = parsedAction.args || [];

    if (toolsLibrary[toolName]) {
      try {
        // Exécution sécurisée de l'outil local
        const observation = toolsLibrary[toolName](...toolArgs);
        console.log(`🔍 [Observation] Résultat de l'outil :`, observation);

        // On nourrit l'historique de l'agent avec son action et l'observation obtenue
        messages.push({ role: "assistant", content: rawContent });
        messages.push({ 
          role: "user", 
          content: `Observation de l'outil '${toolName}' : ${JSON.stringify(observation)}` 
        });

      } catch (err) {
        console.error(`❌ Erreur lors de l'exécution de l'outil ${toolName}:`, err.message);
        messages.push({ role: "assistant", content: rawContent });
        messages.push({ role: "user", content: `Erreur lors de l'exécution de l'outil : ${err.message}` });
      }
    } else {
      console.error(`❌ L'outil '${toolName}' demandé par l'agent n'existe pas.`);
      messages.push({ role: "assistant", content: rawContent });
      messages.push({ role: "user", content: `Erreur : L'outil '${toolName}' n'existe pas.` });
    }
  }
}

runReActAgent();