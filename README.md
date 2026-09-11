# Plateforme de veille pour un laboratoire ISO/IEC 17025

Projet de fin d’études en génie logiciel : conception et développement d’une application autonome de veille normative, réglementaire, scientifique et d’accréditation pour un laboratoire d’analyses agroalimentaires et environnementales.

**État documenté au 10 septembre 2026 : socle utilisateurs, sources, connecteurs et premières collectes — semaines 3 à 5.** Le projet est en développement et n’est pas encore une plateforme complète de gestion de la veille.

## Objectifs et périmètre

La plateforme doit permettre de collecter, centraliser, qualifier, faire valider et diffuser les informations utiles au laboratoire, avec un suivi des décisions et des actions. Elle fonctionne indépendamment du LIMS et du SMQ existants.

La conception s’appuie sur **MERISE** : règles de gestion, dictionnaire de données, MCD, MLD et MPD. Le cahier des charges et les documents de conception sont conservés dans l’espace de travail du mémoire ; ils ne sont pas tous présents dans ce dépôt applicatif.

Principes retenus :

- Architecture de monolithe modulaire côté backend.
- Validation humaine des décisions d’impact et de conformité.
- Assistance par IA optionnelle, à développer ultérieurement.
- Conservation des références, métadonnées et liens autorisés ; pas de redistribution du texte intégral des normes protégées.

## Fonctionnalités réalisées

| Domaine | État actuel |
| --- | --- |
| Authentification | Connexion par email/mot de passe, JWT, consultation du profil connecté, déconnexion frontend |
| Utilisateurs | Liste et création de comptes avec attribution de rôles, réservées aux administrateurs |
| Rôles et permissions | Entités, relations et services ; cinq rôles initialisés au démarrage |
| Sources | Création, liste, détail, modification, désactivation et réactivation via l’API |
| Interface Sources | Création, tableau paginé, statut, désactivation/réactivation et actions sur le premier connecteur |
| Connecteurs | Création et liste via l’API, choix d’implémentation, test et collecte manuelle |
| Import manuel | Connecteur de test disponible ; retourne une liste vide, sans import de fichier implémenté |
| RSS / Atom | Lecture de flux avec `rss-parser` et conversion vers un format commun |
| Crossref | Recherche de publications via l’API, avec requête et nombre de résultats configurables |
| Planification | Scheduler NestJS intégré : vérification des sources actives chaque minute |
| Tableau de bord | Page d’accueil et informations de session ; KPI métier à venir |

Les résultats de collecte sont actuellement **retournés par l’API mais ne sont pas enregistrés dans une table d’éléments de veille**. Le statut, le curseur éventuel et la date de dernière collecte du connecteur sont enregistrés.

## Technologies

Les versions exactes résolues sont conservées dans les fichiers `package-lock.json` de chaque application.

| Backend | Frontend |
| --- | --- |
| NestJS 12, TypeScript | Vue 3, TypeScript, Vite 8 |
| TypeORM 1.1, PostgreSQL, pilote `pg` | Vue Router 5, Pinia 4 |
| Passport, JWT, bcrypt | Axios avec ajout automatique du Bearer Token |
| `class-validator`, `class-transformer` | PrimeVue **4.5.5**, thème Aura `@primeuix/themes` **2.0.3** |
| `@nestjs/config`, `@nestjs/schedule`, `rss-parser` | Tailwind CSS 4 |
| Vitest, Supertest, Oxlint | Vérification Vue/TypeScript avec `vue-tsc` |

PrimeVue 5 a été remplacé par PrimeVue 4 avec un thème compatible. Les versions de ces deux dépendances sont fixées dans le frontend.

Le backend utilise `type: commonjs` dans `package.json` et la résolution TypeScript `nodenext`. Les imports locaux du code source sont écrits **sans extension `.js`**.

## Organisation du dépôt

