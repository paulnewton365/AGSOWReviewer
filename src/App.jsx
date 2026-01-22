import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, AlertCircle, Loader2, ChevronDown, ChevronRight, Key, Eye, EyeOff, ArrowUpRight, Copy, Check, ArrowRight, Download, Sparkles } from 'lucide-react';

// Assessment Framework
const ASSESSMENT_FRAMEWORK = `
# SOW Assessment Framework

## Reference Standards by Engagement Type
- Branding: Switch Energy Alliance SOW (R1000)
- Website: Echogen SOW  
- Integrated: DER Coalition SOW (R9278)
- Creative Retainers: Integrated Creative & Strategic Support Retainer
- PR/Comms: TerraPower UK PR Support SOW

## Part 1: Universal Requirements (Apply to ALL SOWs)

### 1.1 Document Structure and Numbering
- Must use decimal numbering (5.1, 5.1.1, 5.1.1.1) NOT bullet points
- Every deliverable, activity, output, assumption must have unique reference number

### 1.2 Completion Criteria
- Every deliverable must have explicit completion trigger
- Acceptable: approval-based, output-based, time-based, gate-based
- Must have stage gates requiring approval before subsequent phases

### 1.3 Controlled Language - RED FLAGS TO IDENTIFY
Search for and flag these phrases:
- "ad hoc" → replace with quantified support parameters
- "ongoing" → add term limits or define cadence
- "as and when" → specify triggers or quantities
- "as needed" → define scope boundaries
- "various" → enumerate specific items
- "regular" → specify frequency
- "continuous" → define iterations or rounds
- "flexible" → add parameters
- "unlimited" → NEVER use, always cap
- "best efforts" → define success criteria
- "reasonable" → quantify where possible
- "mutually agreed" without default → specify default window

### 1.4 Deliverable Structure
Each deliverable MUST include:
- Activities: What Agency will DO (active voice: "Agency will...")
- Outputs: What Agency will PRODUCE (use "1x" notation with quantities)
- Assumptions: Conditions that must be true for scope/fee to hold

### 1.5 Objectives and Value Articulation
- Must state business outcomes, NOT just activities
- Good: "Establish brand hierarchy and align stakeholders"
- Bad: "Develop brand guidelines" (this is an output, not objective)

### 1.6 Client Responsibilities - MUST INCLUDE ALL:

1. Consolidated Feedback Requirement:
"Client agrees to consolidate all internal feedback before submission to Agency. Feedback must represent unified organizational direction; Agency is not responsible for reconciling conflicting stakeholder input."

2. Approval Windows:
"Client commits to providing feedback within [3-5] business days of deliverable submission"

3. Direction Change Clause:
"If Client requests changes to approved strategic direction after formal approval, such changes constitute new scope and may require a change order"

4. Stakeholder Addition Protection:
"If Client introduces new decision-making stakeholders after project commencement whose input materially alters previously approved direction, resulting rework will be scoped separately"

### 1.7 Master Assumptions - MUST INCLUDE:
- Scope boundaries catch-all: "Any deliverable not explicitly stated is not in scope"
- PM and Account Lead assignment
- Revision limits (typically 2 rounds per deliverable)
- Response time commitments (1-2 business days standard, same-day urgent)
- Business hours definition with timezone
- Production exclusions (photography, video unless added)
- Pause/termination ladder: 10 days → notice → 5 days → pause → 30 days → terminate

### 1.8 Scope Exclusions
- Must have NAMED exclusions list, not just catch-all
- List common adjacent services NOT included

### 1.9 Budget Alignment
- Fee table must match deliverable structure
- All arithmetic must be correct
- Billing schedule must tie to milestones/approval gates
- Contingency shown separately with pre-approval requirement

## Part 2: Service-Line Specific Requirements

### 2.1 BRANDING Engagements
Required elements:
- Phase structure with stage gates (Strategy → Expression)
- Research scope quantified (number of IDIs, workshops)
- Creative territories quantified (e.g., "2 distinct territories")
- Territory selection process (one selected for refinement)
- Brand deliverable components enumerated (manifesto, tone of voice, logo system, design system, taglines, image direction)
- Workshop quantities and purposes specified
- If naming: trademark search disclaimer, Client legal responsibility

### 2.2 WEBSITE Engagements
Required elements:
- BRD (Business Requirements Document) with approval gate before development
- Page/template/component counts specified
- Development platform named (e.g., Webflow)
- Browser/device/language scope specified
- UAT process with approval gate before launch
- 60-day warranty
- Hosting costs: year one included, subsequent annual cost stated
- Content scope with quantities or budget cap
- Design tools specified (e.g., Figma)
- Third-party/domain costs addressed

### 2.3 PR/COMMS Engagements
Required elements:
- Retainer/drawdown structure clear
- Rate card included (all levels)
- Reporting cadence (weekly status, biweekly meetings, budget reports)
- Media deliverables quantified (releases, pitches, monitoring)
- Third-party costs separated (wire distribution)
- Media coverage disclaimer: "Agency cannot guarantee coverage"
- Spokesperson availability commitment
- Approval windows for time-sensitive materials
- If crisis rate: activation process defined

### 2.4 CREATIVE RETAINER Engagements
Required elements:
- Deposit/drawdown structure clear
- Available services listed
- Excluded services explicit (brand strategy requires separate SOW)
- Minimum charge per request (e.g., $225)
- Maximum request value (e.g., $20,000) with escalation path
- Service hours defined
- SLAs: triage within 48 hours, commence within 7-10 business days
- Revision limits stated
- Deemed approval clause
- Deposit terms (non-refundable, no rollover)
- Work-in-progress cancellation terms

### 2.5 INTEGRATED Engagements
Required elements:
- Fee table distinguishes fixed, retainer, and drawdown components
- Timeline visualization shows parallel workstreams
- Quarterly planning governance for ongoing services
- Billing schedule separates milestone payments from recurring fees
- All relevant service-line requirements met for each component
- Dependencies between workstreams clear

## Output Format

Structure your assessment as:

### CRITICAL ISSUES (Must fix before issuing)
For each issue: Section reference, Current language (quote), Issue explanation, Required action, Recommended language

### RECOMMENDED IMPROVEMENTS (Should fix)
For each: Section reference, Current state, Recommendation, Suggested language

### RED FLAGS FOUND
List all instances of problematic phrases with location and replacement

### SERVICE-LINE COMPLIANCE
Check each required element for the engagement type

### BUDGET VERIFICATION
Fee table arithmetic check, Billing schedule alignment check, Deliverable-to-fee mapping check

### OVERALL ASSESSMENT
Compliance score estimate (1-10), Top 3 priorities to address, What's working well
`;

