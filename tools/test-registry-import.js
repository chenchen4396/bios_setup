// Test: Import real BMC registry.json using production parser (via Function constructor for global scope)
const fs = require('fs');
const globalEval = (code) => { const fn = new Function(code); fn.call(globalThis); };

globalEval(fs.readFileSync('../js/models.js', 'utf8'));
globalEval(fs.readFileSync('../js/parser.js', 'utf8'));

// Read the file
const text = fs.readFileSync('../registry.json', 'utf8');

// Test the cleaning logic
let json;
try {
    json = JSON.parse(text);
    console.log('Direct parse: OK');
} catch (e) {
    console.log('Direct parse failed (' + e.message.substring(0, 60) + '), trying cleaned...');
    const cleaned = text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    try {
        json = JSON.parse(cleaned);
        console.log('Cleaned parse: OK');
    } catch (e2) {
        console.error('Cleaned parse also failed:', e2.message);
        process.exit(1);
    }
}

// Parse with our parser
const profile = Parser.parseRegistryJSON(json);

console.log('\n======= Import Results =======');
console.log('ProductName:', profile.productName);
console.log('SystemId:', profile.systemId);
console.log('FirmwareVersion:', profile.firmwareVersion);
console.log('menuMap entries:', Object.keys(profile.menuMap).length);
console.log('attrMap entries:', Object.keys(profile.attrMap).length);
console.log('dependencies:', profile.dependencies.length);
console.log('errors:', profile.importErrors.length, profile.importErrors);

// Stats
const attrs = Object.values(profile.attrMap);
const types = {};
attrs.forEach(a => { types[a.type] = (types[a.type] || 0) + 1; });
console.log('\nTypes:', JSON.stringify(types));

// Menu paths
const paths = [...new Set(attrs.map(a => a.menuPath))].sort();
console.log('\nMenu paths:', paths.length);
paths.slice(0, 20).forEach(p => {
    const count = attrs.filter(a => a.menuPath === p).length;
    console.log('  ' + count + ' attrs -> ' + p);
});
if (paths.length > 20) console.log('  ... +' + (paths.length - 20) + ' more');

console.log('\n======= Done =======');
