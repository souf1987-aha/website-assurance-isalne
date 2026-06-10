const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const nav = document.querySelector("[data-nav]");
const tabs = document.querySelectorAll("[data-filter]");
const cards = document.querySelectorAll("[data-category]");
const form = document.querySelector("[data-form]");
const formNote = document.querySelector("[data-form-note]");
const logo = document.querySelector(".brand-logo");
const chatbot = document.querySelector("[data-chatbot]");
const chatbotToggle = document.querySelector("[data-chatbot-toggle]");
const chatbotClose = document.querySelector("[data-chatbot-close]");
const chatbotPanel = document.querySelector("[data-chatbot-panel]");
const chatbotMessages = document.querySelector("[data-chatbot-messages]");
const chatbotSuggestions = document.querySelector("[data-chatbot-suggestions]");
const chatbotForm = document.querySelector("[data-chatbot-form]");
const claimForm = document.querySelector("[data-claim-form]");
const claimProduct = document.querySelector("[data-claim-product]");
const autoClaimFields = document.querySelector("[data-auto-claim-fields]");
const autoRequiredFields = document.querySelectorAll("[data-auto-required]");
const claimFormNote = document.querySelector("[data-claim-form-note]");
const whatsappNumber = "212661744550";
const maxAttachmentSize = 5 * 1024 * 1024;
let chatFlow = null;

if (logo) {
  logo.addEventListener("error", () => {
    logo.style.display = "none";
  });
}

const syncHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 20);
};

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

menuToggle?.addEventListener("click", () => {
  const isOpen = nav?.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(Boolean(isOpen)));
});

nav?.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    nav.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const filter = tab.dataset.filter ?? "all";

    tabs.forEach((item) => item.classList.toggle("is-active", item === tab));
    cards.forEach((card) => {
      const shouldShow = filter === "all" || card.dataset.category === filter;
      card.classList.toggle("is-hidden", !shouldShow);
    });
  });
});

const getTextValue = (data, key) => String(data.get(key) || "").trim();

const getFileNames = (data, key) =>
  data
    .getAll(key)
    .filter((item) => item instanceof File && item.name)
    .map((file) => file.name)
    .join(", ");

const openWhatsAppMessage = (message) => {
  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
};

const setSubmitState = (targetForm, isLoading, loadingLabel = "Envoi en cours...") => {
  const button = targetForm?.querySelector('button[type="submit"]');
  if (!button) return;

  if (isLoading) {
    button.dataset.defaultText = button.textContent;
    button.textContent = loadingLabel;
    button.disabled = true;
    button.classList.add("is-loading");
    button.setAttribute("aria-busy", "true");
  } else {
    button.textContent = button.dataset.defaultText || button.textContent;
    button.disabled = false;
    button.classList.remove("is-loading");
    button.removeAttribute("aria-busy");
  }
};

const validateFileSizes = (targetForm, noteElement) => {
  const fileInputs = targetForm?.querySelectorAll('input[type="file"]') || [];

  for (const input of fileInputs) {
    for (const file of input.files || []) {
      if (file.size > maxAttachmentSize) {
        if (noteElement) {
          noteElement.textContent = `Le fichier "${file.name}" dépasse la limite autorisée de 5 Mo.`;
          noteElement.classList.remove("is-success");
          noteElement.classList.add("is-error");
        }
        input.focus();
        return false;
      }
    }
  }

  return true;
};

