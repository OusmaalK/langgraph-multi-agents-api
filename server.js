require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { StateGraph, END } = require("@langchain/langgraph");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// --- Définition du Graphe Multi-Agents ---
const GraphState = {
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

const workflow = new StateGraph({ channels: GraphState });

// Nœud 1 : Agent Analyste
async function agentAnalyste(state) {
  console.log("🔍 [Agent Analyste] : Récupération des données brutes...");
  const rawData = fs.readFileSync('./transactions.json', 'utf8');
  return { donneesBrutes: JSON.parse(rawData) };
}

// Nœud 2 : Agent Comptable
async function agentComptable(state) {
  console.log("🧮 [Agent Comptable] : Calcul du total des montants...");
  const donnees = state.donneesBrutes;
  const total = donnees.reduce((acc, curr) => acc + curr.montant, 0);
  return { totalMontant: total };
}

// Nœud 3 : Agent Rédacteur
async function agentRédacteur(state) {
  console.log("✍️ [Agent Rédacteur] : Génération et sauvegarde du rapport...");
  const chemin = path.join(__dirname, 'rapport_api.json');
  const rapport = {
    total: state.totalMontant,
    donnees: state.donneesBrutes,
    dateGeneration: new Date().toISOString()
  };
  fs.writeFileSync(chemin, JSON.stringify(rapport, null, 2), 'utf8');
  return { rapportStatut: `Rapport sauvegardé avec succès dans ${chemin}` };
}

// Ajout et liaison des nœuds
workflow.addNode("analyste", agentAnalyste);
workflow.addNode("comptable", agentComptable);
workflow.addNode("redacteur", agentRédacteur);

workflow.addEdge("__start__", "analyste");
workflow.addEdge("analyste", "comptable");
workflow.addEdge("comptable", "redacteur");
workflow.addEdge("redacteur", END);

const appGraph = workflow.compile();

// --- Route API ---
app.post('/api/agent/executer', async (req, res) => {
    // 1. Récupération de la clé fournie dans l'en-tête (header) de la requête
    const apiKey = req.headers['x-api-key'];
  
    // 2. Vérification par rapport à la variable d'environnement
    if (!apiKey || apiKey !== process.env.EXTERNAL_API_KEY) {
      return res.status(401).json({ 
        success: false, 
        error: "Accès refusé : Clé API manquante ou invalide." 
      });
    }
  
    const { sessionId, prompt } = req.body;
    try {
      console.log(`\n📥 Exécution sécurisée du Graphe Multi-Agents pour la session [${sessionId}]`);
      
      const resultatFinal = await appGraph.invoke({});
      
      return res.json({ 
        success: true, 
        sessionId, 
        architecture: "Multi-Agents (LangGraph)",
        resultat: {
          message: resultatFinal.rapportStatut,
          total: resultatFinal.totalMontant,
          donnees: resultatFinal.donneesBrutes
        } 
      });
    } catch (error) {
      console.error(`❌ Erreur :`, error.message);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

app.listen(PORT, () => {
  console.log(`🚀 Serveur Multi-Agents démarré sur le port ${PORT}`);
});