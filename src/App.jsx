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

// Antenna Group Logo - matches Conscious Compass branding
function AntennaLogo({ className = "h-8", color = "currentColor" }) {
  return (
    <img 
      src="https://ktuyiikwhspwmzvyczit.supabase.co/storage/v1/object/public/assets/brand/antenna-new-logo.svg" 
      alt="Antenna Group" 
      className={className}
    />
  );
}

// Fallback SVG logo if image doesn't load
function AntennaLogoFallback({ className = "h-8" }) {
  return (
    <svg viewBox="0 0 140 32" className={className} fill="currentColor">
      <text x="0" y="24" fontFamily="system-ui, -apple-system, sans-serif" fontSize="22" fontWeight="500" letterSpacing="-0.5">
        Antenna Group
      </text>
    </svg>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false, icon: Icon, count, variant }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const variants = {
    critical: {
      header: 'bg-red-50 hover:bg-red-100',
      badge: 'bg-red-600 text-white',
      icon: 'text-red-600'
    },
    recommended: {
      header: 'bg-amber-50 hover:bg-amber-100',
      badge: 'bg-amber-600 text-white',
      icon: 'text-amber-600'
    },
    default: {
      header: 'bg-gray-50 hover:bg-gray-100',
      badge: 'bg-gray-900 text-white',
      icon: 'text-gray-900'
    }
  };
  
  const style = variants[variant] || variants.default;
  
  return (
    <div className="border border-gray-200 rounded-xl mb-3 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-4 ${style.header} flex items-center justify-between transition-colors`}
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="w-4 h-4 text-gray-900" /> : <ChevronRight className="w-4 h-4 text-gray-900" />}
          {Icon && <Icon className={`w-5 h-5 ${style.icon}`} />}
          <span className="font-semibold text-gray-900">{title}</span>
          {count !== undefined && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${style.badge}`}>
              {count}
            </span>
          )}
        </div>
      </button>
      {isOpen && (
        <div className="p-5 bg-white border-t border-gray-100">
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
    critical: { bg: 'bg-red-50 border-red-200', icon: 'text-red-600', Icon: AlertCircle, accent: 'bg-red-600' },
    recommended: { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', Icon: AlertTriangle, accent: 'bg-amber-600' },
    info: { bg: 'bg-gray-50 border-gray-200', icon: 'text-gray-900', Icon: CheckCircle, accent: 'bg-gray-900' }
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
    <div className={`p-4 rounded-xl border ${bg} mb-3`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${icon}`} />
        <div className="flex-1">
          {parsed.section && (
            <span className="inline-block text-xs font-mono bg-white/60 px-2 py-0.5 rounded mb-2 text-gray-500">
              Section {parsed.section}
            </span>
          )}
          
          {hasStructuredRecommendation ? (
            <div className="space-y-3">
              {/* Issue explanation */}
              <p className="text-sm text-gray-900 leading-relaxed">
                {issue.split(/(?:Current|Recommended|Replace|→)/i)[0].trim()}
              </p>
              
              {/* Current → Recommended comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="bg-white/50 rounded-lg p-3 border border-red-200">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Current</p>
                  <p className="text-sm text-gray-900 font-mono leading-relaxed">"{parsed.currentLanguage}"</p>
                </div>
                <div className="bg-white/50 rounded-lg p-3 border border-green-200 relative">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Recommended</p>
                    <CopyButton text={parsed.recommendation} />
                  </div>
                  <p className="text-sm text-gray-900 font-mono leading-relaxed">"{parsed.recommendation}"</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm whitespace-pre-wrap text-gray-900 leading-relaxed">{issue}</div>
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
      <label className="block text-sm font-semibold text-gray-900 mb-2">
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
          className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all text-gray-900 placeholder:text-gray-400"
        />
        <button
          type="button"
          onClick={() => setShowKey(!showKey)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900 transition-colors"
        >
          {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
      <p className="mt-2 text-sm text-gray-500">
        Your API key is only used in your browser and never stored.
        Get one at <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-gray-900 underline hover:no-underline">console.anthropic.com</a>
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
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
          <div className="flex-1">
            {parsed.section && (
              <span className="inline-block text-xs font-mono bg-white/60 px-2 py-0.5 rounded mb-2 text-gray-500">
                Section {parsed.section}
              </span>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                <span className="text-xs text-red-600 font-medium">Found:</span>
                <span className="text-sm font-mono text-gray-900">"{parsed.found}"</span>
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className="inline-flex items-center gap-1 bg-white border border-green-200 px-3 py-1.5 rounded-lg">
                <span className="text-xs text-green-600 font-medium">Replace:</span>
                <span className="text-sm font-mono text-gray-900">"{parsed.replacement}"</span>
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
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
        <div className="text-sm whitespace-pre-wrap text-gray-900 leading-relaxed">{flag}</div>
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
    <div className="min-h-screen bg-white">
      {/* Header - matches Conscious Compass */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <AntennaLogo className="h-8" />
            <a 
              href="https://www.antennagroup.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Back to Antenna
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        {!analysis ? (
          <>
            {/* Hero - matches Conscious Compass style */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                SOW Review Tool
              </h1>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                Upload a Statement of Work for automated quality assessment against Antenna Group standards.
              </p>
            </div>

            {/* Form Card */}
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />

              {/* File Upload */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Upload SOW Document
                </label>
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                    file ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <input type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFileUpload} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {file ? (
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center">
                          <FileText className="w-7 h-7 text-white" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB • Click to change</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-900 font-medium mb-1">Click to upload or drag and drop</p>
                        <p className="text-sm text-gray-500">PDF, DOCX, or TXT files supported</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Engagement Type */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-900 mb-3">Engagement Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ENGAGEMENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setEngagementType(type.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        engagementType === type.value
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          engagementType === type.value ? 'border-gray-900' : 'border-gray-300'
                        }`}>
                          {engagementType === type.value && <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{type.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3 text-red-600">
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
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />Analyzing SOW...</>
                ) : (
                  <>Analyze SOW<ArrowUpRight className="w-5 h-5" /></>
                )}
              </button>
            </div>

            {/* What we check - styled like Conscious Compass steps */}
            <div className="mt-20 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What this tool assesses</h2>
              <p className="text-gray-500 mb-10 max-w-xl mx-auto">Our SOW reviewer checks your documents against Antenna Group quality standards in 6 key areas.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  { num: '01', title: 'Universal Requirements', desc: 'Numbering, completion criteria, controlled language' },
                  { num: '02', title: 'Client Responsibilities', desc: 'Feedback consolidation, approval windows, change control' },
                  { num: '03', title: 'Master Assumptions', desc: 'Scope boundaries, revision limits, response times' },
                  { num: '04', title: 'Service-Line Specifics', desc: 'Requirements for branding, website, PR, creative' },
                  { num: '05', title: 'Budget Alignment', desc: 'Fee arithmetic, billing schedules, deliverable mapping' },
                  { num: '06', title: 'Red Flag Detection', desc: 'Identifies "ad hoc", "ongoing", "as needed" phrases' },
                ].map((item, idx) => (
                  <div key={idx} className="text-left p-6 bg-gray-50 rounded-2xl">
                    <span className="text-4xl font-bold text-gray-200">{item.num}</span>
                    <h3 className="font-semibold text-gray-900 mt-2 mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500">{item.desc}</p>
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
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Analysis Complete</h1>
                <p className="text-gray-500">{file?.name} • {ENGAGEMENT_TYPES.find(t => t.value === engagementType)?.label} Engagement</p>
              </div>
              <button onClick={resetReview} className="px-5 py-2.5 text-sm font-semibold text-gray-900 border-2 border-gray-900 rounded-xl hover:bg-gray-900 hover:text-white transition-colors">
                Review Another
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              {analysis.critical?.length > 0 && (
                <CollapsibleSection title="Critical Issues" icon={AlertCircle} count={analysis.critical.length} defaultOpen variant="critical">
                  <p className="text-sm text-red-600 mb-4">Must be addressed before issuing to client.</p>
                  {analysis.critical.map((issue, idx) => <IssueCard key={idx} issue={issue} type="critical" />)}
                </CollapsibleSection>
              )}

              {analysis.recommended?.length > 0 && (
                <CollapsibleSection title="Recommended Improvements" icon={AlertTriangle} count={analysis.recommended.length} defaultOpen variant="recommended">
                  <p className="text-sm text-amber-600 mb-4">Would strengthen the SOW but not blocking.</p>
                  {analysis.recommended.map((issue, idx) => <IssueCard key={idx} issue={issue} type="recommended" />)}
                </CollapsibleSection>
              )}

              {analysis.redFlags?.length > 0 && (
                <CollapsibleSection title="Red Flags Found" count={analysis.redFlags.length} icon={AlertTriangle}>
                  <p className="text-sm text-gray-500 mb-4">Problematic language to replace. Click the copy button to grab the replacement text.</p>
                  {analysis.redFlags.map((flag, idx) => <RedFlagCard key={idx} flag={flag} />)}
                </CollapsibleSection>
              )}

              {analysis.compliance && (
                <CollapsibleSection title="Service-Line Compliance" icon={CheckCircle}>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg overflow-auto font-mono text-gray-900">{analysis.compliance}</pre>
                </CollapsibleSection>
              )}

              {analysis.budget && (
                <CollapsibleSection title="Budget Verification">
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg overflow-auto font-mono text-gray-900">{analysis.budget}</pre>
                </CollapsibleSection>
              )}

              {analysis.overall && (
                <CollapsibleSection title="Overall Assessment" defaultOpen>
                  <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg overflow-auto text-gray-900">{analysis.overall}</pre>
                </CollapsibleSection>
              )}

              <CollapsibleSection title="Full Analysis (Raw)">
                <pre className="whitespace-pre-wrap text-xs bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto max-h-96 font-mono">{rawResponse}</pre>
              </CollapsibleSection>
            </div>

            {/* Draft Updated SOW Section */}
            <div className="mt-8 bg-gray-900 rounded-2xl p-8 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-gray-900" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">Generate Revised SOW</h2>
                  <p className="text-gray-400 mb-6">
                    Create an updated draft that incorporates all critical fixes, recommended improvements, and red flag replacements from the analysis above.
                  </p>

                  {draftError && (
                    <div className="mb-4 p-4 bg-red-900/30 border border-red-500/40 rounded-xl">
                      <p className="text-red-300 text-sm">{draftError}</p>
                    </div>
                  )}

                  {!draftedSOW ? (
                    <button
                      onClick={generateDraft}
                      disabled={isDrafting}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-3 ${
                        isDrafting
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : 'bg-white text-gray-900 hover:bg-gray-100'
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
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-500/40 rounded-full text-green-300 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Draft Generated
                        </span>
                        <button
                          onClick={downloadDraft}
                          className="px-4 py-2 bg-white text-gray-900 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Download Draft
                        </button>
                        <button
                          onClick={generateDraft}
                          disabled={isDrafting}
                          className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium text-sm hover:bg-gray-600 transition-colors"
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
                  <div className="bg-gray-950 rounded-xl border border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-400">Revised SOW Preview</span>
                      <CopyButton text={draftedSOW} className="!bg-gray-700 !text-gray-400 hover:!bg-gray-600 hover:!text-white" />
                    </div>
                    <div className="p-4 max-h-[500px] overflow-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-100 font-mono leading-relaxed">{draftedSOW}</pre>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    <span className="text-white">[REVISED]</span> marks modified sections • <span className="text-white">[NEW]</span> marks added sections • Review carefully before use
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer - matches Conscious Compass */}
      <footer className="bg-gray-900 text-white mt-20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h3 className="text-2xl font-semibold mb-8">For conscious brands with the courage to lead</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="font-semibold mb-4 text-gray-400">Our Offices</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>San Francisco, CA</li>
                <li>New York, NY</li>
                <li>Hackensack, NJ</li>
                <li>Washington, D.C.</li>
                <li>London, UK</li>
                <li>Prague, CZ</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-400">Social</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://www.linkedin.com/company/antenna-group" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">LinkedIn</a></li>
                <li><a href="https://www.instagram.com/antennagroup/" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Instagram</a></li>
                <li><a href="https://www.facebook.com/AntennaGroup" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Facebook</a></li>
                <li><a href="https://x.com/antenna_group" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">X</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-400">Learn</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://www.antennagroup.com/lets-chat" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Let's Chat</a></li>
                <li><a href="https://www.antennagroup.com/work" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Work</a></li>
                <li><a href="https://www.antennagroup.com/age-of-adoption-podcast" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Podcast</a></li>
                <li><a href="https://fullyconscious.com" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Conscious Compass</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-gray-400">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://www.antennagroup.com/terms" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Terms of Use</a></li>
                <li><a href="https://www.antennagroup.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800 text-sm text-gray-400">
            © 2026 Antenna Group — All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
