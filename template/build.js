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