# SOW Workbench v2.0.0

A comprehensive Statement of Work management tool for Antenna Group. Draft new SOWs from client call transcripts or review existing SOWs against agency quality standards.

## What's New in v2.0.0

### Enhanced Semantic Trigger Detection
The AI now uses sophisticated semantic analysis to identify client needs, not just keyword matching. It understands:
- **Pain points**: Problems expressed through frustration, complaints, challenges
- **Ambitions**: Goals expressed through "we want to", "our goal is", aspirational language
- **Situational triggers**: Business events like mergers, launches, new leadership, funding
- **Performance gaps**: Declining metrics, competitive losses, ROI questions
- **Resource constraints**: Team capacity issues, expertise gaps, time pressure

### Expanded Service Categories (23 categories)
Now includes comprehensive coverage of all agency service lines:
- Website & App Development
- Integrated Marketing Strategy
- Brand Strategy & Identity
- Creative Production
- Influencer Marketing
- Creative Campaigns & Platforms
- Public Relations
- Media Outreach (Proactive & Reactive)
- Executive Visibility & Thought Leadership
- Paid Social Media
- SEO
- Generative Engine Optimization (GEO)
- Measurement & Analytics
- Go-to-Market Strategy
- Event Planning & Production
- Communications Training
- Impact Report Writing & Design
- Content Ideation & Production
- Performance Marketing & Optimization
- Brand & Marketing Assessments
- Plus enhanced versions of original categories

### Comprehensive SOW Assessment Framework
The review engine now checks against a much more detailed framework including:
- All 12 essential SOW components with specific requirements
- Language quality standards with 25+ red flag patterns
- Contract-type specific requirements (Fixed Fee, T&M, T&M with Cap, Retainer)
- Service-line specific checklists
- Scope creep prevention mechanisms
- Detailed acceptance criteria and client responsibility patterns

### Trigger Intensity Detection
AI now identifies urgency level:
- **High Intensity**: Board priorities, revenue impact, competitive threats, hard deadlines
- **Medium Intensity**: Roadmap items, exploration mode, planning phase
- **Low Intensity**: Curiosity, future consideration

### Combined Trigger Pattern Recognition
Recognizes common service combinations:
- Launch scenarios → GTM, PR, creative, paid social, website
- Brand transformation → brand strategy, website, creative, integrated
- Growth mode → SEO, performance marketing, content, measurement
- Awareness building → PR, media outreach, executive visibility, content

## Features

### Draft Mode (Create New SOWs)
- Paste client call transcripts for AI analysis
- Automatic extraction of: success criteria, problem statements, mandatories, timeline, budget signals, stakeholders, context
- Smart service category recommendations based on semantic analysis
- Customizable service selection with expandable categories
- Complete SOW generation following Antenna Group standards
- Engagement-type specific guidance (Fixed Fee, T&M, T&M with Cap, Retainer)
- Download as branded Word document

### Review Mode (Assess Existing SOWs)
- Upload PDF, DOCX, or text files
- Comprehensive assessment against quality framework
- Categorized feedback: Critical Issues, Recommended Improvements, Red Flags
- Service-line compliance checking
- Budget verification
- Generate revised drafts incorporating all fixes
- Download revised versions as Word documents

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Claude API (Anthropic) - Sonnet 4
- docx library for Word document generation

## Local Development

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd sow-reviewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## Deployment to Vercel

See DEPLOYMENT.md for step-by-step instructions.

## Usage

### Drafting a New SOW
1. Enter your Anthropic API key
2. Select engagement type (Fixed Fee, T&M, T&M with Cap, or Retainer)
3. Add any notes from the account team (optional)
4. Paste the client call transcript
5. Click "Analyze Transcript"
6. Review detected service categories and adjust selections as needed
7. Click "Generate SOW Draft"
8. Download the Word document

### Reviewing an Existing SOW
1. Enter your Anthropic API key
2. Upload your SOW document (PDF, DOCX, or TXT)
3. Select the engagement type
4. Click "Analyze SOW"
5. Review the structured feedback
6. Optionally generate a revised draft
7. Download the revised Word document

## Assessment Framework Overview

