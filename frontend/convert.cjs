const fs = require('fs');
const path = require('path');

function convertHtmlToJsx(html) {
  let jsx = html.replace(/class="/g, 'className="');
  jsx = jsx.replace(/for="/g, 'htmlFor="');
  jsx = jsx.replace(/<img([^>]*[^/])>/g, '<img$1 />');
  jsx = jsx.replace(/<input([^>]*[^/])>/g, '<input$1 />');
  jsx = jsx.replace(/<meta([^>]*[^/])>/g, '<meta$1 />');
  jsx = jsx.replace(/<link([^>]*[^/])>/g, '<link$1 />');
  jsx = jsx.replace(/<source([^>]*[^/])>/g, '<source$1 />');
  
  // Quick style fixes
  jsx = jsx.replace(/style="margin-bottom:32px"/g, "style={{ marginBottom: '32px' }}");
  jsx = jsx.replace(/style="max-width:none; margin-bottom:16px"/g, "style={{ maxWidth: 'none', marginBottom: '16px' }}");
  jsx = jsx.replace(/style="max-width:none; margin-bottom:24px"/g, "style={{ maxWidth: 'none', marginBottom: '24px' }}");
  jsx = jsx.replace(/style="display:none"/g, "style={{ display: 'none' }}");
  jsx = jsx.replace(/style="display:none;"/g, "style={{ display: 'none' }}");
  jsx = jsx.replace(/style="min-height:150px"/g, "style={{ minHeight: '150px' }}");
  jsx = jsx.replace(/style="font-family:var\(--font-heading\); font-size:1.8rem; margin-bottom:8px;"/g, "style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', marginBottom: '8px' }}");
  jsx = jsx.replace(/style="color:var\(--text-secondary\); margin-bottom:24px;"/g, "style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}");
  jsx = jsx.replace(/style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;"/g, "style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}");
  
  // HTML comments inside JSX need to be {/* ... */}
  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

  return jsx;
}

try {
  // Convert index.html to Home.jsx
  const indexHtml = fs.readFileSync('../index.html', 'utf8');
  const bodyMatch = indexHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    let bodyContent = bodyMatch[1];
    bodyContent = bodyContent.replace(/<script[\s\S]*?<\/script>/g, '');
    bodyContent = bodyContent.replace(/<style>[\s\S]*?<\/style>/g, '');
    
    const jsxBody = convertHtmlToJsx(bodyContent);
    const homeJsx = `import React, { useEffect } from 'react';\n\nexport default function Home() {\n  return (\n    <>\n      ${jsxBody}\n    </>\n  );\n}\n`;
    fs.mkdirSync('./src/pages', { recursive: true });
    fs.writeFileSync('./src/pages/Home.jsx', homeJsx);
    console.log('Created Home.jsx');
  }

  // Convert admin.html to Admin.jsx
  const adminHtml = fs.readFileSync('../admin.html', 'utf8');
  const adminBodyMatch = adminHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (adminBodyMatch) {
    let adminBodyContent = adminBodyMatch[1];
    adminBodyContent = adminBodyContent.replace(/<script[\s\S]*?<\/script>/g, '');
    
    // Extract head style
    const styleMatch = adminHtml.match(/<style>([\s\S]*?)<\/style>/i);
    if (styleMatch) {
      fs.mkdirSync('./src/css', { recursive: true });
      fs.writeFileSync('./src/css/admin.css', styleMatch[1]);
      console.log('Created admin.css');
    }
    
    const jsxAdminBody = convertHtmlToJsx(adminBodyContent);
    const adminJsx = `import React, { useEffect } from 'react';\nimport '../css/admin.css';\n\nexport default function Admin() {\n  return (\n    <>\n      ${jsxAdminBody}\n    </>\n  );\n}\n`;
    fs.writeFileSync('./src/pages/Admin.jsx', adminJsx);
    console.log('Created Admin.jsx');
  }
} catch (e) {
  console.error(e);
}
