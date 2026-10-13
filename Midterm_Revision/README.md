# ARTI 403 · Image Processing — Midterm Revision

An interactive, bilingual (English / Arabic) study website covering Lectures 1–8 of the Image Processing course. It turns the lecture slides into visual explanations, live demos and exam practice.

## 🌐 Live Website

**https://batoolashour.github.io/ARTI403-Image-Processing/Midterm_Revision/**

## ✨ Key Features

- **8 chapters**: from image fundamentals to intensity transforms, spatial and frequency filtering, colour, and restoration
- **77 interactive visuals**: filters, histograms, FFTs, noise and colour models, all computed live in the browser. You can try them on your own photo.
- **Arabic toggle**: an Arabic explanation can be shown under every concept, or hidden for an English-only layout
- **Mind maps** that you can zoom and expand for every chapter
- **136 MCQs** with instant feedback and explanations, plus **50 essay questions** with model answers
- **Exam notes**, a **formula sheet**, **quick revision**, and a timed **mock midterm**
- **Search** across all chapters, in English and Arabic
- **Progress tracking** saved in your browser (`localStorage`)
- Responsive light and dark design for laptop, tablet and phone

## 🚀 Run Locally

No build step is needed. Open `index.html`, or start a local server in this folder:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## 🗂 Structure

```
Midterm_Revision/
├── index.html
└── assets/
    ├── css/style.css
    └── js/   core/ (engine, UI, mind map) · vis/ (demos) · data/ (chapter content) · app.js
```

Deployment is handled by `.github/workflows/deploy-midterm-revision.yml` at the repository root. Every push that changes this folder redeploys the site.

---
Content is based on the course lecture slides (adapted from Gonzalez & Woods, *Digital Image Processing*, 4th ed.). All figures are re-created programmatically.