const sendFormToBackend = async (type, message, fields = {}) => {
  let response;
  let result = {};

  try {
    response = await fetch(`/api/whatsapp/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, fields }),
    });
    result = await response.json().catch(() => ({}));
  } catch (error) {
    error.useFallback = true;
    throw error;
  }

  if (!response.ok || !result.ok) {
    const error = new Error(result.error || `Envoi WhatsApp indisponible (${response.status}).`);
    error.useFallback = false;
    throw error;
  }

  return result;
};

const sendClaimToBackend = async (formData) => {
  let response;
  let result = {};

  try {
    response = await fetch("/api/whatsapp/claim", {
      method: "POST",
      body: formData,
    });
    result = await response.json().catch(() => ({}));
  } catch (error) {
    error.useFallback = true;
    throw error;
  }

  if (!response.ok || !result.ok) {
    const error = new Error(result.error || "Envoi WhatsApp indisponible.");
    error.useFallback = false;
    throw error;
  }

  return result;
};

const buildRequestMessage = (data) => {
  const lines = [
    "Bonjour Assurances Islane,",
    "",
    "Je souhaite envoyer une demande depuis le site web.",
    "",
    `Nom: ${getTextValue(data, "name")}`,
    `T\u00e9l\u00e9phone: ${getTextValue(data, "phone")}`,
    `Objet / produit: ${getTextValue(data, "product")}`,
  ];
  const message = getTextValue(data, "message");

  if (message) {
    lines.push(`Message: ${message}`);
  }

  return lines.join("\n");
};

const buildRequestFields = (data) => ({
  name: getTextValue(data, "name"),
  phone: getTextValue(data, "phone"),
  product: getTextValue(data, "product"),
  message: getTextValue(data, "message"),
});

const buildClaimMessage = (data) => {
  const product = getTextValue(data, "product");
  const lines = [
    "Bonjour Assurances Islane,",
    "",
    "Je souhaite d\u00e9clarer un sinistre depuis le site web.",
    "",
    `Nom: ${getTextValue(data, "name")}`,
    `T\u00e9l\u00e9phone: ${getTextValue(data, "phone")}`,
    `Produit: ${product}`,
    `Date du sinistre: ${getTextValue(data, "claim_date")}`,
    `Lieu du sinistre: ${getTextValue(data, "claim_place")}`,
    `Description: ${getTextValue(data, "message")}`,
  ];

  if (product === "automobile") {
    lines.push(`Immatriculation: ${getTextValue(data, "registration")}`);
    lines.push(`Constat: ${getFileNames(data, "constat") || "A joindre sur WhatsApp"}`);
    lines.push(`Carte grise: ${getFileNames(data, "carte_grise") || "A joindre sur WhatsApp"}`);
    lines.push(`Assurance: ${getFileNames(data, "assurance") || "A joindre sur WhatsApp"}`);
  }

  const attachments = getFileNames(data, "attachments");
  if (attachments) {
    lines.push(`Autres documents: ${attachments}`);
  }

  lines.push("");
  lines.push("Je joins les documents directement dans WhatsApp apr\u00e8s l'envoi de ce message.");

  return lines.join("\n");
};

const buildClaimFields = (data) => {
  const product = getTextValue(data, "product");
  const fields = {
    name: getTextValue(data, "name"),
    phone: getTextValue(data, "phone"),
    product,
    claim_date: getTextValue(data, "claim_date"),
    claim_place: getTextValue(data, "claim_place"),
    message: getTextValue(data, "message"),
    registration: getTextValue(data, "registration"),
    attachments: getFileNames(data, "attachments"),
  };

  if (product === "automobile") {
    fields.constat = getFileNames(data, "constat") || "A joindre sur WhatsApp";
    fields.carte_grise = getFileNames(data, "carte_grise") || "A joindre sur WhatsApp";
    fields.assurance = getFileNames(data, "assurance") || "A joindre sur WhatsApp";
  }

  return fields;
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim().split(" ")[0] || "Votre demande";
  const message = buildRequestMessage(data);
  const fields = buildRequestFields(data);

  setSubmitState(form, true);
  try {
    await sendFormToBackend("request", message, fields);
    if (formNote) {
      formNote.textContent = `${name}, votre demande a bien \u00e9t\u00e9 envoy\u00e9e sur WhatsApp.`;
      formNote.classList.add("is-success");
    }
    form.reset();
  } catch (error) {
    if (!error.useFallback) {
      if (formNote) {
        formNote.textContent = `${name}, l'envoi automatique WhatsApp n'a pas abouti : ${error.message}`;
        formNote.classList.add("is-success");
      }
      return;
    }

    openWhatsAppMessage(message);
    if (formNote) {
      formNote.textContent = `${name}, l'envoi automatique n'est pas disponible. Le message est pr\u00eat dans WhatsApp.`;
      formNote.classList.add("is-success");
    }
  } finally {
    setSubmitState(form, false);
  }
});

const syncAutoClaimFields = () => {
  const isAuto = claimProduct?.value === "automobile";
  autoClaimFields?.classList.toggle("is-hidden", !isAuto);
  autoRequiredFields.forEach((field) => {
    if (field instanceof HTMLInputElement) {
      field.required = Boolean(isAuto);
      if (!isAuto) {
        field.value = "";
      }
    }
  });
};

claimProduct?.addEventListener("change", syncAutoClaimFields);
syncAutoClaimFields();

claimForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!claimForm.checkValidity()) {
    claimForm.reportValidity();
    return;
  }

  if (!validateFileSizes(claimForm, claimFormNote)) {
    return;
  }

  const data = new FormData(claimForm);
  const name = String(data.get("name") || "").trim().split(" ")[0] || "Votre d\u00e9claration";
  const product = String(data.get("product") || "");
  const message = buildClaimMessage(data);

  setSubmitState(claimForm, true, "Envoi de la d\u00e9claration...");
  try {
    await sendClaimToBackend(data);
    if (claimFormNote) {
      claimFormNote.textContent =
        product === "automobile"
          ? `${name}, votre d\u00e9claration auto a bien \u00e9t\u00e9 envoy\u00e9e sur WhatsApp.`
          : `${name}, votre d\u00e9claration a bien \u00e9t\u00e9 envoy\u00e9e sur WhatsApp.`;
      claimFormNote.classList.add("is-success");
    }
    claimForm.reset();
    syncAutoClaimFields();
  } catch (error) {
    if (!error.useFallback) {
      if (claimFormNote) {
        claimFormNote.textContent = `${name}, l'envoi automatique WhatsApp n'a pas abouti : ${error.message}`;
        claimFormNote.classList.add("is-success");
      }
      return;
    }

    openWhatsAppMessage(message);
    if (claimFormNote) {
      claimFormNote.textContent =
        product === "automobile"
          ? `${name}, l'envoi automatique n'est pas disponible. Le message est pr\u00eat dans WhatsApp ; joignez ensuite le constat, la carte grise et l'assurance.`
          : `${name}, l'envoi automatique n'est pas disponible. Le message est pr\u00eat dans WhatsApp.`;
      claimFormNote.classList.add("is-success");
    }
  } finally {
    setSubmitState(claimForm, false);
  }
});
const quickQuestions = [
  "Je veux un devis auto",
  "Comment déclarer un sinistre ?",
  "C'est quoi une franchise ?",
  "Quel délai pour un sinistre ?",
  "Quels produits proposez-vous ?",
  "Comment contacter l'agence ?",
];

