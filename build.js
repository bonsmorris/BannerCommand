// Build: concatenates src into a single self-contained HTML for Hostinger.
// Usage: node build.js  →  dist/banners-of-coronal.html
const fs=require('fs');
const css=fs.readFileSync('src/styles.css','utf8');
const js=['a_data.js','b_screens.js','c_field.js','d_atb.js']
  .map(f=>fs.readFileSync('src/'+f,'utf8')).join('\n');
let html=fs.readFileSync('index.html','utf8');
html=html.replace('<link rel="stylesheet" href="src/styles.css">','<style>\n'+css+'</style>');
html=html.replace(/<script src="src\/a_data\.js"><\/script>[\s\S]*?<script src="src\/d_atb\.js"><\/script>/,
  '<script>\n"use strict";\n'+js+'\n</script>');
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/banners-of-coronal.html',html);
console.log('Built dist/banners-of-coronal.html —',(html.length/1024).toFixed(1),'KB');
