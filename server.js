require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { StateGraph, END } = require("@langchain/langgraph");

// Import direct du JSON en mémoire (fonctionne partout, y compris sur Vercel)
const transactionsData = require('./transactions.json');

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
  console.log("🔍 [Agent Analyste] : Utilisation des données en mémoire...");
  return { donneesBrutes: transactionsData };
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
  console.log("✍️ [Agent Rédacteur] : Génération du rapport en mémoire...");
  return { rapportStatut: "Rapport généré avec succès en mémoire" };
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

// --- Nouvelle Route Publique (appelée par le Front-end) ---
app.post('/api/agent/lancer', async (req, res) => {
  const { sessionId, prompt } = req.body;
  try {
    console.log(`\n📥 Requête reçue du Front-end pour la session [${sessionId}]`);
    
    // Exécution directe du graphe d'agents en interne (sans exposer de clé au client)
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

// --- Route API ---
app.post('/api/agent/executer', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
  
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
module.exports = app;