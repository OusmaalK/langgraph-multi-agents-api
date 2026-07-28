Voici un modèle de documentation prêt à l'emploi que vous pouvez partager avec vos utilisateurs pour leur expliquer comment utiliser votre API d'orchestration multi-agents.

---

📚 Documentation de l'API Multi-Agents (LangGraph)

Bienvenue sur la documentation officielle de l'API d'orchestration multi-agents. Cette API permet d'exécuter un workflow automatisé combinant plusieurs agents (Analyste et Comptable) pour traiter des données financières.


🌐 1. Point d'accès (Endpoint)

URL de base : `[https://langgraph-multi-agents-api.vercel.app](https://langgraph-multi-agents-api.vercel.app)` *(ou votre domaine de déploiement)*
Route : `/api/agent/executer`
Méthode HTTP : `POST`
Format des données : `application/json`


🔒 2. Authentification et Sécurité

L'accès à l'API est sécurisé par une clé API. Vous devez impérativement l'inclure dans les en-têtes (headers) de chacune de vos requêtes.

Header requis : `x-api-key: <VOTRE_CLE_API>`


📥 3. Format de la Requête (Request)

Envoyez un objet JSON contenant les paramètres suivants :

{
  "sessionId": "session_web_123456",
  "prompt": "Lancer le workflow d'analyse"
}


Paramètres :

`sessionId` (String, optionnel) : Identifiant unique de votre session ou de votre utilisateur.
`prompt` (String, optionnel) : Instructions ou message transmis pour l'exécution.


📤 4. Format de la Réponse (Response)

En cas de succès (`200 OK`) :

{
  "success": true,
  "sessionId": "session_web_123456",
  "architecture": "Multi-Agents (LangGraph)",
  "resultat": {
    "message": "Rapport généré avec succès en mémoire",
    "total": 2051.25,
    "donnees": [
      {
        "id": 1,
        "montant": 150.5,
        "devise": "USD",
        "isVIP": true
      }
    ]
  }
}

⚠️ 5. Gestion des Erreurs

En cas de problème, l'API retourne un code d'erreur HTTP accompagné d'un message explicatif au format JSON :

`401 Unauthorized` : Clé API manquante, incorrecte ou invalide.

{
  "success": false,
  "error": "Accès refusé : Clé API manquante ou invalide."
}

`500 Internal Server Error` : Erreur interne survenue lors de l'exécution du graphe d'agents.

{
  "success": false,
  "error": "Message décrivant l'erreur technique..."
}

💻 6. Exemple d'utilisation (cURL)

Voici un exemple de requête à tester depuis votre terminal :

curl -X POST https://votre-projet.vercel.app/api/agent/executer \
  -H "Content-Type: application/json" \
  -H "x-api-key: VOS_CLE_API_SECRETE" \
  -d '{"sessionId": "test_1", "prompt": "Lancer"}'


