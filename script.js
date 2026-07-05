(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------ */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------
     Scroll reveals — lines, fades, plate wipes
     ------------------------------------------------------------------ */
  const revealTargets = document.querySelectorAll('.reveal-line, .reveal-up, .plate[data-plate]');

  if (prefersReduced) {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  }

  /* ------------------------------------------------------------------
     Chart-rail scroll-spy
     ------------------------------------------------------------------ */
  const railLinks = Array.from(document.querySelectorAll('.chart-rail__list a'));
  const sections = railLinks
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  const setActive = (id) => {
    railLinks.forEach(a => {
      a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`);
    });
    mobileTabLinks.forEach(a => {
      a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`);
    });
  };

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      // pick the entry closest to the top of the viewport that is intersecting
      const visible = entries.filter(e => e.isIntersecting);
      if (visible.length) {
        const top = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        setActive(top.target.id);
      }
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

    sections.forEach(s => spy.observe(s));
  }

  /* ------------------------------------------------------------------
     Mobile tab bar — mirrors the chart-rail for small viewports
     ------------------------------------------------------------------ */
  const mobileTabsWrap = document.querySelector('.mobile-tabs');
  const mobileTabLinks = [];
  if (mobileTabsWrap) {
    railLinks.forEach(a => {
      const clone = document.createElement('a');
      clone.href = a.getAttribute('href');
      clone.textContent = a.querySelector('span') ? a.querySelector('span').textContent : a.textContent;
      clone.style.cssText = 'flex:0 0 auto;padding:.9rem 1.1rem;font-family:var(--font-mono);font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;color:rgba(237,234,224,.6);text-decoration:none;border-bottom:2px solid transparent;white-space:nowrap;';
      clone.addEventListener('click', () => {
        mobileTabLinks.forEach(l => l.style.borderBottomColor = 'transparent');
      });
      mobileTabsWrap.appendChild(clone);
      mobileTabLinks.push(clone);
    });
  }

  /* ------------------------------------------------------------------
     "Book a visit" quick-jump buttons
     ------------------------------------------------------------------ */
  document.querySelectorAll('[data-open-booking]').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById('booking');
      if (!target) return;
      target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
      const firstField = document.getElementById('f-name');
      if (firstField) window.setTimeout(() => firstField.focus(), prefersReduced ? 0 : 600);
    });
  });

  /* ------------------------------------------------------------------
     Booking form — client-side validation + isolated submit handler.
     Swap `submitBookingRequest` for a real endpoint (Formspree, Web3Forms,
     a serverless function, etc.) without touching the validation logic.
     ------------------------------------------------------------------ */
  const form = document.getElementById('booking-form');
  const statusEl = document.getElementById('booking-status');
  const submitBtn = document.getElementById('booking-submit');

  const FIELD_RULES = {
    name: { required: true, label: 'Full name' },
    email: { required: true, label: 'Email', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMsg: 'Enter a valid email address' },
    phone: { required: true, label: 'Phone', pattern: /^[0-9+\-()\s]{7,}$/, patternMsg: 'Enter a valid phone number' },
    consent: { required: true, label: 'Consent', isCheckbox: true },
  };

  function clearFieldErrors() {
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));
  }

  function showFieldError(field, message) {
    field.setAttribute('aria-invalid', 'true');
    const msg = document.createElement('span');
    msg.className = 'field-error mono';
    msg.style.cssText = 'color:#e08a78;display:block;margin-top:.35rem;text-transform:none;letter-spacing:0;';
    msg.textContent = message;
    field.insertAdjacentElement('afterend', msg);
  }

  function validateForm(data) {
    clearFieldErrors();
    let firstInvalid = null;
    let valid = true;

    Object.entries(FIELD_RULES).forEach(([name, rule]) => {
      const field = form.elements[name];
      if (!field) return;
      const value = rule.isCheckbox ? field.checked : (data.get(name) || '').trim();

      if (rule.required && !value) {
        valid = false;
        showFieldError(field, `${rule.label} is required.`);
        firstInvalid = firstInvalid || field;
        return;
      }
      if (rule.pattern && value && !rule.pattern.test(value)) {
        valid = false;
        showFieldError(field, rule.patternMsg);
        firstInvalid = firstInvalid || field;
      }
    });

    return { valid, firstInvalid };
  }

  /**
   * Isolated submit function. This is the ONLY place that needs to change
   * to wire this form up to a real backend, e.g.:
   *
   *   return fetch('https://formspree.io/f/YOUR_ID', {
   *     method: 'POST',
   *     headers: { Accept: 'application/json' },
   *     body: formData,
   *   });
   *
   * or a Web3Forms / serverless endpoint. Return a Promise that resolves on
   * success and rejects (or resolves { ok:false }) on failure.
   */
  async function submitBookingRequest(formData) {
    // REPLACE — placeholder "success" so the form is demonstrable without a backend.
    console.info('[booking-form] Would submit:', Object.fromEntries(formData.entries()));
    await new Promise(res => setTimeout(res, 600));
    return { ok: true };
  }

  if (form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const { valid, firstInvalid } = validateForm(data);

      if (!valid) {
        statusEl.textContent = 'Please fix the highlighted fields.';
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      submitBtn.disabled = true;
      statusEl.textContent = 'Sending request…';

      try {
        const result = await submitBookingRequest(data);
        if (result && result.ok) {
          statusEl.textContent = 'Request sent — we\u2019ll be in touch within one business day.';
          form.reset();
        } else {
          throw new Error('Submission failed');
        }
      } catch (err) {
        statusEl.textContent = 'Something went wrong — please call the studio directly.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
})();
