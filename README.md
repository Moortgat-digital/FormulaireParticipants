# Formulaire Participants

Application web d'inscription de participants aux formations Moortgat, intégrée en iframe dans les pages Softr.

## Stack technique

- **Framework** : Next.js 16 (App Router, React 19)
- **Style** : Tailwind CSS v4
- **Back-end** : API Notion via `@notionhq/client` v5.9 (API version `2025-09-03`)
- **Hébergement** : Vercel
- **Front-end client** : Softr (portail formateur)

## Architecture

```
src/
├── app/
│   ├── page.tsx              # Page principale (Server Component)
│   ├── layout.tsx            # Layout racine (police DM Sans)
│   ├── globals.css           # Styles globaux
│   └── api/
│       └── submit/route.ts   # POST : création des inscriptions dans Notion
├── components/
│   ├── ParticipantForm.tsx   # Formulaire 2 étapes (sélection groupe + saisie)
│   └── ParticipantRow.tsx    # Ligne participant (4 champs)
├── lib/
│   └── notion.ts             # Client Notion : lecture formations/groupes, écriture inscriptions
└── types/
    └── participant.ts        # Types TypeScript partagés
```

## Fonctionnement général

### Flux utilisateur

1. Le formateur accède à une **page Formation** sur Softr
2. Le formulaire est chargé en iframe avec le `recordId` de la formation
3. **Etape 1** : l'application récupère automatiquement le nom de la formation et les groupes liés depuis Notion. Le formateur sélectionne un groupe et indique le nombre de participants
4. **Etape 2** : le formateur remplit les informations de chaque participant (Prénom, Nom, Entreprise/Entité, E-mail), puis soumet le formulaire
5. Les inscriptions sont créées dans la base Notion **Demandes d'inscription**, rattachées au groupe sélectionné

### Copier-coller depuis Excel

Le formulaire supporte le copier-coller direct depuis un tableur. Il suffit de :

1. Sélectionner les colonnes **Prénom, Nom, Entreprise/Entité, E-mail** dans Excel
2. Coller dans le champ **Prénom** du premier participant
3. Les données sont automatiquement distribuées dans les champs et lignes correspondants (de nouvelles lignes sont créées si nécessaire)

### Bases Notion utilisées

| Base | Rôle | ID API v2025 |
|------|------|--------------|
| Formations | Lecture du nom de la formation | `21e2b5dd-fdb8-81aa-9a38-000bef1bfa88` |
| Sessions/Groupes | Lecture des groupes liés à une formation (relation `📚 Formation`) | `2292b5dd-fdb8-81c3-a1a9-000b30c94de1` |
| Demandes d'inscription | Ecriture des inscriptions participants | `3132b5dd-fdb8-8042-91bd-000b69b7ad45` |

> **Note** : l'API Notion v2025 utilise des IDs différents de ceux visibles dans les URLs Notion. Les IDs ci-dessus sont ceux retournés par l'API.

### Propriétés écrites dans Notion (Demandes d'inscription)

| Propriété | Type | Contenu |
|-----------|------|---------|
| Nom | Title | Nom du participant |
| Prénom | Rich text | Prénom du participant |
| E-mail | Email | Adresse e-mail |
| Entreprise | Rich text | Entreprise ou entité |
| 📂 Groupe | Relation | Lien vers le groupe sélectionné |
| Soumis par | Email | E-mail du formateur connecté sur Softr |

## Intégration Softr

### Code embed (Custom Code block)

Placer ce code dans un bloc **Custom Code** sur les pages de type **Formation** dans Softr :

```html
<div id="participant-form-container" data-email="{{logged_in_user.email}}"></div>
<script>
  (function() {
    var params = new URLSearchParams(window.location.search);
    var recordId = params.get('recordId') || '';
    var container = document.getElementById('participant-form-container');
    var email = container.getAttribute('data-email') || '';
    if (recordId) {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://formulaire-participants.vercel.app/?recordId=' + recordId + '&submitted_by=' + encodeURIComponent(email);
      iframe.style.width = '100%';
      iframe.style.height = '600px';
      iframe.style.border = 'none';
      container.appendChild(iframe);
    }
  })();
</script>
```

### Pourquoi cette approche JavaScript ?

- Le `recordId` est extrait de l'URL de la page Softr (paramètre `?recordId=...`)
- L'email du formateur connecté est récupéré via `{{logged_in_user.email}}`, résolu par Softr uniquement dans les attributs HTML (pas dans les balises `<script>`)
- Le `data-email` sur le `div` sert de pont entre les variables Softr et le JavaScript

### Variables d'environnement (Vercel)

| Variable | Description |
|----------|-------------|
| `NOTION_API_KEY` | Token de l'intégration Notion "Formulaire participants" |
| `NOTION_DATABASE_ID` | ID API v2025 de la base "Demandes d'inscription" |

## Limites techniques & process

### Dépendance aux saisies manuelles dans BSoft

Le formulaire repose sur la structure de données Notion alimentée depuis BSoft. Pour qu'une formation soit disponible dans le formulaire, il faut que les éléments suivants aient été **préalablement créés manuellement dans BSoft** :

- **La formation** : fiche formation avec toutes ses informations
- **Les sessions** : sessions rattachées à la formation
- **Les journées** (critique) : les journées de chaque session doivent impérativement être saisies. Sans journées, les groupes ne sont pas correctement générés et le formulaire ne pourra pas proposer de groupe à l'utilisateur

Si l'un de ces éléments est manquant, le formulaire affichera "Aucun groupe disponible pour cette formation".

### Cas d'exclusion

Certains clients ou dispositifs ne sont pas compatibles avec ce process d'inscription :

- **Covéa** (et cas similaires) : le process d'inscription par formulaire ne peut pas être appliqué. Les inscriptions pour ces clients doivent continuer à être gérées selon le process existant (saisie manuelle, fichier d'import, etc.)

### Autres limites

- **Rate limiting Notion** : l'API Notion est limitée à ~3 requêtes/seconde. Pour les soumissions de plus de 3 participants, un délai de 350ms est ajouté entre chaque création pour éviter les erreurs 429
- **IDs Notion v2025** : les identifiants de bases de données retournés par l'API v2025 diffèrent de ceux affichés dans les URLs Notion. En cas de reconfiguration, utiliser l'endpoint de recherche `notion.search()` pour retrouver les bons IDs
- **Intégration Notion** : l'intégration "Formulaire participants" doit être connectée aux 3 bases (Formations, Sessions/Groupes, Demandes d'inscription) depuis les paramètres Notion
