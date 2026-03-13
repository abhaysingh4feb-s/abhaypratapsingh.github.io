import resumeData from "@/content/resume.json";

export interface Experience {
  company: string;
  location: string;
  role: string;
  period: string;
  highlights: string[];
}

export interface Stat {
  label: string;
  value: string;
}

export interface Resume {
  name: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  summary: string;
  experience: Experience[];
  skills: Record<string, string[]>;
  education: {
    degree: string;
    university: string;
    period: string;
  };
  stats: Stat[];
}

export function getResume(): Resume {
  return resumeData as Resume;
}
