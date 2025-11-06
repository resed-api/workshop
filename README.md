# CLI Conference Minisite

*Terminal-style conference website. Edit one Markdown file, get a working site.*

Source repository: [`cli-minisite`](https://github.com/pdaengeli/cli-minisite)

## Quick Start

1. **Edit config**
   ```bash
   vim config.yml  # Set your conference details
2. **Edit `content.md`** with your conference content
3. **Push to GitHub**
4. GitHub Actions automatically builds and deploys to GitHub Pages

<details>
<summary><h2>Features</h2></summary>

- 🖥️ Terminal-style interface with command prompt
- 📝 Single Markdown file drives all content
- 🔗 Direct URL access with hash routing
- 📱 Mobile-friendly with fallback navigation
- 📥 All contents printable/downloadable in document form
- 🚀 Automated build and deployment with GitHub Actions

### Direct URLs

You can also access sections directly:
- `#/about`
- `#/program`
- `#/venue`
- `#/hotels`

</details>


## Setting Up a Conference Site

### How to

Setting up an instance is based on including the template as subtree. Follow the script below to get started.

<details>
<summary><h2>Script</h2></summary>

```bash
# 1. Create a new repository for your conference
mkdir my-conference-2026
cd my-conference-2026
git init

# 2. Create your configuration files
cat > config.yml << 'EOF'
# Conference Configuration
conference:
  title: "My Conference 2026"
  subtitle: "Conference subtitle"
  # ... (copy structure from example-config.yml)
EOF

cat > content.md << 'EOF'
## About
Conference description here...

## Program
Conference program details...
EOF

# 3. Add the template as a Git subtree
git remote add cli-template https://github.com/pdaengeli/cli-minisite.git
git fetch cli-template main
git read-tree --prefix=template -u cli-template/main:template

# 4. Create root package.json
cat > package.json << 'EOF'
{
  "name": "my-conference-2026",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "cd template && npm install && node build.js"
  }
}
EOF

# 5. Add .gitignore
cat > .gitignore << 'EOF'
# Generated files
index.html
config.js
sections.json
temp.md
node_modules/
template/node_modules/
*.backup
*.bak
EOF

# 6. Build and test locally
npm run build

# 7. Commit and push
git add -A
git commit -m "Initial conference site setup"
git remote add origin <your-repo-url>
git push -u origin main
```

### File Structure

```
your-conference-repo/
├── config.yml              # Conference configuration
├── content.md              # Conference content (markdown)
├── package.json            # Build script delegator
├── .gitignore              # Ignore generated files
└── template/               # Template files (via subtree)
    ├── build.js
    ├── css/
    ├── js/
    └── package.json
```

</details>

### Enable GitHub Pages

Before or immediately after your first push, enable GitHub Pages:

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The site will build and deploy automatically on every push to `main`

### Updating the Template

To pull template updates (CSS, JS, build system) without touching your conference content:

```bash
git subtree pull --prefix template cli-template main --squash
```

**Only edit:** `config.yml` and `content.md`. The template directory is managed via Git subtree.

<details>
<summary><h2>Extend the minisite</h2></summary>

Creating new sections, e.g. for registration or calls for contributions, requires two short steps:

* Add the new section(s) to `config.yml`

  ```diff
  +   - id: "cfp"
  +     label: "CFP"
  +     icon: "📣"
  +   - id: "register"
  +     label: "Register"
  +     icon: "✍️"
  ```

* Add sections with corresponding titles to `content.md`

  ```diff
  + ## Register
  + 
  + Registration for API Editions 2026 will open on **January 15, 2026**.
  ```

</details>

<details>
<summary><h2>Commands</h2></summary>

Type these commands in the terminal:

- `about` - Conference information
- `clear` - Clear the terminal
- `help` - Show all available commands
- `home` - Clear the terminal
- `hotels` - Accommodation information
- `program` - Schedule and talks
- `venue` - Location details

The set of available commands depends on the sections defined in the configuration and content files.

</details>

<details>
<summary><h2>Local Development</h2></summary>

### Initial Setup

Make sure you have **Pandoc** installed.

1. **Add the template remote** (only needed once):

```bash
git remote add cli-template https://github.com/pdaengeli/cli-minisite.git
git fetch cli-template main
```

2. **Create a `package.json` file in your repository root:**

```json
{
  "name": "your-conference-name",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "build": "cd template && npm install && node build.js"
  }
}
```

### During development

3. **Build and run:**

```bash
npm install
npm run build
```

4. **Serve locally:**

```bash
python -m http.server 8000
# Or: npx http-server -p 8000
```

Then open http://localhost:8000

### Making Changes

Edit conference content and rebuild:

```bash
vim content.md      # Edit content
vim config.yml      # Edit configuration
npm run build       # Rebuild the site
```

Refresh browser to see the changes.

### Updating the Template (alternative to the `subtree` command given above)

When there are updates to the template (CSS, JS, build system), it makes sense to update the local copy:

```bash
# Backup current template
cp -r template template.backup

# Download the latest template
curl -L https://github.com/pdaengeli/cli-minisite/archive/refs/heads/main.tar.gz | tar xz

# Copy the updated template directory
cp -r cli-minisite-main/template/* template/

# Clean up
rm -rf cli-minisite-main

# Rebuild with the new template
npm run build
```

**Note:** GitHub Actions automatically uses the latest template when building, so local template updates are optional.

### Optional: PDF generation at build time

The build creates a PDF reflecting the whole `content.md` if the Pandoc instance has access to LaTeX. In the GitHub action this is not set up for performance reasons.

Add it in an additional step if needed for the conference page:

```yaml
- name: Install LaTeX for PDF generation
  run: |
    sudo apt-get update
    sudo apt-get install -y texlive-xetex texlive-fonts-recommended texlive-latex-extra
```

The build will take ca. 3 minutes longer and create a considerably more voluminous artifact.

</details>

