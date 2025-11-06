const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

// All paths relative to root (parent of template/)
const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'config.yml');
const contentPath = path.join(rootDir, 'content.md');
const exampleConfigPath = path.join(rootDir, 'example-config.yml');
const exampleContentPath = path.join(rootDir, 'example-content.md');
const tempPath = path.join(rootDir, 'temp.md');
const outputSections = path.join(rootDir, 'sections.json');
const outputConfig = path.join(rootDir, 'config.js');
const outputHtml = path.join(rootDir, 'index.html');

console.log('Starting build process...');

// Check if config.yml exists, if not copy from example
if (!fs.existsSync(configPath)) {
    if (fs.existsSync(exampleConfigPath)) {
        console.log('⚠ config.yml not found, using example-config.yml');
        fs.copyFileSync(exampleConfigPath, configPath);
    } else {
        console.error('✗ Error: config.yml not found and no example-config.yml available');
        process.exit(1);
    }
}

// Check if content.md exists, if not copy from example
if (!fs.existsSync(contentPath)) {
    if (fs.existsSync(exampleContentPath)) {
        console.log('⚠ content.md not found, using example-content.md');
        fs.copyFileSync(exampleContentPath, contentPath);
    } else {
        console.error('✗ Error: content.md not found and no example-content.md available');
        process.exit(1);
    }
}

// Read config
const config = yaml.load(fs.readFileSync(configPath, 'utf-8'));
console.log(`Building site for: ${config.conference.title}`);

// Read content.md
const content = fs.readFileSync(contentPath, 'utf-8');

// Split by h2 headers
const sections = {};
const lines = content.split('\n');
let currentSection = null;
let currentContent = [];

for (const line of lines) {
    if (line.startsWith('## ')) {
        // Save previous section
        if (currentSection) {
            sections[currentSection] = currentContent.join('\n');
        }
        // Start new section
        currentSection = line.substring(3).trim().toLowerCase();
        currentContent = [];
    } else if (currentSection) {
        currentContent.push(line);
    }
}

// Save last section
if (currentSection) {
    sections[currentSection] = currentContent.join('\n');
}

// Convert each section to HTML using Pandoc
const htmlSections = {};

