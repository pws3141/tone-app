export interface Nav {
  home(): void;
  game(): void;
  settings(): void;
  drones(): void;
}

/** A screen renders into `root` and may return a cleanup function run when it is left. */
export type Screen = (root: HTMLElement, nav: Nav) => void | (() => void);
