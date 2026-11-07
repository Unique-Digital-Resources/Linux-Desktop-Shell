/**
 * files.commands.js — file-explorer entry-point commands.
 *
 * The file-explorer app encapsulates its own internal file operations
 * (copy/cut/paste/rename/etc.); these commands handle the cross-cutting
 * "open the files app at a path" flow that the dock / launcher / other
 * apps need.
 */
import { commands } from '../core/command-registry.js';

export function registerFilesCommands() {
  commands.registerAll({
    /** @param {{path?:string}} args */
    'files.open'(args = {}) {
      return commands.execute('window.open', {
        appId: 'files',
        title: 'Files',
        path: args.path,
      });
    },
  });
}

export default registerFilesCommands;
