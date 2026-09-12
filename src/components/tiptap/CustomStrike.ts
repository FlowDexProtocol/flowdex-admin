// StarterKit's bundled Strike defaults to Mod-Shift-s; the spec here wants
// Ctrl+Shift+X specifically (kept Mod-Shift-s too — no reason to take away
// a working shortcut just for adding another).
import Strike from '@tiptap/extension-strike';

export const CustomStrike = Strike.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
    };
  },
});
