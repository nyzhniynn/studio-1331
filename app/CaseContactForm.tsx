"use client";

import { type ChangeEvent, type DragEvent, type FormEvent, useCallback, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Dictionary } from "../dictionaries";
import FormChoiceRow from "./FormChoiceRow";

gsap.registerPlugin(ScrollTrigger);

const contactFileMaxSize = 4 * 1024 * 1024;
const contactFileAccept = ".pdf,.png,.jpg,.jpeg,.zip,.doc,.docx";
const contactAllowedFileExtensions = new Set(["pdf", "png", "jpg", "jpeg", "zip", "doc", "docx"]);

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop();

  return extension ? extension.toLowerCase() : "";
}

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
  type,
  value,
}: {
  label: string;
  name: keyof CaseContactFields;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type: "email" | "tel" | "text";
  value: string;
}) {
  return (
    <label data-case-contact-field>
      <input
        aria-label={label}
        data-form-line-input
        className="motion-field"
        name={name}
        onChange={onChange}
        placeholder={label}
        type={type}
        value={value}
      />
    </label>
  );
}

export default function CaseContactForm({ dictionary }: { dictionary: Dictionary }) {
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
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const buttonTweenRef = useRef<gsap.core.Tween | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const brief = dictionary.home.brief;
  const contact = dictionary.caseDetail.contactForm;

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
    setAttachedFiles([]);
    setBudget([]);
    setFields({
      company: "",
      email: "",
      name: "",
      phone: "",
      task: "",
    });
    setServices([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const incomingFiles = Array.from(fileList);

    if (!incomingFiles.length) {
      return;
    }

    const invalidFile = incomingFiles.find((file) => (
      file.size > contactFileMaxSize ||
      !contactAllowedFileExtensions.has(getFileExtension(file.name))
    ));

    if (invalidFile) {
      setStatus("error");
      setStatusMessage(brief.fileTooLarge.replace("{fileName}", invalidFile.name));
      return;
    }

    const currentSize = attachedFiles.reduce((sum, file) => sum + file.size, 0);
    const incomingSize = incomingFiles.reduce((sum, file) => sum + file.size, 0);

    if (currentSize + incomingSize > contactFileMaxSize) {
      setStatus("error");
      setStatusMessage(brief.totalFilesTooLarge);
      return;
    }

    clearFeedback();
    setAttachedFiles((current) => {
      const existingKeys = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const nextFiles = [...current];

      incomingFiles.forEach((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;

        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          nextFiles.push(file);
        }
      });

      return nextFiles;
    });
  }, [attachedFiles, brief.fileTooLarge, brief.totalFilesTooLarge]);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) {
      addFiles(event.currentTarget.files);
    }

    event.currentTarget.value = "";
  }, [addFiles]);

  const handleFileDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (event.dataTransfer.files.length) {
      addFiles(event.dataTransfer.files);
    }
  }, [addFiles]);

  const handleFileDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const removeFile = useCallback((indexToRemove: number) => {
    clearFeedback();
    setAttachedFiles((current) => current.filter((_, index) => index !== indexToRemove));
  }, []);

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
    attachedFiles.forEach((file) => {
      formData.append("files", file, file.name);
    });

    try {
      const response = await fetch("/api/contact", {
        body: formData,
        method: "POST",
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(result?.error ?? brief.error);
      }

      resetForm();
      setStatus("success");
      setStatusMessage(brief.success);
    } catch (error) {
      setStatus("error");
      setStatusMessage(error instanceof Error ? error.message : brief.error);
    }
  };

  return (
    <section data-case-contact data-expanded={expanded}>
      <div data-case-contact-intro>
        <h2>{contact.introTitle}</h2>
        <p>
          {contact.introText}
        </p>
        <button
          ref={buttonRef}
          className="motion-button"
          onClick={openForm}
          type="button"
          aria-expanded={expanded}
          aria-controls="case-contact-form"
        >
          {contact.button}
        </button>
      </div>

      {expanded ? (
        <form id="case-contact-form" data-case-contact-form ref={formRef} onSubmit={handleSubmit}>
          <FormChoiceRow
            title={brief.servicesTitle}
            name="services"
            onSelectedChange={(selected) => {
              clearFeedback();
              setServices(selected);
            }}
            options={brief.serviceOptions}
            selectedOptions={services}
          />

          <FormChoiceRow
            title={brief.budgetTitle}
            multiple={false}
            name="budget"
            onSelectedChange={(selected) => {
              clearFeedback();
              setBudget(selected);
            }}
            options={brief.budgetOptions}
            selectedOptions={budget}
          />

          <div data-motion-form-item onDragOver={handleFileDragOver} onDrop={handleFileDrop}>
            <p>{brief.taskTitle}</p>
            <textarea
              className="motion-field"
              aria-label={brief.taskTitle}
              name="task"
              onChange={handleFieldChange}
              placeholder={brief.taskPlaceholder}
              rows={1}
              value={fields.task}
            />
            <input
              ref={fileInputRef}
              accept={contactFileAccept}
              className="hidden"
              multiple
              name="files"
              onChange={handleFileChange}
              type="file"
            />
            <button
              type="button"
              className="motion-link"
              onClick={() => fileInputRef.current?.click()}
            >
              {brief.attachFile}
            </button>
            {attachedFiles.length ? (
              <ul data-case-contact-file-list>
                {attachedFiles.map((file, index) => (
                  <li key={`${file.name}-${file.size}-${file.lastModified}`}>
                    <span>{file.name}</span>
                    <button
                      aria-label={brief.removeFileAria.replace("{fileName}", file.name)}
                      onClick={() => removeFile(index)}
                      type="button"
                    >
                      {brief.removeFile}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div data-motion-form-item>
            <p>{brief.contactsTitle}</p>
            <div data-case-contact-fields>
              <CaseFormLineField label={brief.fields.name} name="name" onChange={handleFieldChange} type="text" value={fields.name} />
              <CaseFormLineField label={brief.fields.company} name="company" onChange={handleFieldChange} type="text" value={fields.company} />
              <CaseFormLineField label={brief.fields.email} name="email" onChange={handleFieldChange} type="email" value={fields.email} />
              <CaseFormLineField label={brief.fields.phone} name="phone" onChange={handleFieldChange} type="tel" value={fields.phone} />
            </div>

            <div data-case-contact-submit>
              <div>
                <p>
                  {contact.consent}
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
                {status === "loading" ? brief.sending : brief.send}
              </button>
            </div>
          </div>
        </form>
      ) : null}
    </section>
  );
}