```text
plateforme-veille/
├── README.md
├── .gitignore
├── package.json                  # Dépendances racine ; ne lance pas les deux apps
├── backend/
│   ├── package.json
│   ├── .env                      # Local, exclu de Git
│   ├── test/
│   └── src/
│       ├── auth/                 # Login, JWT, stratégie, gardes et décorateur Roles
│       ├── users/                # Utilisateurs, DTO et entité
│       ├── roles/                # Rôles et entité
│       ├── permissions/          # Permissions et entité
│       ├── database/             # Initialisation des rôles et de l’administrateur
│       ├── sources/              # CRUD, statut, DTO et entité
│       ├── connectors/
│       │   ├── dto/
│       │   ├── entities/
│       │   ├── interfaces/       # BaseConnector, ExternalItem, CollectionResult
│       │   ├── implementations/
│       │   │   ├── manual.connector.ts
│       │   │   ├── rss.connector.ts
│       │   │   └── crossref.connector.ts
│       │   ├── connectors.controller.ts
│       │   ├── connectors.service.ts
│       │   └── connectors.module.ts
│       ├── collection/           # Service de collecte et scheduler
│       ├── app.module.ts
│       └── main.ts
└── frontend/
    ├── package.json
    ├── .env                      # Local, exclu de Git
    └── src/
        ├── components/
        ├── layouts/AppLayout.vue
        ├── router/index.ts
        ├── services/
        │   ├── api.ts
        │   └── sources.service.ts
        ├── stores/auth.ts
        ├── views/
        │   ├── LoginView.vue
        │   ├── DashboardView.vue
        │   ├── UsersView.vue
        │   └── SourcesView.vue
        ├── App.vue
        ├── main.ts
        └── style.css
```

## Installation locale

### Prérequis

- Node.js et npm ; environnement de développement utilisé : Node.js 24.
- PostgreSQL installé et démarré.
- Git ; Postman est utile pour les tests API.
- Accès Internet pour installer les dépendances et contacter les sources externes.

### 1. Récupérer le projet

```bash
git clone https://github.com/koffiP24/memoire.git
cd memoire
```

Les chemins suivants sont relatifs à la racine clonée. Le dossier local peut aussi s’appeler `plateforme-veille`.

### 2. Créer la base PostgreSQL

Avec pgAdmin ou une session SQL disposant des droits nécessaires :

```sql
CREATE DATABASE veille;
```

Le nom attendu est **`veille`**. TypeORM peut synchroniser les tables au démarrage, mais ne crée pas la base elle-même.

### 3. Configurer le backend

Créer `backend/.env` avec les valeurs de votre environnement. Les valeurs entre chevrons ci-dessous sont à remplacer ; aucune clé ou aucun mot de passe réel n’est fourni dans ce README.

```dotenv
PORT=3000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<mot-de-passe-postgresql>
DB_NAME=veille

JWT_SECRET=<secret-aleatoire-long>
SEED_ADMIN_EMAIL=admin@veille.local
SEED_ADMIN_PASSWORD=<mot-de-passe-administrateur-au-moins-8-caracteres>
```

Pour générer un secret JWT, exécuter localement :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

`JWT_SECRET` est obligatoire. `ConfigModule` charge la configuration globalement et la configuration JWT est construite via `ConfigService`, après ce chargement.

Au démarrage, le seed crée les rôles absents. Il crée aussi un administrateur si les deux variables `SEED_ADMIN_*` sont renseignées et que cet email n’existe pas encore. **Changer `SEED_ADMIN_PASSWORD` ne réinitialise pas le mot de passe d’un compte déjà créé.**

### 4. Démarrer le backend

Dans un premier terminal :

```bash
cd backend
npm ci
npm run start:dev
```

Base de l’API : `http://localhost:3000/api/v1`.

**Le démarrage actuel active aussi le scheduler et la synchronisation TypeORM (`synchronize: true`).** Utiliser une base de développement. Avant un déploiement, remplacer la synchronisation automatique par des migrations maîtrisées.

### 5. Configurer et démarrer le frontend

Créer `frontend/.env` :

```dotenv
VITE_API_URL=http://localhost:3000/api/v1
```

Dans un second terminal, depuis la racine du dépôt :

```bash
cd frontend
npm ci
npm run dev
```

Ouvrir l’adresse annoncée par Vite, habituellement `http://localhost:5173/login`. Si Vite utilise un autre port, adapter `FRONTEND_URL` côté backend pour CORS.

Sur Windows, si PowerShell bloque `npm.ps1`, utiliser `npm.cmd` à la place de `npm`, ou utiliser Git Bash. Après une modification de `.env`, redémarrer le processus concerné.

## Authentification et rôles

Les mots de passe sont hachés avec bcrypt. Le login retourne un JWT valable 8 heures et un objet `user`. Le frontend conserve le jeton et le profil dans `localStorage`, puis Axios transmet le jeton dans les requêtes. La déconnexion efface ces données locales ; elle ne révoque pas un JWT déjà émis côté serveur.

Rôles initialisés :

- `ADMIN`
- `RESPONSABLE_VEILLE`
- `REFERENT_LABORATOIRE`
- `LECTEUR`
- `OPERATEUR_VEILLE`