Exemple pratique dans un screen frontend en html test.html

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Orchestration Multi-Agents Sécurisée</title>
    <!-- Importation de Mermaid.js pour générer le graphe visuel -->
    <script type="module">
      import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
      mermaid.initialize({ startOnLoad: true });
    </script>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f9; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        button { background-color: #6c5ce7; color: white; border: none; padding: 12px 24px; cursor: pointer; font-size: 16px; border-radius: 4px; }
        button:hover { background-color: #5849be; }
        pre { background: #1e1e2f; color: #00ffcc; padding: 15px; border-radius: 6px; white-space: pre-wrap; }
        .mermaid { text-align: center; margin: 20px 0; background: #fff; padding: 10px; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>Orchestration Multi-Agents (LangGraph.js & API Proxy)</h2>
        <p>Visualisation du graphe d'architecture :</p>
        
        <!-- Le conteneur du graphe Mermaid -->
        <div class="mermaid">
            graph LR
                Start([Début]) --> Analyste[🔍 Agent Analyste]
                Analyste --> Comptable[🧮 Agent Comptable]
                Comptable --> Redacteur[✍️ Agent Rédacteur]
                Redacteur --> End([Fin])
        </div>

        <button id="btnLancer">Lancer le Workflow</button>
    </div>

    <div class="card">
        <h3>Résultat JSON de l'orchestration :</h3>
        <pre id="resultat">En attente du lancement...</pre>
    </div>

    <script>
        document.getElementById('btnLancer').onclick = async () => {
            const resultatElem = document.getElementById('resultat');
            resultatElem.innerText = "⏳ Exécution des agents en cours...";
            
            try {
                // Appel direct de la route proxy sécurisée (sans exposer de clé API)
                const response = await fetch('https://langgraph-multi-agents-api.vercel.app/api/agent/lancer', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        sessionId: "session_web_" + Date.now(), 
                        prompt: "Lancer le processus d'analyse financière depuis le web" 
                    })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    resultatElem.innerText = JSON.stringify(data, null, 2);
                } else {
                    resultatElem.innerText = "❌ Erreur : " + (data.error || "Requête refusée");
                }
            } catch (err) {
                resultatElem.innerText = "❌ Erreur réseau / Serveur injoignable : " + err.message;
            }
        };
    </script>
</body>
</html>

Pratique metier 

Pour exploiter cette API de manière optimale dans un **espace administrateur (dashboard de monitoring)** et offrir une excellente visibilité sur les performances et l'état des agents, voici comment mettre en place la logique d'intégration :

1. Structure de l'interface d'administration (Dashboard)

Votre écran d'administration doit se diviser en blocs visuels clés alimentés par les données retournées par l'API (`/api/agent/lancer`) :

Un Indicateur d'État (Status Card) : Pour afficher si le service est joignable (`success: true`).
Un Compteur de Synthèse : Pour afficher directement le montant total calculé par l'agent comptable (`resultat.total`).
Un Tableau ou une Liste des Données Brutes : Pour lister chaque transaction analysée (ID, montant, devise, statut VIP) issue de `resultat.donnees`.
Un Journal d'Activité (Logs) : Pour afficher le message de confirmation du workflow (`resultat.message`) et l'identifiant de session (`sessionId`).


2. Implémentation du code de monitoring (JavaScript Front-end)

Voici un exemple concret de script à intégrer dans votre espace administrateur pour récupérer, actualiser et afficher ces métriques en temps réel :

async function chargerDashboardAdmin() {
    const indicateurStatut = document.getElementById('admin-status');
    const totalElement = document.getElementById('admin-total');
    const tableauTransactions = document.getElementById('admin-table-body');
    const logsElement = document.getElementById('admin-logs');

    try {
        indicateurStatut.innerHTML = "⏳ Chargement des données...";
        
        // Appel de l'API proxy sécurisée
        const reponse = await fetch('https://votre-projet.vercel.app/api/agent/lancer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId: "admin_monitor_" + Date.now(),
                prompt: "Rafraîchir le monitoring" 
            })
        });

        const data = await reponse.json();

        if (data.success) {
            // 1. Mise à jour du statut global
            indicateurStatut.innerHTML = '<span style="color: green;">● Système Opérationnel</span>';
            
            // 2. Affichage du total comptable
            totalElement.innerText = `${data.resultat.total} USD`;

            // 3. Affichage du message de l'agent
            logsElement.innerText = `[Session: ${data.sessionId}] - ${data.resultat.message}`;

            // 4. Injection des données dans un tableau de monitoring
            tableauTransactions.innerHTML = ''; // Nettoyage
            data.resultat.donnees.forEach(item => {
                const ligne = `<tr>
                    <td>#${item.id}</td>
                    <td>${item.montant} ${item.devise}</td>
                    <td>${item.isVIP ? '⭐ VIP' : 'Standard'}</td>
                </tr>`;
                tableauTransactions.innerHTML += ligne;
            });
        } else {
            indicateurStatut.innerHTML = '<span style="color: red;">● Erreur de traitement</span>';
        }
    } catch (error) {
        console.error("Erreur de connexion à l'API:", error);
        indicateurStatut.innerHTML = '<span style="color: red;">● API Hors ligne</span>';
    }
}

// Actualiser automatiquement les données toutes les 30 secondes pour un vrai monitoring
setInterval(chargerDashboardAdmin, 30000);

// Charger au démarrage de la page
window.onload = chargerDashboardAdmin;

3. Bonnes pratiques pour un espace administrateur performant

Auto-rafraîchissement (Polling) : Utilisez `setInterval` (comme dans l'exemple ci-dessus) pour que l'administrateur voie les données se mettre à jour en arrière-plan sans avoir à recharger toute la page manuellement.
Gestion des états de chargement (Loaders) : Affichez des squelettes de chargement (skeletons) ou des icônes de rotation pendant que l'API exécute le graphe multi-agents.
Indicateurs visuels (Badges de couleur) : Utilisez des codes couleur (vert pour les transactions normales ou VIP, rouge pour les anomalies) pour donner de la visibilité en un coup d'œil à l'administrateur.




