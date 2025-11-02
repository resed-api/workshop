const fs = require('fs');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

console.log('Starting build process...');

// Read config
const config = yaml.load(fs.readFileSync('config.yml', 'utf-8'));
console.log(`Building site for: ${config.conference.title}`);

// Read content.md
const content = fs.readFileSync('content.md', 'utf-8');

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
        fs.writeFileSync('temp.md', markdown);
        
        // Convert with Pandoc
        const html = execSync('pandoc temp.md -f markdown -t html').toString();
        htmlSections[key] = html;
        
        console.log(`✓ Converted section: ${key}`);
    } catch (error) {
        console.error(`✗ Error converting section ${key}:`, error.message);
        htmlSections[key] = `<p>${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    }
}

// Clean up temp file
if (fs.existsSync('temp.md')) {
    fs.unlinkSync('temp.md');
}

// Write sections.json
fs.writeFileSync('sections.json', JSON.stringify(htmlSections, null, 2));
console.log('✓ Generated sections.json');

// Generate config.js for frontend
const configJs = `// Auto-generated configuration
window.CONFERENCE_CONFIG = ${JSON.stringify(config, null, 2)};
`;
fs.writeFileSync('config.js', configJs);
console.log('✓ Generated config.js');

// Generate index.html from template
generateIndexHtml(config);

console.log('\n✓ Build complete!');

function generateIndexHtml(config) {
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${config.site.description}">
    <meta name="author" content="${config.site.author}">
    <title>${config.conference.title} - ${config.conference.subtitle}</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/print.css" media="print">
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
        <pre id="ascii-title" class="ascii-art">${config.ascii_art}</pre>

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
    <script src="js/app.js"></script>
</body>
</html>`;

    fs.writeFileSync('index.html', template);
    console.log('✓ Generated index.html from config');
}