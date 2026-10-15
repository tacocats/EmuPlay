/**
 * Standalone play-path resolver based on RomM's frontend logic.
 *
 * Returns one of:
 *   /rom/:id/stream
 *   /rom/:id/jsdos
 *   /rom/:id/ejs
 *   /rom/:id/pico8
 *   /rom/:id/ruffle
 *
 * Or null when the ROM cannot be launched by the requested target.
 */

export type PlayTarget = 'auto' | 'local' | 'stream';

export interface Rom {
  id: number;
  platform_slug: string;
  has_file_on_disk: boolean;
  fs_extension?: string | null;
  fs_name?: string | null;
}

export interface Heartbeat {
  EMULATION: {
    DISABLE_EMULATOR_JS?: boolean;
    DISABLE_JSDOS?: boolean;
    DISABLE_PICO8?: boolean;
    DISABLE_RUFFLE_RS?: boolean;
  };
}

export interface Config {
  /**
   * Optional platform aliases/remaps.
   *
   * Example:
   * {
   *   PLATFORMS_VERSIONS: {
   *     "some-old-slug": "snes"
   *   }
   * }
   */
  PLATFORMS_VERSIONS?: Record<string, string>;

  /**
   * When true, nightly EmulatorJS cores are included.
   */
  EJS_NETPLAY_ENABLED?: boolean;
}

interface StreamingContainer {
  platform: string;
  container?: string;
  label?: string;
  emulator?: string;
}

export interface StreamingConfig {
  enabled: boolean;
  containers: StreamingContainer[];
}

/**
 * EmulatorJS core map.
 *
 * A platform is EmulatorJS-compatible when it has at least one core here.
 */
const EJS_CORES_MAP: Record<string, string[]> = {
  '3do': ['opera'],
  acpc: ['cap32', 'crocods'],
  amiga: ['puae'],
  'amiga-cd32': ['puae'],

  arcade: [
    'mame2003',
    'mame2003_plus',
    'fbneo',
    'fbalpha2012_cps1',
    'fbalpha2012_cps2',
  ],

  neogeoaes: ['fbneo'],
  neogeomvs: ['fbneo'],

  atari2600: ['stella2014'],
  'atari-2600-plus': ['stella2014'],
  atari5200: ['a5200'],
  atari7800: ['prosystem'],

  'c-plus-4': ['vice_xplus4'],
  c64: ['vice_x64sc', 'vice_x64'],
  cpet: ['vice_xpet'],
  'commodore-64c': ['vice_x64sc', 'vice_x64'],
  c128: ['vice_x128'],
  'commmodore-128': ['vice_x128'],

  colecovision: ['gearcoleco'],
  doom: ['prboom'],
  dos: ['dosbox_pure'],
  jaguar: ['virtualjaguar'],
  lynx: ['handy'],
  'atari-lynx-mkii': ['handy'],

  'neo-geo-pocket': ['mednafen_ngp'],
  'neo-geo-pocket-color': ['mednafen_ngp'],

  nes: ['fceumm', 'nestopia'],
  famicom: ['fceumm', 'nestopia'],
  fds: ['fceumm', 'nestopia'],
  'game-televisison': ['fceumm'],
  'new-style-nes': ['fceumm'],

  n64: ['mupen64plus_next', 'parallel_n64'],
  'ique-player': ['mupen64plus_next'],

  nds: ['melonds', 'desmume', 'desmume2015'],
  'nintendo-ds-lite': ['melonds', 'desmume', 'desmume2015'],
  'nintendo-dsi': ['melonds', 'desmume', 'desmume2015'],
  'nintendo-dsi-xl': ['melonds', 'desmume', 'desmume2015'],

  gb: ['gambatte', 'mgba'],
  'game-boy-pocket': ['gambatte', 'mgba'],
  'game-boy-light': ['gambatte', 'mgba'],
  gba: ['mgba'],
  'game-boy-adavance-sp': ['mgba'],
  'game-boy-micro': ['mgba'],
  gbc: ['gambatte', 'mgba'],

  'pc-fx': ['mednafen_pcfx'],
  psx: ['pcsx_rearmed', 'mednafen_psx_hw'],
  'philips-cd-i': ['same_cdi'],
  psp: ['ppsspp'],

  segacd: ['genesis_plus_gx', 'picodrive'],
  sega32: ['picodrive'],
  gamegear: ['genesis_plus_gx'],
  sms: ['genesis_plus_gx'],
  'sega-mark-iii': ['genesis_plus_gx'],
  'sega-game-box-9': ['genesis_plus_gx'],
  'sega-master-system-ii': ['genesis_plus_gx', 'smsplus'],
  'master-system-super-compact': ['genesis_plus_gx'],
  'master-system-girl': ['genesis_plus_gx'],
  genesis: ['genesis_plus_gx'],
  'sega-mega-drive-2-slash-genesis': ['genesis_plus_gx'],
  'sega-mega-jet': ['genesis_plus_gx'],
  'mega-pc': ['genesis_plus_gx'],
  'tera-drive': ['genesis_plus_gx'],
  'sega-nomad': ['genesis_plus_gx'],
  saturn: ['yabause'],

  snes: ['snes9x'],
  sfam: ['snes9x'],
  'super-nintendo-original-european-version': ['snes9x'],
  'super-famicom-shvc-001': ['snes9x'],
  'super-famicom-jr-model-shvc-101': ['snes9x'],
  'new-style-super-nes-model-sns-101': ['snes9x'],

  tg16: ['mednafen_pce'],
  'turbografx-cd': ['mednafen_pce'],
  supergrafx: ['mednafen_pce'],

  'vic-20': ['vice_xvic'],
  virtualboy: ['beetle_vb'],
  wonderswan: ['mednafen_wswan'],
  swancrystal: ['mednafen_wswan'],
  'wonderswan-color': ['mednafen_wswan'],
  zxs: ['fuse'],
};

