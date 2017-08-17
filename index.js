const fs = require('fs');
const path = require('path');
const findup = require('findup');

function findPkg(dir) {
  try {
    return path.join(findup.sync(dir, 'package.json'), 'package.json');
  } catch (err) {
    console.log(err);
    throw new Error('No package.json file found');
  }
}

module.exports = function SCRIPTS(originalContent, options = {}, config) {
  let pkgPath;

  if (options && options.pkg) {
    pkgPath = path.resolve(path.dirname(config.originalPath), options.pkg);
  } else {
    pkgPath = findPkg(config.originalPath);
  }

  const { scripts } = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  const rows = originalContent.trim().split('\n').map(s => s.trim());
  const headerIndex = rows.findIndex(row => row.startsWith('|-'));

  const details = (headerIndex !== -1 ? rows.slice(headerIndex + 1) : rows)
    .map(row => row.split('|').map(s => s.trim()).filter(s => !!s))
    .filter(([script]) => !!script)
    .reduce((obj, [script, description]) => {
      obj[script.replace(/`/g, '')] = description;
      return obj;
    }, {});

  return ['| Script | Description |', '|--------|-------------|']
    .concat(
      Object.keys(scripts)
        .sort((a,b, array) => {
          regex = /^(pre|post)?(.*)$/;
          let [, prefixA, suffixA] = a.match(regex);
          let [, prefixB, suffixB] = b.match(regex);

          // Disregard the prefix if there is no suffix method
          // mostly for npm hook scripts
          if (!scripts[suffixA]) suffixA = a;
          if (!scripts[suffixB]) suffixB = b;

          if (suffixA === suffixB) {
            return (prefixA === 'pre' || prefixB === 'post') ? -1 : 1
          }

          return suffixA > suffixB;
        })
        .map(script => `| ${[script, details[script] || ''].join(' | ')} |`)
    )
    .join('\n');
  }