const enhancedQuickQuestions = [
  { label: "Demander un devis", action: "quote" },
  { label: "D\u00e9clarer un sinistre", action: "claim" },
  { label: "Documents auto", question: "Quels documents pour un devis auto ?" },
  { label: "D\u00e9lai sinistre", question: "Quel d\u00e9lai pour un sinistre ?" },
  { label: "Produits", question: "Quels produits proposez-vous ?" },
  { label: "Contact", question: "Comment contacter l'agence ?" },
];

const codeAnswers = [
  {
    keys: ["code des assurances", "loi assurance", "loi 17-99", "droit assurance", "reglementation"],
    text: "Le Code des assurances marocain encadre notamment le contrat d'assurance, les obligations de l'assureur et de l'assuré, les déclarations, les exclusions, la prescription et certaines assurances obligatoires. Cette réponse est informative : pour un cas précis, il faut vérifier le contrat et le texte applicable.",
  },
  {
    keys: ["contrat d'assurance", "contrat assurance", "police", "conditions generales", "conditions particulieres"],
    text: "Selon le Code des assurances, le contrat d'assurance est la convention entre l'assureur et le souscripteur pour couvrir un risque et constater leurs engagements réciproques. Il doit être rédigé par écrit, en caractères apparents, et préciser notamment les parties, les risques garantis, la durée, le montant de garantie, la prime, les obligations et les modalités de déclaration de sinistre.",
  },
  {
    keys: ["prime", "cotisation", "echeance", "payer prime", "paiement prime"],
    text: "La prime est la somme due par le souscripteur en contrepartie des garanties accordées. Le Code prévoit que l'assuré est notamment obligé de payer la prime ou cotisation aux dates convenues. En cas d'impayé, les effets exacts dépendent du contrat et de la procédure de mise en demeure.",
  },
  {
    keys: ["sinistre definition", "c'est quoi un sinistre", "qu'est ce qu'un sinistre", "definition sinistre"],
    text: "Dans le Code des assurances, le sinistre correspond à la survenance de l'événement prévu par le contrat d'assurance. Autrement dit, c'est l'événement garanti qui peut déclencher l'indemnité ou la prestation, dans les limites du contrat.",
  },
  {
    keys: ["delai sinistre", "declarer sinistre", "declaration sinistre", "combien de jours sinistre", "retard sinistre"],
    text: "Le Code des assurances indique que l'assuré doit donner avis à l'assureur dès qu'il a connaissance d'un sinistre de nature à entraîner la garantie, et au plus tard dans les cinq jours de sa survenance, sauf dispositions particulières. Le contrat peut prévoir des modalités pratiques : gardez les preuves et contactez rapidement l'agence.",
    link: { href: "sinistre.html", label: "Préparer un sinistre" },
  },
  {
    keys: ["franchise", "reste a charge"],
    text: "La franchise est la somme qui reste toujours à la charge de l'assuré lors du règlement d'un sinistre. Elle doit être lue dans les conditions du contrat, car son montant et son mode d'application peuvent varier selon la garantie.",
  },
  {
    keys: ["exclusion", "exclusions", "decheance", "non assurance", "nullite"],
    text: "Le Code encadre les exclusions, nullités et déchéances : les clauses qui les prévoient ne sont valables que si elles sont mentionnées en caractères très apparents dans le contrat. Il faut donc lire attentivement les exclusions et obligations avant de signer.",
  },
  {
    keys: ["avenant", "modifier contrat", "modification contrat", "changement contrat"],
    text: "Une addition ou modification au contrat d'assurance doit être constatée par un avenant écrit et signé des parties. L'avenant fait partie intégrante du contrat et sert à formaliser un changement de garantie, de capital, de risque ou de situation.",
  },
  {
    keys: ["aggravation", "risque aggrave", "changer situation", "declaration risque"],
    text: "Si le risque s'aggrave, le Code prévoit que l'assuré doit le déclarer à l'assureur. Si l'aggravation résulte de son fait, la déclaration doit être faite préalablement ; sinon, elle doit être faite dans un délai de huit jours à partir du moment où il en a connaissance.",
  },
  {
    keys: ["prescription", "delai action", "recours assurance", "action assurance"],
    text: "En principe, les actions dérivant d'un contrat d'assurance se prescrivent par deux ans à compter de l'événement qui y donne naissance. Le Code prévoit des exceptions, notamment pour certaines assurances de personnes. Pour un litige ou un recours, demandez un avis juridique adapté.",
  },
  {
    keys: ["regle proportionnelle", "sous assurance", "insuffisance prime", "fausse declaration"],
    text: "La règle proportionnelle peut réduire l'indemnité en assurance de dommages, notamment en cas de sous-assurance ou d'insuffisance de prime par rapport aux caractéristiques du risque. C'est pourquoi il est important de déclarer correctement la valeur assurée et la situation du risque.",
  },
  {
    keys: ["beneficiaire", "souscripteur", "assure", "assureur"],
    text: "Le Code distingue plusieurs rôles : l'assureur est l'entreprise agréée qui couvre le risque ; le souscripteur contracte et s'engage notamment au paiement de la prime ; l'assuré est la personne ou l'intérêt sur lequel repose l'assurance ; le bénéficiaire reçoit le capital ou la rente prévu.",
  },
  {
    keys: ["attestation", "certificat assurance", "preuve assurance"],
    text: "L'attestation d'assurance est le certificat délivré par l'assureur constatant l'existence de l'assurance. Elle sert souvent de preuve pratique de couverture, notamment pour certains contrats obligatoires.",
  },
  {
    keys: ["notice", "information avant contrat", "avant souscription", "obligations assureur"],
    text: "Avant la souscription, le Code prévoit que l'assureur remet un projet de contrat comportant le prix ou une notice d'information décrivant notamment les garanties, les exclusions, le prix et les obligations de l'assuré.",
  },
];

