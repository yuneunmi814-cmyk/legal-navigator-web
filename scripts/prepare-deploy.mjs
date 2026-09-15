import {cp, mkdir, rm, readFile, writeFile} from 'node:fs/promises';
const previewOrigin=process.env.PREVIEW_ORIGIN;
if(previewOrigin){const url=new URL(previewOrigin);if(url.protocol!=='https:'||url.origin!==previewOrigin||!url.hostname.endsWith('.legalnavi.pages.dev'))throw Error('Expected legalnavi preview origin');}
// Upload only public files. Source, handoffs and test fixtures stay out of Pages.
await rm('dist', {recursive:true, force:true}); await mkdir('dist');
for (const name of ['index.html','404.html','_headers','assets','forms','절차','brochure','icon.svg','apple-touch-icon.png','og.png','robots.txt','sitemap.xml']) {
 await cp(name, `dist/${name}`, {recursive:true});
}
if(previewOrigin){
 // A new image may not exist on production yet. Share the preview's own asset.
 let html=await readFile('dist/index.html','utf8');
 html=html.replace(/(<meta (?:property="og:(?:url|image)"|name="twitter:image") content=")https:\/\/legalnavi\.pages\.dev/g,`$1${previewOrigin}`);
 html=html.replace('</head>','<meta name="robots" content="noindex, nofollow">\n</head>');
 await writeFile('dist/index.html',html);
}
console.log('Public files prepared in dist/');
