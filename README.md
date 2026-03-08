# Simulateur de modules IoT (app externe)

Application standalone pour simuler des modules virtuels (Mère, Pompe, Champ) et injecter des données en temps réel dans Firebase. Permet de tester l’IHM principale sans matériel (LoRa/ESP32). Thème sombre obligatoire pour distinguer le simulateur de l’IHM agriculteur.

## Prérequis

- Node.js 18+
- Même projet Firebase que le site (même config)

## Installation

```bash
cd Simulator
npm install
```

## Configuration

Créez un fichier `.env` à la racine du dossier `Simulator` avec les variables Firebase, préfixées par `VITE_` :

- Depuis le site : copiez les variables `NEXT_PUBLIC_FIREBASE_*` de `Site/.env.local` et renommez-les en `VITE_FIREBASE_*`.

Exemple (voir `.env.example`) :

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Lancement

```bash
npm run dev
```

Ouvrez l’URL affichée (souvent http://localhost:5173). Connectez-vous avec le **même compte** que sur le site.

## Fonctionnalités

### Générateur de modules (Factory)

- **Créer un nouveau module** : choix du type (Mère / Pompe / Champ), génération d’un ID unique (ex. `SIM_POMPE_8A4B`).
- **UserId cible** : par défaut les modules sont créés pour l’utilisateur connecté. Vous pouvez modifier le champ « UserId cible » en haut pour associer les modules à un autre utilisateur (nécessite des règles Firebase adaptées pour écrire sous un autre `uid`).

### Panneau de contrôle temps réel

- **Module Mère** : statut (En ligne / Hors ligne / Latence élevée), Kill Switch.
- **Module Pompe** : pression (0–10 bar), délai LoRa (2–5 s) avant confirmation des commandes envoyées par l’IHM, Kill Switch.
- **Module Champ** : batterie (0–100 %), humidité du sol (0–100 %), pH (0–14), GPS (saisie manuelle ou **Choisir sur la carte** avec mini-carte), Kill Switch.

### Kill Switch

Par module : bouton « Kill Switch » pour simuler une panne. Le simulateur arrête d’envoyer les mises à jour `lastSeen` ; l’IHM principale déclare le module hors ligne après 5 min.

### Modes de simulation

- **Manuel** : les valeurs ne changent que lorsque vous bougez les curseurs.
- **Scénario** : évolution automatique — batterie -1 %/heure, humidité -5 %/minute ; si une pompe est allumée (état confirmé côté IHM), l’humidité remonte (+3 %/minute) jusqu’à 100 %.

### Délai LoRa (Pompe)

Quand l’IHM envoie une commande (pompe / vanne), le simulateur attend le délai configuré (2–5 s) avant de confirmer, pour simuler la latence réseau.

## Build

```bash
npm run build
```

Les fichiers générés sont dans `dist/`. Déploiement possible sur tout hébergeur statique.