codeAnswers.forEach((answer) => {
  if (!answer.link) {
    answer.link = { href: "documents/code_des_assurances_fr.pdf", label: "Consulter le Code" };
  }
});

const answers = [
  ...codeAnswers,
  {
    keys: ["auto", "voiture", "vehicule", "flotte", "permis", "carte grise"],
    text: "Pour l'assurance auto, l'agence peut vous orienter sur la responsabilité civile, les dommages, le vol, l'incendie, le bris de glace, l'assistance et les solutions flotte. Préparez idéalement la carte grise, la CIN, le permis et l'ancien contrat si disponible. Vous pouvez aussi demander un devis rapide.",
    link: { href: "automobile.html", label: "Voir Automobile" },
  },
  {
    keys: ["devis", "prix", "tarif", "souscrire", "contrat"],
    text: "Pour un devis, indiquez le produit souhaité, votre situation, les garanties attendues et vos coordonnées. L'agence pourra ensuite vous proposer une orientation adaptée.",
    link: { href: "devis.html", label: "Demander un devis" },
  },
  {
    keys: ["sinistre", "declarer", "declaration", "accident", "expertise", "remboursement"],
    text: "En cas de sinistre, sécurisez d'abord la situation, prenez des photos si possible, gardez les justificatifs et contactez l'agence rapidement. La page Sinistre résume les documents fréquents et les grandes étapes de suivi.",
    link: { href: "sinistre.html", label: "Voir Sinistre" },
  },
  {
    keys: ["sante", "vie", "retraite", "prevoyance", "maladie", "hospitalisation"],
    text: "Pour Santé & Vie, l'agence peut vous aider à comparer les niveaux de remboursement, plafonds, exclusions, délais, retraite, prévoyance et solutions collectives.",
    link: { href: "sante-vie.html", label: "Voir Santé & Vie" },
  },
  {
    keys: ["habitation", "maison", "commerce", "multirisque", "multirisques", "bureau", "pme"],
    text: "Les solutions multirisques couvrent notamment habitation, commerce, bureau, PME, locaux, biens, responsabilité et certains risques techniques selon le contrat.",
    link: { href: "multirisques.html", label: "Voir Multirisques" },
  },
  {
    keys: ["responsabilite", "rc", "tiers", "decennale", "professionnelle"],
    text: "La responsabilité civile aide à couvrir les dommages causés aux tiers. Les garanties dépendent de l'activité : exploitation, professionnelle, scolaire, sportive ou décennale.",
    link: { href: "responsabilite-civile.html", label: "Voir RC" },
  },
  {
    keys: ["travail", "accident de travail", "salarie", "employeur"],
    text: "L'assurance Accident de Travail accompagne l'employeur sur la protection des salariés et les démarches liées aux accidents survenus dans le cadre professionnel.",
    link: { href: "accident-travail.html", label: "Voir Accident de Travail" },
  },
  {
    keys: ["assistance", "voyage", "depannage", "remorquage"],
    text: "L'assistance peut concerner l'auto, le voyage, le sinistre ou certaines démarches administratives, selon les garanties souscrites et les conditions du contrat.",
    link: { href: "assistance.html", label: "Voir Assistance" },
  },
  {
    keys: ["contact", "telephone", "adresse", "whatsapp", "email", "agadir"],
    text: "Vous pouvez contacter Assurances Islane à Agadir. Les coordonnées et le formulaire de message sont regroupés sur la page Contact.",
    link: { href: "contact.html", label: "Voir Contact" },
  },
  {
    keys: ["partenaire", "atlantasanad", "atlanta", "sanad", "axa", "barid", "cat"],
    text: "Assurances Islane est agent agréé AtlantaSanad et présente aussi ses partenaires utiles pour l'assistance, le paiement et les services automobiles.",
    link: { href: "partenaires.html", label: "Voir Partenaires" },
  },
];

