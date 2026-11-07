/**
 * main.js — the desktop entry point.
 *
 * Importing this module:
 *   1. registers all custom elements (side-effect imports of component modules)
 *   2. registers all command modules (the source of truth for functionality)
 *   3. waits for window.lucide (CDN) then starts the boot orchestrator
 *
 * Loaded by the Next.js host page as `<script type="module" src="/de/main.js">`.
 * Everything below runs in the browser only.
 */

// --- side-effect: register custom elements ---
import './components/dm-greeter.js';
import './components/de-shell.js';
import './components/de-dock.js';
import './components/de-launcher.js';
import './components/de-quicksettings.js';
import './components/de-calendar.js';
import './components/de-app-window.js';
import './components/de-placeholder-app.js';
import './components/fe-app.js';

// --- register the command system (source of truth) ---
import { registerSystemCommands } from './commands/system.commands.js';
import { registerWindowCommands } from './commands/window.commands.js';
import { registerUiCommands } from './commands/ui.commands.js';
import { registerFilesCommands } from './commands/files.commands.js';

import { waitForLucide } from './core/utils.js';
import { startBoot } from './boot/boot.js';

registerSystemCommands();
registerWindowCommands();
registerUiCommands();
registerFilesCommands();

// wait for the lucide CDN, then boot
waitForLucide().then(() => {
  startBoot(document.getElementById('de-root'));
});
