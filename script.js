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

form?.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = new FormData(form);
  const name = String(data.get("name") || "").trim().split(" ")[0] || "Votre demande";

  formNote.textContent = `${name}, votre demande est pr\u00eate. Branchez ce formulaire \u00e0 l'email ou WhatsApp de l'agence pour l'envoi r\u00e9el.`;
  formNote.classList.add("is-success");
  form.reset();
});

const quickQuestions = [
  "Je veux un devis auto",
  "Comment déclarer un sinistre ?",
  "C'est quoi une franchise ?",
  "Quel délai pour un sinistre ?",
  "Quels produits proposez-vous ?",
  "Comment contacter l'agence ?",
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

  quickQuestions.forEach((question) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = question;
    button.addEventListener("click", () => {
      openChatbot();
      answerQuestion(question);
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

chatbotForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const input = chatbotForm.querySelector("input");
  const question = input?.value.trim();
  if (!question) return;

  answerQuestion(question);
  input.value = "";
});
