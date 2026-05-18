"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CaseVisualGalleryProps = {
  images: string[];
  title: string;
};

export default function CaseVisualGallery({ images, title }: CaseVisualGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const openLightbox = useCallback((index: number) => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      return;
    }

    setActiveIndex(index);
  }, []);

  const closeLightbox = useCallback(() => {
    const index = activeIndex;

    setActiveIndex(null);

    if (index !== null) {
      window.requestAnimationFrame(() => {
        triggerRefs.current[index]?.focus();
      });
    }
  }, [activeIndex]);

  const showPrevious = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) {
        return current;
      }

      return (current - 1 + images.length) % images.length;
    });
  }, [images.length]);

  const showNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null) {
        return current;
      }

      return (current + 1) % images.length;
    });
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, closeLightbox, showNext, showPrevious]);

  if (!images.length) {
    return null;
  }

  return (
    <>
      <div data-case-detail-visual-stack>
        {images.map((image, index) => (
          <figure data-case-detail-visual key={`${image}-${index}`}>
            <button
              aria-label={`Open ${title} slide ${index + 1}`}
              data-case-detail-visual-trigger
              onClick={() => openLightbox(index)}
              ref={(element) => {
                triggerRefs.current[index] = element;
              }}
              type="button"
            >
              <img className="case-media-image" src={image} alt="" loading="lazy" decoding="async" />
            </button>
          </figure>
        ))}
      </div>

      {activeIndex !== null ? (
        <div
          aria-label={`${title} slide ${activeIndex + 1}`}
          aria-modal="true"
          data-case-lightbox
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeLightbox();
            }
          }}
          role="dialog"
        >
          <button
            aria-label="Close image preview"
            data-case-lightbox-close
            onClick={closeLightbox}
            type="button"
          >
            <span aria-hidden="true" />
          </button>

          {images.length > 1 ? (
            <>
              <button
                aria-label="Previous slide"
                data-case-lightbox-nav
                data-direction="previous"
                onClick={showPrevious}
                type="button"
              >
                <span aria-hidden="true" />
              </button>
              <button
                aria-label="Next slide"
                data-case-lightbox-nav
                data-direction="next"
                onClick={showNext}
                type="button"
              >
                <span aria-hidden="true" />
              </button>
            </>
          ) : null}

          <figure data-case-lightbox-frame>
            <img
              alt={`${title} slide ${activeIndex + 1}`}
              data-case-lightbox-image
              src={images[activeIndex]}
            />
          </figure>

          <p data-case-lightbox-counter>
            {activeIndex + 1} / {images.length}
          </p>
        </div>
      ) : null}
    </>
  );
}
