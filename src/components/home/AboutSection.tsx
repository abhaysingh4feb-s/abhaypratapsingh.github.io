"use client";

import AnimateOnScroll from "@/components/shared/AnimateOnScroll";
import SectionHeading from "@/components/shared/SectionHeading";
import { getResume } from "@/lib/resume";

const resume = getResume();

export default function AboutSection() {
  return (
    <section id="about" className="section-padding bg-[var(--bg-secondary)]">
      <div className="container-custom">
        <SectionHeading title="About Me" />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-start">
          <AnimateOnScroll className="lg:col-span-3">
            <div className="prose prose-lg dark:prose-invert max-w-none text-[var(--text-secondary)]">
              <p>
                I&apos;m Abhay Pratap Singh — a Senior Backend Engineer and Team Lead based in
                India with 5+ years of experience building production SaaS platforms and
                AI-powered systems.
              </p>
              <p>
                At Voyantt Consultancy Services, I lead cross-functional overseas teams and
                own the full backend lifecycle — from architecture decisions and sprint
                planning to code reviews and developer mentoring.
              </p>
              <p>
                I&apos;ve shipped multi-tenant financial platforms, AI analytics engines
                processing 20M+ records, and ERP-integrated e-commerce systems serving
                multiple countries. My core stack is PHP, Laravel, Node.js, and NestJS, and
                I&apos;m particularly focused on LLM integration, vector search, and scalable
                backend architecture.
              </p>
            </div>
          </AnimateOnScroll>

          <AnimateOnScroll className="lg:col-span-2" delay={0.2}>
            <div className="grid grid-cols-2 gap-4">
              {resume.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card p-4 text-center"
                >
                  <div className="text-2xl md:text-3xl font-bold gradient-text">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
