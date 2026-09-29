# Plateforme de veille ISO/IEC 17025

Application de veille normative, réglementaire, scientifique et d’accréditation destinée à un laboratoire d’analyses agroalimentaires et environnementales.

**État du projet au 25 septembre 2026 : version fonctionnelle complète destinée à l’utilisation au laboratoire.**

Le projet couvre le cycle complet de veille : administration, collecte automatique ou manuelle, qualification, validation, publication, abonnements, notifications, actions de suivi, rapports et journal d’audit.

## Fonctionnalités disponibles

| Domaine                | Fonctionnalités                                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Authentification       | Connexion par adresse email et mot de passe, JWT, profil connecté et déconnexion                           |
| Utilisateurs           | Création, liste, activation, désactivation et modification des rôles                                       |
| Rôles                  | Contrôle des accès avec les gardes NestJS et protection des routes Vue                                     |
| Sources                | Création, consultation, modification, activation et désactivation                                          |
| Connecteurs            | RSS/Atom avec détection automatique XML, JSON ou CSV, API Crossref et autres API JSON de listes d'articles |
| Collecte               | Test, collecte immédiate, planification automatique et reprise après erreur                                |
| Import manuel          | Import de fichiers CSV ou XLSX, validation, normalisation et déduplication                                 |
| Sécurité des collectes | Protection en mémoire et verrou PostgreSQL contre les exécutions simultanées                               |
| Normalisation          | Transformation des données externes vers un format commun                                                  |
| Déduplication          | Recherche par DOI, identifiant externe, URL canonique et empreinte                                         |
| Éléments de veille     | Enregistrement en base, liste, détail et historique des versions                                           |
| Journaux de collecte   | Nombre d’éléments reçus, créés, mis à jour, en doublon et en erreur                                        |
| Taxonomie              | Gestion des thèmes, domaines, laboratoires, mots-clés et synonymes                                         |
| Qualification          | Type de veille, pertinence, criticité et rattachement à la taxonomie                                       |
| Validation             | Validation, rejet, publication et archivage avec historique des décisions                                  |
| Recherche              | Recherche instantanée par flux, titre ou résumé et filtres métier                                          |
| Favoris et vues        | Favoris personnels et vues de recherche enregistrées et supprimables                                       |
| Actions de suivi       | Création, affectation, modification, suppression et changement de statut                                   |
| Abonnements            | Abonnements par source, thème, domaine ou mot-clé                                                          |
| Notifications          | Notifications internes lors de la publication d’une veille correspondante                                  |
| Rapports               | Périodes hebdomadaires, mensuelles ou personnalisées, exports PDF, XLSX et CSV                             |
| Audit                  | Traçabilité des opérations, filtres par module et valeurs avant/après lisibles                             |
| Santé                  | État de PostgreSQL et des connecteurs, avec relance d’une collecte en erreur                               |
| Tableau de bord        | Compteurs animés, courbes, diagrammes, Top 5 des sources et périodes adaptés aux rôles                     |
| Interface              | Français, Toast, spinners SVG, cloche de notifications, menu escamotable et modes clair/sombre             |

## Technologies

### Backend

- NestJS 12 et TypeScript
- TypeORM et PostgreSQL
- Passport, JWT et bcrypt
- Validation avec `class-validator` et `class-transformer`
- Planification avec `@nestjs/schedule`
- Événements métier avec `@nestjs/event-emitter`
- Protection HTTP avec Helmet et limitation avec `@nestjs/throttler`
- Lecture RSS/Atom avec `rss-parser`
- Import et export XLSX avec ExcelJS
- Génération de rapports PDF avec PDFKit
- Vitest et Supertest

### Frontend

- Vue 3 et TypeScript
- Vite 8
- Vue Router
- Pinia
- Axios
- PrimeVue 4 avec le thème Aura
- PrimeIcons 8 et composants SVG `@primeicons/vue`
- Tailwind CSS 4
- Vitest 5

Les versions exactes installées sont enregistrées dans les fichiers `package-lock.json`.

## Structure principale

