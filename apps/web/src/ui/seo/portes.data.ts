export interface SousType {
  icon: string;
  title: string;
  desc: string;
}

export interface Etape {
  num: number;
  title: string;
  desc: string;
}

export interface FAQ {
  q: string;
  a: string;
}

export interface PorteData {
  num: string;
  icon: string;
  titleFr: string;
  heroFr: string;
  subtitleFr: string;
  appPath: string;
  sousTypes: SousType[];
  etapes: Etape[];
  faqs: FAQ[];
  pourQui: string[];
  slugFr: string;
  slugEn: string;
  slugAr: string;
  titleEn: string;
  titleAr: string;
}

export const PORTES: PorteData[] = [
  {
    num: '01',
    icon: '🏠',
    titleFr: 'Projet personnel & familial',
    heroFr: 'Construire votre villa ou maison partout au Maroc',
    subtitleFr: "CITURBAREA accompagne votre projet résidentiel dans toutes les villes du Maroc — villa, maison, rénovation, extension. Zone prioritaire : Rabat-Salé-Kénitra et Casablanca.",
    appPath: '/p1',
    slugFr: 'porte-01-projet-personnel',
    slugEn: 'door-01-personal-family-project',
    slugAr: 'bab-01-mashrou-shakhsi-wa-usari',
    titleEn: 'Personal & Family Project',
    titleAr: 'مشروع شخصي وعائلي',
    sousTypes: [
      { icon: '🏠', title: 'Villa au Maroc', desc: 'Villa en bande, jumelée, isolée — arbitrage surface, façades, budget et finition.' },
      { icon: '🏡', title: 'Maison individuelle', desc: 'Maison RDC, R+1 ou petit projet familial avec lecture du terrain et phasage.' },
      { icon: '🔧', title: 'Rénovation & réaménagement', desc: 'Redistribution intérieure, modernisation, réhabilitation complète ou progressive.' },
      { icon: '📐', title: 'Extension & surélévation', desc: "Créer de la surface utile sans déstabiliser le bâti ni entrer dans un mauvais scénario réglementaire." },
    ],
    etapes: [
      { num: 1, title: 'Analyse & cadrage', desc: "On étudie votre terrain, le Plan d'Aménagement, les contraintes et votre budget. Vous savez ce qui est réellement faisable avant de dépenser un dirham." },
      { num: 2, title: 'Avant-projet & plans', desc: "Esquisse, APS, APD. Chaque option est chiffrée. Vous validez avant de passer à la phase suivante." },
      { num: 3, title: 'Dossier permis Rokhas.ma', desc: "Constitution complète du dossier, dépôt sur Rokhas.ma, suivi auprès de la commune et de l'Agence Urbaine." },
      { num: 4, title: 'Consultation entreprises', desc: "Appel d'offres, analyse des devis, recommandation des entreprises fiables. Aucune commission cachée." },
      { num: 5, title: 'Suivi chantier', desc: "Visites régulières, comptes rendus, contrôle qualité et conformité aux plans." },
      { num: 6, title: 'Réception & permis habiter', desc: "Constat de conformité, dossier de permis d'habiter, remise des documents. Votre villa est légale et valorisée." },
    ],
    faqs: [
      { q: "Faut-il déjà avoir un terrain ?", a: "Non. Cette porte sert aussi à cadrer un projet avant l'achat ou avant la prise de décision finale." },
      { q: "Puis-je construire sans architecte au Maroc ?", a: "Non. La loi marocaine impose la signature d'un architecte DENA inscrit à l'Ordre pour tout projet soumis à permis." },
      { q: "Quel est le coût des honoraires ?", a: "Entre 6% et 12% du coût des travaux selon la mission confiée (plans seuls ou mission complète)." },
      { q: "Combien de temps pour construire une villa ?", a: "En moyenne 12 à 24 mois du premier plan à la livraison. La phase administrative représente 3 à 6 mois." },
      { q: "CITURBAREA intervient-il hors RSK ?", a: "Oui. CITURBAREA est une plateforme nationale. Nous intervenons partout au Maroc selon la nature du projet." },
    ],
    pourQui: [
      "Vous partez de zéro ou d'une idée floue et voulez clarifier le bon type de projet.",
      "Vous avez déjà un terrain et voulez savoir ce qui est réellement faisable.",
      "Vous craignez les erreurs coûteuses : mauvais ordre, blocages administratifs, faux budgets.",
    ],
  },
  {
    num: '02',
    icon: '🏢',
    titleFr: 'Projet immobilier & équipements',
    heroFr: 'Immeuble, résidence ou équipement partout au Maroc',
    subtitleFr: "CITURBAREA accompagne vos projets immobiliers collectifs et d'équipements. R+2 à R+6, cliniques, commerces, lotissements. Zone prioritaire : RSK et Casablanca.",
    appPath: '/p2',
    slugFr: 'porte-02-projet-immobilier-equipements',
    slugEn: 'door-02-real-estate-development-facilities',
    slugAr: 'bab-02-mashrou-aqari-wa-tajhizat',
    titleEn: 'Real Estate Development & Facilities',
    titleAr: 'مشروع عقاري وتجهيزات',
    sousTypes: [
      { icon: '🏢', title: 'Immeuble résidentiel ou mixte', desc: 'R+2, R+3, R+4, RDC commerce + logements, lecture du gabarit et rentabilité opérationnelle.' },
      { icon: '🏗️', title: 'Promotion immobilière / résidence', desc: 'Résidence, groupement, opération multi-lots, logique produit et marché.' },
      { icon: '📏', title: 'Lotissement / division / valorisation', desc: 'Découpage, structuration foncière et valorisation de terrain avant opération.' },
      { icon: '🏥', title: 'Équipements privés ou publics', desc: 'Clinique, école, hôtel, bureaux, commerce structuré ou équipement institutionnel.' },
    ],
    etapes: [
      { num: 1, title: 'Faisabilité & programme', desc: "Analyse du foncier, des ratios réglementaires, du gabarit autorisé et de la rentabilité attendue." },
      { num: 2, title: 'Études techniques', desc: "APS, APD, BET structure et techniques, coordination avec les bureaux de contrôle et laboratoires." },
      { num: 3, title: 'Dossier permis & Rokhas', desc: "Constitution du dossier complet, coordination multi-intervenants, dépôt et suivi Rokhas.ma." },
      { num: 4, title: "Appel d'offres entreprises", desc: "DCE, consultation GO et corps d'état secondaires, analyse comparative des offres." },
      { num: 5, title: 'Direction de travaux', desc: "Suivi d'exécution, réunions de chantier, contrôle conformité, gestion des situations de travaux." },
      { num: 6, title: 'Réception & livraison', desc: "Constat de conformité, levée des réserves, remise des documents réglementaires et techniques." },
    ],
    faqs: [
      { q: "Quelle surface minimale pour lancer une opération ?", a: "Il n'y a pas de seuil universel. La faisabilité dépend du PA, du gabarit autorisé et du programme envisagé." },
      { q: "CITURBAREA fait-il la promotion immobilière ?", a: "Non. CITURBAREA est le maître d'œuvre et le coordinateur technique. La promotion reste à votre charge." },
      { q: "Comment est calculée la rentabilité ?", a: "Nous établissons un bilan promoteur complet : coût foncier + honoraires + travaux vs prix de vente marché." },
      { q: "Peut-on mixer usages dans un même immeuble ?", a: "Oui. Les immeubles mixtes RDC commercial + logements sont courants et optimisent la rentabilité du foncier." },
    ],
    pourQui: [
      "Vous êtes promoteur, propriétaire de terrain ou opérateur avec un projet collectif.",
      "Vous devez arbitrer faisabilité, programme et stratégie réglementaire avant d'investir.",
      "Vous cherchez à optimiser la valorisation foncière d'un terrain bien localisé.",
    ],
  },
  {
    num: '03',
    icon: '🏗️',
    titleFr: 'Réalisation clé en main',
    heroFr: 'Votre projet de A à Z — conception, coordination, livraison',
    subtitleFr: "CITURBAREA prend en charge l'intégralité de votre projet : architecte, BET, entreprise GO, corps secondaires, suivi chantier. Vous validez les étapes, nous gérons l'exécution.",
    appPath: '/p3',
    slugFr: 'porte-03-realisation-cle-en-main',
    slugEn: 'door-03-turnkey-delivery',
    slugAr: 'bab-03-injaz-miftah-fi-yad',
    titleEn: 'Turnkey Delivery',
    titleAr: 'إنجاز مفتاح في يد',
    sousTypes: [
      { icon: '🏠', title: 'Villa clé en main', desc: 'De la conception à la remise des clés — un seul interlocuteur pour tout votre projet résidentiel.' },
      { icon: '🏢', title: 'Immeuble clé en main', desc: 'Coordination complète GO + BET + corps secondaires pour votre opération collective.' },
      { icon: '🔧', title: 'Réhabilitation complète', desc: 'Restructuration, mise aux normes et rénovation globale avec direction unique des travaux.' },
      { icon: '⚙️', title: 'Projet industriel ou spécifique', desc: "Usine, entrepôt, équipement à haute technicité — coordination pluridisciplinaire et suivi spécialisé." },
    ],
    etapes: [
      { num: 1, title: 'Cadrage & avant-projet', desc: "Programme, budget, planning. Vous validez le cadre avant de lancer les études." },
      { num: 2, title: 'Études complètes', desc: "Architecture + BET structure, fluides, électricité — tous les plans d'exécution coordonnés." },
      { num: 3, title: 'Permis & autorisations', desc: "Dossier Rokhas, coordination avec les administrations, obtention des autorisations." },
      { num: 4, title: 'Sélection des entreprises', desc: "Appel d'offres GO + lots secondaires, analyse comparative, contractualisation." },
      { num: 5, title: 'Direction & contrôle chantier', desc: "Réunions hebdomadaires, rapports d'avancement, contrôle qualité et gestion des réserves." },
      { num: 6, title: 'Livraison clé en main', desc: "Réception, levée des réserves, remise des documents et accompagnement post-livraison." },
    ],
    faqs: [
      { q: "Quelle différence avec une mission classique ?", a: "En mission classique, vous coordonnez vous-même les intervenants. En clé en main, CITURBAREA assume cette coordination complète." },
      { q: "Est-ce plus cher qu'une mission standard ?", a: "Les honoraires MOD (maîtrise d'ouvrage déléguée) s'ajoutent, mais évitent les surcoûts liés aux mauvaises coordinations." },
      { q: "Gardez-vous le choix des entreprises ?", a: "Oui. Vous validez chaque sélection. CITURBAREA recommande et coordonne, vous décidez." },
      { q: "Y a-t-il une garantie de délai ?", a: "Un planning contractuel est établi. Les délais dépendent aussi des tiers (commune, entreprises)." },
    ],
    pourQui: [
      "Vous n'avez pas le temps de gérer les intervenants en parallèle.",
      "Vous voulez un seul interlocuteur responsable de tout le processus.",
      "Vous avez un projet complexe nécessitant une coordination pluridisciplinaire fine.",
    ],
  },
  {
    num: '04',
    icon: '📊',
    titleFr: 'Investisseur & foncier',
    heroFr: 'Valoriser, arbitrer ou sécuriser un investissement immobilier',
    subtitleFr: "CITURBAREA accompagne les investisseurs fonciers et immobiliers : analyse de rentabilité, faisabilité réglementaire, valorisation avant cession ou opération.",
    appPath: '/p4',
    slugFr: 'porte-04-investisseur-foncier',
    slugEn: 'door-04-land-investor',
    slugAr: 'bab-04-mostathmir-aqari-wa-aard',
    titleEn: 'Land & Real Estate Investor',
    titleAr: 'مستثمر عقاري وأرض',
    sousTypes: [
      { icon: '📊', title: 'Analyse foncière avant achat', desc: "Lecture du PA, gabarit, contraintes et potentiel réel avant de signer l'acte." },
      { icon: '💰', title: 'Bilan promoteur & rentabilité', desc: "Simulation financière complète : coûts, prix marché, rendement attendu et scénarios." },
      { icon: '🗺️', title: 'Valorisation avant cession', desc: "Obtenir un permis, une esquisse ou un dossier technique pour augmenter la valeur avant la vente." },
      { icon: '🤝', title: 'Montage partenariat', desc: "Structurer un partage terrain/financement avec un promoteur ou un tiers investisseur." },
    ],
    etapes: [
      { num: 1, title: 'Due diligence foncière', desc: "Vérification titre, Plan d'Aménagement, servitudes, risques et potentiel constructible." },
      { num: 2, title: 'Simulation financière', desc: "Bilan promoteur simplifié ou complet selon l'ambition du projet." },
      { num: 3, title: 'Esquisse de valorisation', desc: "Un plan de masse ou une esquisse pour matérialiser le potentiel et faciliter la cession ou le financement." },
      { num: 4, title: 'Stratégie & décision', desc: "Recommandation claire : acheter / ne pas acheter, construire maintenant / différer, vendre tel quel / valoriser d'abord." },
    ],
    faqs: [
      { q: "Peut-on analyser un terrain avant l'achat ?", a: "Oui. C'est même le meilleur moment pour éviter une mauvaise décision irréversible." },
      { q: "CITURBAREA achète-t-il des terrains ?", a: "Non. Nous sommes conseils et maîtres d'œuvre, pas promoteurs ni marchands de biens." },
      { q: "Quel est le coût d'une analyse foncière ?", a: "Cela dépend de la complexité. Contactez-nous pour un devis personnalisé selon la surface et la localisation." },
      { q: "Comment est estimée la valeur marché ?", a: "Nous croisons les prix DGI, les prix de vente affichés et notre connaissance terrain des marchés locaux marocains." },
    ],
    pourQui: [
      "Vous possédez un terrain et cherchez à en maximiser la valeur avant cession ou opération.",
      "Vous envisagez d'acheter un foncier et souhaitez valider sa faisabilité réglementaire.",
      "Vous montez une opération et avez besoin d'un bilan promoteur sérieux.",
    ],
  },
  {
    num: '05',
    icon: '📋',
    titleFr: 'Rapports & expertises',
    heroFr: 'Expertise technique indépendante pour votre projet ou litige',
    subtitleFr: "CITURBAREA produit des rapports techniques et expertises indépendantes : état des lieux, diagnostic, contre-expertise, rapport de conformité, avis technique.",
    appPath: '/p5',
    slugFr: 'porte-05-rapports-expertises',
    slugEn: 'door-05-reports-expert-opinions',
    slugAr: 'bab-05-taqarir-wa-khibra',
    titleEn: 'Reports & Expert Opinions',
    titleAr: 'تقارير وخبرة',
    sousTypes: [
      { icon: '📋', title: "Rapport d'état des lieux", desc: "Constat technique contradictoire d'un bien avant acquisition, location ou litige." },
      { icon: '🔍', title: 'Diagnostic & non-conformité', desc: "Identification des désordres, malfaçons, non-conformités aux plans ou aux règles de l'art." },
      { icon: '⚖️', title: 'Contre-expertise & litige', desc: "Analyse contradictoire d'un rapport existant, avis technique pour procédure juridique." },
      { icon: '✅', title: 'Rapport de conformité', desc: "Vérification de la conformité aux plans autorisés, aux prescriptions et aux normes applicables." },
    ],
    etapes: [
      { num: 1, title: 'Demande & cadrage', desc: "Description du bien, contexte (pré-achat, litige, contrôle), documents disponibles." },
      { num: 2, title: 'Visite & relevés', desc: "Visite technique sur site, relevés, photographies, mesures et constats." },
      { num: 3, title: 'Analyse & rédaction', desc: "Analyse des constats, confrontation aux plans, aux règles de l'art et aux normes applicables." },
      { num: 4, title: 'Remise du rapport signé', desc: "Rapport technique signé par un architecte DENA, opposable en cas de litige." },
    ],
    faqs: [
      { q: "Le rapport est-il opposable en justice ?", a: "Oui, un rapport signé par un architecte inscrit à l'Ordre des Architectes a valeur probante." },
      { q: "Intervenez-vous en contra-expertise ?", a: "Oui. Nous pouvons analyser un rapport existant et produire un avis technique contradictoire." },
      { q: "Quel délai pour obtenir un rapport ?", a: "En général 5 à 10 jours ouvrés selon la complexité. Urgences traitées sous 48h sur demande." },
      { q: "Peut-on commander un rapport à distance ?", a: "La visite sur site est indispensable. Nous couvrons tout le territoire national." },
    ],
    pourQui: [
      "Vous achetez un bien et voulez un constat technique indépendant avant signature.",
      "Vous avez un litige avec un entrepreneur et avez besoin d'une expertise contradictoire.",
      "Vous cherchez à vérifier la conformité de travaux réalisés.",
    ],
  },
  {
    num: '06',
    icon: '🤝',
    titleFr: 'Entreprises & structures partenaires',
    heroFr: "Rejoignez l'écosystème CITURBAREA en tant que prestataire",
    subtitleFr: "Architectes, BET, topographes, bureaux de contrôle, laboratoires, entreprises GO, artisans — rejoignez la marketplace CITURBAREA et accédez à des projets qualifiés.",
    appPath: '/p6',
    slugFr: 'porte-06-entreprises-partenaires',
    slugEn: 'door-06-companies-partners',
    slugAr: 'bab-06-sharikat-wa-shoraka',
    titleEn: 'Companies & Partner Structures',
    titleAr: 'شركات وشركاء',
    sousTypes: [
      { icon: '📐', title: 'Architectes & urbanistes', desc: "Rejoignez le réseau CITURBAREA et accédez à des missions qualifiées sur tout le territoire." },
      { icon: '⚙️', title: 'BET structure & techniques', desc: "Bureaux d'études structure, fluides, électricité — missions coordinées avec les architectes partenaires." },
      { icon: '🏗️', title: 'Entreprises GO & artisans', desc: "Maçonnerie, gros-œuvre, lots secondaires — accédez à des chantiers avec suivi et paiement sécurisé." },
      { icon: '🔬', title: 'Contrôle & laboratoires', desc: "Bureaux de contrôle, laboratoires d'essais — missions de vérification et d'essai intégrées." },
    ],
    etapes: [
      { num: 1, title: 'Inscription & qualification', desc: "Création de votre profil prestataire, vérification des certifications et de l'expérience." },
      { num: 2, title: 'Validation CITURBAREA', desc: "Examen du dossier, entretien si nécessaire, activation du profil dans la marketplace." },
      { num: 3, title: 'Accès aux missions', desc: "Vous êtes sollicité sur les projets correspondant à vos spécialités et votre zone d'intervention." },
      { num: 4, title: 'Exécution & évaluation', desc: "Mission suivie via la plateforme, paiement sécurisé par escrow, notation par le client." },
    ],
    faqs: [
      { q: "Qui peut s'inscrire sur CITURBAREA ?", a: "Tout professionnel du secteur BTP : architectes, BET, topographes, bureaux de contrôle, laboratoires, entreprises, artisans." },
      { q: "Y a-t-il une commission sur les missions ?", a: "Oui. CITURBAREA prélève une commission sur les missions réalisées via la plateforme, en contrepartie de la qualification et du suivi." },
      { q: "Les paiements sont-ils sécurisés ?", a: "Oui. Tous les paiements transitent par l'escrow CITURBAREA avant d'être libérés au prestataire." },
      { q: "Peut-on intervenir hors RSK ?", a: "Oui. La plateforme couvre tout le Maroc. Vous définissez votre zone d'intervention lors de l'inscription." },
    ],
    pourQui: [
      "Vous êtes un professionnel du BTP cherchant à développer votre portefeuille de missions.",
      "Vous souhaitez des projets qualifiés avec un client déjà cadré et un paiement sécurisé.",
      "Vous voulez accéder à un réseau pluridisciplinaire structuré à l'échelle nationale.",
    ],
  },
];

