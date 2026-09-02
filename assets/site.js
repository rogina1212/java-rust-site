const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('[data-menu-toggle]');
const mobileMenu = document.querySelector('[data-mobile-menu]');

const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 24);
updateHeader();
window.addEventListener('scroll', updateHeader, { passive: true });

menuToggle?.addEventListener('click', () => {
  const open = mobileMenu?.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(Boolean(open)));
});

mobileMenu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  menuToggle?.setAttribute('aria-expanded', 'false');
}));

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px' })
  : null;

document.querySelectorAll('.reveal').forEach((element) => {
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add('visible');
});

document.querySelectorAll('[data-copy]').forEach((button) => {
  button.addEventListener('click', async () => {
    const value = button.dataset.copy || '';
    try {
      await navigator.clipboard.writeText(value);
      const label = button.querySelector('b');
      const original = label?.textContent;
      if (label) label.textContent = 'Скопировано';
      window.setTimeout(() => { if (label) label.textContent = original; }, 1500);
    } catch {
      window.prompt('Скопируйте значение:', value);
    }
  });
});

document.querySelectorAll('.faq-list details').forEach((item) => {
  item.addEventListener('toggle', () => {
    if (!item.open) return;
    document.querySelectorAll('.faq-list details[open]').forEach((other) => {
      if (other !== item) other.open = false;
    });
  });
});

const filterButtons = document.querySelectorAll('[data-filter]');
const products = document.querySelectorAll('[data-category]');
filterButtons.forEach((button) => button.addEventListener('click', () => {
  filterButtons.forEach((item) => item.classList.remove('active'));
  button.classList.add('active');
  const filter = button.dataset.filter;
  products.forEach((product) => {
    product.hidden = filter !== 'all' && product.dataset.category !== filter;
  });
}));

document.querySelectorAll('[data-buy]').forEach((button) => {
  button.addEventListener('click', () => {
    const product = button.closest('.product-card')?.querySelector('h3')?.textContent || 'товар';
    button.textContent = 'Добавлено ✓';
    button.classList.add('added');
    window.setTimeout(() => {
      button.textContent = `Купить ${product}`;
      button.classList.remove('added');
    }, 1800);
  });
});
