/** Browser-only storage for the admin panel (no server needed). */

export type ContactInfo = {
  doctor: string;
  title: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
  facebook: string;
};
export type Service = { id: string; name: string; description: string };
export type Faq = { id: string; question: string; answer: string };
export type AppointmentRequest = {
  id: string;
  name: string;
  phone: string;
  date: string;
  message: string;
  page: string;
  createdAt: number;
  read: boolean;
};
export type Account = { username: string; password: string };

export const KEYS = {
  contact: "site_admin_contact_v1",
  services: "site_admin_services_v1",
  faqs: "site_admin_faqs_v1",
  requests: "site_admin_requests_v1",
  account: "site_admin_account_v1",
} as const;

export const DEFAULT_CONTACT: ContactInfo = {
  doctor: "Dr. Dina Svinareva",
  title: "Plastic and Aesthetic Surgeon",
  phone: "+972 53 281 5272",
  whatsapp: "+972 53 281 5272",
  email: "",
  address: "",
  hours: "",
  instagram: "https://www.instagram.com/dr.fatemamirza/",
  facebook: "",
};

const SERVICE_NAMES = [
  "Rhinoplasty (Nose Reshaping)",
  "Breast Augmentation",
  "Liposuction & Body Contouring",
  "Facelift & Neck Lift",
  "Tummy Tuck (Abdominoplasty)",
  "Eyelid Surgery (Blepharoplasty)",
  "Breast Lift & Breast Reduction",
  "Hair Transplant",
  "Gynecomastia Surgery",
  "Botox & Dermal Fillers",
];
export const DEFAULT_SERVICES: Service[] = SERVICE_NAMES.map((name, i) => ({
  id: `s${i + 1}`,
  name,
  description: "",
}));

export const DEFAULT_FAQS: Faq[] = [
  {
    id: "f1",
    question: "How do I book a consultation with Dr. Dina Svinareva?",
    answer: "Fill in the appointment form or message us on WhatsApp and we will confirm a time.",
  },
  {
    id: "f2",
    question: "What happens during the first consultation?",
    answer: "The doctor listens to your goals, examines the area and explains the options, risks and recovery.",
  },
  {
    id: "f3",
    question: "How long is the recovery after surgery?",
    answer: "It depends on the procedure; the doctor gives you a personal recovery plan at the consultation.",
  },
];

export const DEFAULT_ACCOUNT: Account = { username: "admin", password: "admin123" };

export function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}
