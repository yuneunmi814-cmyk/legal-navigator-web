import {cp, mkdir, rm} from 'node:fs/promises';
// Upload only public files. Source, handoffs and test fixtures stay out of Pages.
await rm('dist', {recursive:true, force:true}); await mkdir('dist');
for (const name of ['index.html','404.html','_headers','assets','forms','절차','brochure','icon.svg','apple-touch-icon.png','og.png','robots.txt','sitemap.xml']) {
 await cp(name, `dist/${name}`, {recursive:true});
}
console.log('Public files prepared in dist/');
