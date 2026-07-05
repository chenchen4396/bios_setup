// Full pipeline test: real BMC registry.json
const fs = require('fs');

const models = fs.readFileSync('../js/models.js', 'utf8');
const parser = fs.readFileSync('../js/parser.js', 'utf8');
const text = fs.readFileSync('../registry.json', 'utf8');

const code = models + ';' + parser + ';' +
    'var cleaned = cleanJsonControlChars(_text);' +
    'var json = JSON.parse(cleaned);' +
    'var profile = Parser.parseRegistryJSON(json);' +
    'console.log("ProductName: " + profile.productName);' +
    'console.log("SystemId: " + profile.systemId);' +
    'console.log("FirmwareVersion: " + profile.firmwareVersion);' +
    'console.log("Menus: " + Object.keys(profile.menuMap).length);' +
    'console.log("Attrs: " + Object.keys(profile.attrMap).length);' +
    'console.log("Deps: " + profile.dependencies.length);' +
    'console.log("Errors: " + profile.importErrors.length);' +
    'var attrs = Object.values(profile.attrMap);' +
    'var types = {}; attrs.map(function(a) { types[a.type] = (types[a.type] || 0) + 1; });' +
    'console.log("Types: " + JSON.stringify(types));' +
    'var noSR = attrs.filter(function(a) { return !a.supportsRedfish; }).length;' +
    'console.log("NoRedfish: " + noSR + "/" + attrs.length);' +
    'var paths = Array.from(new Set(attrs.map(function(a) { return a.menuPath; })));' +
    'console.log("MenuPaths: " + paths.length);';

const fn = new Function('_text', code);
fn(text);
console.log('Done');
