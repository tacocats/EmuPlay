import type { EmuPlayDesktopApi } from '../../electron/api';

export type { DesktopPreferences, EmuPlayDesktopApi } from '../../electron/api';
export { GUEST_MESSAGE_CHANNEL, PLAYER_PARTITION } from '../../electron/api';

/**
 * The Electron main process's API (electron/preload.ts), or null when the web
 * build is running in a plain browser (`npm run dev:web`) — every caller has
 * to cope with that, usually by falling back to a browser API.
 */
export function getDesktopBridge(): EmuPlayDesktopApi | null {
  const host = globalThis as { emuplay?: EmuPlayDesktopApi };
  return host.emuplay ?? null;
}