### Universal Requirements (All SOWs)
- Decimal numbering structure (1.1, 1.1.1, etc.)
- Explicit completion criteria for each deliverable
- Controlled language (no vague qualifiers)
- Deliverable structure (activities, outputs, assumptions)
- Client responsibilities with consequences
- Master assumptions with contingencies
- Explicit scope exclusions
- Change management process

### Contract-Type Requirements

**Fixed Fee**
- Exhaustive scope definition
- Revision limits
- Strong assumptions section
- Change order process
- Deemed acceptance provisions

**Time & Materials**
- Complete rate schedule
- Initial estimate (not cap)
- Notification thresholds
- Reporting requirements

**T&M with Cap**
- Cap tied to scope
- Work stoppage rights
- Cap adjustment mechanisms
- Assumption protection

**Retainer**
- Minimum term
- Hour/deliverable allocation
- Rollover policy
- Overage handling
- Utilization reporting

### Service-Line Specific
- **Branding**: Phase gates, concept counts, brand components, file formats
- **Website**: Technical specs, content responsibility, browser compatibility, warranty
- **PR/Comms**: Pitch quantities, media lists, reporting cadence, crisis exclusions
- **Creative Retainer**: Hour allocation, rollover, SLAs, rate card
- **Integrated**: Workstream dependencies, coordination, single accountability

## Red Flag Language Patterns

The tool flags and suggests replacements for:
- "As needed" → bounded quantities with "up to"
- "Ongoing" → defined term limits
- "Reasonable" → specific definitions
- "Unlimited" → capped quantities
- "Best efforts" → measurable criteria
- "Various" → enumerated items
- "Regular" → specified frequency
- And 15+ more patterns

## Version History

### v2.1.7 (Current)
- Added guidance for deposit-based minimum commitment retainers vs traditional hourly allocation retainers
- AI now correctly understands that "minimum commitment held as deposit" is a FLOOR, not a ceiling
- AI will not incorrectly suggest "up to" language for deposit amounts
- AI will not incorrectly suggest rollover policies for deposit-based retainers
- Updated Creative Retainers and Retainer Contracts sections in assessment framework
- Added explicit rule in review prompt to handle deposit-based retainer language correctly

### v2.1.6
- Word documents now use proper Word numbering instead of text-based numbers
- Multi-level decimal numbering (1., 1.1, 1.1.1, etc.) uses native Word list styles
- Numbering is editable in Word - add/remove items and numbers update automatically
- Bullet lists also use native Word bullet styles
- Improved SOW content parsing to detect numbering levels accurately
- [REVISED] and [NEW] markers styled as italic gray annotations

### v2.1.5
- Added checkboxes to each recommendation (Critical, Recommended, Red Flags)
- All recommendations selected by default (opt-out model)
- Added "Select All / Deselect All" toggle for each section
- Selection summary shown in Generate Revised SOW panel
- Generate Draft button disabled when no recommendations selected
- Deselected items appear faded/grayed out
- Only selected recommendations are passed to SOW generation

### v2.1.4
- Renamed "Service-Line Compliance" to "Structural Compliance"

### v2.1.3
- Fixed section parsing to handle markdown formatting (##, **, etc.)
- parseSection now accepts multiple possible header formats
- IssueCard now strips markdown bold markers before parsing
- Improved regex patterns for Current/Recommended extraction
- Fixed duplicate code issue in IssueCard component
- Section headers like "## CRITICAL ISSUES" now correctly detected

### v2.1.1
- Fixed issue where "missing element" recommendations were showing unrelated "Current" text
- AI now distinguishes between two types of issues:
  - **Language Issues**: Existing text that needs improvement (shows Current → Recommended)
  - **Missing Elements**: Required sections that don't exist (shows "Add This Language" only)
- Updated IssueCard component to render both issue types appropriately
- Improved prompt clarity for SOW review output formatting

### v2.1.0
- Enhanced semantic trigger detection with 5 trigger types per service category
- Added performance triggers for metrics-based need detection
- Added trigger intensity detection (High/Medium/Low urgency)
- Improved AI prompts for better semantic matching
- Added version number display on homepage

### v2.0.0
- Enhanced semantic trigger detection
- 23 service categories with detailed trigger patterns
- Comprehensive SOW assessment framework
- Engagement-type specific guidance
- Combined trigger pattern recognition

### v1.0.0
- Initial release
- Basic SOW review functionality
- Simple trigger matching
- Word document generation

## License

Internal use only - Antenna Group
