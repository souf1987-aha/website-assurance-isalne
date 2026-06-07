# Backend WhatsApp Cloud API

Ce service reçoit les formulaires du site et appelle Meta WhatsApp Cloud API côté serveur, sans exposer le token dans le navigateur.

Variables d'environnement :

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
```

Si aucun template n'est configuré, le backend envoie un message texte simple.

Si un template est configuré, `WHATSAPP_TEMPLATE_REQUEST_PARAMS` et `WHATSAPP_TEMPLATE_CLAIM_PARAMS` doivent correspondre au nombre et à l'ordre des variables `{{1}}`, `{{2}}`, etc. dans Meta.

Exemples :

```env
# Template avec une seule variable {{1}}
WHATSAPP_TEMPLATE_REQUEST_PARAMS=message

# Template avec quatre variables : {{1}} nom, {{2}} téléphone, {{3}} produit, {{4}} message
WHATSAPP_TEMPLATE_REQUEST_PARAMS=name,phone,product,message

# Template sans variable
WHATSAPP_TEMPLATE_REQUEST_PARAMS=none
```

Pour les sinistres auto avec documents, créez une template Meta avec un header de type `Document`, puis activez :

```env
WHATSAPP_TEMPLATE_CLAIM_HAS_DOCUMENT_HEADER=true
```