Les droits des routes sont contrôlés par `JwtAuthGuard`, `RolesGuard` et `@Roles`. Les relations de permissions existent dans le modèle, mais les règles des routes reposent actuellement sur les noms de rôles.

Relations principales : `users ↔ roles` via `user_roles`, `roles ↔ permissions` via `role_permissions`, et `sources → connectors` via `connectors.source_id`.

## API disponible

Toutes les adresses suivantes sont préfixées par `/api/v1`. À l’exception du login, elles demandent un Bearer Token.

| Méthode | Route | Rôles autorisés | Fonction |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public | Connexion |
| GET | `/auth/me` | Utilisateur authentifié | Identité contenue dans le JWT |
| GET / POST | `/users` | ADMIN | Lister / créer des utilisateurs |
| GET | `/sources` | ADMIN, RESPONSABLE_VEILLE, OPERATEUR_VEILLE | Lister les sources et leurs connecteurs |
| GET | `/sources/:id` | ADMIN, RESPONSABLE_VEILLE, OPERATEUR_VEILLE | Détail d’une source |
| POST | `/sources` | ADMIN, OPERATEUR_VEILLE | Créer une source |
| PATCH | `/sources/:id` | ADMIN | Modifier une source |
| PATCH | `/sources/:id/status` | ADMIN | Activer ou désactiver : `{ "active": true/false }` |
| PATCH | `/sources/:id/disable` | ADMIN | Ancienne route de désactivation conservée |
| GET | `/connectors` | ADMIN, RESPONSABLE_VEILLE | Lister les connecteurs |
| POST | `/connectors` | ADMIN | Créer un connecteur |
| POST | `/connectors/:id/test` | ADMIN | Tester un connecteur |
| POST | `/connectors/:id/run` | ADMIN, RESPONSABLE_VEILLE | Lancer une collecte manuelle |

Les DTO sont validés avec le `ValidationPipe` global. Le changement de statut exige un véritable booléen JSON : `false`, pas la chaîne `"false"`.

## Tester avec Postman

### Connexion

Envoyer `POST http://localhost:3000/api/v1/auth/login` avec **Body → raw → JSON** :

```json
{
  "email": "admin@veille.local",
  "password": "<mot-de-passe-choisi-lors-du-seed>"
}
```

Le login réussi retourne habituellement `201 Created`, un `accessToken` et les informations du compte. Copier uniquement la valeur du jeton, sans guillemets, dans **Authorization → Bearer Token** pour chaque requête suivante. Ne pas ajouter `Bearer` une seconde fois dans ce champ.

Vérifier la connexion avec `GET /api/v1/auth/me` : réponse attendue `200 OK`.

### Source et connecteur manuels

Créer la source avec `POST /api/v1/sources` :

```json
{
  "name": "Import manuel",
  "organization": "Interne",
  "country": "Côte d'Ivoire",
  "category": "AUTRE",
  "sourceType": "IMPORT_MANUEL",
  "active": true
}
```

Puis créer le connecteur avec `POST /api/v1/connectors`. **Remplacer `1` par l’identifiant de source réellement retourné** :

```json
{
  "connectorType": "IMPORT_MANUEL",
  "sourceId": 1,
  "config": {}
}
```

Envoyer ensuite `POST /api/v1/connectors/<id-connecteur>/test`, avec **Body → none**. Résultat attendu :

```json
{
  "success": true,
  "message": "Le connecteur manuel est disponible."
}
```

### Source et connecteur RSS / Atom

Exemple de source à envoyer à `POST /api/v1/sources` :

```json
{
  "name": "FDA MedWatch",
  "organization": "FDA",
  "country": "USA",
  "category": "REGLEMENTAIRE",
  "sourceType": "RSS",
  "baseUrl": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml",
  "frequency": "6h",
  "active": true
}
```

Connecteur associé, en remplaçant `sourceId` :

```json
{
  "connectorType": "RSS",
  "sourceId": 1,
  "config": {
    "feedUrl": "https://www.fda.gov/about-fda/contact-fda/stay-informed/rss-feeds/medwatch/rss.xml"
  }
}
```

`RSS` et `ATOM` utilisent `RssConnector`. `config.feedUrl` est requis. L’accessibilité et le contenu d’un flux externe peuvent évoluer.

### Source et connecteur Crossref

Source :

```json
{
  "name": "Crossref",
  "organization": "Crossref",
  "country": "International",
  "category": "SCIENTIFIQUE",
  "sourceType": "API",
  "baseUrl": "https://api.crossref.org",
  "frequency": "12h",
  "active": true
}
```