```text
plateforme-veille/
├── backend/
│   └── src/
│       ├── auth/
│       ├── actions/
│       ├── audit/
│       ├── collection/
│       │   ├── entities/collection-run.entity.ts
│       │   ├── collection.service.ts
│       │   ├── collection-scheduler.service.ts
│       │   └── normalization.service.ts
│       ├── connectors/
│       │   └── implementations/
│       │       ├── manual.connector.ts
│       │       ├── rss.connector.ts
│       │       └── crossref.connector.ts
│       ├── dashboard/
│       ├── database/
│       │   ├── data-source.ts
│       │   └── migrations/
│       ├── favorites/
│       ├── health/
│       ├── notifications/
│       ├── permissions/
│       ├── qualification/
│       ├── reports/
│       ├── roles/
│       ├── saved-views/
│       ├── search/
│       ├── sources/
│       ├── subscriptions/
│       ├── taxonomy/
│       ├── users/
│       ├── validation/
│       └── watch-items/
└── frontend/
    └── src/
        ├── i18n/
        ├── layouts/
        ├── router/
        ├── services/
        ├── stores/
        ├── utils/
        └── views/
```

## Prérequis

- Node.js et npm
- PostgreSQL
- Git
- Une connexion Internet pour installer les dépendances et interroger les sources externes

## Installation

### 1. Récupérer le projet

```bash
git clone https://github.com/koffiP24/memoire.git
cd memoire
```

Le dossier cloné peut porter un autre nom, par exemple `plateforme-veille`.

### 2. Installer les dépendances

```bash
cd backend
npm ci

cd ../frontend
npm ci
```

### 3. Créer la base PostgreSQL

```sql
CREATE DATABASE veille;
```

Le nom attendu par le projet est `veille`.

### 4. Configurer le backend

Créer `backend/.env` :

```dotenv
PORT=3000
FRONTEND_URL=http://localhost:5173

# Alertes e-mail immédiates des abonnements (Gmail)
SMTP_USER=philippeassidjo62@gmail.com
SMTP_APP_PASSWORD=<mot-de-passe-d-application-google>

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<mot-de-passe-postgresql>
DB_NAME=veille

JWT_SECRET=<secret-jwt-long-et-aleatoire>
SEED_ADMIN_EMAIL=admin@veille.local
SEED_ADMIN_PASSWORD=<mot-de-passe-administrateur>

# Facultatif : instance LibreTranslate pour traduire automatiquement en français
LIBRETRANSLATE_URL=http://127.0.0.1:5000
# LIBRETRANSLATE_API_KEY=<cle-si-l-instance-en-demande-une>
```

Le mot de passe administrateur doit contenir au moins huit caractères. Les variables `SEED_ADMIN_*` créent le compte seulement s’il n’existe pas encore. Modifier ensuite le mot de passe dans `.env` ne change pas celui déjà enregistré en base.

Pour les abonnements par e-mail, activer la validation en deux étapes du compte Gmail expéditeur puis créer un **mot de passe d’application** Google. Renseigner ce mot de passe dans `SMTP_APP_PASSWORD` du seul fichier `backend/.env`, sans l’ajouter au dépôt ni le communiquer dans une conversation. `SMTP_USER` désigne le compte expéditeur. Sans ces deux valeurs, les alertes e-mail restent en attente et aucun message n’est envoyé. Après configuration et redémarrage du backend, les alertes en attente sont reprises par lots de 50 chaque minute.

À chaque publication, les abonnements correspondants déclenchent une alerte immédiate. Le message contient le titre, le **type de veille**, la source et son type (RSS, Atom, API ou import manuel), un résumé et un lien vers la veille. Plusieurs abonnements correspondants d’un même utilisateur ne produisent qu’un e-mail par veille. L’envoi réussi est marqué `SENT`, un échec `FAILED`. En développement, le lien utilise `FRONTEND_URL=http://localhost:5173` : il fonctionne uniquement sur l’ordinateur où tourne le frontend. Remplacer cette URL lorsque le site sera accessible aux autres utilisateurs.

Pour générer un secret JWT :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### 5. Configurer le frontend

Créer `frontend/.env` :

```dotenv
VITE_API_URL=/api/v1
```

En développement, Vite transmet `/api` au backend local sur le port 3000. Cette configuration permet de partager uniquement le port 5173 avec VS Code Dev Tunnels, sans exposer PostgreSQL ni le backend séparément.

Après toute modification d’un fichier `.env`, redémarrer l’application concernée.

## Migrations

`synchronize` est désactivé dans l’application et dans la source de données TypeORM. Les changements de structure doivent passer par des migrations.

Depuis `backend/` :

```bash
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
```

La migration du module 4 crée notamment :

- les thèmes, domaines, laboratoires, mots-clés et synonymes ;
- les relations entre les éléments de veille et la taxonomie ;
- les colonnes de pertinence et de criticité ;
- les structures nécessaires à la qualification.

