# DefySwarm — Landing Page

Modern, responsive landing page for DefySwarm: Out-of-band Cloud Object Storage Ransomware & AI Swarm Defense.

## Tech Stack

- **React 19**
- **Vite 8**
- **Tailwind CSS 4**
- **TypeScript**

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build

```bash
npm run build
```

The production assets will be generated in the `dist/` directory.

### 4. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
├── index.html              # Entry HTML document
├── package.json            # Scripts & frontend dependencies
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
├── public/                 # Static assets (fonts, brand logos)
│   └── assets/
│       ├── brand/
│       │   └── defyswarm-logo.png
│       └── fonts/
│           ├── DM-Sans-OFL.txt
│           ├── dm-sans-latin.woff2
│           └── dm-sans-latin-ext.woff2
└── src/
    ├── main.tsx            # Application entrypoint
    ├── App.tsx             # Root component
    ├── index.css           # Global typography & landing styles
    ├── context/
    │   └── ConsoleContext.tsx # Page routing types
    ├── components/
    │   ├── BrandLogo.tsx              # SVG brand logo component
    │   ├── LandingDocsSheet.tsx       # Quickstart, Scope & Roadmap modal sheet
    │   └── LandingWorkflowSection.tsx # Interactive workflow replay & telemetry log
    └── views/
        └── LandingPage.tsx            # Main landing page view
```