Connecteur, avec l’identifiant de cette source :

```json
{
  "connectorType": "API",
  "sourceId": 1,
  "config": {
    "provider": "CROSSREF",
    "baseUrl": "https://api.crossref.org",
    "query": "food safety laboratory",
    "rows": 10
  }
}
```

`mailto` est optionnel dans `config`. S’il est renseigné, utiliser une adresse choisie pour les échanges avec Crossref, pas la valeur littérale `TON_EMAIL`. `CROSSREF` est actuellement le seul fournisseur API implémenté.

### Test et collecte

Pour le connecteur créé, envoyer successivement, sans corps :

```http
POST http://localhost:3000/api/v1/connectors/<id-connecteur>/test
POST http://localhost:3000/api/v1/connectors/<id-connecteur>/run
```

Examiner `success` dans la réponse du test : une réponse HTTP réussie ne signifie pas forcément que le flux est accessible.

Une collecte réussie retourne :

```json
{
  "connectorId": 2,
  "sourceId": 6,
  "collectedAt": "2026-09-10T10:59:09.375Z",
  "count": 20,
  "items": []
}
```

Cet exemple présente seulement la structure : la liste `items` a été omise pour la lisibilité. Dans la réponse réelle, `count` correspond à sa longueur. Les identifiants, la date et le nombre d’éléments dépendent de la base et de la source.

Le format commun des éléments comprend notamment `externalId`, `title`, `summary`, `url`, `publishedAt` et les données `raw`. Le connecteur passe à `RUNNING`, puis `AVAILABLE` avec `lastSyncAt` mis à jour, ou à `ERROR` en cas d’échec.

## Interface utilisateur

- `/login` : connexion.
- `/` : tableau de bord de démarrage.
- `/users` : liste et création des comptes, route réservée aux administrateurs.
- `/sources` : référentiel des sources, formulaire de création, pagination et statuts.

Le menu latéral comprend Tableau de bord, Sources et Utilisateurs. La colonne **Actions** de Sources propose :

- **Tester** si la source possède au moins un connecteur.
- **Collecter** si elle est active et possède au moins un connecteur.
- **Désactiver / Réactiver** selon son état.

Tester et Collecter ciblent actuellement **le premier connecteur** de la source. Les appels affichent un message de résultat, bloquent les doubles clics en cours et rechargent la liste après succès. Les permissions réelles restent appliquées par le backend, même si un bouton est visible.

## Collecte planifiée

`ScheduleModule` et `CollectionModule` sont intégrés à `AppModule`. Le scheduler s’exécute chaque minute, sélectionne les connecteurs dont la source est active et vérifie leur échéance.

- Formats de fréquence : `30m`, `6h`, `12h`, `1j` (jour). L’ancien format `1d` reste accepté et s’affiche `1j` dans l’interface.
- Un connecteur sans `lastSyncAt` est considéré comme à collecter, même sans fréquence valide.
- Après une première collecte réussie, une fréquence absente ou non reconnue empêche le calcul d’une nouvelle échéance.
- Les collectes sont parcourues séquentiellement ; un échec journalisé par `CollectionService` n’arrête pas à lui seul les connecteurs suivants.
- Un ensemble en mémoire évite deux exécutions simultanées du même connecteur **via `CollectionService` dans un même processus**. Il ne protège pas les appels HTTP directs à `/run` ni plusieurs instances du backend.

Les essais RSS et Crossref décrits ci-dessous ont été réalisés manuellement avant la mise en place du scheduler. Son comportement périodique actuel reste à valider par un test dédié.

## Vérifications réalisées et commandes disponibles

Résultats observés pendant le développement, et non garanties sur l’état futur des services externes :

