# Configuration WhatsApp Cloud API

Le site utilise maintenant un backend Node.js pour envoyer les formulaires vers Meta WhatsApp Cloud API sans exposer le token dans le navigateur.

## Variables à créer

Créez un fichier `.env` à la racine du projet, sur le serveur et en local si besoin :

```env
WHATSAPP_TOKEN=EA...
WHATSAPP_PHONE_NUMBER_ID=123456789
WHATSAPP_TO=212661744550
WHATSAPP_TO_REQUEST=212661744550
WHATSAPP_TO_CLAIM=212661744550
WHATSAPP_API_VERSION=v21.0
WHATSAPP_TEMPLATE_LANGUAGE=fr
WHATSAPP_TEMPLATE_REQUEST_NAME=nom_template_devis
WHATSAPP_TEMPLATE_REQUEST_PARAMS=message
WHATSAPP_TEMPLATE_CLAIM_NAME=nom_template_sinistre
WHATSAPP_TEMPLATE_CLAIM_PARAMS=name,phone,product,claim_date,claim_place,registration,message
WHATSAPP_TEMPLATE_CLAIM_HAS_DOCUMENT_HEADER=true
SITE_PORT=8080
```

Le fichier `.env` est ignoré par Git.

`WHATSAPP_TO_REQUEST` reçoit les demandes de devis/contact. `WHATSAPP_TO_CLAIM` reçoit les déclarations de sinistre. `WHATSAPP_TO` reste un fallback si l'un des deux n'est pas renseigné.

## Templates

Si `WHATSAPP_TEMPLATE_REQUEST_NAME` est renseigné, les demandes de devis/contact utilisent ce template.

Si `WHATSAPP_TEMPLATE_CLAIM_NAME` est renseigné, les déclarations de sinistre utilisent ce template.

`WHATSAPP_TEMPLATE_REQUEST_PARAMS` doit correspondre exactement au nombre et à l'ordre des variables du template Meta.

Exemples :

```env
# Template avec seulement {{1}}
WHATSAPP_TEMPLATE_REQUEST_PARAMS=message

# Template avec {{1}} nom, {{2}} téléphone, {{3}} produit, {{4}} message
WHATSAPP_TEMPLATE_REQUEST_PARAMS=name,phone,product,message

# Template sans variable
WHATSAPP_TEMPLATE_REQUEST_PARAMS=none
```

Champs disponibles pour les demandes :

```text
name, phone, product, message
```

Champs disponibles pour les sinistres :

```text
name, phone, product, claim_date, claim_place, message, registration, constat, carte_grise, assurance, attachments
```

Pour une template sinistre avec un PDF en header, créez dans Meta une template avec :

```text
Header: Document
Body:
Nouvelle déclaration de sinistre automobile.

Nom : {{1}}
Téléphone : {{2}}
Produit : {{3}}
Date du sinistre : {{4}}
Lieu : {{5}}
Immatriculation : {{6}}
Description : {{7}}
```

Puis configurez :

```env
WHATSAPP_TEMPLATE_CLAIM_HAS_DOCUMENT_HEADER=true
WHATSAPP_TEMPLATE_CLAIM_PARAMS=name,phone,product,claim_date,claim_place,registration,message
```

Le backend crée un PDF unique avec le résumé du sinistre, le constat, la carte grise, l'assurance et les autres pièces jointes supportées (`pdf`, `jpg`, `png`), puis l'envoie comme document de header.

## Lancement Docker

```bash
docker compose up -d --build
```

En local Windows, si le port `8080` est occupé :

```powershell
$env:SITE_PORT='8081'
docker compose up -d --build
```

## Tests rapides

```bash
curl http://localhost:8080/api/health
```

La réponse attendue :

```json
{"ok":true}
```