const normalizeMessage = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const appendChatMessage = (text, type = "bot", link) => {
  if (!chatbotMessages) return;

  const message = document.createElement("div");
  message.className = `chat-message ${type}`;
  message.textContent = text;

  if (link && type === "bot") {
    const anchor = document.createElement("a");
    anchor.href = link.href;
    anchor.textContent = link.label;
    anchor.className = "chat-message-link";
    message.appendChild(document.createElement("br"));
    message.appendChild(anchor);
  }

  chatbotMessages.appendChild(message);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
};

const appendChatActions = (actions = []) => {
  if (!chatbotMessages || !actions.length) return;

  const container = document.createElement("div");
  container.className = "chat-message bot chat-actions";

  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    container.appendChild(button);
  });

  chatbotMessages.appendChild(container);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
};

const appendMainChatActions = () => {
  appendChatActions([
    { label: "Demander un devis", onClick: startQuoteFlow },
    { label: "D\u00e9clarer un sinistre", onClick: startClaimFlow },
    { label: "Documents utiles", onClick: () => enhancedAnswerQuestion("Quels documents pour un devis auto ?") },
    { label: "Contacter l'agence", onClick: () => enhancedAnswerQuestion("Comment contacter l'agence ?") },
  ]);
};

const resetChatFlow = () => {
  chatFlow = null;
  appendChatMessage("D'accord. Que souhaitez-vous faire maintenant ?");
  appendMainChatActions();
};

