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

