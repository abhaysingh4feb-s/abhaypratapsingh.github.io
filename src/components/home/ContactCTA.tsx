import AnimateOnScroll from "@/components/shared/AnimateOnScroll";
import Button from "@/components/shared/Button";
import { siteConfig } from "@/config/site";

export default function ContactCTA() {
  return (
    <section id="contact" className="section-padding">
      <div className="container-custom">
        <AnimateOnScroll>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold">
              Let&apos;s Build Something{" "}
              <span className="gradient-text">Together</span>
            </h2>
            <p className="mt-4 text-[var(--text-secondary)] leading-relaxed">
              Whether you&apos;re a recruiter, engineering leader, or fellow developer
              — I&apos;d love to hear from you.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button href="/contact">Get in Touch</Button>
              <Button href={siteConfig.linkedin} variant="secondary" external>
                Connect on LinkedIn
              </Button>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