const startQuoteFlow = () => {
  chatFlow = { type: "quote", step: "product", data: {} };
  appendChatMessage("Tr\u00e8s bien, je vais pr\u00e9parer une demande de devis. Quel produit vous int\u00e9resse ?");
  appendChatActions([
    { label: "Automobile", onClick: () => handleChatFlowInput("Automobile") },
    { label: "Sant\u00e9 / Vie", onClick: () => handleChatFlowInput("Sant\u00e9 / Vie") },
    { label: "Multirisques", onClick: () => handleChatFlowInput("Multirisques") },
    { label: "Responsabilit\u00e9 civile", onClick: () => handleChatFlowInput("Responsabilit\u00e9 civile") },
  ]);
};

const startClaimFlow = () => {
  chatFlow = { type: "claim", step: "product", data: {} };
  appendChatMessage("Je peux vous aider \u00e0 pr\u00e9parer la d\u00e9claration. Quel produit est concern\u00e9 ?");
  appendChatActions([
    { label: "Automobile", onClick: () => handleChatFlowInput("Automobile") },
    { label: "Habitation / Commerce", onClick: () => handleChatFlowInput("Habitation / Commerce") },
    { label: "Sant\u00e9 / Vie", onClick: () => handleChatFlowInput("Sant\u00e9 / Vie") },
    { label: "Autre", onClick: () => handleChatFlowInput("Autre") },
  ]);
};

const finishQuoteFlow = async () => {
  const { product, name, phone, message } = chatFlow.data;
  const payloadMessage = [
    "Bonjour Assurances Islane,",
    "",
    "Je souhaite envoyer une demande de devis depuis le chatbot.",
    "",
    `Nom: ${name}`,
    `T\u00e9l\u00e9phone: ${phone}`,
    `Objet / produit: ${product}`,
    `Message: ${message || "Demande de devis"}`,
  ].join("\n");

  appendChatMessage("Merci. J'envoie la demande \u00e0 l'agence...");

  try {
    await sendFormToBackend("request", payloadMessage, {
      name,
      phone,
      product,
      message: message || "Demande de devis depuis le chatbot",
    });
    appendChatMessage("Votre demande a bien \u00e9t\u00e9 transmise \u00e0 l'agence sur WhatsApp. Vous serez recontact\u00e9 prochainement.");
    chatFlow = null;
    appendMainChatActions();
  } catch (error) {
    appendChatMessage(`L'envoi automatique n'a pas abouti : ${error.message}. Vous pouvez utiliser la page Devis.`, "bot", {
      href: "devis.html",
      label: "Ouvrir le devis",
    });
    chatFlow = null;
  }
};

