import type { Nav } from './nav';

type Tab = 'tones' | 'drones';

const ICONS: Record<Tab, string> = {
  tones: '<path d="M2 12c2.5-7 5-7 7.5 0s5 7 7.5 0 3.5-5 5-3" />',
  drones: '<path d="M8 3h8l4 18H4L8 3z" /><path d="M12 17l5-11" />',
};

const LABELS: Record<Tab, string> = { tones: 'Tones', drones: 'Drones' };

/** Bottom tab bar switching between the Tones and Drones sections. */
export function renderTabBar(root: HTMLElement, nav: Nav, active: Tab): void {
  const bar = document.createElement('nav');
  bar.className = 'tabbar';
  bar.innerHTML = (Object.keys(LABELS) as Tab[])
    .map(
      (tab) => `
      <button data-tab="${tab}" class="${tab === active ? 'active' : ''}" ${tab === active ? 'aria-current="page"' : ''}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[tab]}</svg>
        <span>${LABELS[tab]}</span>
      </button>`,
    )
    .join('');
  bar.addEventListener('click', (e) => {
    const tab = (e.target as Element).closest<HTMLElement>('[data-tab]')?.dataset.tab as Tab | undefined;
    if (!tab || tab === active) return;
    if (tab === 'tones') nav.home();
    else nav.drones();
  });
  root.append(bar);
}
