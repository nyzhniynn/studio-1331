"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FormChoiceRow from "./FormChoiceRow";

gsap.registerPlugin(ScrollTrigger);

function CaseFormLineField({ label }: { label: string }) {
  return (
    <label data-case-contact-field>
      <span>{label}</span>
      <input aria-label={label} className="motion-field" type="text" />
    </label>
  );
}

export default function CaseContactForm() {
  const [expanded, setExpanded] = useState(false);
  const buttonTweenRef = useRef<gsap.core.Tween | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    return () => {
      buttonTweenRef.current?.kill();
    };
  }, []);

  useLayoutEffect(() => {
    if (!expanded || !formRef.current) {
      return;
    }

    const form = formRef.current;
    const items = Array.from(form.querySelectorAll<HTMLElement>("[data-motion-form-item]"));
    const context = gsap.context(() => {
      gsap.set(form, {
        autoAlpha: 1,
        height: "auto",
        overflow: "hidden",
      });

      const targetHeight = form.offsetHeight;

      gsap.fromTo(
        form,
        {
          height: 0,
          y: -18,
        },
        {
          height: targetHeight,
          y: 0,
          duration: 0.72,
          ease: "power3.out",
          onComplete: () => {
            gsap.set(form, {
              clearProps: "height,overflow,transform",
            });
            ScrollTrigger.refresh();
          },
        },
      );

      gsap.fromTo(
        items,
        {
          autoAlpha: 0,
          y: 24,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.68,
          ease: "power3.out",
          stagger: 0.08,
          delay: 0.16,
        },
      );
    }, form);

    return () => {
      context.revert();
    };
  }, [expanded]);

  const openForm = () => {
    if (expanded) {
      return;
    }

    const button = buttonRef.current;

    if (!button) {
      setExpanded(true);
      return;
    }

    buttonTweenRef.current?.kill();
    buttonTweenRef.current = gsap.to(button, {
      autoAlpha: 0,
      y: -12,
      scale: 0.98,
      duration: 0.32,
      ease: "power2.out",
      onComplete: () => {
        buttonTweenRef.current = null;
        setExpanded(true);
      },
    });
  };

  return (
    <section data-case-contact data-expanded={expanded}>
      <div data-case-contact-intro>
        <h2>Tell us about the task</h2>
        <p>
          Briefly describe the project or context. We will contact you and
          suggest further steps.
        </p>
        <button
          ref={buttonRef}
          className="motion-button"
          onClick={openForm}
          type="button"
          aria-expanded={expanded}
          aria-controls="case-contact-form"
        >
          Discuss project
        </button>
      </div>

      {expanded ? (
        <div id="case-contact-form" data-case-contact-form ref={formRef}>
          <FormChoiceRow
            title="Services"
            options={[
              "Strategic basis",
              "Brand & Digital Identity",
              "Website & Digital Platform",
              "Redesign of existing products",
            ]}
            serif
          />

          <FormChoiceRow
            title="Budget"
            options={[
              "Less than $20k",
              "$20-$40k",
              "$40-$60k",
              "$60-$80k",
              "$80-$100k",
              "To infinity and beyond",
            ]}
            serif
          />

          <div data-motion-form-item>
            <p>Task</p>
            <textarea
              className="motion-field"
              aria-label="Task"
              placeholder="Briefly describe the project"
              rows={3}
            />
          </div>

          <div data-motion-form-item>
            <p>Contacts</p>
            <div data-case-contact-fields>
              <CaseFormLineField label="Name" />
              <CaseFormLineField label="Company" />
              <CaseFormLineField label="E-mail" />
              <CaseFormLineField label="Phone" />
            </div>

            <div data-case-contact-submit>
              <p>
                By clicking on the button, I consent to the processing of
                personal data and confirm that I have read the terms and
                conditions.
              </p>
              <button className="motion-button" type="button">
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
