# Intelligence commerciale intégrée à l’application

## Objectif
Remplacer la connexion envisagée à Google Opal par une intelligence commerciale dans l’application, accessible en français et en anglais. Chaque vendeur conserve ses produits, ses conversations et ses propres identifiants.

Le lien public Opal ne fournit pas de connexion automatique officiellement documentée. Google annonce l’arrêt d’Opal le 17 novembre 2026 : aucune clé Opal fictive ni connexion non officielle ne sera ajoutée.

## 1. Paramètres API et consignes commerciales
- Ajouter une page « Paramètres API », adaptée au téléphone comme à l’ordinateur.
- Permettre à chaque utilisateur de configurer son token Telegram et ses identifiants WhatsApp Business et Meta, de tester leur validité, de les remplacer ou de les supprimer.
- Chiffrer les identifiants sur le serveur ; ne jamais les restituer après enregistrement.
- Ajouter des consignes commerciales modifiables : ton, informations de vente et conditions de passage à un humain.
- Proposer des consignes initiales prudentes, sans inventer de prix, de remises ou de promesses. Les consignes exactes du workflow Opal nécessitent son export : le lien seul ne permet pas de les récupérer.

## 2. Conversations et décisions IA
- Ajouter une messagerie avec historique, canal, contact et état de traitement.
- Utiliser les produits actifs du vendeur et l’historique du contact pour préparer une réponse.
- Prendre en charge les textes et la transcription des messages vocaux reçus.
- Valider les décisions structurées : `SEND_MESSAGE`, `TRANSFER_TO_HUMAN`, `GENERATE_AD_CAMPAIGN`.
- Afficher les demandes de transfert humain et suspendre les réponses automatiques dans la conversation jusqu’à reprise explicite.
- Conserver la décision et son résultat dans l’historique, sans annoncer une vente payée sur la seule déclaration de l’IA.

## 3. WhatsApp Business et Telegram
- Recevoir les messages par des adresses sécurisées propres aux connexions des vendeurs.
- Enregistrer les messages avant traitement, éviter les doublons et afficher les échecs d’envoi.
- Activer les réponses automatiques uniquement après configuration et test du canal.
- Respecter WhatsApp : réponses libres dans les 24 heures suivant un message client ; modèles approuvés et consentement pour les messages commerciaux hors de cette fenêtre.
- Sur Telegram, répondre aux personnes ayant déjà démarré une conversation avec le bot ; ne pas promettre une prospection de contacts arbitraires.
- Prévoir les relances avec date, activation explicite et arrêt lors d’une opposition ou d’un transfert humain.

## 4. Publicités Facebook
- Créer des brouillons contenant le texte Facebook et le script de voix off.
- Ajouter la génération vidéo et la préparation de la campagne à partir de ces brouillons.
- Soumettre les contenus et les dépenses publicitaires à validation du vendeur ; aucune publication ou dépense automatique non approuvée.
- Afficher clairement les étapes bloquées par les autorisations Meta ou les crédits de génération.

## 5. Vérification avant mise en service
- Tester l’enregistrement et la suppression des identifiants, ainsi que l’isolation entre vendeurs.
- Tester les décisions IA, les transferts humains, les doublons, les relances et les erreurs.
- Vérifier une conversation réelle reçue et une réponse sur chaque canal connecté ; distinguer un envoi accepté d’un message livré.
- Vérifier les écrans sur téléphone et ordinateur.
- Ne déclarer l’automatisation opérationnelle qu’après ces tests réels.

## Éléments nécessaires pour l’activation
- Un bot Telegram et un compte WhatsApp Business API configurés par le vendeur.
- Les autorisations et comptes Meta nécessaires. Les messages marketing WhatsApp et les publicités peuvent être payants ; l’IA et la vidéo consomment des crédits.
- La publication des adresses de réception avant leur configuration chez les services concernés.
- L’export des consignes Opal pour reproduire exactement le scénario existant, facultatif pour démarrer avec des consignes nouvelles.

## Détails techniques
- Fonctions serveur authentifiées pour les réglages et actions ; adresses publiques vérifiées pour les callbacks externes.
- Tables privées cloisonnées par utilisateur pour réglages, conversations, messages, décisions, campagnes et travaux programmés. Identifiants chiffrés et accessibles uniquement au serveur.
- Utiliser Lovable AI pour les décisions, la transcription et la génération ; appels serveur et gestion explicite des refus ou crédits insuffisants.
- Aucun connecteur utilisateur WhatsApp, Telegram ou Meta n’est disponible dans le catalogue actuel. Utiliser les identifiants personnels demandés plutôt qu’un compte partagé ou une connexion OAuth personnalisée non approuvée.
- Traitement durable avec lots bornés, verrou, déduplication, reprise contrôlée et suspension persistante en cas de blocage. Les callbacks enregistrent rapidement les événements sans attendre la génération IA.