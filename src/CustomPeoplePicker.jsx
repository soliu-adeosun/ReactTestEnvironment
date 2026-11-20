/**
 * CustomPeoplePicker – Standalone React + JavaScript
 * -------------------------------------------------
 * Works with Vite. No SharePoint / ERP dependencies.
 *
 * Required packages (see package notes below):
 *   npm install react jquery@3 select2
 *
 * In your entry file or App also import the CSS:
 *   import "select2/dist/css/select2.css";
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import $ from "jquery";

// ---- Make sure Select2 attaches to this jQuery instance (Vite/ESM safe) ----
import select2 from "select2";
if (typeof select2 === "function") {
  // Some builds export a function that must be called with jQuery
  select2($);
}
// Ensure global access for any internal Select2 checks
if (typeof window !== "undefined") {
  window.$ = window.jQuery = $;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const CustomPeoplePicker = forwardRef(function CustomPeoplePicker(props, ref) {
  const {
    options = [],
    value = null,
    onChange,
    multiple = false,
    placeholder = "Search for a person…",
    minimumInputLength = 0,
    disabled = false,
    preserveOrder = false,
    getImageUrl,
    className = "",
    style,
    id,
    onSelect,
  } = props;

  const selectRef = useRef(null);
  const $elRef = useRef(null);
  const initialized = useRef(false);
  // Avoid running destroy/init twice under React StrictMode in development
  const strictModeGuard = useRef(0);

  useImperativeHandle(ref, () => ({
    getValue: () => $elRef.current?.val() ?? null,
    setValue: (val) => {
      if ($elRef.current) applyValue($elRef.current, val, multiple, preserveOrder);
    },
    clear: () => {
      if ($elRef.current) {
        $elRef.current.val(multiple ? [] : null).trigger("change");
      }
    },
    setDisabled: (state) => {
      if ($elRef.current) {
        $elRef.current.prop("disabled", !!state).trigger("change.select2");
      }
    },
    getSelect2: () => $elRef.current,
  }));

  // -------- Initialise Select2 --------
  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;

    // React 18 StrictMode runs effects twice in dev. Guard against double-init.
    strictModeGuard.current += 1;
    const runId = strictModeGuard.current;

    const $el = $(el);
    $elRef.current = $el;

    // Safety: confirm select2 is available
    if (typeof $.fn.select2 !== "function") {
      console.error(
        "[CustomPeoplePicker] $.fn.select2 is not a function.\n" +
          "Make sure you installed: npm install jquery@3 select2\n" +
          "and that the import at the top of CustomPeoplePicker.jsx runs."
      );
      return;
    }

    // Destroy previous instance if any
    if (initialized.current && $el.hasClass("select2-hidden-accessible")) {
      try {
        $el.off(".cpp");
        $el.select2("destroy");
      } catch (_) {
        /* ignore */
      }
    }

    // Build options
    $el.empty();
    if (!multiple) $el.append("<option></option>");

    (options || []).forEach((person) => {
      if (!person || person.id == null) return;

      const imageUrl =
        person.image ||
        (typeof getImageUrl === "function" ? getImageUrl(person) : "") ||
        "";

      const label = person.name || person.email || String(person.id);
      const $opt = $("<option></option>")
        .val(String(person.id))
        .text(label)
        .attr("data-email", person.email || "")
        .attr("data-image", imageUrl);

      $el.append($opt);
    });

    const $modal = $el.closest(".modal");

    $el.select2({
      placeholder,
      allowClear: true,
      minimumInputLength,
      width: "100%",
      disabled: !!disabled,
      dropdownParent: $modal.length ? $modal : $(document.body),
      templateResult: renderItem,
      templateSelection: renderItem,
      matcher: customMatcher,
    });

    initialized.current = true;

    $el.on("select2:select.cpp", (e) => {
      if (multiple && preserveOrder) {
        const $option = $(e.params.data.element);
        $option.detach();
        $el.append($option);
        $el.trigger("change");
      }
      if (typeof onSelect === "function") {
        const person = (options || []).find(
          (p) => String(p.id) === String(e.params.data.id)
        );
        onSelect(person || e.params.data, e);
      }
    });

    $el.on("change.cpp", () => {
      if (typeof onChange === "function") {
        onChange($el.val());
      }
    });

    if (value != null) {
      applyValue($el, value, multiple, preserveOrder);
    }

    return () => {
      // Only destroy if this is still the latest effect run
      if (runId !== strictModeGuard.current) return;
      if ($el.hasClass("select2-hidden-accessible")) {
        try {
          $el.off(".cpp");
          $el.select2("destroy");
        } catch (_) {
          /* ignore */
        }
      }
      initialized.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, multiple, placeholder, minimumInputLength, preserveOrder, getImageUrl]);

  // Sync controlled value
  useEffect(() => {
    if (!$elRef.current) return;
    const current = $elRef.current.val();
    const same = multiple
      ? JSON.stringify(current || []) === JSON.stringify(value || [])
      : String(current || "") === String(value || "");
    if (!same) {
      applyValue($elRef.current, value, multiple, preserveOrder);
    }
  }, [value, multiple, preserveOrder]);

  // Sync disabled
  useEffect(() => {
    if ($elRef.current && typeof $.fn.select2 === "function") {
      $elRef.current.prop("disabled", !!disabled).trigger("change.select2");
    }
  }, [disabled]);

  return (
    <select
      ref={selectRef}
      id={id}
      className={className}
      multiple={multiple || undefined}
      disabled={disabled || undefined}
      style={style}
      data-placeholder={placeholder}
    />
  );
});

export default CustomPeoplePicker;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderItem(item) {
  if (!item.id) return item.text;

  const imageUrl = item.element ? $(item.element).data("image") : "";
  if (imageUrl) {
    return $(
      `<span style="display:flex;align-items:center;gap:8px;">
        <img
          src="${imageUrl}"
          alt=""
          style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;"
          onerror="this.style.display='none'"
        />
        <span>${item.text}</span>
      </span>`
    );
  }
  return item.text;
}

function customMatcher(params, data) {
  if ($.trim(params.term) === "") return data;

  const term = params.term.toLowerCase();
  const text = (data.text || "").toLowerCase();
  const email = (data.element ? $(data.element).data("email") : "") || "";
  const id = (data.id || "").toLowerCase();

  if (
    text.includes(term) ||
    String(email).toLowerCase().includes(term) ||
    id.includes(term)
  ) {
    return data;
  }
  return null;
}

function applyValue($el, value, multiple, preserveOrder) {
  if (value == null || value === "") {
    $el.val(multiple ? [] : null).trigger("change");
    return;
  }

  if (multiple && preserveOrder && Array.isArray(value)) {
    value.forEach((id) => {
      const $opt = $el.find(`option[value="${id}"]`);
      if ($opt.length) {
        $opt.detach();
        $el.append($opt);
      }
    });
  }

  setTimeout(() => {
    $el.val(value).trigger("change");
  }, 0);
}
