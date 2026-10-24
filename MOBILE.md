# Application Android (APK)

L'APK est une enveloppe Capacitor qui ouvre l'application publiée (`APP_URL`, par défaut `https://pixel-perfect-display-706.lovable.app`). Mettre à jour l'application web met à jour l'APK sans le recompiler.

## Obtenir l'APK (sans rien installer sur votre ordinateur)
1. Envoyez le projet sur GitHub (Lovable → Connecteurs → GitHub, ou dépôt GitHub existant).
2. GitHub → onglet **Actions** → **Build APK** → **Run workflow**. Après 5 à 10 minutes, téléchargez l'artefact **agents-ia-apk**.
3. Installez le fichier `.apk` sur le téléphone (autoriser « sources inconnues »).

Sans clé de signature, la compilation produit un APK *debug* : il s'installe, mais il ne convient pas à la vente.

## APK signé (obligatoire pour vendre et mettre à jour)
Créez UNE FOIS la clé, puis conservez-la en lieu sûr (sans elle, aucune mise à jour possible) :

    keytool -genkeypair -v -keystore release.keystore -alias agentsia -keyalg RSA -keysize 2048 -validity 10000
    base64 -w0 release.keystore

GitHub → Settings → Secrets and variables → Actions : créez `KEYSTORE_BASE64` (sortie de la 2e commande), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (agentsia) et `KEY_PASSWORD`. Variable facultative : `APP_URL`.

## Personnalisation
Nom : `capacitor.config.ts` (`appName`) · Identifiant : `appId` + `applicationId` dans `android/app/build.gradle` · Icône : remplacez `assets/icon-only.png` (1024×1024 conseillé).

## Clé IA de chaque vendeur
L'application n'utilise aucun crédit Lovable : chaque vendeur colle sa propre clé API Google (Gemini) dans **Paramètres API → Clé IA**. La clé est chiffrée côté serveur et les appels IA (réponses, brouillons, vidéos Gemini Omni) sont facturés par Google directement sur le compte du vendeur. Sans clé enregistrée, les fonctions IA affichent un message renvoyant vers cet écran.

Vidéo : Google a arrêté les modèles Veo 3.1 en préversion le 22 octobre 2026. La génération utilise désormais Gemini Omni Flash (`gemini-omni-1.1-flash`, API Interactions en arrière-plan), modifiable avec la variable `VIDEO_MODEL`. Modèle texte par défaut : `gemini-3.8-flash` (variables `SALES_DECISION_MODEL`, `ADS_DRAFT_MODEL`, `ADS_SCRIPT_MODEL`). Sources : https://ai.google.dev/gemini-api/docs/omni et https://ai.google.dev/gemini-api/docs/deprecations.

## Mettre à jour l'APK
1. Modifiez l'application dans Lovable et publiez-la : l'APK existant charge automatiquement la nouvelle version (il ouvre `APP_URL`).
2. Recompilez uniquement si vous changez le nom, l'icône, l'identifiant ou `APP_URL` : poussez sur GitHub puis relancez le workflow **Build APK** (ou créez un tag `v*`). L'APK doit être signé avec LE MÊME keystore que la première version, sinon Android refuse la mise à jour.

## Dans la WebView Android
La session de connexion persiste après fermeture de l'app (stockage local de la WebView conservé). Les liens externes (Facebook, Google AI Studio) s'ouvrent avec `target="_blank"` dans le navigateur du téléphone. L'interface est utilisable sur petit écran et la vidéo se lit en plein écran (`playsInline`).
