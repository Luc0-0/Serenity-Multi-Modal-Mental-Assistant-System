const fs = require('fs');

const files = [
  'frontend/src/pages/CheckIn.module.css',
  'frontend/src/pages/Landing.jsx',
  'frontend/src/pages/Landing.module.css',
  'frontend/src/pages/Meditate.module.css'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace block decorations
  // From:
  // /* ═══════════════════════════════════════
  //    SOME HEADING
  //    ═══════════════════════════════════════ */
  content = content.replace(/\/\* [═━─]+[\r\n]+\s*(.*?)\s*[\r\n]+\s*[═━─]+ \*\//g, '/* $1 */');

  // Replace inline decorations
  // From: /* ── Some heading ── */
  content = content.replace(/\/\* [─━═]+ (.*?) [─━═]+ \*\//g, '/* $1 */');

  // Replace other long borders
  content = content.replace(/\/\* [━─═]+ \*\//g, '');

  fs.writeFileSync(file, content, 'utf8');
});

console.log('Decorations cleaned');