export interface Province { name: string; villes: { name: string; slug?: string }[]; }
export interface Region {
  name: string;
  priority?: '⭐1' | '⭐2';
  badge?: string;
  lien?: (porteSlug: string) => string;
  provinces: Province[];
}

export const REGIONS: Region[] = [
  {
    name: 'Rabat-Salé-Kénitra', priority: '⭐1',
    badge: "Siège CITURBAREA · Réponse 24h garantie",
    lien: (slug) => `/fr/${slug}-rsk`,
    provinces: [
      { name: 'Préfecture de Kénitra', villes: [
        { name: 'Kénitra', slug: 'kenitra' },
        { name: 'Sidi Kacem', slug: 'sidi-kacem' },
        { name: 'Sidi Slimane', slug: 'sidi-slimane' },
      ]},
      { name: 'Préfecture de Rabat', villes: [{ name: 'Rabat', slug: 'rabat' }] },
      { name: 'Préfecture de Salé', villes: [
        { name: 'Salé', slug: 'sale' },
        { name: 'Témara', slug: 'temara' },
        { name: 'Skhirat', slug: 'skhirat' },
        { name: 'Harhoura', slug: 'harhoura' },
      ]},
      { name: 'Province de Khémisset', villes: [{ name: 'Khémisset', slug: 'khemisset' }] },
    ],
  },
  {
    name: 'Casablanca-Settat', priority: '⭐2',
    badge: "Capitale économique · Premier marché immobilier",
    lien: (slug) => `/fr/${slug}-casablanca`,
    provinces: [
      { name: 'Préfecture de Casablanca', villes: [
        { name: 'Casablanca', slug: 'casablanca' },
        { name: 'Mohammedia', slug: 'mohammedia' },
      ]},
      { name: 'Province de Settat', villes: [{ name: 'Settat' }] },
      { name: 'Province de Berrechid', villes: [{ name: 'Berrechid' }] },
    ],
  },
  {
    name: 'Tanger-Tétouan-Al Hoceima', badge: "Métropole nord · Croissance exceptionnelle",
    lien: (slug) => `/fr/${slug}-tanger`,
    provinces: [
      { name: 'Préfecture de Tanger-Assilah', villes: [{ name: 'Tanger', slug: 'tanger' }] },
      { name: 'Province de Tétouan', villes: [{ name: 'Tétouan' }] },
      { name: "Province de M'diq-Fnideq", villes: [{ name: "M'diq" }] },
    ],
  },
  {
    name: 'Fès-Meknès', badge: "Capitale spirituelle · Patrimoine & modernité",
    lien: (slug) => `/fr/${slug}-fes`,
    provinces: [
      { name: 'Préfecture de Fès', villes: [{ name: 'Fès', slug: 'fes' }] },
      { name: 'Préfecture de Meknès', villes: [{ name: 'Meknès' }] },
      { name: "Province d'Ifrane", villes: [{ name: 'Ifrane' }] },
    ],
  },
  {
    name: 'Marrakech-Safi', badge: "Capitale touristique · Immobilier premium",
    lien: (slug) => `/fr/${slug}-marrakech`,
    provinces: [
      { name: 'Préfecture de Marrakech', villes: [{ name: 'Marrakech', slug: 'marrakech' }] },
      { name: "Province d'Essaouira", villes: [{ name: 'Essaouira' }] },
      { name: 'Province de Safi', villes: [{ name: 'Safi' }] },
    ],
  },
  {
    name: 'Souss-Massa', badge: "Capitale du sud · Pôle balnéaire",
    lien: (slug) => `/fr/${slug}-agadir`,
    provinces: [
      { name: "Préfecture d'Agadir-Ida Outanane", villes: [{ name: 'Agadir', slug: 'agadir' }] },
      { name: 'Province de Taroudant', villes: [{ name: 'Taroudant' }] },
      { name: 'Province de Tiznit', villes: [{ name: 'Tiznit' }] },
    ],
  },
  {
    name: 'Oriental', badge: "Oujda et région nord-est",
    provinces: [
      { name: "Préfecture d'Oujda-Angad", villes: [{ name: 'Oujda' }] },
      { name: 'Province de Nador', villes: [{ name: 'Nador' }] },
      { name: 'Province de Berkane', villes: [{ name: 'Berkane' }] },
    ],
  },
  {
    name: 'Béni Mellal-Khénifra', badge: "Région centre · Développement en cours",
    provinces: [
      { name: 'Province de Béni Mellal', villes: [{ name: 'Béni Mellal' }] },
      { name: 'Province de Khénifra', villes: [{ name: 'Khénifra' }] },
    ],
  },
  {
    name: 'Drâa-Tafilalet', badge: "Grand sud · Ouarzazate",
    provinces: [
      { name: "Province d'Ouarzazate", villes: [{ name: 'Ouarzazate' }] },
      { name: "Province d'Errachidia", villes: [{ name: 'Errachidia' }] },
    ],
  },
  {
    name: 'Guelmim-Oued Noun', badge: "Extrême sud",
    provinces: [
      { name: 'Province de Guelmim', villes: [{ name: 'Guelmim' }] },
    ],
  },
  {
    name: 'Laâyoune-Sakia El Hamra', badge: "Provinces du Sud",
    provinces: [
      { name: 'Province de Laâyoune', villes: [{ name: 'Laâyoune' }] },
    ],
  },
  {
    name: 'Dakhla-Oued Ed-Dahab', badge: "Grand Sud atlantique",
    provinces: [
      { name: "Province d'Oued Ed-Dahab", villes: [{ name: 'Dakhla' }] },
    ],
  },
];