Pour connaître l’état des migrations :

```bash
npx typeorm-ts-node-commonjs migration:show -d src/database/data-source.ts
```

## Démarrage

Dans un premier terminal :

```bash
cd backend
npm run start:dev
```

Le backend est disponible sur :

```text
http://localhost:3000
```

Dans un second terminal :

```bash
cd frontend
npm run dev
```

Le frontend est généralement disponible sur :

```text
http://localhost:5173
```

Ne lancer qu’une seule instance du backend. Plusieurs commandes `npm run start:dev` provoquent l’erreur `EADDRINUSE` sur le port 3000.

Sous Windows, utiliser `npm.cmd` si PowerShell bloque le script `npm.ps1`.

## Authentification et rôles

Les rôles initialisés sont :

- `ADMIN`
- `RESPONSABLE_VEILLE`
- `OPERATEUR_VEILLE`
- `REFERENT_LABORATOIRE`
- `LECTEUR`

Le backend reste responsable de la sécurité avec `JwtAuthGuard`, `RolesGuard` et `@Roles(...)`. Le frontend masque les actions indisponibles et protège certaines routes pour améliorer l’expérience utilisateur.

Un compte `ACTIVE` peut se connecter. Un compte `INACTIVE` reste enregistré, mais sa connexion est refusée. Un administrateur peut désactiver, réactiver et modifier les rôles d’un utilisateur.

## Routes principales de l’API

Toutes les routes sont préfixées par `/api/v1`. Sauf le login, elles exigent un jeton Bearer.

### Authentification et utilisateurs

| Méthode | Route               | Fonction                        |
| ------- | ------------------- | ------------------------------- |
| POST    | `/auth/login`       | Se connecter                    |
| GET     | `/auth/me`          | Consulter le profil connecté    |
| GET     | `/users`            | Lister les utilisateurs         |
| POST    | `/users`            | Créer un utilisateur            |
| PATCH   | `/users/:id/status` | Activer ou désactiver un compte |
| PATCH   | `/users/:id/roles`  | Modifier les rôles              |
| GET     | `/roles`            | Lister les rôles disponibles    |

### Sources, connecteurs et collectes

| Méthode | Route                   | Fonction                                                           |
| ------- | ----------------------- | ------------------------------------------------------------------ |
| GET     | `/sources`              | Lister les sources et leurs connecteurs                            |
| GET     | `/sources/:id`          | Consulter une source                                               |
| POST    | `/sources`              | Créer une source                                                   |
| PATCH   | `/sources/:id`          | Modifier une source                                                |
| PATCH   | `/sources/:id/status`   | Activer ou désactiver une source                                   |
| GET     | `/connectors`           | Lister les connecteurs                                             |
| POST    | `/connectors`           | Créer un connecteur                                                |
| POST    | `/connectors/:id/test`  | Vérifier l’accès et le format, sans collecte ni création de veille |
| POST    | `/connectors/:id/run`   | Lancer une collecte                                                |
| POST    | `/connectors/:id/retry` | Relancer une collecte en erreur                                    |
| POST    | `/sources/:id/import`   | Importer un fichier CSV ou XLSX                                    |
| GET     | `/collection-runs`      | Consulter les 100 derniers journaux                                |

Une collecte terminée retourne une synthèse de cette forme :

```json
{
  "runId": 12,
  "source": "Crossref",
  "received": 20,
  "ignored": 4,
  "created": 5,
  "updated": 2,
  "duplicates": 13,
  "errors": 0
}
```

### Éléments de veille et qualification

| Méthode | Route                            | Fonction                             |
| ------- | -------------------------------- | ------------------------------------ |
| GET     | `/watch-items`                   | Lister les éléments collectés        |
| GET     | `/watch-items/:id`               | Consulter un élément et ses versions |
| GET     | `/watch-items/:id/qualification` | Charger sa qualification             |
| PATCH   | `/watch-items/:id/qualification` | Enregistrer sa qualification         |
| POST    | `/watch-items/:id/review`        | Valider ou rejeter une veille        |
| POST    | `/watch-items/:id/publish`       | Publier une veille validée           |
| POST    | `/watch-items/:id/archive`       | Archiver une veille                  |
| GET     | `/watch-items/:id/reviews`       | Consulter l’historique des décisions |

La qualification enregistre :

- le type de veille ;
- la pertinence ;
- la criticité ;
- les thèmes ;
- les domaines ;
- les laboratoires ;
- les mots-clés.

