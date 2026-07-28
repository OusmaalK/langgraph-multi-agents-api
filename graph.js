const { StateGraph, END } = require("@langchain/langgraph");

// 1. Définition de la structure de l'État partagé entre les agents
const GraphState = {
  messages: {
    value: (x, y) => x.concat(y),
    default: () => [],
  },
  donneesBrutes: {
    value: (x, y) => y ?? x,
    default: () => null,
  },
  totalMontant: {
    value: (x, y) => y ?? x,
    default: () => 0,
  },
  rapportStatut: {
    value: (x, y) => y ?? x,
    default: () => null,
  }
};

// 2. Création du graphe
const workflow = new StateGraph({
  channels: GraphState,
});

// Définition des fonctions de chaque agent (les nœuds)
async function agentAnalyste(state) {
  console.log("🔍 [Agent Analyste] : Récupération des données brutes...");
  const fs = require('fs');
  const rawData = fs.readFileSync('./transactions.json', 'utf8');
  const donnees = JSON.parse(rawData);
  
  return { donneesBrutes: donnees };
}

async function agentComptable(state) {
  console.log("🧮 [Agent Comptable] : Calcul du total des montants...");
  const donnees = state.donneesBrutes;
  const total = donnees.reduce((acc, curr) => acc + curr.montant, 0);
  
  return { totalMontant: total };
}

async function agentRédacteur(state) {
  console.log("✍️ [Agent Rédacteur] : Génération et sauvegarde du rapport...");
  const fs = require('fs');
  const path = require('path');
  
  const rapport = {
    total: state.totalMontant,
    donnees: state.donneesBrutes,
    dateGeneration: new Date().toISOString()
  };
  
  const chemin = path.join(__dirname, 'rapport_api.json');
  fs.writeFileSync(chemin, JSON.stringify(rapport, null, 2), 'utf8');
  
  return { rapportStatut: `Sauvegardé avec succès à ${chemin}` };
}

// 3. Ajout des nœuds au graphe
workflow.addNode("analyste", agentAnalyste);
workflow.addNode("comptable", agentComptable);
workflow.addNode("redacteur", agentRédacteur);

// 4. Définition des connexions (le flux d'exécution séquentiel)
workflow.addEdge("__start__", "analyste");
workflow.addEdge("analyste", "comptable");
workflow.addEdge("comptable", "redacteur");
workflow.addEdge("redacteur", END);

// 5. Compilation du graphe
const appGraph = workflow.compile();

async function executerWorkflow() {
  const resultatFinal = await appGraph.invoke({});
  console.log("✨ Résultat final du graphe multi-agents :", resultatFinal);
}

executerWorkflow();