import type { RefObject } from "react";
import { motion } from "motion/react";
import type { HomepageSection } from "@/content/homepage";

interface NarrativeSectionProps {
  section: HomepageSection;
  isIntro?: boolean;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}

const STORY_EASE = [0.28, 0.72, 0.18, 1] as const;
const STORY_VIEWPORT = { once: true };
const STORY_TRANSITION = {
  duration: 0.86,
  ease: STORY_EASE,
};

export default function NarrativeSection({
  section,
  isIntro = false,
  titleRef,
}: NarrativeSectionProps) {
  const stageClass = `narrative-section--${section.stage}`;
  const TitleTag = isIntro ? "h1" : "h2";

  const MotionTag = isIntro ? motion.h1 : motion.h2;

  return (
    <section
      className={`narrative-section ${stageClass} relative z-20 flex min-h-[100svh]`}
      data-stage={section.stage}
      data-active={isIntro ? "true" : "false"}
      aria-labelledby={`section-${section.stage}`}
    >
      <motion.div
        className="narrative-section-inner w-full px-6 md:px-10"
        initial={{ opacity: 0.001, y: 24, scale: 0.985 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.92,
          ease: STORY_EASE,
          delay: isIntro ? 0.25 : 0.1,
        }}
        viewport={{ amount: 0.26, ...STORY_VIEWPORT }}
      >
        <motion.p
          className={`${isIntro ? "eyebrow " : ""}narrative-kicker mb-6`}
          initial={{ opacity: 0.001, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.76, ease: STORY_EASE }}
          viewport={STORY_VIEWPORT}
        >
          {section.kicker}
        </motion.p>

        <MotionTag
          ref={titleRef}
          id={`section-${section.stage}`}
          className={`${isIntro ? "title " : ""}narrative-title`}
          initial={{ opacity: 0.001, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ ...STORY_TRANSITION, delay: 0.05 }}
          viewport={STORY_VIEWPORT}
        >
          {section.title}
        </MotionTag>

        <motion.p
          className={`${isIntro ? "subtitle " : ""}narrative-body`}
          initial={{ opacity: 0.001, x: 6 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: STORY_EASE, delay: 0.09 }}
          viewport={STORY_VIEWPORT}
        >
          {section.body}
        </motion.p>

        {section.signals ? (
          <motion.div
            className="narrative-signals"
            initial={{ opacity: 0.001, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: STORY_EASE, delay: 0.12 }}
            viewport={STORY_VIEWPORT}
          >
            {section.signals.map((signal) => (
              <motion.span
                key={signal}
                initial={{ opacity: 0.001, scale: 0.96, y: 4 }}
                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: STORY_EASE, delay: 0.16 }}
                viewport={STORY_VIEWPORT}
              >
                {signal}
              </motion.span>
            ))}
          </motion.div>
        ) : null}

        {section.cta ? (
          <div className="cta-row mt-9">
            <a
              href={section.cta.href}
              className="cta-link group inline-flex items-center gap-3"
            >
              <span className="cta-label">{section.cta.label}</span>
              <span className="cta-arrow" aria-hidden="true">→</span>
            </a>
          </div>
        ) : null}
      </motion.div>
    </section>
  );
}