### Taxonomie

Les ressources suivantes disposent de routes `GET`, `POST`, `PATCH` et `DELETE` sous `/taxonomy` :

- `topics`
- `domains`
- `laboratories`
- `keywords`
- `synonyms`

Les consultations sont accessibles aux utilisateurs authentifiés. Les modifications sont réservées aux administrateurs.

### Tableau de bord

| Méthode | Route                          | Fonction                                                         |
| ------- | ------------------------------ | ---------------------------------------------------------------- |
| GET     | `/dashboard`                   | Retourner les indicateurs correspondant aux rôles connectés      |
| GET     | `/dashboard/details`           | Retourner les listes associées aux indicateurs                   |
| GET     | `/dashboard/analytics?days=30` | Retourner les courbes et répartitions sur 7, 30, 90 ou 365 jours |

### Recherche, favoris et vues enregistrées

| Méthode         | Route                              | Fonction                                 |
| --------------- | ---------------------------------- | ---------------------------------------- |
| GET             | `/search/watch-items`              | Rechercher et filtrer les veilles        |
| GET/POST/DELETE | `/favorites`, `/favorites/:itemId` | Gérer les favoris personnels             |
| GET/POST/DELETE | `/saved-views`, `/saved-views/:id` | Gérer les vues de recherche enregistrées |

### Actions, abonnements et notifications

| Méthode          | Route                                  | Fonction                                         |
| ---------------- | -------------------------------------- | ------------------------------------------------ |
| GET/POST         | `/watch-items/:id/actions`             | Consulter ou créer une action de suivi           |
| GET/PATCH/DELETE | `/actions`, `/actions/:id`             | Lister, modifier ou supprimer les actions        |
| GET              | `/actions/my-pending-count`            | Compter les actions non terminées du responsable |
| GET/POST/DELETE  | `/subscriptions`, `/subscriptions/:id` | Gérer les abonnements de l’utilisateur           |
| GET              | `/subscriptions/options`               | Charger les éléments auxquels s’abonner          |
| GET              | `/notifications`                       | Lister les notifications                         |
| PATCH            | `/notifications/:id/read`              | Marquer une notification comme lue               |

### Rapports, audit et santé

| Méthode  | Route                   | Fonction                                |
| -------- | ----------------------- | --------------------------------------- |
| POST/GET | `/reports`              | Générer et lister les rapports          |
| GET      | `/reports/:id/download` | Télécharger un rapport PDF, XLSX ou CSV |
| GET      | `/audit`                | Consulter le journal d’audit            |
| GET      | `/health`               | Vérifier PostgreSQL et les connecteurs  |

## Processus de collecte

```text
Source active
    ↓
Connecteur RSS/Atom, Crossref ou import manuel CSV/XLSX
    ↓
Récupération des données externes
    ↓
Normalisation
    ↓
Traduction en français par LibreTranslate si configuré
    ↓
Déduplication
    ↓
Création, mise à jour ou classement comme doublon
    ↓
Enregistrement du journal de collecte
```

Pour RSS/Atom, le collecteur reconnaît automatiquement les réponses XML, JSON ou CSV à partir du type HTTP, de l’extension et du contenu. L’import manuel accepte jusqu’à 5 Mo et 5 000 lignes ; la colonne `titre` ou `title` est obligatoire.

Pour le type API, le formulaire propose `https://api.crossref.org` mais accepte aussi une URL de recherche Crossref telle que `https://api.crossref.org/works?filter=from-pub-date:2026-01-01`, ou une autre API publique renvoyant une liste JSON d'articles. Les paramètres Crossref inscrits dans l'URL (`filter`, `query`, `rows`, etc.) sont conservés ; si l'URL contient déjà `query` ou `query.bibliographic`, le sujet à surveiller sert uniquement au filtrage local des résultats. Pour ces autres API, la réponse doit être un tableau JSON ou contenir une liste `items`, `entries`, `results` ou `data`, avec au minimum un titre par élément. Une page HTML ou une API nécessitant des en-têtes d'authentification personnalisés n'est pas compatible avec ce connecteur. Dans le journal d’audit, l’onglet Sources distingue les collectes automatiques des collectes et créations de sources manuelles.

