import type { RefObject } from "react";
import type { HomepageSection } from "@/content/homepage";

interface NarrativeSectionProps {
  section: HomepageSection;
  isIntro?: boolean;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}

export default function NarrativeSection({
  section,
  isIntro = false,
  titleRef,
}: NarrativeSectionProps) {
  const stageClass = `narrative-section--${section.stage}`;

  return (
    <section
      className={`narrative-section ${stageClass} relative z-20 flex min-h-[100svh]`}
      data-stage={section.stage}
      data-active={isIntro ? "true" : "false"}
      aria-labelledby={`section-${section.stage}`}
    >
      <div className="narrative-section-inner w-full px-6 md:px-10">
        <p className={`${isIntro ? "eyebrow " : ""}narrative-kicker mb-6`}>
          {section.kicker}
        </p>
        <h2
          ref={titleRef}
          id={`section-${section.stage}`}
          className={`${isIntro ? "title " : ""}narrative-title`}
        >
          {section.title}
        </h2>
        <p className={`${isIntro ? "subtitle " : ""}narrative-body`}>
          {section.body}
        </p>

        {section.cta ? (
          <div className="cta-row mt-9">
            <a href={section.cta.href} className="cta-link group inline-flex items-center gap-3">
              <span className="cta-label">{section.cta.label}</span>
              <span className="cta-arrow" aria-hidden="true">→</span>
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
