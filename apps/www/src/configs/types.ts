export interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Config {
  // General
  projectName: string;
  projectDescription: string;
  projectTagline: string;

  // Links
  purchaseUrl: string;
  githubUrl: string;
  twitterUrl: string;
  discordUrl: string;

  // Developer Info
  creator: {
    name: string;
    url: string;
    image: string;
    role: string;
  };

  // Features
  features: Feature[];

  // FAQ
  faq: FAQItem[];

  // Legal
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
}