export const VILLES_SEO = [
  { slug: 'kenitra', name: 'Kénitra', region: 'Rabat-Salé-Kénitra', priority: true },
  { slug: 'rabat', name: 'Rabat', region: 'Rabat-Salé-Kénitra', priority: true },
  { slug: 'sale', name: 'Salé', region: 'Rabat-Salé-Kénitra', priority: true },
  { slug: 'temara', name: 'Témara', region: 'Rabat-Salé-Kénitra', priority: true },
  { slug: 'skhirat', name: 'Skhirat', region: 'Rabat-Salé-Kénitra', priority: false },
  { slug: 'harhoura', name: 'Harhoura', region: 'Rabat-Salé-Kénitra', priority: false },
  { slug: 'khemisset', name: 'Khémisset', region: 'Rabat-Salé-Kénitra', priority: false },
  { slug: 'sidi-kacem', name: 'Sidi Kacem', region: 'Rabat-Salé-Kénitra', priority: false },
  { slug: 'sidi-slimane', name: 'Sidi Slimane', region: 'Rabat-Salé-Kénitra', priority: false },
  { slug: 'casablanca', name: 'Casablanca', region: 'Casablanca-Settat', priority: true },
  { slug: 'mohammedia', name: 'Mohammedia', region: 'Casablanca-Settat', priority: false },
  { slug: 'tanger', name: 'Tanger', region: 'Tanger-Tétouan-Al Hoceima', priority: false },
  { slug: 'fes', name: 'Fès', region: 'Fès-Meknès', priority: false },
  { slug: 'marrakech', name: 'Marrakech', region: 'Marrakech-Safi', priority: false },
  { slug: 'agadir', name: 'Agadir', region: 'Souss-Massa', priority: false },
];
