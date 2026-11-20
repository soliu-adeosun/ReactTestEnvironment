/**
 * CustomPeoplePicker – Standalone React + JavaScript
 * -------------------------------------------------
 * A self-contained people picker built on Select2.
 * No SharePoint, no global ERP objects, no legacy attributes.
 *
 * Peer dependencies:
 *   npm install react jquery select2
 *   import "select2/dist/css/select2.css";
 *
 * Data shape for each person:
 *   {
 *     id:    "jane.doe@company.com",   // unique value (usually email)
 *     name:  "Jane Doe",               // display name
 *     email: "jane.doe@company.com",   // optional, used for search
 *     image: "https://..."             // optional full image URL
 *   }
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import $ from "jquery";
import "select2";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const CustomPeoplePicker = forwardRef(function CustomPeoplePicker(props, ref) {
  const {
    /** Array of people – see data shape above */
    options = [],

    /** Controlled value: string | string[] | null */
    value = null,

    /** Called with the new value whenever selection changes */
    onChange,

    /** Allow multiple selections */
    multiple = false,

    /** Placeholder text */
    placeholder = "Search for a person…",

    /** Minimum characters before search starts */
    minimumInputLength = 0,

    /** Disable the control */
    disabled = false,

    /** Keep the order the user selected items (multiple only) */
    preserveOrder = false,

    /**
     * Optional function that builds an image URL from a person object.
     * Example: (person) => `https://my.cdn/photos/${person.id}.jpg`
     * If the person already has an `image` property it is used first.
     */
    getImageUrl,

    /** Extra class on the underlying <select> */
    className = "",

    /** Inline styles */
    style,

    /** id attribute */
    id,

    /** Called with (selectedPersonObject, select2Event) on select */
    onSelect,
  } = props;

  const selectRef = useRef(null);
  const $elRef = useRef(null);
  const initialized = useRef(false);

  // -------- Imperative handle (easy access from parent) --------
  useImperativeHandle(ref, () => ({
    /** Current value (string | string[] | null) */
    getValue: () => $elRef.current?.val() ?? null,

    /** Set value programmatically */
    setValue: (val) => {
      if ($elRef.current) applyValue($elRef.current, val, multiple, preserveOrder);
    },

    /** Clear selection */
    clear: () => {
      if ($elRef.current) {
        $elRef.current.val(multiple ? [] : null).trigger("change");
      }
    },

    /** Enable / disable */
    setDisabled: (state) => {
      if ($elRef.current) {
        $elRef.current.prop("disabled", !!state).trigger("change.select2");
      }
    },

    /** Underlying jQuery Select2 instance (escape hatch) */
    getSelect2: () => $elRef.current,
  }));

  // -------- Initialise Select2 --------
  useEffect(() => {
    const el = selectRef.current;
    if (!el) return;

    const $el = $(el);
    $elRef.current = $el;

    // Destroy previous instance cleanly
    if (initialized.current && $el.hasClass("select2-hidden-accessible")) {
      $el.off(".cpp");
      $el.select2("destroy");
    }

    // Build <option> elements
    $el.empty();
    if (!multiple) $el.append("<option></option>");

    options.forEach((person) => {
      if (!person || person.id == null) return;

      const imageUrl =
        person.image ||
        (typeof getImageUrl === "function" ? getImageUrl(person) : "") ||
        "";

      const label = person.name || person.email || String(person.id);
      const $opt = $("<option></option>")
        .val(person.id)
        .text(label)
        .attr("data-email", person.email || "")
        .attr("data-image", imageUrl);

      $el.append($opt);
    });

    // Detect Bootstrap / other modal so dropdown appears above it
    const $modal = $el.closest(".modal");

    $el.select2({
      placeholder,
      allowClear: true,
      minimumInputLength,
      width: "100%",
      disabled,
      dropdownParent: $modal.length ? $modal : $(document.body),
      templateResult: (item) => renderItem(item),
      templateSelection: (item) => renderItem(item),
      matcher: customMatcher,
    });

    initialized.current = true;

    // Events
    $el.on("select2:select.cpp", (e) => {
      if (multiple && preserveOrder) {
        const $option = $(e.params.data.element);
        $option.detach();
        $el.append($option);
        $el.trigger("change");
      }
      if (typeof onSelect === "function") {
        const person = options.find((p) => String(p.id) === String(e.params.data.id));
        onSelect(person || e.params.data, e);
      }
    });

    $el.on("change.cpp", () => {
      if (typeof onChange === "function") {
        onChange($el.val());
      }
    });

    // Apply current controlled value
    if (value != null) {
      applyValue($el, value, multiple, preserveOrder);
    }

    return () => {
      if ($el.hasClass("select2-hidden-accessible")) {
        $el.off(".cpp");
        $el.select2("destroy");
      }
      initialized.current = false;
    };
  }, [options, multiple, placeholder, minimumInputLength, preserveOrder, getImageUrl]);

  // Keep controlled value in sync
  useEffect(() => {
    if (!$elRef.current || value === undefined) return;
    const current = $elRef.current.val();
    const same = multiple
      ? JSON.stringify(current || []) === JSON.stringify(value || [])
      : String(current || "") === String(value || "");
    if (!same) {
      applyValue($elRef.current, value, multiple, preserveOrder);
    }
  }, [value, multiple, preserveOrder]);

  // Sync disabled state
  useEffect(() => {
    if ($elRef.current) {
      $elRef.current.prop("disabled", !!disabled).trigger("change.select2");
    }
  }, [disabled]);

  return (
    <select
      ref={selectRef}
      id={id}
      className={className}
      multiple={multiple}
      disabled={disabled}
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

  const imageUrl = $(item.element).data("image");
  if (imageUrl) {
    return $(`
      <span style="display:flex;align-items:center;gap:8px;">
        <img
          src="${imageUrl}"
          alt=""
          style="width:28px;height:28px;border-radius:50%;object-fit:cover;flex-shrink:0;"
          onerror="this.style.display='none'"
        />
        <span>${item.text}</span>
      </span>
    `);
  }
  return item.text;
}

function customMatcher(params, data) {
  if ($.trim(params.term) === "") return data;

  const term = params.term.toLowerCase();
  const text = (data.text || "").toLowerCase();
  const email = ($(data.element).data("email") || "").toLowerCase();
  const id = (data.id || "").toLowerCase();

  if (text.includes(term) || email.includes(term) || id.includes(term)) {
    return data;
  }
  return null;
}

function applyValue($el, value, multiple, preserveOrder) {
  if (value == null) {
    $el.val(multiple ? [] : null).trigger("change");
    return;
  }

  if (multiple && preserveOrder && Array.isArray(value)) {
    value.forEach((id) => {
      const $opt = $el.find(`option[value="${id}"]`);
      $opt.detach();
      $el.append($opt);
    });
  }

  // Small delay lets Select2 finish building options
  setTimeout(() => {
    $el.val(value).trigger("change");
  }, 0);
}
