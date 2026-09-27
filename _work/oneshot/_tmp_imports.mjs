import fs from 'fs';
const html = fs.readFileSync('dist/欲望都市/界面/状态栏/index.html','utf8');
const imports = [...html.matchAll(/import[^"']*["']([^"']+)["']/g)].map(m=>m[1]);
console.log('module imports:', imports);
const scriptTags = [...html.matchAll(/<script[^>]*>/g)].map(m=>m[0]);
console.log('script tags:', scriptTags);
console.log('has type=module:', html.includes('type="module"'));
// check for createApp / mount
console.log('createApp present:', html.includes('createApp'));
console.log('mount present:', html.includes('.mount'));
// check head vs body
console.log('head tag:', html.includes('<head>'), 'body tag:', html.includes('<body>'));
