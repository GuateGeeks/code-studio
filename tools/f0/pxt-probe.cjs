const path = require('node:path');
const fs = require('node:fs');
const {compile} = require('../../spikes/pxt-adapter.cjs');
const output = path.join(__dirname, '../../artifacts/pxt');
fs.mkdirSync(output, {recursive: true});
(async () => {
  for (const native of [false, true]) {
    try {
      const result = await compile('basic.showIcon(IconNames.Heart)\n', {native});
      fs.writeFileSync(path.join(output, `${native ? 'native' : 'simulation'}-result.json`), JSON.stringify(result, null, 2));
      for (const [name, contents] of Object.entries(result.outfiles)) fs.writeFileSync(path.join(output, name), contents);
      console.log(JSON.stringify({...result, outfiles: Object.keys(result.outfiles)}, null, 2));
    } catch (error) {
      const result = {error: error.message, ...error.evidence};
      fs.writeFileSync(path.join(output, `${native ? 'native' : 'simulation'}-result.json`), JSON.stringify(result, null, 2));
      console.error(JSON.stringify(result, null, 2));
      process.exitCode = 1;
    }
  }
})();
