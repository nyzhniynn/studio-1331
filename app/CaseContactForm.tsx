"use client";

import { type ChangeEvent, type FormEvent, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FormChoiceRow from "./FormChoiceRow";

gsap.registerPlugin(ScrollTrigger);

const caseContactServiceOptions = [
  "Strategic basis",
  "Brand & Digital Identity",
  "Website & Digital Platform",
  "Redesign of existing products",
] as const;
const caseContactBudgetOptions = [
  "Less than $20k",
  "$20-$40k",
  "$40-$60k",
  "$60-$80k",
  "$80-$100k",
  "To infinity and beyond",
] as const;

type CaseContactFields = {
  company: string;
  email: string;
  name: string;
  phone: string;
  task: string;
};

type CaseContactStatus = "idle" | "loading" | "success" | "error";

function CaseFormLineField({
  label,
  name,
  onChange,
  value,
}: {
  label: string;
  name: keyof CaseContactFields;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  value: string;
}) {
  return (
    <label data-case-contact-field>
      <span>{label}</span>
      <input
        aria-label={label}
        className="motion-field"
        name={name}
        onChange={onChange}
        type={label === "E-mail" ? "email" : label === "Phone" ? "tel" : "text"}
        value={value}
      />
    </label>
  );
}

export default function CaseContactForm() {
  const [expanded, setExpanded] = useState(false);
  const [fields, setFields] = useState<CaseContactFields>({
    company: "",
    email: "",
    name: "",
    phone: "",
    task: "",
  });
  const [budget, setBudget] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [status, setStatus] = useState<CaseContactStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const buttonTweenRef = useRef<gsap.core.Tween | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  const clearFeedback = () => {
    setStatus((current) => (current === "loading" ? current : "idle"));
    setStatusMessage("");
  };

  const handleFieldChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.currentTarget;

    clearFeedback();
    setFields((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setBudget([]);
    setFields({
      company: "",
      email: "",
      name: "",
      phone: "",
      task: "",
    });
    setServices([]);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (status === "loading") {
      return;
    }

    setStatus("loading");
    setStatusMessage("");

    const formData = new FormData();

    services.forEach((service) => {
      formData.append("services", service);
    });
    budget.forEach((item) => {
      formData.append("budget", item);
    });
    formData.append("task", fields.task);
    formData.append("name", fields.name);
    formData.append("company", fields.company);
    formData.append("email", fields.email);
    formData.append("phone", fields.phone);

    try {
      const response = await fetch("/api/contact", {
        body: formData,
        method: "POST",
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? "Could not send the request. Please try again.");
      }

      resetForm();
      setStatus("success");
      setStatusMessage("Request sent. We will contact you soon.");
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : "Could not send the request. Please try again.");
    }
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
        <form id="case-contact-form" data-case-contact-form ref={formRef} onSubmit={handleSubmit}>
          <FormChoiceRow
            title="Services"
            name="services"
            onSelectedChange={(selected) => {
              clearFeedback();
              setServices(selected);
            }}
            options={[...caseContactServiceOptions]}
            selectedOptions={services}
            serif
          />

          <FormChoiceRow
            title="Budget"
            multiple={false}
            name="budget"
            onSelectedChange={(selected) => {
              clearFeedback();
              setBudget(selected);
            }}
            options={[...caseContactBudgetOptions]}
            selectedOptions={budget}
            serif
          />

          <div data-motion-form-item>
            <p>Task</p>
            <textarea
              className="motion-field"
              aria-label="Task"
              name="task"
              onChange={handleFieldChange}
              placeholder="Briefly describe the project"
              rows={3}
              value={fields.task}
            />
          </div>

          <div data-motion-form-item>
            <p>Contacts</p>
            <div data-case-contact-fields>
              <CaseFormLineField label="Name" name="name" onChange={handleFieldChange} value={fields.name} />
              <CaseFormLineField label="Company" name="company" onChange={handleFieldChange} value={fields.company} />
              <CaseFormLineField label="E-mail" name="email" onChange={handleFieldChange} value={fields.email} />
              <CaseFormLineField label="Phone" name="phone" onChange={handleFieldChange} value={fields.phone} />
            </div>

            <div data-case-contact-submit>
              <div>
                <p>
                  By clicking on the button, I consent to the processing of
                  personal data and confirm that I have read the terms and
                  conditions.
                </p>
                {statusMessage ? (
                  <p
                    aria-live="polite"
                    className={status === "error" ? "text-[#A13A2F]" : undefined}
                    role="status"
                  >
                    {statusMessage}
                  </p>
                ) : null}
              </div>
              <button className="motion-button" disabled={status === "loading"} type="submit">
                {status === "loading" ? "Sending" : "Send"}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
}
