import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const STORAGE_KEY = "hollyaid_lang";

const resources = {
  en: {
    translation: {
      common: {
        language: "Language",
        back: "Back",
        loading: "Loading…",
      },
      nav: {
        myProfile: "My Profile",
        admin: "Admin",
        signOut: "Sign Out",
      },
      dashboard: {
        usage: "Usage",
        specialists: "Specialists",
        myBookings: "My Bookings",
        employees: "Employees",
      },
      billing: {
        title: "Company Billing",
        subtitle: "Plan, renewal date, and minutes usage.",
      },
    },
  },
  fr: {
    translation: {
      common: {
        language: "Langue",
        back: "Retour",
        loading: "Chargement…",
      },
      nav: {
        myProfile: "Mon profil",
        admin: "Admin",
        signOut: "Se déconnecter",
      },
      dashboard: {
        usage: "Utilisation",
        specialists: "Spécialistes",
        myBookings: "Mes réservations",
        employees: "Employés",
      },
      billing: {
        title: "Facturation de l’entreprise",
        subtitle: "Forfait, date de renouvellement et minutes utilisées.",
      },
    },
  },
  es: {
    translation: {
      common: {
        language: "Idioma",
        back: "Volver",
        loading: "Cargando…",
      },
      nav: {
        myProfile: "Mi perfil",
        admin: "Admin",
        signOut: "Cerrar sesión",
      },
      dashboard: {
        usage: "Uso",
        specialists: "Especialistas",
        myBookings: "Mis reservas",
        employees: "Empleados",
      },
      billing: {
        title: "Facturación de la empresa",
        subtitle: "Plan, fecha de renovación y uso de minutos.",
      },
    },
  },
  pt: {
    translation: {
      common: {
        language: "Idioma",
        back: "Voltar",
        loading: "Carregando…",
      },
      nav: {
        myProfile: "Meu perfil",
        admin: "Admin",
        signOut: "Sair",
      },
      dashboard: {
        usage: "Uso",
        specialists: "Especialistas",
        myBookings: "Minhas reservas",
        employees: "Funcionários",
      },
      billing: {
        title: "Cobrança da empresa",
        subtitle: "Plano, data de renovação e uso de minutos.",
      },
    },
  },
  de: {
    translation: {
      common: {
        language: "Sprache",
        back: "Zurück",
        loading: "Wird geladen…",
      },
      nav: {
        myProfile: "Mein Profil",
        admin: "Admin",
        signOut: "Abmelden",
      },
      dashboard: {
        usage: "Nutzung",
        specialists: "Spezialisten",
        myBookings: "Meine Buchungen",
        employees: "Mitarbeiter",
      },
      billing: {
        title: "Unternehmensabrechnung",
        subtitle: "Plan, Verlängerungsdatum und Minutenverbrauch.",
      },
    },
  },
  it: {
    translation: {
      common: {
        language: "Lingua",
        back: "Indietro",
        loading: "Caricamento…",
      },
      nav: {
        myProfile: "Il mio profilo",
        admin: "Admin",
        signOut: "Esci",
      },
      dashboard: {
        usage: "Utilizzo",
        specialists: "Specialisti",
        myBookings: "Le mie prenotazioni",
        employees: "Dipendenti",
      },
      billing: {
        title: "Fatturazione aziendale",
        subtitle: "Piano, data di rinnovo e utilizzo dei minuti.",
      },
    },
  },
  nl: {
    translation: {
      common: {
        language: "Taal",
        back: "Terug",
        loading: "Laden…",
      },
      nav: {
        myProfile: "Mijn profiel",
        admin: "Admin",
        signOut: "Uitloggen",
      },
      dashboard: {
        usage: "Gebruik",
        specialists: "Specialisten",
        myBookings: "Mijn boekingen",
        employees: "Medewerkers",
      },
      billing: {
        title: "Bedrijfsfacturatie",
        subtitle: "Plan, verlengingsdatum en minutengebruik.",
      },
    },
  },
} as const;

const getInitialLanguage = (): SupportedLanguageCode => {
  const stored = localStorage.getItem(STORAGE_KEY) as SupportedLanguageCode | null;
  if (stored && SUPPORTED_LANGUAGES.some((l) => l.code === stored)) return stored;

  const browser = (navigator.language || "en").slice(0, 2) as SupportedLanguageCode;
  if (SUPPORTED_LANGUAGES.some((l) => l.code === browser)) return browser;
  return "en";
};

void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

// Keep <html lang="..."> updated
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
  localStorage.setItem(STORAGE_KEY, lng);
});

document.documentElement.lang = i18n.language;

export default i18n;
