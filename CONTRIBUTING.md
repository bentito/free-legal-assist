# Contributing to LexHarness

Welcome to **LexHarness**! Our goal is to give solo practitioners, public defenders, legal aid attorneys, and small law firms a safe, practical way to use AI in their daily legal work.

**You do not need to know how to code to contribute to this project.** In fact, some of the most important improvements come directly from practicing lawyers, paralegals, and legal writers who know what actually happens in courtrooms and law offices.

---

## For Lawyers, Paralegals & Legal Professionals

The hardest part of building legal tools isn't the software—it's getting the law, the procedure, and the day-to-day workflow right. Here is how you can help shape LexHarness:

### 1. Share Practice-Area & Local Court Workflows
Every practice area and jurisdiction has its own rules, standard motions, and pitfalls. We want LexHarness to support more practices out of the box. You can propose:
- **New Practice Profiles**: Family law, immigration, eviction defense, estate planning, employment law, personal injury, or commercial contracts.
- **State & Local Court Rules**: Specific constitutional doctrines, rules of civil or criminal procedure, local citation formats, and standard briefing structures for your state or forum.

### 2. Improve the "Second-Chair" & Opposing Counsel Reviews
When LexHarness reviews a draft, it looks for unsupported citations and anticipates arguments from opposing counsel. You can help us sharpen those reviews:
- What are the first five things you check when reviewing a junior associate's motion or brief?
- What common traps or waiver issues should the reviewer flag in your area of practice?

### 3. Tell Us What Slows You Down
- What repetitive drafting, discovery review, or chronology tasks eat up your unbilled or evenings/weekend hours?
- Where have consumer chatbots let you down or produced work you couldn't trust?

### How Lawyers Can Submit Ideas
- **Open a Feature Request**: Click the [**Issues**](../../issues) tab at the top of this GitHub page, click **New Issue**, and choose **Feature or Practice Idea**. Write in plain English—just as you would explain a task to a colleague or law clerk.

---

## For Software Developers

If you are a developer who wants to help build free, practical tools for solo and small-firm lawyers, we'd love your help.

### What You Should Know First
Lawyers don't want complicated technical knobs or engineering jargon in their workspace. Every change to LexHarness should prioritize:
1. **Clarity & Simplicity**: Use plain legal terms (matters, dockets, exhibits, redlines, peer review)—never expose internal technical jargon in the interface.
2. **Client Confidentiality**: Keep case files, notes, and drafts stored locally on the user's computer.
3. **Reliability**: A lawyer must be able to see exactly which page or exhibit a factual claim comes from.

### Setting Up Your Development Environment

1. **Prerequisites**:
   - [Node.js](https://nodejs.org/) (v20+)
   - Git

2. **Install & Run Locally**:
   ```bash
   git clone https://github.com/bentito/free-legal-assist.git
   cd free-legal-assist
   npm install
   npm run dev
   ```

3. **Run Checks Before Submitting Changes**:
   ```bash
   npm run typecheck
   npm test
   ```

### Submitting Changes
1. Check existing [**Issues**](../../issues) or open a new one to discuss what you'd like to build or fix.
2. Create a branch for your work (`git checkout -b fix/short-description`).
3. Make sure tests pass (`npm test`) and the app runs cleanly (`npm start`).
4. Open a Pull Request describing what you changed and how it helps practitioners.

---

Thank you for helping make trustworthy legal AI accessible to every practitioner!
