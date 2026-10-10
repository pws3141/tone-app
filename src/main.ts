import './styles.css';
import { renderGame } from './ui/game';
import { renderHome } from './ui/home';
import type { Nav, Screen } from './ui/nav';
import { renderSettings } from './ui/settings';

const root = document.getElementById('app')!;
let cleanup: (() => void) | undefined;

function show(screen: Screen): void {
  cleanup?.();
  root.replaceChildren();
  cleanup = screen(root, nav) ?? undefined;
  window.scrollTo(0, 0);
}

const nav: Nav = {
  home: () => show(renderHome),
  game: () => show(renderGame),
  settings: () => show(renderSettings),
};

nav.home();