/**
 * Additional nightly cores enabled by the EmulatorJS/netplay setting.
 */
const EJS_NIGHTLY_CORES_MAP: Record<string, string[]> = {
  '3ds': ['azahar'],
  'new-nintendo-3ds': ['azahar'],
  intellivision: ['freeintv'],

  segacd: ['genesis_plus_gx', 'genesis_plus_gx_wide', 'picodrive'],
  gamegear: ['genesis_plus_gx', 'genesis_plus_gx_wide'],
  sms: ['genesis_plus_gx', 'genesis_plus_gx_wide'],
  'sega-mark-iii': ['genesis_plus_gx', 'genesis_plus_gx_wide'],
  'sega-game-box-9': ['genesis_plus_gx', 'genesis_plus_gx_wide'],

  'sega-master-system-ii': [
    'genesis_plus_gx',
    'genesis_plus_gx_wide',
    'smsplus',
  ],

  'master-system-super-compact': ['genesis_plus_gx', 'genesis_plus_gx_wide'],

  'master-system-girl': ['genesis_plus_gx', 'genesis_plus_gx_wide'],

  genesis: ['genesis_plus_gx', 'genesis_plus_gx_wide'],

  'sega-mega-drive-2-slash-genesis': [
    'genesis_plus_gx',
    'genesis_plus_gx_wide',
  ],

  'sega-mega-jet': ['genesis_plus_gx', 'genesis_plus_gx_wide'],

  'mega-pc': ['genesis_plus_gx', 'genesis_plus_gx_wide'],

  'tera-drive': ['genesis_plus_gx', 'genesis_plus_gx_wide'],

  'sega-nomad': ['genesis_plus_gx', 'genesis_plus_gx_wide'],

  snes: ['snes9x', 'bsnes'],
  sfam: ['snes9x', 'bsnes'],
  'super-nintendo-original-european-version': ['snes9x', 'bsnes'],
  'super-famicom-shvc-001': ['snes9x', 'bsnes'],
  'super-famicom-jr-model-shvc-101': ['snes9x', 'bsnes'],
  'new-style-super-nes-model-sns-101': ['snes9x', 'bsnes'],
};

/**
 * Resolve a platform through RomM's configured platform-version aliases.
 */
function resolvePlatformSlug(platformSlug: string, config?: Config): string {
  return config?.PLATFORMS_VERSIONS?.[platformSlug] ?? platformSlug;
}

/**
 * Return the EmulatorJS cores available for a platform.
 */
function getSupportedEJSCores(
  platformSlug: string,
  netplayEnabled = false,
): string[] {
  const coresMap = netplayEnabled
    ? {
        ...EJS_CORES_MAP,
        ...EJS_NIGHTLY_CORES_MAP,
      }
    : EJS_CORES_MAP;

  return coresMap[platformSlug.toLowerCase()] ?? [];
}

/**
 * Check EmulatorJS support for a platform.
 */
function isEJSEmulationSupported(
  platformSlug: string,
  heartbeat: Heartbeat,
  config?: Config,
): boolean {
  if (heartbeat.EMULATION.DISABLE_EMULATOR_JS) {
    return false;
  }

  const resolvedSlug = resolvePlatformSlug(platformSlug, config);

  const hasCore =
    getSupportedEJSCores(resolvedSlug, config?.EJS_NETPLAY_ENABLED ?? false)
      .length > 0;

  return hasCore;
}

/**
 * Check Ruffle support for a platform.
 */
function isRuffleEmulationSupported(
  platformSlug: string,
  heartbeat: Heartbeat,
  config?: Config,
): boolean {
  if (heartbeat.EMULATION.DISABLE_RUFFLE_RS) {
    return false;
  }

  const resolvedSlug = resolvePlatformSlug(platformSlug, config);

  return ['flash', 'browser'].includes(resolvedSlug.toLowerCase());
}

/**
 * Check js-dos support for a platform.
 */