Si `LIBRETRANSLATE_URL` pointe vers une instance LibreTranslate accessible au backend, le collecteur utilise `source: auto` et `target: fr` pour détecter la langue et traduire le titre et le résumé. La clé `LIBRETRANSLATE_API_KEY` est facultative pour une instance auto-hébergée sans authentification, mais nécessaire si l'instance l'exige. Si le service est absent ou échoue, le texte d'origine reste enregistré. Les veilles déjà en base ne sont pas retraduites. Conservez l'URL et la clé éventuelle dans `backend/.env`, jamais dans le frontend.

Pour un essai local, lancez LibreTranslate séparément avec `pip install libretranslate` puis `libretranslate`, renseignez `LIBRETRANSLATE_URL=http://127.0.0.1:5000` dans `backend/.env` et redémarrez le backend. Le premier démarrage télécharge les modèles de traduction ; la langue détectée doit être prise en charge par les modèles installés.

Le champ **Sujet à surveiller** accepte une liste de sujets séparés par des virgules, par exemple :

```text
environnement, ISO 17025, bonbon sucré salé
```

Chaque morceau entre deux virgules est un sujet complet : `bonbon sucré salé` reste une seule expression, sans guillemets. Un élément reçu est conservé si son titre ou son résumé contient au moins un sujet (logique **OU**, sans distinction de casse ou d'accents) ; sinon il est compté parmi les éléments ignorés. Laisser le champ vide désactive ce filtre. Pour Crossref, une recherche est effectuée par sujet, puis les DOI reçus sont fusionnés avant ce filtrage local. Les anciennes configurations pondérées enregistrées restent lisibles ; à l'ouverture du formulaire de modification, elles sont présentées sous forme de liste simple.

Les fréquences reconnues comprennent notamment `30m`, `6h`, `12h` et `1j`. Le scheduler vérifie chaque minute les connecteurs associés aux sources actives.

Pour empêcher deux collectes simultanées du même connecteur, le backend utilise :

- un ensemble en mémoire dans l’instance NestJS ;
- un verrou consultatif PostgreSQL, également efficace entre plusieurs instances du backend.

## Jeu de sources pour les tests

Les URL ci-dessous sont des flux ou services publics réels. Créer la source avec son connecteur, tester le connecteur dans **Administration et santé des sources**, puis lancer la collecte.

| Nom                                    | Catégorie     | Type      | Fréquence | Adresse                                                                                                                                                   | Sujet à surveiller                                                 |
| -------------------------------------- | ------------- | --------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| FDA MedWatch                           | Réglementaire | Flux RSS  | `6h`      | `https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml`                                                                      | `laboratory medical device drug safety recall warning`             |
| NIST - Normes et standards             | Normatif      | Flux RSS  | `1j`      | `https://www.nist.gov/news-events/standards/rss.xml`                                                                                                      | `standard measurement calibration metrology laboratory quality`    |
| arXiv - Microbiologie de laboratoire   | Scientifique  | Flux Atom | `1j`      | `https://export.arxiv.org/api/query?search_query=all%3A%22laboratory%20microbiology%22&start=0&max_results=20&sortBy=submittedDate&sortOrder=descending`  | `laboratory microbiology pathogen diagnostic analysis`             |
| arXiv - Surveillance environnementale  | Environnement | Flux Atom | `1j`      | `https://export.arxiv.org/api/query?search_query=all%3A%22environmental%20monitoring%22&start=0&max_results=20&sortBy=submittedDate&sortOrder=descending` | `environmental monitoring laboratory water air soil contamination` |
| Crossref - Accréditation ISO/IEC 17025 | Accréditation | API       | `1j`      | `https://api.crossref.org/works`                                                                                                                          | `ISO/IEC 17025 laboratory accreditation conformity assessment`     |
| Crossref - Métrologie et incertitude   | Scientifique  | API       | `1j`      | `https://api.crossref.org/works`                                                                                                                          | `measurement uncertainty metrology calibration laboratory`         |

Les deux sources Crossref utilisent la même adresse de service. Leur champ **Sujet à surveiller** définit deux périmètres de collecte différents. Les requêtes en anglais donnent généralement de meilleurs résultats dans les métadonnées internationales.

Références officielles :

- [FDA MedWatch RSS](https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program/subscribe-medwatch-safety-alerts)
- [NIST RSS Feeds](https://www.nist.gov/coo/nist-rss-feeds)
- [arXiv API](https://info.arxiv.org/help/api/index.html)
- [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)

Le guide PDF détaillé est généré dans `output/pdf/guide_sources_tests_veille.pdf`.

## Interface utilisateur

| Page             | Adresse                          | Accès principal                         |
| ---------------- | -------------------------------- | --------------------------------------- |
| Connexion        | `/login`                         | Public                                  |
| Tableau de bord  | `/`                              | Utilisateur authentifié                 |
| Veilles          | `/watch-items`                   | Administrateur et équipe de veille      |
| Qualification    | `/watch-items/:id/qualification` | Administrateur et équipe de veille      |
| Sources          | `/sources`                       | Selon les rôles autorisés               |
| Actions          | `/actions`                       | Administrateur, responsable et référent |
| Abonnements      | `/subscriptions`                 | Utilisateur authentifié                 |
| Notifications    | `/notifications`                 | Utilisateur authentifié                 |
| Rapports         | `/reports`                       | Administrateur et responsable de veille |
| Journal d’audit  | `/audit`                         | Administrateur et responsable de veille |
| Santé du système | `/health`                        | Administrateur et responsable de veille |
| Taxonomie        | `/taxonomy`                      | Administrateur                          |
| Utilisateurs     | `/users`                         | Administrateur                          |

Le menu latéral est masqué afin de laisser davantage de place au contenu. Une languette `☰` reste visible sur le bord gauche :

- le survol affiche le menu ;
- un clic sur la languette permet de le garder ouvert ;
- la sélection d’une rubrique le referme.

Les actions affichées dépendent du rôle connecté. Les libellés techniques et les statuts sont traduits en français dans l’interface. Les résultats et les erreurs sont présentés avec des notifications Toast.

## Tester la connexion avec Postman

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@veille.local",
  "password": "<mot-de-passe-configuré>"
}
```

La réponse contient un `accessToken` et l’objet `user`. Utiliser ensuite la valeur du jeton dans **Authorization → Bearer Token**.

## Vérifications du projet

Depuis `backend/` :

```bash
npm run build
npm run lint
npm test
npm run test:e2e
npm run test:cov
```

Depuis `frontend/` :

```bash
npm run build
npm test
npm run preview
```

La compilation frontend peut afficher un avertissement indiquant qu’un bloc JavaScript dépasse 500 kB. Cet avertissement n’empêche pas la compilation et pourra être traité plus tard avec le découpage du code.

## Dépannage

| Symptôme                         | Solution                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| `EADDRINUSE :::3000`             | Fermer l’ancienne instance NestJS et ne garder qu’un seul `npm run start:dev`      |
| Impossible de joindre PostgreSQL | Vérifier le service PostgreSQL, `DB_HOST`, les identifiants et la base `veille`    |
| Une table ou une colonne manque  | Exécuter les migrations TypeORM                                                    |
| Erreur CORS                      | Vérifier que `FRONTEND_URL` correspond exactement à l’adresse de Vite              |
| Erreur 400 au login              | Envoyer un vrai corps JSON avec `Content-Type: application/json`                   |
| Erreur 401                       | Se reconnecter et remplacer le jeton expiré ou invalide                            |
| Erreur 403                       | Vérifier le rôle du compte connecté                                                |
| Collecte échouée                 | Tester le connecteur et vérifier son URL ainsi que l’accès Internet                |
| Anciennes valeurs visibles       | Redémarrer l’application après une modification de `.env`, puis actualiser la page |

## Git et données sensibles

Les dossiers `backend/` et `frontend/` doivent rester des dossiers ordinaires du même dépôt Git.

Les fichiers `.env`, les dépendances, les sorties de compilation et les journaux sont exclus de Git. Ne jamais publier :

- le mot de passe PostgreSQL ;
- le secret JWT ;
- un jeton d’accès ;
- un mot de passe utilisateur.

Avant un commit :

```bash
git status
git diff --check
```

## Points d’exploitation

- Le canal `EMAIL` utilise le compte Gmail indiqué dans `SMTP_USER` et son mot de passe d’application. Les notifications internes fonctionnent indépendamment de Gmail.
- Les fichiers de rapports sont enregistrés dans `backend/storage/reports/` et doivent être inclus dans la stratégie de sauvegarde ou de purge du laboratoire.
- Le stockage du JWT dans `localStorage` convient au fonctionnement actuel ; une politique de session par cookie sécurisé peut être étudiée pour un déploiement Internet public.
- Le bundle frontend peut être découpé davantage si le temps de chargement devient sensible sur le réseau du laboratoire.

Le backend est marqué `UNLICENSED`. Les bibliothèques utilisées conservent leurs licences respectives.
