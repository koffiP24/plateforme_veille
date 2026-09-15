# Plateforme de veille ISO/IEC 17025

Application de veille normative, réglementaire, scientifique et d’accréditation destinée à un laboratoire d’analyses agroalimentaires et environnementales.

**État du projet au 15 septembre 2026 : fonctionnalités réalisées jusqu’au module 4.**

Le projet permet actuellement de gérer les utilisateurs et les rôles, les sources et leurs connecteurs, les collectes manuelles ou planifiées, la normalisation et la déduplication des résultats, les éléments de veille, la taxonomie et la qualification.

## Fonctionnalités disponibles

| Domaine | Fonctionnalités |
| --- | --- |
| Authentification | Connexion par adresse email et mot de passe, JWT, profil connecté et déconnexion |
| Utilisateurs | Création, liste, activation, désactivation et modification des rôles |
| Rôles | Contrôle des accès avec les gardes NestJS et protection des routes Vue |
| Sources | Création, consultation, modification, activation et désactivation |
| Connecteurs | Connecteurs manuels, RSS/Atom et API Crossref |
| Collecte | Test d’un connecteur, collecte immédiate et planification automatique |
| Sécurité des collectes | Protection en mémoire et verrou PostgreSQL contre les exécutions simultanées |
| Normalisation | Transformation des données externes vers un format commun |
| Déduplication | Recherche par DOI, identifiant externe, URL canonique et empreinte |
| Éléments de veille | Enregistrement en base, liste, détail et historique des versions |
| Journaux de collecte | Nombre d’éléments reçus, créés, mis à jour, en doublon et en erreur |
| Taxonomie | Gestion des thèmes, domaines, laboratoires, mots-clés et synonymes |
| Qualification | Type de veille, pertinence, criticité et rattachement à la taxonomie |
| Tableau de bord | Indicateurs et contenus adaptés aux rôles de l’utilisateur |
| Interface | Messages en français, notifications Toast et menu latéral escamotable |

## Technologies

### Backend

- NestJS 12 et TypeScript
- TypeORM et PostgreSQL
- Passport, JWT et bcrypt
- Validation avec `class-validator` et `class-transformer`
- Planification avec `@nestjs/schedule`
- Lecture RSS/Atom avec `rss-parser`
- Vitest et Supertest

### Frontend

- Vue 3 et TypeScript
- Vite 8
- Vue Router
- Pinia
- Axios
- PrimeVue 4 avec le thème Aura
- Tailwind CSS 4

Les versions exactes installées sont enregistrées dans les fichiers `package-lock.json`.

## Structure principale

```text
plateforme-veille/
├── backend/
│   └── src/
│       ├── auth/
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
│       ├── permissions/
│       ├── qualification/
│       ├── roles/
│       ├── sources/
│       ├── taxonomy/
│       ├── users/
│       └── watch-items/
└── frontend/
    └── src/
        ├── i18n/
        ├── layouts/
        ├── router/
        ├── services/
        ├── stores/
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

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=<mot-de-passe-postgresql>
DB_NAME=veille

JWT_SECRET=<secret-jwt-long-et-aleatoire>
SEED_ADMIN_EMAIL=admin@veille.local
SEED_ADMIN_PASSWORD=<mot-de-passe-administrateur>
```

Le mot de passe administrateur doit contenir au moins huit caractères. Les variables `SEED_ADMIN_*` créent le compte seulement s’il n’existe pas encore. Modifier ensuite le mot de passe dans `.env` ne change pas celui déjà enregistré en base.

Pour générer un secret JWT :

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### 5. Configurer le frontend

Créer `frontend/.env` :

```dotenv
VITE_API_URL=http://localhost:3000/api/v1
```

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

| Méthode | Route | Fonction |
| --- | --- | --- |
| POST | `/auth/login` | Se connecter |
| GET | `/auth/me` | Consulter le profil connecté |
| GET | `/users` | Lister les utilisateurs |
| POST | `/users` | Créer un utilisateur |
| PATCH | `/users/:id/status` | Activer ou désactiver un compte |
| PATCH | `/users/:id/roles` | Modifier les rôles |
| GET | `/roles` | Lister les rôles disponibles |

### Sources, connecteurs et collectes