for (const [key, markdown] of Object.entries(sections)) {
    try {
        // Write temp markdown file
        fs.writeFileSync(tempPath, markdown);
        
        // Convert with Pandoc
        const html = execSync(`pandoc "${tempPath}" -f markdown -t html`).toString();
        htmlSections[key] = html;
        
        console.log(`✓ Converted section: ${key}`);
    } catch (error) {
        console.error(`✗ Error converting section ${key}:`, error.message);
        htmlSections[key] = `<p>${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    }
}

// Clean up temp file
if (fs.existsSync(tempPath)) {
    fs.unlinkSync(tempPath);
}

// Write sections.json
fs.writeFileSync(outputSections, JSON.stringify(htmlSections, null, 2));
console.log('✓ Generated sections.json');

// Generate printable HTML version (always works)
generatePrintableHTML(config, htmlSections);

// Generate PDF from content.md (optional, requires LaTeX)
generatePDF();

// Generate config.js for frontend
const configJs = `// Auto-generated configuration
window.CONFERENCE_CONFIG = ${JSON.stringify(config, null, 2)};
`;
fs.writeFileSync(outputConfig, configJs);
console.log('✓ Generated config.js');

// Generate index.html from template
generateIndexHtml(config);

console.log('\n✓ Build complete!');

function generateIndexHtml(config) {
    // Safely escape for HTML
    const asciiArt = (config.ascii_art || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${config.site.description}">
    <meta name="author" content="${config.site.author}">
    <title>${config.conference.title} - ${config.conference.subtitle}</title>
    <link rel="stylesheet" href="template/css/style.css">
    <link rel="stylesheet" href="template/css/print.css" media="print">
</head>
<body>
    <!-- Persistent Menu -->
    <nav class="top-nav">
        <div class="nav-left">
            <button class="nav-btn nav-btn-home" data-cmd="home">🏠 Home</button>
            ${config.sections.map(section => 
                `<button class="nav-btn" data-cmd="${section.id}">${section.icon} ${section.label}</button>`
            ).join('\n            ')}
	    <button class="nav-btn" data-cmd="download">📥 Save</button>
            <button class="nav-btn" data-cmd="help">❓ Help</button>
            <button class="nav-btn" data-cmd="clear">🗑️ Clear</button>
        </div>
        <div class="nav-right">
            <button id="theme-toggle" class="nav-btn" title="Change theme">🎨 Theme</button>
            <div id="theme-menu" class="hidden">
                ${config.themes.map(theme => 
                    `<button data-theme="${theme.id}">${theme.name}</button>`
                ).join('\n                ')}
            </div>
        </div>
    </nav>
    
    <div id="terminal">
        <!-- ASCII Art Title -->
        <pre id="ascii-title" class="ascii-art">${asciiArt}</pre>

        <!-- Mobile Title (shown on mobile instead of welcome box) -->
        <div class="mobile-title hidden" id="mobile-title">
            <h1>${config.conference.title}</h1>
            <p class="subtitle">${config.conference.subtitle}</p>
            <p class="dates">${config.conference.date} | ${config.conference.location}</p>
            <div class="mobile-instructions">
                <p>👆 Use the buttons above to navigate</p>
                <p>💬 Or type commands below</p>
            </div>
        </div>

        <div id="output"></div>
        
        <!-- Content Display Area -->
        <div id="content-display" class="hidden"></div>
        
        <!-- Enhanced Prompt -->
        <div class="input-line">
            <span class="prompt" id="prompt-text">${config.terminal.username}@${config.terminal.hostname}:~$</span>
            <input type="text" id="command-input" placeholder="Type a command (try 'help' or press TAB)..." autofocus autocomplete="off" spellcheck="false">
        </div>
    </div>
    
    <script src="config.js"></script>
    <script src="template/js/app.js"></script>
</body>
</html>`;

    fs.writeFileSync(outputHtml, template);
    console.log('✓ Generated index.html from config');
}

function generatePrintableHTML(config, sections) {
    const allContent = Object.entries(sections)
        .map(([key, html]) => {
            const section = config.sections.find(s => s.id === key);
            const label = section ? section.label : key;
            return `<section><h1>${label}</h1>${html}</section>`;
        })
        .join('\n');
    
    // Get current date in DD-MM-YYYY format
    const now = new Date();
    const generatedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    
    // Format conference dates
    const conferenceDate = config.dates?.start && config.dates?.end 
        ? `${config.dates.start} to ${config.dates.end}`
        : config.dates?.year || 'TBA';
    
    // Get source URL from config (fallback to website or repository)
    const sourceUrl = config.contact?.website || config.contact?.repository || 'https://yourconference.com';
    
    const printHtml = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${config.conference.title} - Full Program</title>
    <link rel="stylesheet" href="template/css/print.css">
    <style>
        body { 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        section { page-break-after: always; }
        h1 { color: #333; margin-top: 2em; }
        .conference-header {
            text-align: center;
            margin-bottom: 3em;
            padding-bottom: 1em;
            border-bottom: 2px solid #333;
        }
        .conference-header h1 { margin-top: 0; }
        
        /* Image normalization for print */
        .content-body img {
            max-height: 120px !important;
            max-width: 450px !important;
            width: auto !important;
            height: auto !important;
            object-fit: contain;
            vertical-align: middle;
            margin: 10px;
        }
        
        /* Group images on the same line nicely */
        .content-body p {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }
        
        /* If a paragraph has only images, center them */
        .content-body p:has(img):not(:has(:not(img):not(br))) {
            text-align: center;
        }
        
        /* Table styling - clean and professional */
        .content-body table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5em 0;
            page-break-inside: avoid;
        }
        
        .content-body table td,
        .content-body table th {
            border: 1px solid #000;
            padding: 8px 12px;
            text-align: left;
        }
        
        .content-body table th {
            background-color: #f0f0f0;
            font-weight: bold;
        }
        
        /* Alternate row colors for better readability */
        .content-body table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .content-body table tr:nth-child(odd) {
            background-color: #ffffff;
        }
        
        .document-footer {
            margin-top: 3em;
            padding-top: 1em;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 0.85em;
            color: #666;
            page-break-inside: avoid;
        }
        #qrcode {
            margin-top: 1em;
            display: inline-block;
        }
        #qrcode img {
            display: block;
            margin: 0 auto;
        }
        
        @media print {
            .document-footer {
                position: fixed;
                bottom: 0;
                width: 100%;
                background: white;
            }
            
            /* Ensure images and tables don't break across pages */
            .content-body img,
            .content-body table {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="conference-header">
        <h1>${config.conference.title}</h1>
        <h2>${config.conference.subtitle}</h2>
        <p>${conferenceDate} | ${config.venue?.city || config.conference.location || ''}</p>
    </div>
    ${allContent}
    <div class="document-footer">
        <p>${config.conference.title} — ${conferenceDate} — Generated on ${generatedDate} from <span id="source-url">${sourceUrl}</span></p>
        <div id="qrcode"></div>
        <p><small>Scan for latest updates</small></p>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
    <script>
        // Update URL to current page URL when opened
        const actualUrl = window.location.origin + window.location.pathname.replace('/print.html', '');
        document.getElementById('source-url').textContent = actualUrl;
        
        // Generate QR code with actual URL
        var qr = qrcode(0, 'M');
        qr.addData(actualUrl);
        qr.make();
        document.getElementById('qrcode').innerHTML = qr.createImgTag(3, 8);
    </script>
</body>
</html>`;
    
    fs.writeFileSync(path.join(rootDir, 'print.html'), printHtml);
    console.log('✓ Generated print.html with QR code');
}

function generatePDF() {
    const pdfPath = path.join(rootDir, 'conference-content.pdf');
    
    // Get current date in DD-MM-YYYY format
    const now = new Date();
    const generatedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    
    // Format conference dates
    const conferenceDate = config.dates?.start && config.dates?.end 
        ? `${config.dates.start} to ${config.dates.end}`
        : config.dates?.year || 'TBA';
    
    // Get source URL from config
    const sourceUrl = config.contact?.website || config.contact?.repository || 'https://yourconference.com';
    
    // Create footer text (escape for LaTeX)
    const footerText = `${config.conference.title} — ${conferenceDate} — Generated on ${generatedDate} from ${sourceUrl}`
        .replace(/&/g, '\\&')
        .replace(/_/g, '\\_');
    
    try {
        console.log('Attempting to generate PDF...');
        
        // Pandoc with custom footer using fancyhdr
        const pandocCmd = `pandoc "${contentPath}" -o "${pdfPath}" \
            --pdf-engine=xelatex \
            -V geometry:margin=1in \
            -V colorlinks=true \
            -V title="${config.conference.title}" \
            -V date="${conferenceDate}" \
            -V header-includes="\\\\usepackage{fancyhdr}\\\\pagestyle{fancy}\\\\fancyfoot[C]{\\\\small\\\\textit{${footerText}}}"`;
        
        execSync(pandocCmd, { stdio: 'pipe' });
        console.log('✓ Generated conference-content.pdf');
    } catch (error) {
        console.warn('⚠ PDF generation skipped (LaTeX not available)');
        console.warn('  Install with: brew install --cask mactex (macOS)');
        console.warn('  Download command will use print.html instead');
    }
}