| Vérification | Résultat observé |
| --- | --- |
| Login administrateur | JWT et profil retournés |
| `/auth/me` avec JWT | 200 |
| Mot de passe incorrect / routes protégées sans JWT | 401 |
| Changement du statut d’une source | Désactivation et réactivation réussies |
| Statut invalide / identifiant invalide / source absente / rôle non autorisé | Rejets 400 / 400 / 404 / 403 dans un test isolé |
| Connecteur manuel | Test positif, statut AVAILABLE |
| FDA MedWatch, 10 septembre 2026 | Test positif, 20 éléments collectés, date de synchronisation enregistrée |
| Crossref, 10 septembre 2026 | Test positif, 10 publications pour `food safety laboratory`, statut AVAILABLE |
| Compilations backend et frontend lors des dernières modifications | Réussies ; avertissement de taille du bundle frontend |

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
npm run preview
```

Les scripts Vitest existent, mais plusieurs tests générés n’injectent pas encore les dépendances nécessaires aux services actuels. **La suite automatisée complète n’est pas déclarée verte.** Les tests HTTP ciblés effectués pendant le développement ne constituent pas encore une suite de régression complète versionnée.

## Dépannage

| Message ou symptôme | Vérification |
| --- | --- |
| `EADDRINUSE :::3000` | Un processus occupe déjà le port. L’identifier avant de l’arrêter ; éviter de lancer plusieurs backends. Si le port change, adapter aussi `VITE_API_URL`. |
| `Cannot POST /api/v1/auth/login` | Vérifier le port, l’URL complète et que la requête atteint ce backend. Le port du projet est revenu à 3000. |
| `email must be an email`, `password must be a string` | Dans Postman, utiliser Body → raw → JSON et `Content-Type: application/json`. |
| 401 | Jeton absent, invalide ou expiré, ou identifiants incorrects. Se reconnecter et remplacer le Bearer Token. |
| 403 | Le rôle connecté n’a pas accès à l’opération. |
| `AuthModuleOptions` introuvable pour `JwtAuthGuard` | Importer la configuration Passport dans le module qui utilise le garde, comme dans les modules existants. |
| Connexion PostgreSQL impossible | Vérifier le service PostgreSQL, les identifiants de `.env` et l’existence de la base `veille`. |
| Ancienne réponse affichée dans Postman | Vérifier le statut et renvoyer la requête ; si nécessaire, ouvrir une nouvelle requête. |
| Ancien bandeau de licence PrimeUI | Vérifier l’installation de PrimeVue 4, redémarrer Vite et actualiser sans cache. Ne pas masquer le contrôle d’une version différente. |
| Erreurs `startTime` dans des scripts `VM...` | Examiner les extensions de développement, notamment Console Ninja ; leur origine n’a pas été confirmée par un test dédié. |
| Référence SchemaStore non résolue dans `package.json` | Vérifier le téléchargement/cache des schémas de l’éditeur. Cela ne constitue pas à lui seul une erreur npm. |

## Git et configuration locale

Le dépôt Git principal se trouve à la racine applicative. `backend/` et `frontend/` doivent être des dossiers ordinaires, sans dépôt Git imbriqué involontaire. L’erreur `backend/ does not have a commit checked out` signale notamment un dépôt imbriqué sans commit ; sauvegarder ses métadonnées hors du projet avant de le regrouper dans le dépôt principal.

Le `.gitignore` exclut les `.env`, les dépendances, les sorties compilées, les caches et les journaux. Vérifier les fichiers préparés avant publication :

```bash
git status
git diff --cached --stat
```

Ne jamais versionner les mots de passe, le secret JWT ou les jetons de session. Les variables frontend `VITE_*` sont intégrées au code envoyé au navigateur : elles ne doivent pas contenir de secret.

## Limites actuelles et suites prévues

- Persistance des éléments de veille, historique des versions et journal des collectes à développer.
- Déduplication, qualification, validation humaine, actions de suivi, recherche métier et notifications à développer.
- Rapports, exports, audit métier et véritables KPI à développer.
- Création/configuration des connecteurs encore réalisée via l’API ; pas d’écran dédié complet.
- Traitement des erreurs réseau, délais d’attente, reprises et limites de collecte à renforcer.
- La désactivation exclut la source du scheduler et masque Collecter dans l’interface ; la route `/run` ne bloque pas encore explicitement une source inactive.
- Stockage du JWT dans `localStorage`, absence de révocation/refresh token et contrôles de rôle frontend à réexaminer avant production.
- Les réponses de création utilisateur doivent être revues pour garantir l’exclusion du hash : `select: false` sur une colonne ne filtre pas à lui seul un objet retourné après `save()`.
- Compléter la validation des paramètres des connecteurs et le contrôle des URL externes.
- Remplacer `synchronize: true` par des migrations, puis prévoir sauvegardes, HTTPS, déploiement et tests de restauration.
- Refaire `npm audit` dans chaque application : des vulnérabilités backend ont été signalées pendant le développement. Le dernier audit frontend lors du passage à PrimeVue 4 n’en signalait aucune ; ce constat n’est pas permanent.
- Compléter les tests automatisés et réduire le bundle frontend signalé comme volumineux par Vite.

Le dépôt applicatif est actuellement marqué `UNLICENSED` côté backend ; cela ne constitue pas une licence de redistribution du projet. Les bibliothèques conservent leurs licences respectives.
