# CLI Minisite

Terminal-style conference website. Edit one Markdown file, get a working site.

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
- 🚀 Automated build and deployment with GitHub Actions

### Direct URLs

You can also access sections directly:
- `#/about`
- `#/program`
- `#/venue`
- `#/hotels`

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

</details>

<details>
<summary><h2>Setup</h2></summary>

### Enable GitHub Pages

1. Go to **Settings** → **Pages**
2. Source: **GitHub Actions**
3. Push changes to trigger deployment

### Local Development

```bash
npm install
npm run build
```

</details>
