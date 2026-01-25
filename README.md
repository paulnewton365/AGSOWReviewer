# SOW Workbench

**Version 2.1.0**

A comprehensive Statement of Work tool for Antenna Group that helps draft new SOWs from client calls and review existing SOWs against quality standards.

## Features

### Draft Mode (Create New SOWs)
- **Intelligent Transcript Analysis**: Paste client call transcripts and AI identifies key requirements, success criteria, timelines, and stakeholders
- **Semantic Service Detection**: Recognizes client needs through multiple trigger types:
  - Direct triggers (explicit requests)
  - Indirect signals (related problems implying needs)
  - Situational triggers (business events like mergers, launches)
  - Performance triggers (metrics and outcomes)
  - Natural language patterns (how clients actually express needs)
- **Trigger Intensity Detection**: Identifies urgency level (High/Medium/Low)
- **Smart Service Recommendations**: Auto-suggests relevant services based on detected needs
- **Professional SOW Generation**: Creates properly structured SOWs with decimal numbering, "up to" language, completion criteria

### Review Mode (Assess Existing SOWs)
- **Document Support**: Upload PDF, DOCX, or plain text SOW documents
- **Engagement Type Assessment**: Specialized criteria for Branding, Website, PR/Communications, Creative Retainer, and Integrated engagements
- **Comprehensive Analysis**: 
  - Critical issues that must be fixed
  - Recommended improvements
  - Red flag language detection with replacement suggestions
  - Service-line compliance checking
  - Budget verification
- **Revised Draft Generation**: Creates updated SOW incorporating all recommended fixes
- **Word Document Export**: Download as branded .docx files

## Service Categories (31 total)

The app recognizes needs across all major marketing service areas:
- Website & App Development
- Integrated Marketing Strategy
- Brand Strategy & Identity
- Creative Production
- Influencer Marketing
- Creative Campaigns & Platforms
- Public Relations
- Media Outreach
- Executive Visibility & Thought Leadership
- Paid Social Media
- Search Engine Optimization (SEO)
- Generative Engine Optimization (GEO)
- Measurement & Analytics
- Go-to-Market Strategy
- Event Planning & Production
- Communications Training
- Impact Report Writing & Design
- Content Ideation & Production
- Performance Marketing & Optimization
- Brand & Marketing Assessments
- And more...

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Claude API (Anthropic)
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

### Draft Mode
1. Enter your Anthropic API key
2. Select the engagement type (Fixed Fee, T&M, T&M with Cap, or Retainer)
3. Add any notes from the account team (optional)
4. Paste the client call transcript
5. Click "Analyze Transcript" - AI will extract key info and recommend services
6. Review and adjust selected services
7. Click "Generate SOW Draft"
8. Download as Word document

### Review Mode
1. Enter your Anthropic API key
2. Upload your SOW document (PDF, DOCX, or TXT)
3. Select the engagement type
4. Click "Analyze SOW"
5. Review the structured feedback
6. Optionally generate a revised draft incorporating all fixes
7. Download as Word document

## Assessment Framework

The tool checks SOWs against comprehensive criteria including:

### Universal Requirements
- Decimal numbering structure
- Completion criteria for each deliverable
- Controlled language (no red flag phrases like "unlimited", "as needed", "ongoing")
- Deliverable structure (activities, outputs, assumptions)
- Client responsibilities (consolidated feedback, approval windows, change control)
- Master assumptions (scope boundaries, revision limits, pause/termination)
- Explicit scope exclusions
- Budget alignment

### Contract Type Specific
- **Fixed Fee**: Exhaustive scope, revision limits, strong assumptions
- **T&M**: Rate schedule, estimates, notification thresholds
- **T&M with Cap**: Cap-scope linkage, work stoppage rights
- **Retainer**: Term commitment, utilization management, rollover policy

### Service-Line Specific
- **Branding**: Phase gates, creative territories, brand components
- **Website**: BRD, page counts, UAT, warranty, hosting
- **PR/Comms**: Retainer structure, rate card, reporting cadence
- **Creative Retainer**: Drawdown, request parameters, SLAs
- **Integrated**: Fee structure, timeline visualization, quarterly planning

## Changelog

### v2.1.0
- Enhanced semantic trigger detection with 5 trigger types per service category
- Added performance triggers for metrics-based need detection
- Added trigger intensity detection (High/Medium/Low urgency)
- Improved AI prompts for better semantic matching
- Added version number display on homepage

### v2.0.0
- Complete redesign with Draft and Review modes
- Enhanced service trigger patterns
- Comprehensive ASSESSMENT_FRAMEWORK
- Word document generation with Antenna branding

### v1.0.0
- Initial release with SOW review functionality

## License

Internal use only - Antenna Group