const ENGAGEMENT_TYPES = [
  { value: 'branding', label: 'Branding', description: 'Brand strategy, identity, expression projects' },
  { value: 'website', label: 'Website', description: 'Web design, development, digital experience' },
  { value: 'pr', label: 'PR / Communications', description: 'Media relations, comms retainers' },
  { value: 'creative', label: 'Creative Retainer', description: 'Ongoing creative, design, strategy support' },
  { value: 'integrated', label: 'Integrated', description: 'Multi-service: brand + PR + web combined' },
];

// Antenna Group Logo Component - Updated branding
function AntennaLogo({ className = "h-8" }) {
  return (
    <svg viewBox="0 0 180 40" className={className} fill="currentColor">
      {/* Main wordmark */}
      <text x="0" y="28" fontFamily="system-ui, -apple-system, sans-serif" fontSize="28" fontWeight="500" letterSpacing="-0.5">
        Antenna
      </text>
      {/* Group text */}
      <text x="108" y="28" fontFamily="system-ui, -apple-system, sans-serif" fontSize="28" fontWeight="300" letterSpacing="-0.5">
        Group
      </text>
    </svg>
  );
}

// Fully Conscious tagline component
function FullyConsciousTag({ className = "" }) {
  return (
    <span className={`text-xs font-medium tracking-widest uppercase ${className}`}>
      Fully Conscious
    </span>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false, icon: Icon, count, variant }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const variants = {
    critical: {
      header: 'bg-[#FEF2F2] hover:bg-[#FEE2E2]',
      badge: 'bg-[#DC2626] text-white',
      icon: 'text-[#DC2626]'
    },
    recommended: {
      header: 'bg-[#FFFBEB] hover:bg-[#FEF3C7]',
      badge: 'bg-[#D97706] text-white',
      icon: 'text-[#D97706]'
    },
    default: {
      header: 'bg-[#EEEEE9] hover:bg-[#E5E5E0]',
      badge: 'bg-[#1A1A1A] text-white',
      icon: 'text-[#1A1A1A]'
    }
  };
  
  const style = variants[variant] || variants.default;
  
  return (
    <div className="border border-[#D4D4CF] rounded-lg mb-3 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-4 ${style.header} flex items-center justify-between transition-colors`}
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="w-4 h-4 text-[#1A1A1A]" /> : <ChevronRight className="w-4 h-4 text-[#1A1A1A]" />}
          {Icon && <Icon className={`w-5 h-5 ${style.icon}`} />}
          <span className="font-semibold text-[#1A1A1A]">{title}</span>
          {count !== undefined && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${style.badge}`}>
              {count}
            </span>
          )}
        </div>
      </button>
      {isOpen && (
        <div className="p-5 bg-white border-t border-[#E5E5E0]">
          {children}
        </div>
      )}
    </div>
  );
}

// Copy button component
function CopyButton({ text, className = "" }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-md transition-all ${copied ? 'bg-[#16A34A] text-white' : 'bg-white/60 text-[#6B7280] hover:bg-white hover:text-[#1A1A1A]'} ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function IssueCard({ issue, type }) {
  const styles = {
    critical: { bg: 'bg-[#FEF2F2] border-[#FECACA]', icon: 'text-[#DC2626]', Icon: AlertCircle, accent: 'bg-[#DC2626]' },
    recommended: { bg: 'bg-[#FFFBEB] border-[#FDE68A]', icon: 'text-[#D97706]', Icon: AlertTriangle, accent: 'bg-[#D97706]' },
    info: { bg: 'bg-[#F5F5F0] border-[#D4D4CF]', icon: 'text-[#1A1A1A]', Icon: CheckCircle, accent: 'bg-[#1A1A1A]' }
  };
  
  const { bg, icon, Icon, accent } = styles[type] || styles.info;

  // Parse the issue to extract structured parts
  const parseIssue = (text) => {
    const result = {
      section: null,
      title: null,
      currentLanguage: null,
      recommendation: null,
      explanation: null,
      fullText: text
    };

    // Try to extract section reference
    const sectionMatch = text.match(/(?:Section|§)\s*([\d.]+)/i);
    if (sectionMatch) result.section = sectionMatch[1];

    // Try to extract "Current language:" or similar
    const currentMatch = text.match(/(?:Current(?:\s+language)?|Found|Issue):\s*[""]?([^""]+)[""]?/i);
    if (currentMatch) result.currentLanguage = currentMatch[1].trim();

    // Try to extract "Recommended:" or "Replace with:" or similar
    const recommendedMatch = text.match(/(?:Recommended(?:\s+(?:language|replacement))?|Replace\s+with|Suggested|Should\s+be|Change\s+to):\s*[""]?([^""]+)[""]?/i);
    if (recommendedMatch) result.recommendation = recommendedMatch[1].trim();

    // Try to extract arrows for before → after format
    const arrowMatch = text.match(/[""]([^""]+)[""]\s*[→→>-]+\s*[""]([^""]+)[""]/);
    if (arrowMatch) {
      result.currentLanguage = arrowMatch[1].trim();
      result.recommendation = arrowMatch[2].trim();
    }

    return result;
  };

  const parsed = parseIssue(issue);
  const hasStructuredRecommendation = parsed.currentLanguage && parsed.recommendation;

  return (
    <div className={`p-4 rounded-lg border ${bg} mb-3`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${icon}`} />
        <div className="flex-1">
          {parsed.section && (
            <span className="inline-block text-xs font-mono bg-white/60 px-2 py-0.5 rounded mb-2 text-[#6B7280]">
              Section {parsed.section}
            </span>
          )}
          
          {hasStructuredRecommendation ? (
            <div className="space-y-3">
              {/* Issue explanation */}
              <p className="text-sm text-[#1A1A1A] leading-relaxed">
                {issue.split(/(?:Current|Recommended|Replace|→)/i)[0].trim()}
              </p>
              
              {/* Current → Recommended comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-white/50 rounded-lg p-3 border border-[#FECACA]">
                  <p className="text-xs font-semibold text-[#DC2626] uppercase tracking-wide mb-1">Current</p>
                  <p className="text-sm text-[#1A1A1A] font-mono leading-relaxed">"{parsed.currentLanguage}"</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3 border border-[#86EFAC] relative">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-[#16A34A] uppercase tracking-wide">Recommended</p>
                    <CopyButton text={parsed.recommendation} />
                  </div>
                  <p className="text-sm text-[#1A1A1A] font-mono leading-relaxed">"{parsed.recommendation}"</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap text-[#1A1A1A] leading-relaxed">{issue}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApiKeyInput({ apiKey, setApiKey }) {
  const [showKey, setShowKey] = useState(false);
  
  return (
    <div className="mb-8">
      <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4" />
          Anthropic API Key
        </div>
      </label>
      <div className="relative">
        <input
          type={showKey ? 'text' : 'password'}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-api03-..."
          className="w-full px-4 py-3 pr-12 bg-white border border-[#D4D4CF] rounded-lg focus:ring-2 focus:ring-[#1A1A1A] focus:border-[#1A1A1A] outline-none transition-all text-[#1A1A1A] placeholder:text-[#9CA3AF]"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A1A1A] transition-colors"
        >
          {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      <p className="mt-2 text-sm text-[#6B7280]">
        Your API key is only used in your browser and never stored.
        Get one at <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-[#1A1A1A] underline hover:no-underline">console.anthropic.com</a>
      </p>
    </div>
  );
}

// Red Flag Card - specialized for showing before → after replacements
function RedFlagCard({ flag }) {
  // Parse "phrase" in Section X.X → "replacement" format
  const parseRedFlag = (text) => {
    // Try various arrow formats
    const arrowMatch = text.match(/[""]([^""]+)[""]\s*(?:in\s+)?(?:Section\s+)?([\d.]*)\s*[→→>-]+\s*[""]([^""]+)[""]/i);
    if (arrowMatch) {
      return {
        found: arrowMatch[1].trim(),
        section: arrowMatch[2] || null,
        replacement: arrowMatch[3].trim()
      };
    }
    
    // Try "phrase" → "replacement" without section
    const simpleArrow = text.match(/[""]([^""]+)[""]\s*[→→>-]+\s*[""]([^""]+)[""]/);
    if (simpleArrow) {
      const sectionMatch = text.match(/Section\s+([\d.]+)/i);
      return {
        found: simpleArrow[1].trim(),
        section: sectionMatch ? sectionMatch[1] : null,
        replacement: simpleArrow[2].trim()
      };
    }
    
    return null;
  };

  const parsed = parseRedFlag(flag);

  if (parsed) {
    return (
      <div className="bg-[#F5F5F0] border border-[#D4D4CF] rounded-lg p-4 mb-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#D97706]" />
          <div className="flex-1">
            {parsed.section && (
              <span className="inline-block text-xs font-mono bg-white/60 px-2 py-0.5 rounded mb-2 text-[#6B7280]">
                Section {parsed.section}
              </span>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-[#FEF2F2] border border-[#FECACA] px-3 py-1.5 rounded-lg">
                <span className="text-xs text-[#DC2626] font-medium">Found:</span>
                <span className="text-sm font-mono text-[#1A1A1A]">"{parsed.found}"</span>
              </span>
              <ArrowRight className="w-4 h-4 text-[#6B7280]" />
              <span className="inline-flex items-center gap-1 bg-white border border-[#86EFAC] px-3 py-1.5 rounded-lg">
                <span className="text-xs text-[#16A34A] font-medium">Replace:</span>
                <span className="text-sm font-mono text-[#1A1A1A]">"{parsed.replacement}"</span>
                <CopyButton text={parsed.replacement} className="ml-1" />
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback to regular display if parsing fails
  return (
    <div className="bg-[#F5F5F0] border border-[#D4D4CF] rounded-lg p-4 mb-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#D97706]" />
        <div className="text-sm whitespace-pre-wrap text-[#1A1A1A] leading-relaxed">{flag}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [engagementType, setEngagementType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState('');
  
  // Draft SOW state
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftedSOW, setDraftedSOW] = useState(null);
  const [draftError, setDraftError] = useState(null);

  const handleFileUpload = useCallback(async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);
    setAnalysis(null);

    if (uploadedFile.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        setFileContent({ type: 'pdf', data: base64 });
      };
      reader.readAsDataURL(uploadedFile);
    } else if (uploadedFile.type === 'text/plain' || uploadedFile.name.endsWith('.txt') || uploadedFile.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileContent({ type: 'text', data: e.target.result });
      };
      reader.readAsText(uploadedFile);
    } else if (uploadedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || uploadedFile.name.endsWith('.docx')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        setFileContent({ type: 'docx', data: base64 });
      };
      reader.readAsDataURL(uploadedFile);
    } else {
      setError('Please upload a PDF, DOCX, or text file');
      setFile(null);
    }
  }, []);

  const analyzeSOW = async () => {
    if (!apiKey) {
      setError('Please enter your Anthropic API key');
      return;
    }
    if (!fileContent || !engagementType) {
      setError('Please upload a file and select an engagement type');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);

    try {
      const engagementLabel = ENGAGEMENT_TYPES.find(t => t.value === engagementType)?.label || engagementType;
      
      const promptText = `Please review this Statement of Work (SOW) document. This is a ${engagementLabel} engagement.

Using the assessment framework provided in your system prompt, analyze this SOW and provide SPECIFIC, ACTIONABLE recommendations.

For EVERY issue you identify, you MUST provide:
1. The exact section reference (e.g., "Section 5.2.1")
2. The CURRENT language quoted directly from the document
3. The RECOMMENDED replacement language that fixes the issue
4. A brief explanation of WHY this change is needed

FORMAT EACH ISSUE LIKE THIS:
**Section X.X** - [Brief issue title]
Current: "[exact quote from document]"
Recommended: "[specific replacement text]"
[One sentence explaining why this change matters]

Structure your response as:

1. CRITICAL ISSUES - Things that MUST be fixed before issuing
(For each: section, current language, recommended replacement, explanation)

2. RECOMMENDED IMPROVEMENTS - Things that SHOULD be fixed  
(For each: section, current language, recommended replacement, explanation)

3. RED FLAGS FOUND - Every instance of problematic phrases
Format as: "[phrase found]" in Section X.X → "[recommended replacement]"

4. SERVICE-LINE COMPLIANCE - Check each required element for ${engagementLabel} engagements
✓ Present: [element] - [where found]
✗ Missing: [element] - [what to add]

5. BUDGET VERIFICATION - Check fee table arithmetic, billing schedule alignment, deliverable-to-fee mapping

6. OVERALL ASSESSMENT
- Compliance score (1-10) with brief justification
- Top 3 priorities to address (be specific)
- What's working well

Be extremely specific. Quote the actual document. Provide ready-to-use replacement language.`;


      let messages = [];
      
      if (fileContent.type === 'pdf') {
        messages = [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileContent.data }},
            { type: 'text', text: promptText }
          ]
        }];
      } else if (fileContent.type === 'text') {
        messages = [{
          role: 'user',
          content: `${promptText}\n\n=== SOW CONTENT START ===\n${fileContent.data}\n=== SOW CONTENT END ===`
        }];
      } else {
        messages = [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', data: fileContent.data }},
            { type: 'text', text: promptText }
          ]
        }];
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          system: `You are an expert SOW reviewer for Antenna Group, an integrated marketing agency. You review Statements of Work for quality, completeness, and risk before they are issued to clients.

${ASSESSMENT_FRAMEWORK}

When reviewing SOWs:
- Be thorough and specific
- Quote actual language from the document
- Provide section references where possible
- Give concrete recommended replacement language
- Prioritize issues by severity
- Be constructive, not just critical - acknowledge what's working well`,
          messages: messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.content.filter(block => block.type === 'text').map(block => block.text).join('\n');

      setRawResponse(responseText);
      const parsed = parseAnalysis(responseText);
      setAnalysis(parsed);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseAnalysis = (text) => {
    const sections = { critical: [], recommended: [], redFlags: [], compliance: '', budget: '', overall: '' };

    const criticalMatch = text.match(/(?:^|\n)(?:#{1,3}\s*)?(?:1\.?\s*)?CRITICAL ISSUES?[:\s]*\n([\s\S]*?)(?=\n(?:#{1,3}\s*)?(?:2\.?\s*)?RECOMMENDED|$)/i);
    const recommendedMatch = text.match(/(?:^|\n)(?:#{1,3}\s*)?(?:2\.?\s*)?RECOMMENDED IMPROVEMENTS?[:\s]*\n([\s\S]*?)(?=\n(?:#{1,3}\s*)?(?:3\.?\s*)?RED FLAGS?|$)/i);
    const redFlagsMatch = text.match(/(?:^|\n)(?:#{1,3}\s*)?(?:3\.?\s*)?RED FLAGS?[:\s]*(?:FOUND)?[:\s]*\n([\s\S]*?)(?=\n(?:#{1,3}\s*)?(?:4\.?\s*)?SERVICE|$)/i);
    const complianceMatch = text.match(/(?:^|\n)(?:#{1,3}\s*)?(?:4\.?\s*)?SERVICE[- ]LINE COMPLIANCE[:\s]*\n([\s\S]*?)(?=\n(?:#{1,3}\s*)?(?:5\.?\s*)?BUDGET|$)/i);
    const budgetMatch = text.match(/(?:^|\n)(?:#{1,3}\s*)?(?:5\.?\s*)?BUDGET VERIFICATION[:\s]*\n([\s\S]*?)(?=\n(?:#{1,3}\s*)?(?:6\.?\s*)?OVERALL|$)/i);
    const overallMatch = text.match(/(?:^|\n)(?:#{1,3}\s*)?(?:6\.?\s*)?OVERALL ASSESSMENT[:\s]*\n([\s\S]*?)$/i);

    if (criticalMatch) sections.critical = splitIntoIssues(criticalMatch[1]);
    if (recommendedMatch) sections.recommended = splitIntoIssues(recommendedMatch[1]);
    if (redFlagsMatch) sections.redFlags = splitIntoIssues(redFlagsMatch[1]);
    if (complianceMatch) sections.compliance = complianceMatch[1].trim();
    if (budgetMatch) sections.budget = budgetMatch[1].trim();
    if (overallMatch) sections.overall = overallMatch[1].trim();

    if (!sections.critical.length && !sections.recommended.length && !sections.overall) {
      sections.overall = text;
    }

    return sections;
  };

  const splitIntoIssues = (text) => {
    if (!text) return [];
    const items = text.split(/\n(?=\d+\.|[-•*]\s|#{1,4}\s)/);
    return items.map(item => item.trim()).filter(item => item.length > 10);
  };

  const resetReview = () => {
    setFile(null);
    setFileContent(null);
    setEngagementType('');
    setAnalysis(null);
    setError(null);
    setRawResponse('');
    setDraftedSOW(null);
    setDraftError(null);
  };

  // Generate updated SOW draft
  const generateDraft = async () => {
    if (!apiKey || !fileContent || !rawResponse) return;

    setIsDrafting(true);
    setDraftError(null);

    try {
      const engagementLabel = ENGAGEMENT_TYPES.find(t => t.value === engagementType)?.label || engagementType;

      const draftPrompt = `You are revising a Statement of Work (SOW) document based on a quality assessment.

ORIGINAL ASSESSMENT FINDINGS:
${rawResponse}

Your task is to produce a COMPLETE, REVISED version of the SOW that incorporates ALL the recommended fixes from the assessment above.

INSTRUCTIONS:
1. Apply ALL critical issues fixes
2. Apply ALL recommended improvements  
3. Replace ALL red flag phrases with their recommended alternatives
4. Add any missing required sections (client responsibilities, assumptions, exclusions, etc.)
5. Maintain the original document structure and numbering system
6. Preserve all content that was not flagged as problematic
7. Use professional, precise language throughout

OUTPUT FORMAT:
- Produce the complete revised SOW as a well-formatted document
- Use proper section numbering (1.0, 1.1, 1.1.1, etc.)
- Include all standard SOW sections
- Mark any sections you've significantly modified with [REVISED] at the end of the section title
- Mark any new sections you've added with [NEW] at the end of the section title

Begin the revised SOW now:`;

      let messages = [];
      
      if (fileContent.type === 'pdf') {
        messages = [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileContent.data }},
            { type: 'text', text: draftPrompt }
          ]
        }];
      } else if (fileContent.type === 'text') {
        messages = [{
          role: 'user',
          content: `${draftPrompt}\n\n=== ORIGINAL SOW CONTENT ===\n${fileContent.data}\n=== END ORIGINAL SOW ===`
        }];
      } else {
        messages = [{
          role: 'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', data: fileContent.data }},
            { type: 'text', text: draftPrompt }
          ]
        }];
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 16000,
          system: `You are an expert SOW writer for Antenna Group, an integrated marketing agency. You produce clear, precise, and comprehensive Statements of Work that protect both the agency and client interests.

Your writing style:
- Professional and precise
- Uses active voice ("Agency will..." not "It will be...")
- Quantifies everything possible (hours, rounds, days, quantities)
- Includes explicit completion criteria for every deliverable
- Protects against scope creep with clear boundaries
- Maintains consistent decimal numbering throughout`,
          messages: messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const draftText = data.content.filter(block => block.type === 'text').map(block => block.text).join('\n');
      setDraftedSOW(draftText);

    } catch (err) {
      console.error('Draft generation error:', err);
      setDraftError(err.message || 'An error occurred while generating the draft');
    } finally {
      setIsDrafting(false);
    }
  };

  // Download draft as text file
  const downloadDraft = () => {
    if (!draftedSOW) return;
    
    const blob = new Blob([draftedSOW], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const originalName = file?.name?.replace(/\.[^/.]+$/, '') || 'SOW';
    a.download = `${originalName}_REVISED.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F5F4F0]">
      {/* Header */}
      <header className="bg-[#F5F4F0] border-b border-[#E5E5E0] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AntennaLogo className="h-10 text-[#1A1A1A]" />
              <div className="hidden sm:block h-6 w-px bg-[#D4D4CF]" />
              <FullyConsciousTag className="hidden sm:block text-[#6B7280]" />
            </div>
            <p className="text-xs text-[#6B7280] uppercase tracking-wider font-medium">SOW Review Tool</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {!analysis ? (
          <>
            {/* Hero */}
            <div className="mb-12">
              <h1 className="text-5xl md:text-6xl font-bold text-[#1A1A1A] leading-[1.1] mb-6">
                Quality starts with clarity.
              </h1>
              <p className="text-xl text-[#6B7280] max-w-2xl leading-relaxed">
                Upload a Statement of Work for automated quality assessment against Antenna Group standards.
              </p>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-2xl border border-[#E5E5E0] p-8 shadow-sm">
              <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />

              {/* File Upload */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
                  Upload SOW Document
                </label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    file ? 'border-[#1A1A1A] bg-[#F5F4F0]' : 'border-[#D4D4CF] hover:border-[#1A1A1A] hover:bg-[#FAFAF8]'
                  }`}
                >
                  <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFileUpload} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {file ? (
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-14 h-14 bg-[#1A1A1A] rounded-xl flex items-center justify-center">
                          <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-[#1A1A1A]">{file.name}</p>
                          <p className="text-sm text-[#6B7280]">{(file.size / 1024).toFixed(1)} KB • Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
                        <p className="text-[#1A1A1A] font-medium mb-1">Click to upload or drag and drop</p>
                        <p className="text-sm text-[#6B7280]">PDF, DOCX, or TXT files supported</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Engagement Type */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-[#1A1A1A] mb-3">Engagement Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ENGAGEMENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setEngagementType(type.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        engagementType === type.value
                          ? 'border-[#1A1A1A] bg-[#F5F4F0]'
                          : 'border-[#E5E5E0] hover:border-[#D4D4CF] hover:bg-[#FAFAF8]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          engagementType === type.value ? 'border-[#DC2626]' : 'border-[#D4D4CF]'
                        }`}>
                          {engagementType === type.value && <div className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" />}
                        </div>
                        <div>
                          <p className="font-semibold text-[#1A1A1A]">{type.label}</p>
                          <p className="text-xs text-[#6B7280] mt-0.5">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl">
                  <div className="flex items-start gap-3 text-[#DC2626]">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">Error</p>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Button */}
              <button
                onClick={analyzeSOW}
                disabled={!apiKey || !file || !engagementType || isAnalyzing}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-3 ${
                  !apiKey || !file || !engagementType || isAnalyzing
                    ? 'bg-[#E5E5E0] text-[#9CA3AF] cursor-not-allowed'
                    : 'bg-[#CCFF00] text-[#1A1A1A] hover:bg-[#B8E600]'
                }`}
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Analyzing SOW...</>
                ) : (
                  <>ANALYZE SOW<ArrowUpRight className="w-5 h-5" /></>
                )}
              </button>
            </div>

            {/* What we check */}
            <div className="mt-12">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">What this tool assesses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Universal Requirements', desc: 'Numbering, completion criteria, controlled language, deliverable structure' },
                  { title: 'Client Responsibilities', desc: 'Consolidated feedback, approval windows, change control, stakeholder protection' },
                  { title: 'Master Assumptions', desc: 'Scope boundaries, revision limits, response times, pause/termination ladder' },
                  { title: 'Service-Line Specifics', desc: 'Requirements unique to branding, website, PR, creative, or integrated engagements' },
                  { title: 'Budget Alignment', desc: 'Fee table arithmetic, billing schedule, deliverable-to-fee mapping' },
                  { title: 'Red Flag Detection', desc: 'Identifies unbounded phrases like "ad hoc", "ongoing", "as needed"' },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 bg-white rounded-xl border border-[#E5E5E0]">
                    <p className="font-semibold text-[#1A1A1A] mb-1">{item.title}</p>
                    <p className="text-sm text-[#6B7280]">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Results */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">Analysis Complete</h1>
                <p className="text-[#6B7280]">{file?.name} • {ENGAGEMENT_TYPES.find(t => t.value === engagementType)?.label} Engagement</p>
              </div>
              <button onClick={resetReview} className="px-5 py-2.5 text-sm font-semibold text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-xl hover:bg-[#1A1A1A] hover:text-white transition-colors">
                Review Another
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E5E0] p-6 shadow-sm">
              {analysis.critical?.length > 0 && (
                <CollapsibleSection title="Critical Issues" icon={AlertCircle} count={analysis.critical.length} defaultOpen variant="critical">
                  <p className="text-sm text-[#DC2626] mb-4">Must be addressed before issuing to client.</p>
                  {analysis.critical.map((issue, idx) => <IssueCard key={idx} issue={issue} type="critical" />)}
                </CollapsibleSection>
              )}

              {analysis.recommended?.length > 0 && (
                <CollapsibleSection title="Recommended Improvements" icon={AlertTriangle} count={analysis.recommended.length} defaultOpen variant="recommended">
                  <p className="text-sm text-[#D97706] mb-4">Would strengthen the SOW but not blocking.</p>
                  {analysis.recommended.map((issue, idx) => <IssueCard key={idx} issue={issue} type="recommended" />)}
                </CollapsibleSection>
              )}

              {analysis.redFlags?.length > 0 && (
                <CollapsibleSection title="Red Flags Found" count={analysis.redFlags.length} icon={AlertTriangle}>
                  <p className="text-sm text-[#6B7280] mb-4">Problematic language to replace. Click the copy button to grab the replacement text.</p>
                  {analysis.redFlags.map((flag, idx) => <RedFlagCard key={idx} flag={flag} />)}
                </CollapsibleSection>
              )}

              {analysis.compliance && (
                <CollapsibleSection title="Service-Line Compliance" icon={CheckCircle}>
                  <pre className="whitespace-pre-wrap text-sm bg-[#F5F4F0] p-4 rounded-lg overflow-auto font-mono text-[#1A1A1A]">{analysis.compliance}</pre>
                </CollapsibleSection>
              )}

              {analysis.budget && (
                <CollapsibleSection title="Budget Verification">
                  <pre className="whitespace-pre-wrap text-sm bg-[#F5F4F0] p-4 rounded-lg overflow-auto font-mono text-[#1A1A1A]">{analysis.budget}</pre>
                </CollapsibleSection>
              )}

              {analysis.overall && (
                <CollapsibleSection title="Overall Assessment" defaultOpen>
                  <pre className="whitespace-pre-wrap text-sm bg-[#F5F4F0] p-4 rounded-lg overflow-auto text-[#1A1A1A]">{analysis.overall}</pre>
                </CollapsibleSection>
              )}

              <CollapsibleSection title="Full Analysis (Raw)">
                <pre className="whitespace-pre-wrap text-xs bg-[#1A1A1A] text-[#E5E5E0] p-4 rounded-lg overflow-auto max-h-96 font-mono">{rawResponse}</pre>
              </CollapsibleSection>
            </div>

            {/* Draft Updated SOW Section */}
            <div className="mt-8 bg-gradient-to-br from-[#1A1A1A] to-[#2D2D2D] rounded-2xl p-8 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#CCFF00] rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-[#1A1A1A]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">Generate Revised SOW</h2>
                  <p className="text-[#9CA3AF] mb-6">
                    Create an updated draft that incorporates all critical fixes, recommended improvements, and red flag replacements from the analysis above.
                  </p>

                  {draftError && (
                    <div className="mb-4 p-4 bg-[#DC2626]/20 border border-[#DC2626]/40 rounded-xl">
                      <p className="text-[#FCA5A5] text-sm">{draftError}</p>
                    </div>
                  )}

                  {!draftedSOW ? (
                    <button
                      onClick={generateDraft}
                      disabled={isDrafting}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-3 ${
                        isDrafting
                          ? 'bg-[#4B4B4B] text-[#9CA3AF] cursor-not-allowed'
                          : 'bg-[#CCFF00] text-[#1A1A1A] hover:bg-[#B8E600]'
                      }`}
                    >
                      {isDrafting ? (
                        <><Loader2 className="w-5 h-5 animate-spin" />Generating Draft...</>
                      ) : (
                        <><Sparkles className="w-5 h-5" />Draft Updated SOW</>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#16A34A]/20 border border-[#16A34A]/40 rounded-full text-[#86EFAC] text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Draft Generated
                        </span>
                        <button
                          onClick={downloadDraft}
                          className="px-4 py-2 bg-[#CCFF00] text-[#1A1A1A] rounded-lg font-semibold text-sm hover:bg-[#B8E600] transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Draft
                        </button>
                        <button
                          onClick={generateDraft}
                          disabled={isDrafting}
                          className="px-4 py-2 bg-[#3D3D3D] text-white rounded-lg font-medium text-sm hover:bg-[#4B4B4B] transition-colors"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Draft Preview */}
              {draftedSOW && (
                <div className="mt-6">
                  <div className="bg-[#0D0D0D] rounded-xl border border-[#3D3D3D] overflow-hidden">
                    <div className="px-4 py-3 bg-[#1A1A1A] border-b border-[#3D3D3D] flex items-center justify-between">
                      <span className="text-sm font-medium text-[#9CA3AF]">Revised SOW Preview</span>
                      <CopyButton text={draftedSOW} className="!bg-[#3D3D3D] !text-[#9CA3AF] hover:!bg-[#4B4B4B] hover:!text-white" />
                    </div>
                    <div className="p-4 max-h-[500px] overflow-auto">
                      <pre className="whitespace-pre-wrap text-sm text-[#E5E5E0] font-mono leading-relaxed">{draftedSOW}</pre>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[#6B7280]">
                    <span className="text-[#CCFF00]">[REVISED]</span> marks modified sections • <span className="text-[#CCFF00]">[NEW]</span> marks added sections • Review carefully before use
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-6 py-8 border-t border-[#E5E5E0]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AntennaLogo className="h-7 text-[#9CA3AF]" />
            <span className="text-xs text-[#9CA3AF]">For conscious brands with the courage to lead</span>
          </div>
          <p className="text-sm text-[#9CA3AF]">SOW Quality Standards v1.0</p>
        </div>
      </footer>
    </div>
  );
}