const handleChatFlowInput = async (value) => {
  if (!chatFlow) return false;

  const text = String(value || "").trim();
  if (!text) return true;

  appendChatMessage(text, "user");

  if (normalizeMessage(text) === "annuler" || normalizeMessage(text) === "recommencer") {
    resetChatFlow();
    return true;
  }

  if (chatFlow.type === "quote") {
    if (chatFlow.step === "product") {
      chatFlow.data.product = text;
      chatFlow.step = "name";
      appendChatMessage("Votre nom complet ?");
      return true;
    }

    if (chatFlow.step === "name") {
      chatFlow.data.name = text;
      chatFlow.step = "phone";
      appendChatMessage("Votre num\u00e9ro de t\u00e9l\u00e9phone ?");
      return true;
    }

    if (chatFlow.step === "phone") {
      chatFlow.data.phone = text;
      chatFlow.step = "message";
      appendChatMessage("Ajoutez un court message ou les garanties souhait\u00e9es. Vous pouvez aussi \u00e9crire \"RAS\".");
      return true;
    }

    if (chatFlow.step === "message") {
      chatFlow.data.message = normalizeMessage(text) === "ras" ? "" : text;
      await finishQuoteFlow();
      return true;
    }
  }

  if (chatFlow.type === "claim") {
    chatFlow = null;
    appendChatMessage(
      text.toLowerCase().includes("auto")
        ? "Pour un sinistre automobile, pr\u00e9parez le constat, la carte grise, l'attestation d'assurance, la date, le lieu et l'immatriculation. Le formulaire permet de joindre les documents."
        : "Pour ce sinistre, pr\u00e9parez la date, le lieu, une description claire et les justificatifs disponibles. Le formulaire permet de transmettre le dossier \u00e0 l'agence."
    );
    appendChatActions([
      { label: "Ouvrir le formulaire sinistre", onClick: () => { window.location.href = "sinistre.html#declaration-sinistre"; } },
      { label: "Documents fr\u00e9quents", onClick: () => enhancedAnswerQuestion("Quels documents pour un sinistre ?") },
      { label: "Recommencer", onClick: resetChatFlow },
    ]);
    return true;
  }

  return false;
};

const findAnswer = (question) => {
  const normalized = normalizeMessage(question);
  return answers.find((answer) => answer.keys.some((key) => normalized.includes(normalizeMessage(key))));
};

const answerQuestion = (question) => {
  appendChatMessage(question, "user");

  const answer = findAnswer(question);
  if (answer) {
    appendChatMessage(answer.text, "bot", answer.link);
    return;
  }

  appendChatMessage(
    "Je peux vous orienter sur les produits, le devis, le sinistre, l'assistance ou le contact de l'agence. Pour une réponse précise, indiquez le type d'assurance ou utilisez la page Devis.",
    "bot",
    { href: "devis.html", label: "Devis rapide" }
  );
};

const enhancedAnswerQuestion = async (question) => {
  if (chatFlow && (await handleChatFlowInput(question))) {
    return;
  }

  answerQuestion(question);
  appendChatActions([
    { label: "Demander un devis", onClick: startQuoteFlow },
    { label: "D\u00e9clarer un sinistre", onClick: startClaimFlow },
  ]);
};

const openChatbot = () => {
  chatbot?.classList.add("is-open");
  chatbotToggle?.setAttribute("aria-expanded", "true");
  chatbotPanel?.setAttribute("aria-hidden", "false");
};

const closeChatbot = () => {
  chatbot?.classList.remove("is-open");
  chatbotToggle?.setAttribute("aria-expanded", "false");
  chatbotPanel?.setAttribute("aria-hidden", "true");
};

if (chatbot && chatbotMessages && chatbotSuggestions) {
  appendChatMessage(
    "Bonjour, je suis l'assistant Islane. Posez-moi une question sur un devis, un sinistre, une garantie ou les coordonnées de l'agence. Mes réponses sont informatives; la validation finale se fait auprès de l'agence."
  );

  enhancedQuickQuestions.forEach((question) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = question.label || question;
    button.addEventListener("click", async () => {
      openChatbot();
      if (question.action === "quote") {
        startQuoteFlow();
        return;
      }
      if (question.action === "claim") {
        startClaimFlow();
        return;
      }
      await enhancedAnswerQuestion(question.question || question);
    });
    chatbotSuggestions.appendChild(button);
  });
}

chatbotToggle?.addEventListener("click", () => {
  const isOpen = chatbot?.classList.contains("is-open");
  if (isOpen) {
    closeChatbot();
  } else {
    openChatbot();
  }
});

chatbotClose?.addEventListener("click", closeChatbot);

chatbotForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const input = chatbotForm.querySelector("input");
  const question = input?.value.trim();
  if (!question) return;

  await enhancedAnswerQuestion(question);
  input.value = "";
});