| Méthode | Route | Fonction |
| --- | --- | --- |
| GET | `/sources` | Lister les sources et leurs connecteurs |
| GET | `/sources/:id` | Consulter une source |
| POST | `/sources` | Créer une source |
| PATCH | `/sources/:id` | Modifier une source |
| PATCH | `/sources/:id/status` | Activer ou désactiver une source |
| GET | `/connectors` | Lister les connecteurs |
| POST | `/connectors` | Créer un connecteur |
| POST | `/connectors/:id/test` | Tester un connecteur |
| POST | `/connectors/:id/run` | Lancer une collecte |
| GET | `/collection-runs` | Consulter les 100 derniers journaux |

Une collecte terminée retourne une synthèse de cette forme :

```json
{
  "runId": 12,
  "source": "Crossref",
  "received": 20,
  "created": 5,
  "updated": 2,
  "duplicates": 13,
  "errors": 0
}
```

### Éléments de veille et qualification

| Méthode | Route | Fonction |
| --- | --- | --- |
| GET | `/watch-items` | Lister les éléments collectés |
| GET | `/watch-items/:id` | Consulter un élément et ses versions |
| GET | `/watch-items/:id/qualification` | Charger sa qualification |
| PATCH | `/watch-items/:id/qualification` | Enregistrer sa qualification |

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

| Méthode | Route | Fonction |
| --- | --- | --- |
| GET | `/dashboard` | Retourner les indicateurs correspondant aux rôles connectés |

## Processus de collecte

```text
Source active
    ↓
Connecteur manuel, RSS/Atom ou Crossref
    ↓
Récupération des données externes
    ↓
Normalisation
    ↓
Déduplication
    ↓
Création, mise à jour ou classement comme doublon
    ↓
Enregistrement du journal de collecte
```

Les fréquences reconnues comprennent notamment `30m`, `6h`, `12h` et `1j`. Le scheduler vérifie chaque minute les connecteurs associés aux sources actives.

Pour empêcher deux collectes simultanées du même connecteur, le backend utilise :

- un ensemble en mémoire dans l’instance NestJS ;
- un verrou consultatif PostgreSQL, également efficace entre plusieurs instances du backend.

## Interface utilisateur

| Page | Adresse | Accès principal |
| --- | --- | --- |
| Connexion | `/login` | Public |
| Tableau de bord | `/` | Utilisateur authentifié |
| Veilles | `/watch-items` | Administrateur et équipe de veille |
| Qualification | `/watch-items/:id/qualification` | Administrateur et équipe de veille |
| Sources | `/sources` | Selon les rôles autorisés |
| Taxonomie | `/taxonomy` | Administrateur |
| Utilisateurs | `/users` | Administrateur |

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
npm run preview
```

La compilation frontend peut afficher un avertissement indiquant qu’un bloc JavaScript dépasse 500 kB. Cet avertissement n’empêche pas la compilation et pourra être traité plus tard avec le découpage du code.

## Dépannage

| Symptôme | Solution |
| --- | --- |
| `EADDRINUSE :::3000` | Fermer l’ancienne instance NestJS et ne garder qu’un seul `npm run start:dev` |
| Impossible de joindre PostgreSQL | Vérifier le service PostgreSQL, `DB_HOST`, les identifiants et la base `veille` |
| Une table ou une colonne manque | Exécuter les migrations TypeORM |
| Erreur CORS | Vérifier que `FRONTEND_URL` correspond exactement à l’adresse de Vite |
| Erreur 400 au login | Envoyer un vrai corps JSON avec `Content-Type: application/json` |
| Erreur 401 | Se reconnecter et remplacer le jeton expiré ou invalide |
| Erreur 403 | Vérifier le rôle du compte connecté |
| Collecte échouée | Tester le connecteur et vérifier son URL ainsi que l’accès Internet |
| Anciennes valeurs visibles | Redémarrer l’application après une modification de `.env`, puis actualiser la page |

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

## Limites actuelles

- La création et la configuration complètes des connecteurs ne disposent pas encore d’un écran dédié.
- La validation finale, la diffusion, les notifications métier et le suivi des actions appartiennent aux prochains modules.
- Le stockage du JWT dans `localStorage` devra être réévalué avant une mise en production.
- Les erreurs réseau, les délais d’attente et les stratégies de reprise des connecteurs doivent encore être renforcés.
- La suite de tests automatisés doit être complétée à mesure que les prochains modules sont développés.
- Le bundle frontend pourra être découpé pour réduire sa taille initiale.

Le backend est marqué `UNLICENSED`. Les bibliothèques utilisées conservent leurs licences respectives.