function isJsDosEmulationSupported(
  platformSlug: string,
  heartbeat: Heartbeat,
  config?: Config,
): boolean {
  if (heartbeat.EMULATION.DISABLE_JSDOS) {
    return false;
  }

  const resolvedSlug = resolvePlatformSlug(platformSlug, config);

  return ['win3x', 'win9x'].includes(resolvedSlug.toLowerCase());
}

/**
 * Check whether the ROM is a js-dos bundle.
 */
function isJsDosBundle(rom: Rom | null | undefined): boolean {
  return rom?.fs_extension?.toLowerCase() === 'jsdos';
}

/**
 * Check PICO-8 platform support.
 */
function isPico8EmulationSupported(
  platformSlug: string,
  heartbeat: Heartbeat,
  config?: Config,
): boolean {
  if (heartbeat.EMULATION.DISABLE_PICO8) {
    return false;
  }

  const resolvedSlug = resolvePlatformSlug(platformSlug, config);

  return resolvedSlug.toLowerCase() === 'pico';
}

/**
 * Check whether the ROM is a PICO-8 cartridge.
 */
function isPico8Rom(rom: Rom | null | undefined): boolean {
  const name = rom?.fs_name?.toLowerCase();

  return name?.endsWith('.p8') === true || name?.endsWith('.p8.png') === true;
}

/**
 * Find a configured streaming container for a platform.
 */
function containerForPlatform(
  slug: string | null | undefined,
  streaming: StreamingConfig,
): StreamingContainer | null {
  if (!slug || !streaming.enabled) {
    return null;
  }

  const lowerSlug = slug.toLowerCase();

  return (
    streaming.containers.find(
      container => container.platform.toLowerCase() === lowerSlug,
    ) ?? null
  );
}

/**
 * Determine whether a ROM can be played through a browser emulator.
 */
function getBrowserPlayability(
  rom: Rom | null | undefined,
  heartbeat: Heartbeat,
  config: Config | undefined,
): {
  canPlayEJS: boolean;
  canPlayJsDos: boolean;
  canPlayPico8: boolean;
  canPlayRuffle: boolean;
  canPlayInBrowser: boolean;
} {
  if (!rom?.has_file_on_disk) {
    return {
      canPlayEJS: false,
      canPlayJsDos: false,
      canPlayPico8: false,
      canPlayRuffle: false,
      canPlayInBrowser: false,
    };
  }

  const canPlayEJS = isEJSEmulationSupported(
    rom.platform_slug,
    heartbeat,
    config,
  );

  const canPlayRuffle = isRuffleEmulationSupported(
    rom.platform_slug,
    heartbeat,
    config,
  );

  const canPlayJsDos =
    isJsDosEmulationSupported(rom.platform_slug, heartbeat, config) &&
    isJsDosBundle(rom);

  const canPlayPico8 =
    isPico8EmulationSupported(rom.platform_slug, heartbeat, config) &&
    isPico8Rom(rom);

  return {
    canPlayEJS,
    canPlayJsDos,
    canPlayPico8,
    canPlayRuffle,
    canPlayInBrowser:
      canPlayEJS || canPlayJsDos || canPlayPico8 || canPlayRuffle,
  };
}

/**
 * Equivalent of RomM's useGameActions().playPath().
 */
export function playPath(
  rom: Rom | null | undefined,
  options: {
    player?: PlayTarget;
    heartbeat: Heartbeat;
    config?: Config;
    streaming: StreamingConfig;

    /**
     * When false, the browser players are off the table entirely and only a
     * streamed container can launch the rom. Emulation the client runs
     * itself is what this rules out; a stream runs on the server.
     */
    inBrowserPlayEnabled?: boolean;
  },
): string | null {
  const {
    player = 'auto',
    heartbeat,
    config,
    streaming,
    inBrowserPlayEnabled = true,
  } = options;

  if (!rom) {
    return null;
  }

  const hasRomFile = rom.has_file_on_disk;

  const hasStreamingContainer =
    containerForPlatform(rom.platform_slug, streaming) !== null;

  const streamAvailable = hasRomFile && hasStreamingContainer;

  // Explicit stream launch.
  if (player === 'stream') {
    return streamAvailable ? `/rom/${rom.id}/stream` : null;
  }

  // "auto" prefers streaming.
  if (player === 'auto' && streamAvailable) {
    return `/rom/${rom.id}/stream`;
  }

  // "local" and auto fallback use browser players.
  if (hasRomFile && inBrowserPlayEnabled) {
    const browser = getBrowserPlayability(rom, heartbeat, config);

    // This order matches RomM's playPath implementation.
    if (browser.canPlayJsDos) {
      return `/rom/${rom.id}/jsdos`;
    }

    if (browser.canPlayEJS) {
      return `/rom/${rom.id}/ejs`;
    }

    if (browser.canPlayPico8) {
      return `/rom/${rom.id}/pico8`;
    }

    if (browser.canPlayRuffle) {
      return `/rom/${rom.id}/ruffle`;
    }
  }

  return null;
}
