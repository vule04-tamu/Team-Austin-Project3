import { useState, useEffect } from "react";
import "./TextSizeControl.css";

const TEXT_SIZE_SCALES = {
  small: 0.85,
  normal: 1,
  large: 1.15,
  xlarge: 1.3,
};

// Scale an individual element and store its original font size
const scaleElement = (el, scale) => {
  const computedStyle = window.getComputedStyle(el);
  let currentFontSize = computedStyle.fontSize;
  
  // Store original font size on first encounter
  if (!el.hasAttribute("data-original-font-size")) {
    el.setAttribute("data-original-font-size", currentFontSize);
  }
  
  const originalSize = el.getAttribute("data-original-font-size");
  const baseSizeValue = parseFloat(originalSize);
  
  // Apply scaling to the stored original size
  if (!isNaN(baseSizeValue)) {
    el.style.fontSize = `${baseSizeValue * scale}px`;
  }
};

// Scale all elements on the page
const scaleAllElements = (scale) => {
  const allElements = document.querySelectorAll("*");
  allElements.forEach((el) => {
    scaleElement(el, scale);
  });
};

export default function TextSizeControl() {
  const [scale, setScale] = useState("normal");

  useEffect(() => {
    // Load saved preference from localStorage
    const saved = localStorage.getItem("textSizeScale") || "normal";
    setScale(saved);
    applyScale(saved);

    // Set up a MutationObserver to handle dynamically added elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
          const currentScaleValue = TEXT_SIZE_SCALES[localStorage.getItem("textSizeScale") || "normal"];
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) { // Element node
              scaleElement(node, currentScaleValue);
              // Also scale children
              const children = node.querySelectorAll("*");
              children.forEach((child) => {
                scaleElement(child, currentScaleValue);
              });
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  const applyScale = (scaleKey) => {
    const scaleValue = TEXT_SIZE_SCALES[scaleKey];
    document.documentElement.style.setProperty("--font-scale", scaleValue);
    scaleAllElements(scaleValue);
    localStorage.setItem("textSizeScale", scaleKey);
  };

  const handleScaleChange = (newScale) => {
    setScale(newScale);
    applyScale(newScale);
  };

  return (
    <div className="text-size-control">
      <div className="text-size-buttons">
        <button
          className={`size-btn ${scale === "small" ? "active" : ""}`}
          onClick={() => handleScaleChange("small")}
          title="Smaller text"
        >
          <span className="size-indicator small">A</span>
        </button>
        <button
          className={`size-btn ${scale === "normal" ? "active" : ""}`}
          onClick={() => handleScaleChange("normal")}
          title="Normal text"
        >
          <span className="size-indicator normal">A</span>
        </button>
        <button
          className={`size-btn ${scale === "large" ? "active" : ""}`}
          onClick={() => handleScaleChange("large")}
          title="Larger text"
        >
          <span className="size-indicator large">A</span>
        </button>
        <button
          className={`size-btn ${scale === "xlarge" ? "active" : ""}`}
          onClick={() => handleScaleChange("xlarge")}
          title="Extra large text"
        >
          <span className="size-indicator xlarge">A</span>
        </button>
      </div>
    </div>
  );
}
