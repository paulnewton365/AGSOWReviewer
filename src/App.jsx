import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, AlertCircle, Loader2, ChevronDown, ChevronRight, Key, Eye, EyeOff, ArrowUpRight, Copy, Check, ArrowRight, Download, Sparkles, PenTool, Search, MessageSquare, Lightbulb, Target, Users, ChevronLeft } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, LevelFormat, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

// ============================================================================
// VERSION
// ============================================================================
const APP_VERSION = '2.3.0';

// ============================================================================
// DOCX GENERATION UTILITIES
// ============================================================================

// Antenna Group logo as base64 (simple text fallback for header)
const createAntennaHeader = () => {
  return new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: ".antenna",
            font: "Arial",
            size: 36,
            bold: true,
          }),
          new TextRun({
            text: "group",
            font: "Arial",
            size: 24,
            color: "666666",
          }),
        ],
      }),
    ],
  });
};

const createFooter = () => {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Page ",
            font: "Arial",
            size: 20,
            color: "666666",
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: "Arial",
            size: 20,
            color: "666666",
          }),
        ],
      }),
    ],
  });
};

// Parse SOW text into structured sections with proper level detection
const parseSOWContent = (sowText) => {
  const lines = sowText.split('\n');
  const sections = [];
  let currentSection = null;
  
  // Helper to detect numbering level from text like "1.", "1.1", "1.1.1", "1.1.1.1"
  const getNumberingLevel = (text) => {
    // Match patterns like "1.", "1.1", "1.1.1", "A.", "a.", etc.
    const decimalMatch = text.match(/^(\d+(?:\.\d+)*)\.\s/);
    if (decimalMatch) {
      const parts = decimalMatch[1].split('.');
      return { level: parts.length - 1, number: decimalMatch[0], text: text.replace(decimalMatch[0], '').trim() };
    }
    const simpleMatch = text.match(/^(\d+)\.\s/);
    if (simpleMatch) {
      return { level: 0, number: simpleMatch[0], text: text.replace(simpleMatch[0], '').trim() };
    }
    const letterMatch = text.match(/^([a-zA-Z])\.\s/);
    if (letterMatch) {
      return { level: 3, number: letterMatch[0], text: text.replace(letterMatch[0], '').trim() };
    }
    const romanMatch = text.match(/^(i{1,3}|iv|vi{0,3}|ix|x)\.\s/i);
    if (romanMatch) {
      return { level: 4, number: romanMatch[0], text: text.replace(romanMatch[0], '').trim() };
    }
    return null;
  };
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check for markdown headings (# or ##)
    if (trimmed.startsWith('# ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'h1', text: trimmed.replace(/^#+\s*/, ''), children: [] };
    } else if (trimmed.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'h2', text: trimmed.replace(/^#+\s*/, ''), children: [] };
    } else if (trimmed.startsWith('### ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'h3', text: trimmed.replace(/^#+\s*/, ''), children: [] };
    } else {
      // Check for decimal numbering
      const numbering = getNumberingLevel(trimmed);
      if (numbering) {
        if (numbering.level === 0) {
          // Top level (1., 2., etc.) - new section
          if (currentSection) sections.push(currentSection);
          currentSection = { 
            type: 'numbered', 
            level: 0, 
            numberText: numbering.number,
            text: numbering.text, 
            fullText: trimmed,
            children: [] 
          };
        } else {
          // Sub-levels (1.1, 1.1.1, etc.)
          if (currentSection) {
            currentSection.children.push({ 
              type: 'numbered', 
              level: numbering.level,
              numberText: numbering.number,
              text: numbering.text,
              fullText: trimmed
            });
          } else {
            sections.push({ 
              type: 'numbered', 
              level: numbering.level,
              numberText: numbering.number,
              text: numbering.text, 
              fullText: trimmed,
              children: [] 
            });
          }
        }
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        // Bullet point
        if (currentSection) {
          currentSection.children.push({ type: 'bullet', text: trimmed.replace(/^[-•]\s*/, '') });
        } else {
          sections.push({ type: 'bullet', text: trimmed.replace(/^[-•]\s*/, ''), children: [] });
        }
      } else if (trimmed.startsWith('[REVISED]') || trimmed.startsWith('[NEW]')) {
        // Revision markers - treat as annotation
        if (currentSection) {
          currentSection.children.push({ type: 'marker', text: trimmed });
        } else {
          sections.push({ type: 'marker', text: trimmed, children: [] });
        }
      } else {
        // Regular paragraph
        if (currentSection) {
          currentSection.children.push({ type: 'para', text: trimmed });
        } else {
          sections.push({ type: 'para', text: trimmed, children: [] });
        }
      }
    }
  }
  
  if (currentSection) sections.push(currentSection);
  return sections;
};

// Generate Word document from SOW content with proper numbering
const generateSOWDocument = async (sowText, projectInfo = {}) => {
  const sections = parseSOWContent(sowText);
  const children = [];
  
  // Title
  const title = projectInfo.title || 'Statement of Work (SOW)';
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 56,
          font: "Arial",
        }),
      ],
      spacing: { after: 400 },
    })
  );
  
  // Version and date info
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "VERSION: ", bold: true, size: 22, font: "Arial" }),
        new TextRun({ text: "1.0", size: 22, font: "Arial" }),
      ],
      spacing: { after: 100 },
    })
  );
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "DATE: ", bold: true, size: 22, font: "Arial" }),
        new TextRun({ text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), size: 22, font: "Arial" }),
      ],
      spacing: { after: 100 },
    })
  );
  
  if (projectInfo.client) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: "PREPARED FOR: ", bold: true, size: 22, font: "Arial" }),
          new TextRun({ text: projectInfo.client, size: 22, font: "Arial" }),
        ],
        spacing: { after: 100 },
      })
    );
  }
  
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: "CREATED BY: ", bold: true, size: 22, font: "Arial" }),
        new TextRun({ text: "Antenna Group", size: 22, font: "Arial" }),
      ],
      spacing: { after: 400 },
    })
  );
  
  // Add horizontal line
  children.push(
    new Paragraph({
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
      },
      spacing: { after: 400 },
    })
  );
  
  // Helper to get indent for numbering level
  const getIndentForLevel = (level) => {
    const baseIndent = 360; // 0.25 inch in twips
    return { left: baseIndent * (level + 1), hanging: 360 };
  };
  
  // Helper to get font size for level
  const getFontSizeForLevel = (level) => {
    if (level === 0) return 26; // 13pt
    if (level === 1) return 24; // 12pt
    return 22; // 11pt
  };
  
  // Process each section
  for (const section of sections) {
    if (section.type === 'h1') {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: section.text,
              bold: true,
              size: 32,
              font: "Arial",
            }),
          ],
          spacing: { before: 400, after: 200 },
        })
      );
    } else if (section.type === 'h2') {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: section.text,
              bold: true,
              size: 28,
              font: "Arial",
            }),
          ],
          spacing: { before: 300, after: 150 },
        })
      );
    } else if (section.type === 'h3') {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: section.text,
              bold: true,
              size: 24,
              font: "Arial",
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (section.type === 'numbered') {
      // Use Word's numbering for top-level numbered items
      const level = section.level || 0;
      children.push(
        new Paragraph({
          numbering: {
            reference: "sow-numbering",
            level: level,
          },
          children: [
            new TextRun({
              text: section.text,
              bold: level === 0,
              size: getFontSizeForLevel(level),
              font: "Arial",
            }),
          ],
          spacing: { before: level === 0 ? 300 : 150, after: 150 },
        })
      );
    } else if (section.type === 'marker') {
      // [REVISED] or [NEW] markers
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.text,
              italics: true,
              size: 20,
              font: "Arial",
              color: "666666",
            }),
          ],
          spacing: { after: 100 },
        })
      );
    } else if (section.type === 'para') {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: section.text,
              size: 22,
              font: "Arial",
            }),
          ],
          spacing: { after: 150 },
        })
      );
    }
    
    // Process children
    for (const child of section.children || []) {
      if (child.type === 'numbered') {
        // Sub-numbered items use Word's multi-level numbering
        const level = child.level || 1;
        children.push(
          new Paragraph({
            numbering: {
              reference: "sow-numbering",
              level: level,
            },
            children: [
              new TextRun({
                text: child.text,
                bold: level <= 1,
                size: getFontSizeForLevel(level),
                font: "Arial",
              }),
            ],
            spacing: { before: 100, after: 100 },
          })
        );
      } else if (child.type === 'bullet') {
        children.push(
          new Paragraph({
            numbering: {
              reference: "bullet-list",
              level: 0,
            },
            children: [
              new TextRun({
                text: child.text,
                size: 22,
                font: "Arial",
              }),
            ],
            spacing: { after: 80 },
          })
        );
      } else if (child.type === 'marker') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: child.text,
                italics: true,
                size: 20,
                font: "Arial",
                color: "666666",
              }),
            ],
            indent: { left: 360 },
            spacing: { after: 100 },
          })
        );
      } else if (child.type === 'para' || child.type === 'sub') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: child.text || child.fullText,
                size: 22,
                font: "Arial",
              }),
            ],
            indent: { left: 360 },
            spacing: { after: 100 },
          })
        );
      }
    }
  }
  
  // Create document with proper numbering definitions
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "sow-numbering",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 360, hanging: 360 },
                },
                run: { bold: true, size: 26 },
              },
            },
            {
              level: 1,
              format: LevelFormat.DECIMAL,
              text: "%1.%2",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
                run: { bold: true, size: 24 },
              },
            },
            {
              level: 2,
              format: LevelFormat.DECIMAL,
              text: "%1.%2.%3",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 1080, hanging: 540 },
                },
                run: { size: 22 },
              },
            },
            {
              level: 3,
              format: LevelFormat.LOWER_LETTER,
              text: "%4.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 1440, hanging: 360 },
                },
                run: { size: 22 },
              },
            },
            {
              level: 4,
              format: LevelFormat.LOWER_ROMAN,
              text: "%5.",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 1800, hanging: 360 },
                },
                run: { size: 22 },
              },
            },
          ],
        },
        {
          reference: "bullet-list",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
            {
              level: 1,
              format: LevelFormat.BULLET,
              text: "○",
              alignment: AlignmentType.START,
              style: {
                paragraph: {
                  indent: { left: 1080, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: {
            font: "Arial",
            size: 22,
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 400, after: 200 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 300, after: 150 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, font: "Arial" },
          paragraph: { spacing: { before: 200, after: 100 } },
        },
      ],
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: 12240,
            height: 15840,
          },
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      headers: {
        default: createAntennaHeader(),
      },
      footers: {
        default: createFooter(),
      },
      children: children,
    }],
  });
  
  return doc;
};

// Download as Word document
const downloadAsDocx = async (sowText, filename, projectInfo = {}) => {
  try {
    const doc = await generateSOWDocument(sowText, projectInfo);
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error generating DOCX:', error);
    // Fallback to text download
    const textBlob = new Blob([sowText], { type: 'text/plain' });
    saveAs(textBlob, filename.replace('.docx', '.txt'));
  }
};

// ============================================================================
// SERVICE TRIGGER MAPPINGS (Streamlined 19 categories)
// ============================================================================
const SERVICE_TRIGGERS = [
  {
    id: 'website',
    category: 'Website & App Development',
    description: 'Build or rebuild digital platforms',
    engagementType: 'fixed_fee',
    services: [
      // Standard Website Offering bundle
      { name: 'Website Strategy & Planning', recommend: 'always', condition: 'when website is mentioned', pricing: { termLow: 8, termHigh: 16, budgetLow: 50000, budgetHigh: 140000, bundle: 'Standard Website Offering' } },
      { name: 'Website Design & UX', recommend: 'always', condition: 'when website is mentioned', pricing: { bundle: 'Standard Website Offering' } },
      { name: 'Website Development', recommend: 'always', condition: 'when website is mentioned', pricing: { bundle: 'Standard Website Offering' } },
      { name: 'CMS Implementation', recommend: 'always', condition: 'when website is mentioned', pricing: { bundle: 'Standard Website Offering' } },
      // Individual services
      { name: 'E-commerce Development', recommend: 'conditional', condition: 'only if ecommerce mentioned specifically', pricing: { termLow: 2, termHigh: 4, budgetLow: 10000, budgetHigh: 30000 } },
      { name: 'Mobile App Development', recommend: 'conditional', condition: 'only if standalone app is requested', pricing: { termLow: 3, termHigh: 10, budgetLow: 10000, budgetHigh: 60000 } },
      { name: 'Landing Page Development', recommend: 'conditional', condition: 'only if landing or holding page is referenced', pricing: { termLow: 1, termHigh: 3, budgetLow: 15000, budgetHigh: 25000 } },
      { name: 'Website Migration', recommend: 'conditional', condition: 'only if content migration is referenced as requirement', pricing: { termLow: 1, termHigh: 3, budgetLow: 10000, budgetHigh: 20000 } },
      { name: 'Performance Optimization', recommend: 'conditional', condition: 'only if website reporting and tracking is referenced as requirement', pricing: { termLow: 52, termHigh: 52, budgetLow: 24000, budgetHigh: 30000, note: 'Annual retainer' } }
    ],
    triggerPatterns: {
      direct: ['need a new website', 'website redesign', 'site looks outdated', 'rebuild our site', 'new landing page', 'mobile-friendly'],
      indirect: ['high bounce rates', 'site is slow', 'can\'t update the site ourselves', 'CMS is difficult', 'doesn\'t reflect our brand', 'can\'t integrate with our tools'],
      situational: ['recent rebrand', 'merger', 'new product launch', 'expansion into new markets', 'adding e-commerce', 'company milestone'],
      performance: ['low conversion rates', 'cart abandonment', 'poor search rankings', 'low time on site', 'customer complaints about UX', 'website not generating leads'],
      sampleLanguage: ['people leave our site within seconds', 'can\'t compete with competitors\' sites', 'developer left and we can\'t make changes', 'looks fine on desktop but terrible on mobile', 'doesn\'t show up in Google', 'customers can\'t find what they\'re looking for', 'outgrown our platform', 'website doesn\'t tell our story']
    }
  },
  {
    id: 'integrated_strategy',
    category: 'Integrated Marketing Strategy',
    description: 'Develop cohesive marketing plans',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Marketing Strategy Development', recommend: 'conditional', condition: 'when client has specific marketing goals (awareness, reputation, credibility, visibility, perception, audience inspiration)', pricing: { termLow: 1, termHigh: 4, budgetLow: 10000, budgetHigh: 25000 } },
      { name: 'Channel Planning & Media Mix', recommend: 'conditional', condition: 'when paid and social media are discussed as requirements', pricing: { termLow: 1, termHigh: 3, budgetLow: 10000, budgetHigh: 20000 } },
      { name: 'Customer Journey Mapping', recommend: 'conditional', condition: 'when website conversion is a goal or audience segmentation issues identified', pricing: { termLow: 1, termHigh: 2, budgetLow: 7000, budgetHigh: 15000 } },
      { name: 'Marketing Audit & Assessment (Compass)', recommend: 'conditional', condition: 'when client does not know what problem to solve or has broad goals (awareness, reputation, credibility, visibility, perception)', pricing: { termLow: 1, termHigh: 2, budgetLow: 3000, budgetHigh: 4000 } },
      { name: 'Market & Competitive Research', recommend: 'conditional', condition: 'when client does not know competitors or requests differentiation', pricing: { termLow: 1, termHigh: 2, budgetLow: 2000, budgetHigh: 5000 } },
      { name: 'Audience Research & Segmentation', recommend: 'conditional', condition: 'when client does not know their audience, what inspires them, or how to reach them', pricing: { termLow: 1, termHigh: 2, budgetLow: 2000, budgetHigh: 5000 } }
    ],
    triggerPatterns: {
      direct: ['need a marketing strategy', 'marketing feels disjointed', 'don\'t have a plan', 'where to focus our budget', 'nothing seems connected'],
      indirect: ['marketing not producing results', 'conflicting messages', 'no customer journey', 'which channels to prioritize', 'marketing and sales not aligned', 'budget spread too thin'],
      situational: ['new fiscal year', 'leadership change', 'entering new market', 'product launch', 'competitive pressure', 'organizational shift'],
      performance: ['declining market share', 'acquisition costs increasing', 'ROI unknown', 'lead quality issues', 'lifetime value decreasing', 'inconsistent channel performance'],
      sampleLanguage: ['throwing spaghetti at the wall', 'don\'t know what\'s working', 'competitors seem to be everywhere', 'marketing and sales blame each other', 'never had a real strategy', 'channels aren\'t talking to each other', 'someone to make sense of all this', 'reactive instead of proactive']
    }
  },
  {
    id: 'brand',
    category: 'Brand Strategy & Expression',
    description: 'Define or refresh your brand foundation',
    engagementType: 'fixed_fee',
    services: [
      // Brand Strategy bundle
      { name: 'Brand Research (Compass)', recommend: 'always', condition: 'for all brand refresh projects', pricing: { termLow: 1, termHigh: 2, budgetLow: 3000, budgetHigh: 3000, bundle: 'Brand Strategy' } },
      { name: 'Stakeholder Interviews (IDIs)', recommend: 'always', condition: 'for all brand projects', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Rapid Discovery (Landscape & Audience)', recommend: 'always', condition: 'for all brand projects', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Brand Positioning', recommend: 'always', condition: 'for all brand projects', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Brand House Development', recommend: 'always', condition: 'for all brand projects', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Brand Workshop', recommend: 'always', condition: 'for all brand projects', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Authentic Foundation (Why, What, How)', recommend: 'always', condition: 'for all brand projects', pricing: { bundle: 'Brand Strategy' } },
      // Brand Expression - individual services
      { name: 'Tone of Voice', recommend: 'always', condition: 'for all brand projects', pricing: { termLow: 1, termHigh: 1, budgetLow: 2000, budgetHigh: 4000 } },
      { name: 'Manifesto', recommend: 'always', condition: 'for all brand projects', pricing: { termLow: 1, termHigh: 2, budgetLow: 2000, budgetHigh: 3000 } },
      { name: 'Visual Identity System', recommend: 'always', condition: 'for all brand projects', pricing: { termLow: 2, termHigh: 4, budgetLow: 10000, budgetHigh: 20000 } },
      { name: 'Logo/Wordmark Development', recommend: 'always', condition: 'for all brand projects', pricing: { termLow: 2, termHigh: 4, budgetLow: 8000, budgetHigh: 18000 } },
      // Brand Assets
      { name: 'Brand Deck Asset Production', recommend: 'conditional', condition: 'only if requested', pricing: { termLow: 1, termHigh: 2, budgetLow: 2000, budgetHigh: 6000 } },
      { name: 'Social Lock-ups', recommend: 'conditional', condition: 'only if requested', pricing: { termLow: 1, termHigh: 2, budgetLow: 2000, budgetHigh: 6000 } },
      { name: 'Brand Guidelines', recommend: 'conditional', condition: 'only if requested', pricing: { termLow: 2, termHigh: 3, budgetLow: 8000, budgetHigh: 10000 } }
    ],
    triggerPatterns: {
      direct: ['need to rebrand', 'brand feels outdated', 'need a new logo', 'brand doesn\'t reflect who we are', 'need brand guidelines', 'brand is inconsistent'],
      indirect: ['company evolved but identity hasn\'t', 'can\'t explain what makes us different', 'inconsistent messaging', 'employees can\'t articulate positioning', 'customer confusion', 'premium pricing not supported by perception'],
      situational: ['merger or acquisition', 'spin-off', 'new leadership', 'expansion beyond original scope', 'new markets', 'negative reputation', 'company milestone', 'IPO'],
      performance: ['brand awareness declining', 'NPS dropping', 'customer feedback about perception', 'can\'t command premium prices', 'losing deals to stronger brands', 'employee engagement declining'],
      sampleLanguage: ['nobody knows who we are', 'look just like everyone else', 'brand worked when we were small but we\'ve grown', 'customers don\'t understand our value', 'visual identity all over the place', 'embarrassed to hand out business cards', 'can\'t attract talent', 'different departments use different logos', 'evolved but brand hasn\'t', 'associated with something we don\'t do anymore', 'launching in new markets']
    }
  },
  {
    id: 'creative_production',
    category: 'Creative Production',
    description: 'Design, video, animation, and content creation',
    engagementType: 'tm',
    services: [
      // Creative Retainer bundle - all services priced together
      { name: 'Graphic Design', recommend: 'conditional', condition: 'only if requested', pricing: { termLow: 52, termHigh: 52, budgetLow: 24000, budgetHigh: 80000, bundle: 'Creative Retainer', note: 'Annual minimum commitment' } },
      { name: 'Video Production', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Animation & Motion Graphics', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Photography', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Copywriting', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Sales Collateral', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Presentation Design', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Social Media Content', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Campaign Asset Creation', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Brand Asset Library', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Content Ideation', recommend: 'conditional', condition: 'only if requested', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Transcreation (Multi-language)', recommend: 'conditional', condition: 'only if requested or translation/multi-language is mentioned', pricing: { bundle: 'Creative Retainer' } }
    ],
    triggerPatterns: {
      direct: ['need a brochure', 'need a video', 'don\'t have creative resources', 'need professional design', 'materials look amateurish', 'need campaign assets'],
      indirect: ['marketing team stretched thin', 'quality inconsistent', 'no in-house design', 'need specialized formats', 'high volume of creative needs', 'tight deadlines'],
      situational: ['campaign launch', 'trade show', 'sales team needs collateral', 'product launch', 'seasonal campaign', 'executive presentations'],
      performance: ['creative not generating engagement', 'sales team not using materials', 'A/B tests showing underperformance', 'feedback that materials aren\'t compelling', 'social engagement below benchmarks'],
      sampleLanguage: ['don\'t have designers on staff', 'team is overwhelmed', 'need a video but don\'t know where to start', 'sales deck needs updating', 'need assets for our campaign', 'everything takes too long to produce', 'competitors\' materials look more polished', 'have the strategy but need help executing']
    }
  },
  {
    id: 'influencer',
    category: 'Influencer Marketing',
    description: 'Leverage creator partnerships',
    engagementType: 'retainer',
    services: [
      // Influencer Retainer bundle
      { name: 'Influencer Strategy', recommend: 'always', condition: 'when influencer marketing is discussed', pricing: { termLow: 52, termHigh: 52, budgetLow: 30000, budgetHigh: 100000, bundle: 'Influencer Retainer', note: 'Annual retainer, excludes creator fees' } },
      { name: 'Creator Identification & Vetting', recommend: 'always', condition: 'when influencer marketing is discussed', pricing: { bundle: 'Influencer Retainer' } },
      { name: 'Influencer Campaign Management', recommend: 'always', condition: 'when influencer marketing is discussed', pricing: { bundle: 'Influencer Retainer' } },
      { name: 'Ambassador Programs', recommend: 'conditional', condition: 'only if long-term creator partnerships are requested', pricing: { bundle: 'Influencer Retainer' } },
      { name: 'UGC Programs', recommend: 'conditional', condition: 'only if user-generated content is requested', pricing: { bundle: 'Influencer Retainer' } }
    ],
    triggerPatterns: {
      direct: ['want to work with influencers', 'need an influencer campaign', 'reach audience through creators', 'tried influencer marketing but it didn\'t work'],
      indirect: ['difficulty reaching younger audiences', 'need authentic endorsements', 'product requires demonstration', 'brand awareness stalled', 'user-generated content insufficient'],
      situational: ['product launch needing buzz', 'new demographic market', 'brand relevance concerns', 'competitors using influencers', 'need authentic content at scale', 'event amplification'],
      performance: ['social engagement declining', 'owned content not resonating', 'advertising fatigue', 'high CPA on paid channels', 'brand trust declining'],
      sampleLanguage: ['can\'t break through on social', 'younger audiences don\'t trust us directly', 'competitors partnering with creators', 'need authentic voices', 'tried on our own but didn\'t see results', 'don\'t know how to find the right creators', 'need content that feels genuine', 'want to be part of the conversation on TikTok']
    }
  },
  {
    id: 'creative_campaigns',
    category: 'Creative Campaigns & Innovation',
    description: 'Develop breakthrough campaign concepts',
    engagementType: 'fixed_fee',
    services: [
      // Creative Campaigns bundle
      { name: 'Creative Platform Development', recommend: 'conditional', condition: 'when there is a request for a campaign or content series for owned, earned, paid, and/or social', pricing: { termLow: 2, termHigh: 7, budgetLow: 18000, budgetHigh: 30000, bundle: 'Creative Campaigns' } },
      { name: 'Big Idea Generation', recommend: 'conditional', condition: 'when client wants to make a splash, generate awareness, inspire media attention, or connect with audience', pricing: { bundle: 'Creative Campaigns' } },
      { name: 'Experiential Concepts', recommend: 'conditional', condition: 'when big idea development, media stunt, or event production are being recommended or requested', pricing: { bundle: 'Creative Campaigns' } }
    ],
    triggerPatterns: {
      direct: ['need a big idea', 'need a campaign concept', 'want something breakthrough', 'need a creative platform', 'marketing lacks unifying concept', 'marketing is uninspiring', 'breakthrough ideas'],
      indirect: ['campaigns feel tactical', 'each effort is standalone', 'difficulty creating memorable work', 'need to differentiate', 'brand awareness plateaued', 'work is boring', 'looks like everyone else'],
      situational: ['major launch', 'brand repositioning', 'new market entry', 'competitive threat', 'company transformation', 'major anniversary', 'category disruption'],
      performance: ['brand recall declining', 'campaign metrics mediocre', 'share of voice decreasing', 'advertising not breaking through', 'content engagement low', 'creative fatigue'],
      sampleLanguage: ['need something memorable', 'all our campaigns look the same', 'want to stand out', 'need an idea that can run for years', 'work doesn\'t break through the clutter', 'want something competitors can\'t copy', 'creative that people talk about', 'ads are forgettable', 'cut through the noise', 'campaigns are safe']
    }
  },
  {
    id: 'pr',
    category: 'Public Relations & Media Outreach',
    description: 'Media relations, press coverage, and ongoing media engagement',
    engagementType: 'retainer',
    services: [
      // Standard PR bundle
      { name: 'Media Relations', recommend: 'always', condition: 'when client requests comms, PR, earned media, awareness, or reputation', pricing: { termLow: 52, termHigh: 52, budgetLow: 180000, budgetHigh: 360000, bundle: 'Standard PR', note: 'Annual retainer ($15K-$30K/month)' } },
      { name: 'Press Kit Development', recommend: 'always', condition: 'when client requests comms, PR, earned media, awareness, or reputation', pricing: { bundle: 'Standard PR' } },
      // Individual services
      { name: 'Media Training', recommend: 'conditional', condition: 'when client mentions reputation, credibility, executive visibility, or requests directly', pricing: { termLow: 52, termHigh: 52, budgetLow: 20000, budgetHigh: 60000, note: 'Annual or per session' } },
      { name: 'Crisis Communications', recommend: 'conditional', condition: 'only if client mentions a crisis or urgent PR support', pricing: { termLow: 1, termHigh: 4, budgetLow: 40000, budgetHigh: 200000, note: 'T&M based on severity' } },
      { name: 'Media Monitoring', recommend: 'always', condition: 'when client requests comms, PR, earned media, awareness, reputation, or share of voice', pricing: { termLow: 52, termHigh: 52, budgetLow: 12000, budgetHigh: 40000, note: 'Annual, excludes tool costs' } },
      { name: 'Newsjacking Strategy', recommend: 'conditional', condition: 'only if requested or transcript mentions intercepting another news story', pricing: { termLow: 1, termHigh: 4, budgetLow: 10000, budgetHigh: 60000, note: 'T&M per opportunity' } },
      { name: 'Industry Domain Consultancy', recommend: 'conditional', condition: 'when client needs industry expertise and trend analysis', pricing: { termLow: 52, termHigh: 52, budgetLow: 52000, budgetHigh: 100000, note: 'Annual retainer' } }
    ],
    triggerPatterns: {
      direct: ['need PR', 'want media coverage', 'help with press relations', 'want to be in specific publications', 'need a PR agency', 'want to be seen as a source', 'need rapid response'],
      indirect: ['important news not getting coverage', 'lack of third-party credibility', 'competitors in media more', 'no journalist relationships', 'story not being told externally', 'need crisis preparedness', 'journalists covering competitors'],
      situational: ['product launch', 'funding announcement', 'executive hire', 'research release', 'awards', 'company milestone', 'crisis', 'merger announcement', 'industry event', 'breaking developments'],
      performance: ['low share of voice', 'minimal media mentions', 'negative coverage without response', 'lack of third-party validation', 'sales team lacking proof points', 'competitors quoted more'],
      sampleLanguage: ['have great news but nobody covers us', 'competitors always in the press', 'don\'t have relationships with journalists', 'don\'t know how to pitch media', 'need someone to tell our story', 'launching something big and need coverage', 'not prepared if something goes wrong', 'need credibility with our audience', 'when something happens we\'re never quoted', 'want to be top of mind for reporters']
    }
  },
  {
    id: 'executive_visibility',
    category: 'Executive Visibility & Thought Leadership',
    description: 'Elevate leadership profiles and establish authority',
    engagementType: 'retainer',
    services: [
      // Executive Visibility bundle
      { name: 'Executive Positioning Strategy', recommend: 'always', condition: 'for all executive visibility projects', pricing: { termLow: 52, termHigh: 52, budgetLow: 60000, budgetHigh: 180000, bundle: 'Executive Visibility', note: 'Annual retainer ($5K-$15K/month per executive)' } },
      { name: 'Thought Leadership Content', recommend: 'always', condition: 'for all executive visibility projects', pricing: { bundle: 'Executive Visibility' } },
      { name: 'Byline & Op-Ed Development', recommend: 'conditional', condition: 'when written thought leadership is requested', pricing: { bundle: 'Executive Visibility' } },
      { name: 'Speaking Opportunity Development', recommend: 'conditional', condition: 'when speaking engagements are requested', pricing: { bundle: 'Executive Visibility' } },
      { name: 'Executive Social Media', recommend: 'conditional', condition: 'when LinkedIn or social presence is requested', pricing: { bundle: 'Executive Visibility' } },
      { name: 'Awards Strategy', recommend: 'conditional', condition: 'when recognition programs are requested', pricing: { bundle: 'Executive Visibility' } },
      { name: 'Podcast Guest Strategy', recommend: 'conditional', condition: 'when podcast appearances are requested', pricing: { bundle: 'Executive Visibility' } }
    ],
    triggerPatterns: {
      direct: ['CEO needs to be more visible', 'position executives as experts', 'need thought leadership content', 'leaders need higher profile', 'leadership is invisible', 'ceo profile'],
      indirect: ['competitor executives more visible', 'difficulty attracting talent', 'investor relations need credibility', 'sales cycle requires leadership trust', 'industry influence desired', 'board wants more visible CEO'],
      situational: ['new CEO', 'IPO preparation', 'fundraising', 'conference schedule', 'speaking pipeline', 'award nominations', 'acquisition', 'crisis'],
      performance: ['low leadership recognition', 'executive content not engaging', 'speaking invitations not coming', 'board feedback about visibility', 'LinkedIn engagement low', 'not invited to speak'],
      sampleLanguage: ['CEO should be better known', 'position executive as expert', 'competitors\' leaders always at conferences', 'need help with LinkedIn presence', 'leadership has insights but nobody hears them', 'want execs writing about industry issues', 'need bylines and speaking opportunities', 'investors want visible leadership', 'credibility problem', 'communications is timid']
    }
  },
  {
    id: 'paid_social',
    category: 'Paid Social Media',
    description: 'Social advertising campaigns',
    engagementType: 'retainer',
    services: [
      // Paid Social bundle
      { name: 'Paid Social Strategy', recommend: 'always', condition: 'when paid social is discussed', pricing: { termLow: 52, termHigh: 52, budgetLow: 80000, budgetHigh: 200000, bundle: 'Paid Social', note: 'Annual retainer, excludes media spend' } },
      { name: 'Campaign Setup & Management', recommend: 'always', condition: 'when paid social is discussed', pricing: { bundle: 'Paid Social' } },
      { name: 'Audience Development & Targeting', recommend: 'always', condition: 'when paid social is discussed', pricing: { bundle: 'Paid Social' } },
      { name: 'Ad Creative Development', recommend: 'conditional', condition: 'when creative support is needed', pricing: { bundle: 'Paid Social' } },
      { name: 'Retargeting Campaigns', recommend: 'conditional', condition: 'when retargeting or remarketing is mentioned', pricing: { bundle: 'Paid Social' } },
      { name: 'Paid Social Reporting', recommend: 'always', condition: 'when paid social is discussed', pricing: { bundle: 'Paid Social' } }
    ],
    triggerPatterns: {
      direct: ['need social media ads', 'want paid social campaigns', 'help with Facebook/Instagram/LinkedIn ads', 'social ads aren\'t working'],
      indirect: ['organic reach declining', 'need precise targeting', 'have budget but no expertise', 'campaigns underperforming', 'need lead generation'],
      situational: ['campaign launch', 'product launch', 'event promotion', 'time-sensitive offers', 'competitive pressure on social'],
      performance: ['high CPA on social', 'low conversion rates', 'ad fatigue', 'poor targeting results', 'ROAS below benchmarks'],
      sampleLanguage: ['organic reach has tanked', 'spending money but not seeing results', 'don\'t know if targeting is right', 'competitors\' ads everywhere', 'need to generate leads from social', 'not sure which platforms to focus on', 'social advertising is inconsistent', 'want to reach specific audience']
    }
  },
  {
    id: 'seo',
    category: 'Search Engine Optimization',
    description: 'Improve organic search visibility',
    engagementType: 'retainer',
    services: [
      // SEO bundle
      { name: 'SEO Strategy & Audit', recommend: 'always', condition: 'for all SEO engagements', pricing: { termLow: 52, termHigh: 52, budgetLow: 60000, budgetHigh: 120000, bundle: 'SEO Retainer', note: 'Annual retainer ($5K-$10K/month), 6-month minimum' } },
      { name: 'Technical SEO', recommend: 'always', condition: 'for all SEO engagements', pricing: { bundle: 'SEO Retainer' } },
      { name: 'On-Page Optimization', recommend: 'always', condition: 'for all SEO engagements', pricing: { bundle: 'SEO Retainer' } },
      { name: 'Content SEO Strategy', recommend: 'conditional', condition: 'when content marketing is included', pricing: { bundle: 'SEO Retainer' } },
      { name: 'Link Building', recommend: 'conditional', condition: 'when off-page SEO is requested', pricing: { bundle: 'SEO Retainer' } },
      { name: 'Local SEO', recommend: 'conditional', condition: 'when local/geographic targeting is needed', pricing: { bundle: 'SEO Retainer' } },
      { name: 'SEO Reporting', recommend: 'always', condition: 'for all SEO engagements', pricing: { bundle: 'SEO Retainer' } }
    ],
    triggerPatterns: {
      direct: ['don\'t rank on Google', 'need SEO help', 'organic traffic declining', 'want to rank for keywords'],
      indirect: ['website not appearing in search', 'competitors outranking us', 'paid search costs too high', 'content not getting discovered', 'technical website issues'],
      situational: ['website redesign', 'new content strategy', 'competitive threat in search', 'market expansion', 'algorithm update impact'],
      performance: ['declining organic traffic', 'keyword rankings dropping', 'low domain authority', 'high reliance on paid search', 'competitor visibility increasing'],
      sampleLanguage: ['don\'t show up when people search for what we do', 'competitors always rank above us', 'website redesign and traffic disappeared', 'paying too much for search ads', 'people can\'t find us online', 'content doesn\'t rank', 'don\'t understand SEO', 'hit by a Google update']
    }
  },
  {
    id: 'geo',
    category: 'Generative Engine Optimization (GEO)',
    description: 'Optimize for AI-powered search',
    engagementType: 'retainer',
    services: [
      // GEO bundle
      { name: 'GEO Strategy & Audit', recommend: 'always', condition: 'for all GEO engagements', pricing: { termLow: 52, termHigh: 52, budgetLow: 50000, budgetHigh: 80000, bundle: 'GEO Retainer', note: 'Annual retainer, often bundled with SEO' } },
      { name: 'AI Search Optimization', recommend: 'always', condition: 'for all GEO engagements', pricing: { bundle: 'GEO Retainer' } },
      { name: 'Structured Data Implementation', recommend: 'conditional', condition: 'when technical implementation is needed', pricing: { bundle: 'GEO Retainer' } },
      { name: 'Content Optimization for AI', recommend: 'always', condition: 'for all GEO engagements', pricing: { bundle: 'GEO Retainer' } }
    ],
    triggerPatterns: {
      direct: ['need to show up in AI search', 'want to be cited by ChatGPT', 'optimize for AI answers'],
      indirect: ['concern about AI changing search', 'questions about future of organic search', 'interest in emerging search', 'competitors in AI content'],
      situational: ['AI search feature launches', 'industry AI conversations', 'competitive monitoring', 'future planning'],
      performance: ['declining traditional search traffic', 'absence from AI answers', 'competitors cited in AI', 'audience behavior changing'],
      sampleLanguage: ['people using AI to search now', 'will ChatGPT mention us', 'how do we prepare for AI search', 'content needs to be AI-friendly', 'search is changing', 'want to be the authoritative source AI cites']
    }
  },
  {
    id: 'measurement',
    category: 'Measurement & Analytics',
    description: 'Track and prove marketing ROI',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Analytics Strategy', recommend: 'always', condition: 'for all measurement engagements', pricing: { termLow: 2, termHigh: 4, budgetLow: 10000, budgetHigh: 20000 } },
      { name: 'Dashboard Development', recommend: 'conditional', condition: 'when reporting visualization is requested', pricing: { termLow: 2, termHigh: 4, budgetLow: 10000, budgetHigh: 20000 } },
      { name: 'Attribution Modeling', recommend: 'conditional', condition: 'when multi-channel attribution is needed', pricing: { termLow: 1, termHigh: 2, budgetLow: 10000, budgetHigh: 20000 } },
      { name: 'Marketing ROI Framework', recommend: 'always', condition: 'for all measurement engagements', pricing: { termLow: 2, termHigh: 3, budgetLow: 10000, budgetHigh: 20000 } },
      { name: 'KPI Development', recommend: 'always', condition: 'for all measurement engagements', pricing: { termLow: 1, termHigh: 2, budgetLow: 10000, budgetHigh: 20000 } },
      { name: 'Data Integration', recommend: 'conditional', condition: 'when multiple data sources need connecting', pricing: { termLow: 2, termHigh: 4, budgetLow: 20000, budgetHigh: 30000 } }
    ],
    triggerPatterns: {
      direct: ['don\'t know if marketing is working', 'need better reporting', 'need to track performance', 'can\'t prove ROI'],
      indirect: ['decisions without data', 'tools not integrated', 'leadership asking for accountability', 'budget justification challenges', 'unclear attribution'],
      situational: ['new leadership demanding accountability', 'budget review', 'board reporting', 'marketing technology audit', 'new initiatives'],
      performance: ['can\'t report on basic metrics', 'data conflicts between systems', 'no baseline', 'unknown customer journey', 'efficiency unclear'],
      sampleLanguage: ['have no idea what\'s working', 'data is all over the place', 'can\'t connect marketing to sales', 'board wants to see ROI', 'decisions based on gut feel', 'each tool tells us something different', 'need a dashboard that makes sense', 'can\'t justify marketing spend']
    }
  },
  {
    id: 'gtm',
    category: 'Go-to-Market Strategy',
    description: 'Launch products and enter markets',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Go-to-Market Strategy', recommend: 'always', condition: 'for all GTM projects', pricing: { termLow: 1, termHigh: 3, budgetLow: 10000, budgetHigh: 30000, bundle: 'GTM Strategy' } },
      { name: 'Launch Planning', recommend: 'always', condition: 'for all GTM projects', pricing: { bundle: 'GTM Strategy' } },
      { name: 'Market Entry Strategy', recommend: 'conditional', condition: 'when entering new markets', pricing: { bundle: 'GTM Strategy' } },
      { name: 'Channel Strategy', recommend: 'conditional', condition: 'when distribution channels need defining', pricing: { bundle: 'GTM Strategy' } },
      { name: 'Sales Enablement', recommend: 'conditional', condition: 'when sales team support is needed', pricing: { bundle: 'GTM Strategy' } }
    ],
    triggerPatterns: {
      direct: ['launching a new product', 'need a GTM strategy', 'need to bring this to market', 'entering a new market'],
      indirect: ['uncertainty about target audience', 'no launch plan', 'pricing and positioning questions', 'channel strategy unclear', 'sales and marketing alignment needed'],
      situational: ['product development completion', 'service line expansion', 'market expansion', 'competitive response', 'acquisition of new capabilities'],
      performance: ['previous launches underperformed', 'new product uptake slow', 'market penetration below expectations', 'customer acquisition challenges', 'sales cycle too long'],
      sampleLanguage: ['launching in Q[X] and need a plan', 'built something great but don\'t know how to sell it', 'need to understand who will buy this', 'how do we price this', 'entering a new category', 'need to generate demand quickly', 'last launch didn\'t go well', 'have the product but not the plan']
    }
  },
  {
    id: 'events',
    category: 'Event Planning & Production',
    description: 'Plan and execute events',
    engagementType: 'fixed_fee',
    services: [
      // Events bundle
      { name: 'Event Strategy', recommend: 'always', condition: 'for all event projects', pricing: { termLow: 4, termHigh: 16, budgetLow: 50000, budgetHigh: 180000, bundle: 'Event Production', note: 'Excludes venue and vendor costs' } },
      { name: 'Event Production', recommend: 'always', condition: 'for all event projects', pricing: { bundle: 'Event Production' } },
      { name: 'Virtual Event Production', recommend: 'conditional', condition: 'when virtual or hybrid events are needed', pricing: { bundle: 'Event Production' } },
      { name: 'Trade Show Management', recommend: 'conditional', condition: 'when trade show participation is involved', pricing: { bundle: 'Event Production' } },
      { name: 'Speaker Management', recommend: 'conditional', condition: 'when speakers need coordination', pricing: { bundle: 'Event Production' } },
      { name: 'Event Marketing', recommend: 'conditional', condition: 'when event promotion is needed', pricing: { bundle: 'Event Production' } }
    ],
    triggerPatterns: {
      direct: ['have an event coming up', 'need to plan a conference', 'need event support'],
      indirect: ['team doesn\'t have event experience', 'past events had issues', 'budget requires professional management', 'complex logistics', 'need creative concepts'],
      situational: ['annual conference', 'product launch event', 'customer events', 'trade show', 'employee events', 'milestone celebrations', 'investor events'],
      performance: ['event feedback poor', 'attendance declining', 'event ROI unclear', 'logistics challenges', 'content quality inconsistent'],
      sampleLanguage: ['have our annual conference and need help', 'want to make this event memorable', 'don\'t have time to plan ourselves', 'need vendors and don\'t know where to start', 'last event was a disaster', 'want to elevate our event experience', 'need creative ideas for the event', 'budget is tight but want something special']
    }
  },
  {
    id: 'training',
    category: 'Communications Training',
    description: 'Media and communications training',
    engagementType: 'fixed_fee',
    services: [
      // Training bundle
      { name: 'Media & Spokesperson Training', recommend: 'always', condition: 'for all communications training', pricing: { termLow: 2, termHigh: 4, budgetLow: 20000, budgetHigh: 50000, bundle: 'Communications Training', note: 'Per session or program' } },
      { name: 'Presentation Training', recommend: 'conditional', condition: 'when presentation skills are needed', pricing: { bundle: 'Communications Training' } },
      { name: 'Crisis Communications Training', recommend: 'conditional', condition: 'when crisis preparedness is needed', pricing: { bundle: 'Communications Training' } },
      { name: 'Brand Training', recommend: 'conditional', condition: 'when brand alignment training is needed', pricing: { bundle: 'Communications Training' } }
    ],
    triggerPatterns: {
      direct: ['team needs media training', 'need communications training', 'executives need spokesperson prep', 'want internal training'],
      indirect: ['executives uncomfortable with media', 'teams lack marketing skills', 'inconsistent brand representation', 'new hires need onboarding', 'crisis preparedness concerns'],
      situational: ['new spokesperson', 'upcoming media tour', 'crisis preparation', 'marketing team expansion', 'leadership changes', 'brand launch'],
      performance: ['poor media interview performance', 'inconsistent external communication', 'brand message dilution', 'crisis response failures', 'employee communications issues'],
      sampleLanguage: ['CEO freezes in front of cameras', 'need help training our team', 'spokespeople need practice', 'want to be prepared if something goes wrong', 'new team members need to understand our brand', 'marketing team has skill gaps']
    }
  },
  {
    id: 'impact',
    category: 'Impact & Purpose Communications',
    description: 'Sustainability, impact, and purpose communications',
    engagementType: 'fixed_fee',
    services: [
      // Impact bundle
      { name: 'Impact Report Writing & Design', recommend: 'always', condition: 'when impact/sustainability report is needed', pricing: { termLow: 4, termHigh: 10, budgetLow: 60000, budgetHigh: 150000, bundle: 'Impact Communications' } },
      { name: 'Sustainability Communications', recommend: 'conditional', condition: 'when sustainability messaging is needed', pricing: { bundle: 'Impact Communications' } },
      { name: 'ESG Reporting', recommend: 'conditional', condition: 'when ESG requirements exist', pricing: { bundle: 'Impact Communications' } },
      { name: 'CSR Communications', recommend: 'conditional', condition: 'when corporate responsibility messaging is needed', pricing: { bundle: 'Impact Communications' } },
      { name: 'Purpose Discovery Workshop', recommend: 'conditional', condition: 'when purpose definition is needed', pricing: { bundle: 'Impact Communications' } },
      { name: 'Theory of Change', recommend: 'conditional', condition: 'when impact framework is needed', pricing: { bundle: 'Impact Communications' } }
    ],
    triggerPatterns: {
      direct: ['need an annual report', 'need an impact report', 'need help with CSR report', 'want to showcase our impact', 'impact story', 'sustainability story', 'esg communications', 'purpose driven'],
      indirect: ['stakeholder expectations for transparency', 'ESG reporting requirements', 'investor relations needs', 'employee engagement communications', 'competitor reports setting higher bar', 'customers want to know our values'],
      situational: ['annual reporting cycle', 'sustainability milestones', 'stakeholder meeting', 'grant reporting', 'public accountability', 'B Corp certification'],
      performance: ['stakeholder feedback on transparency', 'competitor reports more compelling', 'internal data not shared', 'impact not being communicated', 'brand purpose scores low'],
      sampleLanguage: ['do great work but don\'t communicate it', 'report needs to be more compelling', 'have the data but need help presenting it', 'stakeholders want more transparency', 'competitors have beautiful impact reports', 'need to tell our sustainability story', 'want people to know we\'re more than just a business']
    }
  },
  {
    id: 'content_production',
    category: 'Content Ideation & Production',
    description: 'Content strategy and creation',
    engagementType: 'tm',
    services: [
      // Content Production bundle
      { name: 'Content Strategy', recommend: 'always', condition: 'when client needs content to be produced', pricing: { termLow: 12, termHigh: 52, budgetLow: 60000, budgetHigh: 180000, bundle: 'Content Production', note: 'Quarterly to annual commitment' } },
      { name: 'Content Calendar Development', recommend: 'always', condition: 'when client needs content produced and distributed over time', pricing: { bundle: 'Content Production' } },
      { name: 'Blog & Article Writing', recommend: 'conditional', condition: 'only if requested or included in Additional Notes', pricing: { bundle: 'Content Production' } },
      { name: 'Podcast Production', recommend: 'conditional', condition: 'only if requested or included in Additional Notes', pricing: { bundle: 'Content Production' } },
      { name: 'Video Content Series', recommend: 'conditional', condition: 'only if requested or included in Additional Notes', pricing: { bundle: 'Content Production' } },
      { name: 'Social Content Creation', recommend: 'conditional', condition: 'only if requested or included in Additional Notes', pricing: { bundle: 'Content Production' } },
      { name: 'Thought Leadership Content', recommend: 'conditional', condition: 'only if requested or included in Additional Notes', pricing: { bundle: 'Content Production' } },
      { name: 'Social Content Creation (Reactive)', recommend: 'conditional', condition: 'only if requested or social media management needed', pricing: { bundle: 'Content Production' } }
    ],
    triggerPatterns: {
      direct: ['need more content', 'need a content strategy', 'run out of ideas', 'need help producing content'],
      indirect: ['content calendar empty', 'publishing frequency declined', 'team stretched too thin', 'quality inconsistent', 'topics not resonating'],
      situational: ['blog launch', 'newsletter launch', 'podcast initiative', 'video series', 'campaign content', 'thought leadership program'],
      performance: ['content engagement declining', 'audience growth stalled', 'SEO content needed', 'social content underperforming', 'lead magnet requests'],
      sampleLanguage: ['know we need content but don\'t know what to create', 'started a blog but ran out of steam', 'team doesn\'t have time to write', 'need fresh ideas', 'content isn\'t getting engagement', 'want to start a podcast', 'need more lead magnets']
    }
  },
  {
    id: 'performance_marketing',
    category: 'Performance Marketing & Optimization',
    description: 'Optimize for conversions and efficiency',
    engagementType: 'retainer',
    services: [
      // Performance Marketing bundle
      { name: 'Conversion Rate Optimization', recommend: 'always', condition: 'for all performance marketing', pricing: { termLow: 52, termHigh: 52, budgetLow: 120000, budgetHigh: 200000, bundle: 'Performance Marketing', note: 'Annual retainer ($10K-$17K/month)' } },
      { name: 'A/B Testing Program', recommend: 'always', condition: 'for all performance marketing', pricing: { bundle: 'Performance Marketing' } },
      { name: 'Landing Page Optimization', recommend: 'conditional', condition: 'when landing pages need improvement', pricing: { bundle: 'Performance Marketing' } },
      { name: 'Funnel Optimization', recommend: 'conditional', condition: 'when conversion funnel needs improvement', pricing: { bundle: 'Performance Marketing' } },
      { name: 'Marketing Automation', recommend: 'conditional', condition: 'when automation is requested', pricing: { bundle: 'Performance Marketing' } },
      { name: 'Performance Reporting (Owned/Earned/Paid/Social)', recommend: 'always', condition: 'for all performance marketing', pricing: { bundle: 'Performance Marketing' } }
    ],
    triggerPatterns: {
      direct: ['need to optimize campaigns', 'want to A/B test', 'conversion rates need improvement', 'need CRO help'],
      indirect: ['campaigns not meeting targets', 'high traffic low conversion', 'marketing efficiency concerns', 'budget pressure', 'data-driven culture needed'],
      situational: ['new campaign needing optimization', 'declining performance', 'budget cuts', 'competitive pressure on costs', 'new conversion goals'],
      performance: ['conversion rates below benchmark', 'CPA rising', 'ROAS declining', 'landing page performance poor', 'funnel dropoff identified'],
      sampleLanguage: ['driving traffic but no one converts', 'campaigns used to work better', 'need to get more from our budget', 'want to test different approaches', 'something\'s broken in our funnel', 'need to understand what\'s working', 'leaving money on the table']
    }
  },
  {
    id: 'project_management',
    category: 'Project Management',
    description: 'Coordinate complex marketing initiatives',
    engagementType: 'any',
    services: [
      // Project Management - percentage based
      { name: 'Project Management', recommend: 'always', condition: 'when PM support is requested', pricing: { percentageOfProject: 10, note: 'Approximately 10% of total project fee. Not required on PR/Earned-only engagements.' } },
      { name: 'Marketing Operations', recommend: 'conditional', condition: 'when operational support is needed', pricing: { percentageOfProject: 10 } },
      { name: 'Agency Coordination', recommend: 'conditional', condition: 'when multiple agencies need coordination', pricing: { percentageOfProject: 10 } },
      { name: 'Resource Planning', recommend: 'conditional', condition: 'when resource allocation is needed', pricing: { percentageOfProject: 10 } }
    ],
    triggerPatterns: {
      direct: ['need help managing projects', 'overwhelmed with coordination', 'need a PM'],
      indirect: ['projects always late', 'over budget', 'multiple agencies not coordinated', 'quality control problems'],
      situational: ['complex campaign launch', 'multiple initiatives', 'major event', 'organizational change', 'agency consolidation'],
      performance: ['missed deadlines', 'budget overruns', 'quality inconsistencies', 'team burnout', 'stakeholder dissatisfaction'],
      sampleLanguage: ['things keep falling through the cracks', 'can\'t keep all the pieces coordinated', 'internal team is overwhelmed', 'projects always go over budget', 'need someone to keep everything on track', 'communication is a mess']
    }
  }
];

// Helper function to extract service name from service object or string
const getServiceName = (service) => {
  return typeof service === 'object' ? service.name : service;
};

// Helper function to get all service names from a trigger
const getServiceNames = (trigger) => {
  return trigger.services.map(getServiceName);
};

// ============================================================================
// ENGAGEMENT TYPES FOR DRAFTING
// ============================================================================
const DRAFT_ENGAGEMENT_TYPES = [
  { value: 'fixed_fee', label: 'Fixed Fee', description: 'Set price for defined deliverables' },
  { value: 'retainer', label: 'Retainer', description: 'Ongoing monthly engagement' },
  { value: 'tm', label: 'Time & Materials', description: 'Hourly billing with minimum commitment' },
  { value: 'integrated', label: 'Integrated', description: 'Multi-phase with mixed billing models' },
  { value: 'tm_cap', label: 'T&M with Cap', description: 'Hourly with maximum (client request only)' }
];

// Engagement type recommendations based on service categories
const ENGAGEMENT_TYPE_RECOMMENDATIONS = {
  // Fixed Fee is best for these categories
  fixed_fee_preferred: [
    'website',             // Website & App Development
    'brand',               // Brand Strategy & Expression
    'events',              // Event Planning & Production
    'integrated_strategy', // Upfront planning and strategy work
    'creative_campaigns',  // Ring-fenced campaigns
    'gtm',                 // Go-to-Market Strategy
    'training',            // Communications Training
    'impact',              // Impact & Purpose Communications
    'measurement',         // Measurement & Analytics (setup)
  ],
  // T&M is best for these (with minimum spend)
  tm_preferred: [
    'creative_production', // Creative retainers
    'content_production',  // Content ideation & production
  ],
  // Retainer is best for these professional services
  retainer_preferred: [
    'pr',                  // Public Relations & Media Outreach
    'executive_visibility', // Thought Leadership
    'paid_social',         // Paid Social Media
    'seo',                 // Search Engine Optimization
    'geo',                 // Generative Engine Optimization
    'performance_marketing', // Performance Marketing & Optimization
    'influencer',          // Influencer Marketing
  ],
  // T&M with Cap - only when client specifically requests
  tm_cap_preferred: [],  // Never recommended by default
  // Project Management can be applied to any engagement type
  any_preferred: [
    'project_management',  // Project Management (overlay)
  ]
};

// Helper to determine billing model for a category
const getCategoryBillingModel = (categoryId) => {
  if (ENGAGEMENT_TYPE_RECOMMENDATIONS.fixed_fee_preferred.includes(categoryId)) return 'fixed_fee';
  if (ENGAGEMENT_TYPE_RECOMMENDATIONS.tm_preferred.includes(categoryId)) return 'tm';
  if (ENGAGEMENT_TYPE_RECOMMENDATIONS.retainer_preferred.includes(categoryId)) return 'retainer';
  if (ENGAGEMENT_TYPE_RECOMMENDATIONS.any_preferred.includes(categoryId)) return 'any';
  return 'fixed_fee'; // default
};

// Helper to analyze selected services and determine if integrated billing is needed
const analyzeServiceBillingModels = (selectedServices) => {
  const categoryBillingModels = {};
  const billingModelCategories = { fixed_fee: [], tm: [], retainer: [] };
  
  SERVICE_TRIGGERS.forEach(trigger => {
    const serviceNames = getServiceNames(trigger);
    const matchingServices = serviceNames.filter(s => selectedServices.includes(s));
    if (matchingServices.length > 0 && trigger.id !== 'project_management') {
      const billingModel = getCategoryBillingModel(trigger.id);
      if (billingModel !== 'any') {
        categoryBillingModels[trigger.id] = {
          category: trigger.category,
          billingModel: billingModel,
          services: matchingServices
        };
        billingModelCategories[billingModel].push({
          id: trigger.id,
          category: trigger.category,
          services: matchingServices
        });
      }
    }
  });
  
  // Count distinct billing models needed
  const activeBillingModels = Object.keys(billingModelCategories).filter(
    model => billingModelCategories[model].length > 0
  );
  
  return {
    categoryBillingModels,
    billingModelCategories,
    activeBillingModels,
    needsIntegrated: activeBillingModels.length > 1
  };
};

// Get engagement type recommendation based on selected services
const getEngagementTypeRecommendation = (selectedServices, selectedTriggers, currentEngagementType) => {
  if (!selectedServices || selectedServices.length === 0) return null;
  
  // Analyze billing models needed
  const billingAnalysis = analyzeServiceBillingModels(selectedServices);
  
  // Count services by their parent category
  const categoryCount = {};
  SERVICE_TRIGGERS.forEach(trigger => {
    const serviceNames = getServiceNames(trigger);
    const matchingServices = serviceNames.filter(s => selectedServices.includes(s));
    if (matchingServices.length > 0) {
      categoryCount[trigger.id] = matchingServices.length;
    }
  });
  
  const categories = Object.keys(categoryCount);
  if (categories.length === 0) return null;
  
  // Determine the dominant category
  const dominantCategory = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  // Project management can be applied to any engagement type - skip recommendation
  if (dominantCategory === 'project_management' && categories.length === 1) {
    return null;
  }
  
  // CHECK FOR INTEGRATED ENGAGEMENT FIRST
  if (billingAnalysis.needsIntegrated) {
    const modelSummary = billingAnalysis.activeBillingModels.map(model => {
      const cats = billingAnalysis.billingModelCategories[model];
      const modelLabel = model === 'fixed_fee' ? 'Fixed Fee' : model === 'tm' ? 'Time & Materials' : 'Retainer';
      return `${modelLabel}: ${cats.map(c => c.category).join(', ')}`;
    }).join(' | ');
    
    // If integrated is already selected, confirm it's good
    if (currentEngagementType === 'integrated') {
      return {
        type: 'confirmation',
        title: 'Integrated Engagement Recommended',
        message: `Your selected services span multiple billing models. The SOW will be structured with separate sections: ${modelSummary}`,
        recommendedType: 'integrated',
        budgetGuidance: 'Present fees by section: Fixed Fee phases with milestone payments, Retainer services as monthly fees, and T&M work with minimum commitments and hourly rates.',
        billingAnalysis: billingAnalysis
      };
    }
    
    // Suggest switching to integrated
    return {
      type: 'suggestion',
      title: 'Consider Integrated Engagement',
      message: `Your selected services span multiple billing models (${billingAnalysis.activeBillingModels.join(', ')}). An Integrated engagement will structure the SOW with appropriate sections for each: ${modelSummary}`,
      recommendedType: 'integrated',
      budgetGuidance: 'Present fees by section: Fixed Fee phases with milestone payments, Retainer services as monthly fees, and T&M work with minimum commitments and hourly rates.',
      billingAnalysis: billingAnalysis
    };
  }
  
  // If T&M with Cap is selected, provide specific guidance
  if (currentEngagementType === 'tm_cap') {
    return {
      type: 'warning',
      title: 'T&M with Cap: Client Request Only',
      message: 'Time & Materials with Cap should only be used when specifically requested by the client. It shifts risk to the agency. Consider if Fixed Fee or standard T&M would be more appropriate.',
      recommendedType: null,
      budgetGuidance: 'If proceeding with T&M Cap: Present cap amount with clear scope boundaries, notification thresholds at 75% consumption, and explicit language that work stops when cap is reached unless client authorizes additional budget.'
    };
  }
  
  // Check what engagement type is recommended for these services
  let recommendedType = null;
  let reason = '';
  let budgetGuidance = '';
  
  // Check fixed fee preferred
  if (ENGAGEMENT_TYPE_RECOMMENDATIONS.fixed_fee_preferred.includes(dominantCategory)) {
    recommendedType = 'fixed_fee';
    if (dominantCategory === 'website') {
      reason = 'Website and app production projects have well-defined deliverables that are best suited to Fixed Fee pricing.';
      budgetGuidance = 'Present total project fee with milestone-based payments (e.g., 50% at kickoff, 25% at design approval, 25% at launch).';
    } else if (dominantCategory === 'brand') {
      reason = 'Branding projects (strategy and expression) have defined phases and deliverables best suited to Fixed Fee pricing. Minimum project value: $50,000.';
      budgetGuidance = 'Present total project fee with phase-based payments aligned to Discovery, Strategy, and Expression phases.';
    } else if (dominantCategory === 'events') {
      reason = 'Event projects have fixed dates and defined deliverables best suited to Fixed Fee pricing.';
      budgetGuidance = 'Present total project fee with milestone payments tied to planning phases and event date.';
    } else if (dominantCategory === 'integrated_strategy') {
      reason = 'Upfront planning and strategy work has defined deliverables best suited to Fixed Fee pricing.';
      budgetGuidance = 'Present total project fee with milestone-based payments tied to deliverable phases.';
    } else if (dominantCategory === 'creative_campaigns') {
      reason = 'Ring-fenced campaigns with defined deliverables are best suited to Fixed Fee pricing.';
      budgetGuidance = 'Present total project fee with milestone-based payments tied to campaign phases.';
    } else if (dominantCategory === 'gtm') {
      reason = 'Go-to-Market strategy projects have defined phases and deliverables best suited to Fixed Fee pricing.';
      budgetGuidance = 'Present total project fee with milestone-based payments tied to GTM phases.';
    } else if (dominantCategory === 'training') {
      reason = 'Training engagements have defined sessions and deliverables best suited to Fixed Fee pricing.';
      budgetGuidance = 'Present total project fee per training session or program.';
    } else if (dominantCategory === 'impact') {
      reason = 'Impact and purpose communications projects have defined deliverables best suited to Fixed Fee pricing.';
      budgetGuidance = 'Present total project fee with milestone-based payments tied to deliverable phases.';
    } else if (dominantCategory === 'measurement') {
      reason = 'Measurement and analytics setup has defined deliverables best suited to Fixed Fee pricing.';
      budgetGuidance = 'Present total project fee for setup. Consider ongoing retainer for maintenance and reporting.';
    }
  }
  // Check T&M preferred
  else if (ENGAGEMENT_TYPE_RECOMMENDATIONS.tm_preferred.includes(dominantCategory) || 
           categories.some(c => ['creative_production', 'content_production'].includes(c))) {
    recommendedType = 'tm';
    reason = 'Creative and content work where deliverables evolve is best suited to Time & Materials with a minimum spend commitment. Include monthly/quarterly planning and prioritization language.';
    budgetGuidance = 'Present as minimum commitment (e.g., $24,000 annual minimum for creative retainer) with hourly rates for work. Include language about monthly planning sessions to prioritize work. Avoid "drawdown" language.';
  }
  // Check retainer preferred
  else if (ENGAGEMENT_TYPE_RECOMMENDATIONS.retainer_preferred.some(c => categories.includes(c))) {
    recommendedType = 'retainer';
    if (categories.includes('pr')) {
      reason = 'PR and media outreach are ongoing professional services best suited to a monthly Retainer structure. Minimum retainer: $15,000/month.';
      budgetGuidance = 'Present as monthly retainer fee with defined scope of activities per month. Include utilization tracking and overage rates.';
    } else if (categories.includes('executive_visibility')) {
      reason = 'Thought leadership is an ongoing professional service best suited to a monthly Retainer structure.';
      budgetGuidance = 'Present as monthly retainer fee with defined activities. Include utilization tracking.';
    } else if (categories.includes('paid_social')) {
      reason = 'Paid social media management is an ongoing service best suited to a monthly Retainer structure.';
      budgetGuidance = 'Present as monthly retainer fee with defined scope. Separate media spend from agency fees.';
    } else if (categories.includes('seo') || categories.includes('geo')) {
      reason = 'SEO and GEO are ongoing optimization services best suited to a monthly Retainer structure.';
      budgetGuidance = 'Present as monthly retainer fee with defined activities and reporting.';
    } else if (categories.includes('performance_marketing')) {
      reason = 'Performance marketing optimization is an ongoing service best suited to a monthly Retainer structure.';
      budgetGuidance = 'Present as monthly retainer fee with defined scope and measurement reporting.';
    } else if (categories.includes('influencer')) {
      reason = 'Influencer marketing is an ongoing service best suited to a monthly Retainer structure.';
      budgetGuidance = 'Present as monthly retainer fee with defined scope. Include utilization tracking and overage rates.';
    } else {
      reason = 'These professional services are best suited to a monthly Retainer structure.';
      budgetGuidance = 'Present as monthly retainer fee with defined scope and utilization tracking.';
    }
  }
  
  // If current selection doesn't match recommendation
  if (recommendedType && currentEngagementType && currentEngagementType !== recommendedType && currentEngagementType !== 'integrated') {
    return {
      type: 'suggestion',
      title: 'Consider a Different Engagement Type',
      message: reason,
      recommendedType: recommendedType,
      budgetGuidance: budgetGuidance
    };
  }
  
  // If selection matches recommendation, provide positive confirmation
  if (recommendedType && currentEngagementType === recommendedType) {
    return {
      type: 'confirmation',
      title: 'Good Match',
      message: reason,
      recommendedType: recommendedType,
      budgetGuidance: budgetGuidance
    };
  }
  
  return null;
};

// ============================================================================
// REVIEW ENGAGEMENT TYPES (existing)
// ============================================================================
const REVIEW_ENGAGEMENT_TYPES = [
  { value: 'branding', label: 'Branding', description: 'Brand strategy, identity, guidelines' },
  { value: 'website', label: 'Website', description: 'Web design, development, CMS' },
  { value: 'pr_comms', label: 'PR / Communications', description: 'Media relations, thought leadership' },
  { value: 'creative_retainer', label: 'Creative Retainer', description: 'Ongoing creative support' },
  { value: 'integrated', label: 'Integrated', description: 'Multi-service campaigns' }
];

// ============================================================================
// ASSESSMENT FRAMEWORK (Comprehensive - for review flow)
// ============================================================================
const ASSESSMENT_FRAMEWORK = `
# SOW Assessment Framework (Comprehensive)

A Statement of Work serves as both a legal document and project management tool. Its purposes are:
- Establishing clear, mutual understanding about what is being delivered, how, when, and under what terms
- Transforming high-level commitments into actionable plans
- Preventing scope creep by distinguishing between what is included and what falls outside boundaries
- Reducing disputes by establishing accountability measures and performance standards
- Serving as the single source of truth throughout the project lifecycle

## Reference Standards by Engagement Type
- Branding: Switch Energy Alliance SOW (R1000)
- Website: Echogen SOW  
- Integrated: DER Coalition SOW (R9278)
- Creative Retainers: Integrated Creative & Strategic Support Retainer
- PR/Comms: TerraPower UK PR Support SOW

## Antenna Group Pricing Minimums
When recommending budget language, DO NOT invent numbers. Use "$xxxx.xx" as placeholder UNLESS:
- The SOW already contains specific budget values (use those)
- It's one of these known minimums:
  • Branding Strategy & Expression projects: $50,000 minimum
  • Creative T&M retainer deposit: $24,000 minimum
  • Brand assessment: $4,000
  • Minimum retainers: $15,000

---

## PART 1: ESSENTIAL SOW COMPONENTS (Verify presence and quality)

### 1.1 Project Overview and Background
Must include:
- Context for the project and its purpose
- Business need being addressed
- Parties involved
- High-level success criteria

FLAGS:
✗ Missing context that helps readers understand purpose
✗ No stated business objective or success criteria
✗ Unclear identification of parties

### 1.2 Objectives and Purpose
Must include:
- Specific goals the project aims to achieve
- Measurable definition of success
- Alignment with client's stated business objectives

FLAGS:
✗ Vague objectives that cannot be measured
✗ Objectives stated as activities rather than outcomes
✗ No connection between objectives and deliverables

### 1.3 Scope of Work
Must include:
- All tasks and activities to be performed
- Clear, action-oriented language
- Complex tasks broken into smaller components
- Specific quantities, frequencies, and formats
- Methodology or approach at appropriate detail level

FLAGS:
✗ Tasks described in vague terms
✗ No quantification of effort or output
✗ Scope that could have multiple interpretations
✗ Missing activities required to achieve stated objectives

### 1.4 Out of Scope and Exclusions (CRITICAL)
This section PREVENTS SCOPE CREEP. Must explicitly list:
- Services, deliverables, or activities NOT included
- Adjacent services clients commonly assume are included
- Specific enough to prevent misunderstanding

Common items to consider for exclusions:
- Rush fees and expedited timelines
- Additional revision rounds beyond stated limits
- Crisis communications support
- Paid media spend and management
- Event staffing or on-site support
- Travel outside defined geography
- Third-party vendor management
- Photography, video production, content creation
- Translation or localization
- Legal review of materials
- Regulatory compliance verification

FLAGS:
✗ Missing exclusions section entirely
✗ Exclusions too vague to be useful
✗ Common adjacent services not addressed

### 1.5 Deliverables
Each deliverable MUST include:
- Clear description of what will be produced
- Format and specifications
- Quantity or volume (use "1x" notation)
- Quality standards or requirements
- Dependencies on client inputs

FLAGS:
✗ Deliverables without format or specifications
✗ No stated quantity or volume limits
✗ Deliverables depending on client inputs without those inputs specified
✗ Vague descriptions that could encompass varying effort levels

### 1.6 Acceptance Criteria
For each major deliverable, define:
- Specific conditions for acceptance
- Who has authority to approve
- Timeframe for client review
- Process if deliverable does not meet criteria
- Deemed acceptance provision for client non-response

Acceptance criteria MUST be:
- Objective and measurable
- Agreed upon before work begins
- Clear about what constitutes completion

FLAGS:
✗ No acceptance criteria defined
✗ Subjective criteria that invite dispute
✗ No review window specified
✗ No deemed acceptance provision
✗ No process for rejected deliverables

### 1.7 Timeline and Milestones
Must include:
- Realistic schedule with clear deadlines
- Major milestones with target dates
- Dependencies between tasks
- Client review and approval cycles
- Critical path items

FLAGS:
✗ No specific dates or timeframes
✗ Timeline not accounting for client review periods
✗ Dependencies not identified
✗ Milestones not tied to specific deliverables
✗ No buffer for client delays or revisions

### 1.8 Roles and Responsibilities

AGENCY responsibilities:
- Specific tasks agency will perform
- Resources agency will provide
- Communication and reporting cadence
- Project management approach

CLIENT responsibilities (CRITICAL):
- Materials, content, or assets client must provide
- Access to systems, personnel, or information
- Response and approval timeframes
- Feedback consolidation requirements
- Decision-making authority and designated approvers

FLAGS:
✗ Client responsibilities missing or vague
✗ No specified response timeframes for client
✗ No designated approver identified
✗ No consequences for client failure to meet responsibilities
✗ Feedback consolidation not addressed

### 1.9 Assumptions
Document conditions expected to exist. Common assumptions include:
- Client cooperation and responsiveness
- Access to required systems or information
- Availability of client personnel
- Accuracy of information provided by client
- Third-party performance or availability
- Technical environment stability
- Regulatory environment stability

Each assumption MUST have:
- Clear statement of what is assumed
- Consequence or contingency if assumption proves false

FLAGS:
✗ No assumptions section
✗ Assumptions without consequences for failure
✗ Critical dependencies not identified as assumptions
✗ Response time assumptions missing
✗ No provision for adjusting scope, timeline, or fee if assumptions fail

### 1.10 Change Management Process
Must define:
- How changes are requested
- Who can authorize changes
- How impact to timeline and budget is assessed
- Documentation requirements
- Process for approving and implementing changes

FLAGS:
✗ No change management process defined
✗ No requirement for written approval before work proceeds
✗ No provision for impact assessment
✗ Unclear authorization requirements

### 1.11 Fees and Payment Terms
Must specify:
- Total fee or fee structure
- Payment schedule and milestones
- Invoice timing and payment terms
- Late payment consequences
- Rate schedule for out-of-scope work
- Expense handling and approval thresholds

FLAGS:
✗ Fee not clearly stated
✗ Payment not tied to milestones or deliverables
✗ No late payment provisions
✗ No rate for additional work
✗ Expense handling unclear

### 1.12 Termination Provisions
Must address:
- Termination for cause (material breach)
- Termination for convenience
- Notice requirements
- Payment obligations upon termination
- Kill fee or early termination fee if applicable
- Transition obligations

FLAGS:
✗ No termination provisions
✗ No notice period specified
✗ Payment upon termination unclear
✗ No protection for agency if client terminates early

---

## PART 2: LANGUAGE QUALITY STANDARDS

### 2.1 VAGUE QUALIFIERS TO FLAG (Replace with specific language)
- "Approximately" or "about" → specify tolerance range
- "Reasonable" → define specifically
- "As needed" or "as appropriate" → add parameters with "up to" caps
- "Best efforts" → define measurable standard
- "Standard" or "typical" → specify what standard means
- "Ongoing" → add time boundary (e.g., "for up to 12 months")
- "Regular" → specify frequency (e.g., "up to 2 times per week")
- "Timely" → specify timeframe (e.g., "within 5 business days")
- "Various" or "multiple" → specify exact number
- "Etc." or "and so on" → enumerate all items
- "Including but not limited to" → enumerate specific items

### 2.2 PROBLEMATIC SCOPE LANGUAGE TO FLAG
- "Support" → define specific activities
- "Assistance" → define specific activities
- "Management" → define specific activities
- "Oversight" → define specific activities
- "Coordination" → define specific activities
- "Consultation" → define format, frequency, limits (e.g., "up to 4 hours per month")
- "Guidance" → define format or limits
- "Strategy" → define specific deliverables

### 2.3 UNLIMITED/OPEN-ENDED COMMITMENTS TO FLAG (CRITICAL)
These MUST be replaced with bounded language:
- "Unlimited revisions" → "Up to [X] rounds of revisions"
- "As many as needed" → "Up to [X]"
- "Until client is satisfied" → objective completion criteria
- "Ongoing support" → bounded term with hour cap
- "Continuous improvement" → defined iterations
- "Ad hoc" → "Up to [X] hours per month"
- "As and when" → specify triggers with caps
- Any commitment without stated limits

### 2.4 PASSIVE VOICE OBSCURING RESPONSIBILITY
Flag and recommend active voice:
- "Work will be completed" → "Agency will complete..."
- "Deliverables will be provided" → "Agency will deliver..."
- "Feedback will be incorporated" → "Agency will incorporate up to [X] rounds..."
- "Approval will be obtained" → "Client will approve within [X] business days..."

### 2.5 RECOMMENDED LANGUAGE PATTERNS

CONTROLLED QUANTIFICATION (use "up to" language):
- "Up to X hours of consultation"
- "Up to X rounds of revisions"
- "Up to X deliverables per month"
- "Up to X proactive media pitches"

Benefits of "up to" language:
- Sets ceiling client cannot exceed without additional fees
- Does not commit agency to minimum if circumstances change
- Creates natural conversation point when approaching limits
- Provides no discount for unused capacity (it is reserved, not delivered)

SPECIFIC TIMEFRAMES:
- "Within X business days of [trigger event]"
- "By [specific date]"
- "No later than X days before [milestone]"
- "Weekly, delivered every [day] by [time]"

CLEAR RESPONSIBILITY ASSIGNMENT:
- "Agency will deliver..."
- "Client will provide..."
- "Client's designated approver will respond..."

CONDITIONAL LANGUAGE FOR DEPENDENCIES:
- "Agency will deliver X, contingent upon receiving Y from Client by [date]"
- "Timeline assumes Client provides Z within [timeframe]; delays may require schedule adjustment"

REVISION LIMITS PATTERN:
"This scope includes up to [number] rounds of revisions of decreasing complexity. A round of revisions consists of one consolidated set of feedback from Client's designated approver. Additional revision rounds beyond those included will be billed at [rate] per round or quoted separately."

CONSOLIDATED FEEDBACK PATTERN:
"Client will consolidate all stakeholder feedback into a single submission per revision round. Multiple separate feedback submissions addressing the same deliverable will each count as a separate revision round."

---

## PART 3: CLIENT RESPONSIBILITIES (MUST be present)

### 3.1 Consolidated Feedback Requirement
MUST include language similar to: "Client agrees to consolidate all internal feedback before submission to Agency. Feedback must represent unified organizational direction; Agency is not responsible for reconciling conflicting stakeholder input."

### 3.2 Approval Windows
MUST specify: "Client commits to providing feedback within [X] business days of deliverable submission. Deliverables not rejected within this window shall be deemed approved."

### 3.3 Change Control
MUST include: "Any change to scope, timeline, or budget requires mutual written agreement via change order. Agency may decline changes that compromise quality or timeline."

### 3.4 Stakeholder Protection
Include language: "Agency will interface with a maximum of [X] client stakeholders for feedback purposes. Additional stakeholders require scope adjustment."

### 3.5 Client Obligations with Consequences
Each client obligation should include:
- Specific action required
- Timeframe for completion
- Consequence for failure

Pattern: "Client will [specific action] within [timeframe] of [trigger event]. If Client fails to meet this obligation, Agency may [consequence: adjust timeline, pause work, adjust fee, etc.]."

---

## PART 4: CONTRACT TYPE SPECIFIC REQUIREMENTS

### 4.1 Fixed Fee Contracts
REQUIRED ELEMENTS:
□ Scope exhaustively defined (all deliverables with specifications)
□ Quantities and volumes specified
□ Revision rounds specified and limited
□ Meeting and consultation time limited
□ Exclusions clearly stated
□ Assumptions documented with consequences
□ Change order process requiring written approval
□ Client obligations with timeframes and consequences
□ Completion clearly defined with acceptance criteria
□ Deemed acceptance provision

HIGH RISK INDICATORS:
✗ Unlimited revision language
✗ Scope in vague terms
✗ No exclusions section
✗ No assumptions documented
✗ Client obligations without consequences
✗ No change order process
✗ Completion tied to subjective client satisfaction

### 4.2 Time & Materials Contracts
REQUIRED ELEMENTS:
□ Rate schedule complete (all roles, billing increment, adjustment provisions)
□ Initial estimate provided (clearly stated as estimate, not cap)
□ Notification thresholds when approaching estimate
□ Tracking increment specified
□ Reporting frequency and content defined
□ Client access to detailed time logs
□ Scope guidance (intended objectives and boundaries)

RISK INDICATORS:
✗ No estimate provided
✗ No notification thresholds
✗ Vague or no reporting requirements
✗ No billing increment specified
✗ No scope guidance or boundaries

### 4.3 Time & Materials with Cap (Not to Exceed)
REQUIRED ELEMENTS:
□ Cap clearly defined (total amount, inclusions, exclusions)
□ Cap explicitly tied to defined scope
□ Notification thresholds (percentage trigger)
□ Work stoppage rights when cap approached
□ Scope change provisions requiring cap adjustment
□ Assumption protection (failure grounds for cap adjustment)
□ No obligation to work beyond cap without authorization

HIGH RISK INDICATORS:
✗ Cap not tied to specific scope
✗ No notification thresholds
✗ No work stoppage provision
✗ No scope change adjustment mechanism
✗ Assumptions not documented or protected
✗ Cap includes pass-through costs agency cannot control

### 4.4 Retainer Contracts

IMPORTANT: Retainers can be structured two ways - understand the difference:

**Deposit-Based Minimum Commitment Model:**
- Client pays minimum commitment upfront as deposit
- Work is drawn down against deposit with approval process
- Client can exceed deposit and pay additional T&M
- This is a FLOOR (minimum spend), NOT a ceiling
- DO NOT flag deposit language as needing "up to" caps
- DO NOT suggest rollover policies for deposit models - they work differently

**Traditional Hourly/Monthly Allocation Model:**
- Client gets fixed allocation per period
- Unused time may or may not roll over
- Overages billed at specified rates

REQUIRED ELEMENTS (all retainer types):
□ Minimum term specified
□ Fee structure clearly stated (deposit vs monthly)
□ Early termination provisions and fees
□ Services included clearly enumerated
□ Services explicitly excluded
□ Overage handling defined (rate, notification, pre-approval)
□ Notice period for non-renewal

ADDITIONAL FOR TRADITIONAL ALLOCATION MODEL:
□ Monthly allocation specified
□ Rollover policy clearly stated (recommend: limited or no rollover)
□ Utilization tracking and reporting

ADDITIONAL FOR DEPOSIT-BASED MODEL:
□ Minimum commitment amount stated
□ Deposit payment terms
□ Drawdown approval process
□ Request parameters (min/max per request)
□ Service level commitments

ROLLOVER POLICY OPTIONS (Traditional Model Only):
- Option A (Recommended): No rollover - unused allocation forfeited
- Option B: Limited rollover to immediately following month only, with cap
- Option C: No monthly rollover with quarterly true-up review

RISK INDICATORS:
✗ No minimum term commitment
✗ Unlimited rollover (traditional model)
✗ Vague scope definition
✗ No overage mechanism
✗ No utilization reporting (traditional model)
✗ No early termination protection
✗ Discount without corresponding commitment

---

## PART 5: SERVICE-LINE SPECIFIC REQUIREMENTS

### 5.1 Branding Projects
□ Brand architecture/hierarchy explicitly addressed
□ Stakeholder alignment sessions defined
□ Number of concepts at each stage specified
□ Revision rounds per phase specified
□ Asset formats and file deliverables listed (file formats, sizes)
□ Guidelines scope (what's covered, what's not)
□ Usage rights and licensing terms
□ Photography and stock imagery handling

### 5.2 Website Projects
□ Technical requirements (CMS, hosting, etc.)
□ Content responsibility clearly assigned
□ Browser/device compatibility defined
□ Page counts specified
□ Post-launch support period specified
□ Training deliverables included
□ UAT (User Acceptance Testing) process defined
□ Warranty period specified
□ Third-party integrations listed

### 5.3 PR/Communications
□ Media target list scope defined
□ Number of proactive pitches per period specified
□ Reporting frequency and format defined
□ Measurement metrics specified
□ Reactive media inquiry handling (included or excluded)
□ Spokesperson preparation (included or excluded)
□ Message development ownership
□ Crisis communications (typically excluded unless explicit)

### 5.4 Creative Retainers

IMPORTANT: Creative retainers can follow two models. DO NOT confuse them:

**Model A: Deposit-Based Minimum Commitment (e.g., Integrated Creative & Strategic Support Retainer)**
- Client pays a MINIMUM annual commitment upfront as a deposit
- Deposit is drawn down against approved work throughout the term
- Client CAN SPEND MORE than the deposit on a T&M basis
- This is NOT a cap - it's a FLOOR
- DO NOT suggest "up to" language for deposit amounts - the deposit IS the minimum, not the maximum
- DO NOT suggest "unused budget does not roll over" - deposits are meant to be used
- Key language pattern: "minimum annual commitment of $X... held as a deposit and drawn down"

Required elements for deposit-based retainers:
□ Minimum commitment amount clearly stated
□ Deposit payment terms specified
□ Drawdown/approval process for individual requests
□ T&M rates for work exceeding deposit
□ Request parameters (minimum charge, maximum per request before separate SOW)
□ Service hours and availability
□ Service level commitments (response times, delivery windows)
□ Expedited turnaround process
□ Services included and excluded

**Model B: Traditional Hourly Allocation Retainer**
□ Monthly hour allocation clearly stated
□ Rollover policy defined (recommend: limited or no rollover)
□ Utilization reporting specified
□ Rate card for overage included
□ Request parameters (lead times, formats)
□ SLAs for response times
□ Exclusions clearly listed

### 5.5 Paid Media
□ Separation of media spend from agency fees
□ Media spend ownership and management
□ Ad account ownership
□ Reporting frequency and format
□ Optimization responsibilities and frequency
□ Platform-specific requirements
□ Audience development and targeting scope

### 5.6 Integrated/Multi-Service
□ Workstream dependencies mapped
□ Cross-functional coordination specified
□ Boundaries between service lines defined
□ Handoff points between teams identified
□ Which team leads on strategy vs execution
□ Consolidated vs separate reporting
□ Single point of contact vs multiple
□ Integrated timeline with milestones
□ Single point of accountability identified

---

## PART 6: SCOPE CREEP PREVENTION CHECKLIST

### 6.1 Does the SOW include these protection mechanisms?
□ Explicit exclusions section
□ Client obligations with documented consequences
□ Revision limits with process for additional rounds
□ Consolidated feedback requirement
□ Assumptions documentation with adjustment provisions
□ Formal change order process
□ Stop work provisions for client non-compliance

### 6.2 Stop Work / Pause Clause
Should include:
- Trigger events (payment default, failure to respond, failure to provide inputs)
- Grace period before pause takes effect
- Notification requirements
- Impact on timeline
- Restart conditions and potential restart fee
- Relationship to termination rights

Pattern: "If Client fails to make a payment when due, or fails to respond to requests within [specified period], Agency may stop work upon written notice until Client cures the failure. Client acknowledges that stopping work will cause delay, and timeline will be adjusted accordingly. If Agency stops work for more than [period], Agency may require a restart fee before resuming."

---

## PART 7: QUICK REFERENCE - REVIEW FLAGS

### FLAG AS HIGH PRIORITY (Must fix before issuing):
Missing Elements:
- No exclusions section
- No client obligations
- No revision limits
- No change order process
- No assumptions documentation
- No acceptance criteria

Problematic Language:
- "Unlimited" anything
- "As needed" without parameters
- "Reasonable" without definition
- Any commitment without limits

Structural Issues:
- Payment not tied to milestones or deliverables
- No consequences for client non-performance
- No termination protection
- Scope not aligned with pricing model

### FLAG AS MODERATE PRIORITY (Should fix):
Missing Elements:
- Incomplete acceptance criteria
- Vague timeline
- Unclear roles
- Missing reporting requirements

Language Issues:
- Passive voice obscuring responsibility
- Vague qualifiers
- Undefined terms
- Inconsistent terminology

### FLAG FOR IMPROVEMENT (Would strengthen):
- Could be more specific
- Could benefit from examples
- Terms could be defined
- Could add flexibility mechanisms
- Could strengthen protections
`;

// ============================================================================
// COMPONENTS
// ============================================================================

// Antenna-style Button with yellow highlight that slides away on hover
function AntennaButton({ children, onClick, disabled, loading, loadingText, icon: Icon, className = "", variant = "primary", size = "default" }) {
  const baseStyles = "group relative overflow-hidden font-semibold transition-all duration-300 flex items-center justify-center";
  
  const variants = {
    primary: "bg-[#12161E] text-white",
    secondary: "bg-white text-[#12161E] border-2 border-[#12161E]",
    ghost: "bg-transparent text-[#12161E] hover:bg-[#12161E]/5"
  };
  
  const sizes = {
    small: "px-4 py-2 text-sm rounded-lg gap-2",
    default: "px-6 py-3 text-base rounded-xl gap-3",
    large: "px-8 py-4 text-lg rounded-xl gap-3"
  };
  
  const disabledStyles = disabled || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer";
  
  // Lime yellow color from Antenna brand
  const highlightColor = "#E8FF00";
  
  // Determine text colors based on variant
  const isLightBg = variant === 'secondary' || variant === 'ghost';
  const baseTextColor = isLightBg ? '#12161E' : 'white';
  const highlightTextColor = '#12161E'; // Always black on yellow
  
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin relative z-10" />
          <span className="relative z-10">{loadingText || 'Loading...'}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-5 h-5 relative z-10 flex-shrink-0" />}
          
          {/* Text container with yellow highlight that slides down on hover */}
          <span className="relative z-10 flex-shrink-0 overflow-hidden">
            {/* Base text (revealed on hover) */}
            <span className="relative inline-block" style={{ color: baseTextColor }}>
              {children}
              {/* Yellow highlight with black text on top - slides down on hover */}
              <span 
                className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out group-hover:translate-y-full pointer-events-none"
                style={{ backgroundColor: highlightColor }}
              >
                <span style={{ color: highlightTextColor }}>{children}</span>
              </span>
            </span>
          </span>
          
          {/* Arrow */}
          <svg 
            className="w-5 h-5 flex-shrink-0 relative z-10" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </>
      )}
    </button>
  );
}

// Antenna Group Logo
function AntennaLogo({ className = "h-8" }) {
  return (
    <img 
      src="https://ktuyiikwhspwmzvyczit.supabase.co/storage/v1/object/public/assets/brand/antenna-new-logo.svg" 
      alt="Antenna Group" 
      className={className}
    />
  );
}

// Collapsible Section
function CollapsibleSection({ title, children, defaultOpen = false, icon: Icon, count, variant }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const variants = {
    critical: { header: 'bg-red-50 hover:bg-red-100', badge: 'bg-red-600 text-white', icon: 'text-red-600' },
    recommended: { header: 'bg-amber-50 hover:bg-amber-100', badge: 'bg-amber-600 text-white', icon: 'text-amber-600' },
    default: { header: 'bg-gray-50 hover:bg-gray-100', badge: 'bg-gray-900 text-white', icon: 'text-gray-900' }
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

// Copy Button
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
      className={`p-1.5 rounded-md transition-all ${
        copied 
          ? 'bg-green-600 text-white' 
          : 'bg-white/60 text-gray-500 hover:bg-white hover:text-gray-900'
      } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// Issue Card for Review
function IssueCard({ issue, type, isSelected, onToggle }) {
  const styles = {
    critical: { bg: 'bg-red-50 border-red-200', icon: 'text-red-600', Icon: AlertCircle },
    recommended: { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', Icon: AlertTriangle },
    info: { bg: 'bg-gray-50 border-gray-200', icon: 'text-gray-900', Icon: CheckCircle }
  };
  
  const { bg, icon, Icon } = styles[type] || styles.info;
  
  // Adjust background when deselected
  const cardBg = isSelected === false ? 'bg-gray-100 border-gray-200 opacity-60' : bg;

  const parseIssue = (text) => {
    const result = { 
      section: null, 
      currentLanguage: null, 
      recommendation: null,
      missingElement: null,
      addLanguage: null,
      why: null,
      issueType: null,
      title: null
    };
    
    // Clean up markdown formatting
    let cleanText = text.replace(/\*\*/g, ''); // Remove bold markers
    
    // Extract section - handle various formats like "Section D.2.2:" or "**Section D.2.2:**"
    const sectionMatch = cleanText.match(/(?:Section|§)\s*([\d.A-Za-z]+)/i);
    if (sectionMatch) result.section = sectionMatch[1];
    
    // Extract title (text after section number, before Current/Missing)
    const titleMatch = cleanText.match(/Section\s*[\d.A-Za-z]+[:\s]*([^\n]+?)(?=\n|Current:|Missing:|$)/i);
    if (titleMatch) result.title = titleMatch[1].trim();
    
    // Check for "Missing" format (Type B - missing elements)
    const missingMatch = cleanText.match(/Missing:\s*[""]?([^""\n]+)[""]?/i);
    const addMatch = cleanText.match(/Add:\s*[""]([^""]+)[""]|Add:\s*"([^"]+)"/i);
    
    if (missingMatch || addMatch) {
      result.issueType = 'missing';
      if (missingMatch) result.missingElement = missingMatch[1].trim();
      if (addMatch) result.addLanguage = (addMatch[1] || addMatch[2]).trim();
    }
    
    // Check for "Current/Recommended" format (Type A - language issues)
    // Handle both quoted and unquoted, multiline content
    const currentMatch = cleanText.match(/Current:\s*[""]([^""]+)[""]|Current:\s*"([^"]+)"/i);
    const recommendedMatch = cleanText.match(/Recommended:\s*[""]([^""]+)[""]|Recommended:\s*"([^"]+)"/i);
    
    if (currentMatch && recommendedMatch) {
      result.issueType = 'language';
      result.currentLanguage = (currentMatch[1] || currentMatch[2]).trim();
      result.recommendation = (recommendedMatch[1] || recommendedMatch[2]).trim();
    }
    
    // Fallback: arrow format
    const arrowMatch = cleanText.match(/[""]([^""]+)[""]\s*[→→>-]+\s*[""]([^""]+)[""]/);
    if (arrowMatch && !result.issueType) {
      result.issueType = 'language';
      result.currentLanguage = arrowMatch[1].trim();
      result.recommendation = arrowMatch[2].trim();
    }
    
    // Extract "Why" explanation
    const whyMatch = cleanText.match(/Why:\s*([^\n]+)/i);
    if (whyMatch) result.why = whyMatch[1].trim();
    
    return result;
  };

  const parsed = parseIssue(issue);
  
  // Get the issue description/title
  const getIssueDescription = () => {
    if (parsed.title) return parsed.title;
    
    let desc = issue.replace(/\*\*/g, ''); // Remove bold
    // Remove the structured parts to get just the description
    desc = desc.replace(/Current:[\s\S]*?(?=Recommended:|Missing:|Add:|Why:|$)/i, '');
    desc = desc.replace(/Recommended:[\s\S]*?(?=Why:|$)/i, '');
    desc = desc.replace(/Missing:[\s\S]*?(?=Add:|Why:|$)/i, '');
    desc = desc.replace(/Add:[\s\S]*?(?=Why:|$)/i, '');
    desc = desc.replace(/Why:[\s\S]*$/i, '');
    desc = desc.replace(/Section[:\s]*[\d.A-Za-z]+[:\s]*/i, '').trim();
    // Clean up and get first meaningful line
    const lines = desc.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines[0] || '';
  };

  return (
    <div className={`p-4 rounded-xl border ${cardBg} mb-3 transition-all`}>
      <div className="flex items-start gap-3">
        {onToggle && (
          <label className="flex items-center cursor-pointer mt-0.5">
            <input
              type="checkbox"
              checked={isSelected !== false}
              onChange={onToggle}
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
            />
          </label>
        )}
        <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${icon}`} />
        <div className="flex-1">
          {parsed.section && (
            <span className="inline-block text-xs font-mono bg-white/60 px-2 py-0.5 rounded mb-2 text-gray-500">
              Section {parsed.section}
            </span>
          )}
          
          {parsed.issueType === 'language' && parsed.currentLanguage && parsed.recommendation ? (
            // Type A: Language issue with Current → Recommended
            <div className="space-y-3">
              <p className="text-sm text-gray-900 leading-relaxed font-medium">
                {getIssueDescription()}
              </p>
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
              {parsed.why && (
                <p className="text-xs text-gray-500 italic">{parsed.why}</p>
              )}
            </div>
          ) : parsed.issueType === 'missing' && (parsed.missingElement || parsed.addLanguage) ? (
            // Type B: Missing element - show what to add
            <div className="space-y-3">
              <p className="text-sm text-gray-900 leading-relaxed font-medium">
                {parsed.missingElement ? `Missing: ${parsed.missingElement}` : getIssueDescription()}
              </p>
              {parsed.addLanguage && (
                <div className="bg-white/50 rounded-lg p-3 border border-green-200 relative">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Add This Language</p>
                    <CopyButton text={parsed.addLanguage} />
                  </div>
                  <p className="text-sm text-gray-900 font-mono leading-relaxed">"{parsed.addLanguage}"</p>
                </div>
              )}
              {parsed.why && (
                <p className="text-xs text-gray-500 italic">{parsed.why}</p>
              )}
            </div>
          ) : (
            // Fallback: just show the raw text
            <div className="text-sm whitespace-pre-wrap text-gray-900 leading-relaxed">{issue}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Red Flag Card
function RedFlagCard({ flag, isSelected, onToggle }) {
  const parseRedFlag = (text) => {
    const arrowMatch = text.match(/[""]([^""]+)[""]\s*(?:in\s+)?(?:Section\s+)?([\d.]*)\s*[→→>-]+\s*[""]([^""]+)[""]/i);
    if (arrowMatch) {
      return { found: arrowMatch[1].trim(), section: arrowMatch[2] || null, replacement: arrowMatch[3].trim() };
    }
    const simpleArrow = text.match(/[""]([^""]+)[""]\s*[→→>-]+\s*[""]([^""]+)[""]/);
    if (simpleArrow) {
      const sectionMatch = text.match(/Section\s+([\d.]+)/i);
      return { found: simpleArrow[1].trim(), section: sectionMatch ? sectionMatch[1] : null, replacement: simpleArrow[2].trim() };
    }
    return null;
  };

  const parsed = parseRedFlag(flag);
  const cardBg = isSelected === false ? 'bg-gray-100 border-gray-200 opacity-60' : 'bg-gray-50 border-gray-200';

  if (parsed) {
    return (
      <div className={`${cardBg} rounded-xl p-4 mb-3 transition-all`}>
        <div className="flex items-start gap-3">
          {onToggle && (
            <label className="flex items-center cursor-pointer mt-0.5">
              <input
                type="checkbox"
                checked={isSelected !== false}
                onChange={onToggle}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
              />
            </label>
          )}
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

  return (
    <div className={`${cardBg} rounded-xl p-4 mb-3 transition-all`}>
      <div className="flex items-start gap-3">
        {onToggle && (
          <label className="flex items-center cursor-pointer mt-0.5">
            <input
              type="checkbox"
              checked={isSelected !== false}
              onChange={onToggle}
              className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
            />
          </label>
        )}
        <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-600" />
        <div className="text-sm whitespace-pre-wrap text-gray-900 leading-relaxed">{flag}</div>
      </div>
    </div>
  );
}

// API Key Input
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

// Service Selection Card
// Helper function to format pricing guidance
const formatPricingGuidance = (service) => {
  if (!service.pricing) return null;
  
  const pricing = service.pricing;
  
  // Handle percentage-based pricing (Project Management)
  if (pricing.percentageOfProject) {
    return {
      term: null,
      budget: `~${pricing.percentageOfProject}% of project`,
      note: pricing.note,
      bundle: null
    };
  }
  
  // Handle bundled services (only first in bundle shows pricing)
  if (pricing.bundle && !pricing.termLow) {
    return {
      term: null,
      budget: null,
      note: null,
      bundle: pricing.bundle
    };
  }
  
  // Format term
  let term = null;
  if (pricing.termLow && pricing.termHigh) {
    if (pricing.termLow === pricing.termHigh) {
      term = pricing.termLow === 52 ? 'Annual' : `${pricing.termLow} weeks`;
    } else {
      term = `${pricing.termLow}-${pricing.termHigh} weeks`;
    }
  }
  
  // Format budget
  let budget = null;
  if (pricing.budgetLow && pricing.budgetHigh) {
    const formatCurrency = (num) => {
      if (num >= 1000) return `$${(num/1000).toFixed(0)}K`;
      return `$${num}`;
    };
    if (pricing.budgetLow === pricing.budgetHigh) {
      budget = formatCurrency(pricing.budgetLow);
    } else {
      budget = `${formatCurrency(pricing.budgetLow)}-${formatCurrency(pricing.budgetHigh)}`;
    }
  }
  
  return {
    term,
    budget,
    note: pricing.note,
    bundle: pricing.bundle
  };
};

function ServiceCard({ trigger, isSelected, selectedServices, onToggleService }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const serviceNames = getServiceNames(trigger);
  const selectedCount = serviceNames.filter(s => selectedServices.includes(s)).length;
  
  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all ${isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-200'}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <div className="text-left">
            <p className="font-semibold text-gray-900">{trigger.category}</p>
            <p className="text-sm text-gray-500">{trigger.description}</p>
          </div>
        </div>
        {selectedCount > 0 && (
          <span className="px-2.5 py-1 bg-gray-900 text-white text-xs rounded-full font-medium">
            {selectedCount} selected
          </span>
        )}
      </button>
      {isExpanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-3">
          <div className="space-y-3">
            {trigger.services.map((service) => {
              const serviceName = getServiceName(service);
              const pricingInfo = typeof service === 'object' ? formatPricingGuidance(service) : null;
              const isChecked = selectedServices.includes(serviceName);
              
              return (
                <div key={serviceName} className="group">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => onToggleService(serviceName)}
                      className="w-4 h-4 mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <div className="flex-1">
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{serviceName}</span>
                      {pricingInfo && isChecked && (pricingInfo.term || pricingInfo.budget || pricingInfo.note) && (
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {pricingInfo.bundle && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              {pricingInfo.bundle}
                            </span>
                          )}
                          {pricingInfo.term && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                              ⏱ {pricingInfo.term}
                            </span>
                          )}
                          {pricingInfo.budget && (
                            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                              💰 {pricingInfo.budget}
                            </span>
                          )}
                          {pricingInfo.note && (
                            <span className="text-xs text-gray-500 italic">
                              {pricingInfo.note}
                            </span>
                          )}
                        </div>
                      )}
                      {pricingInfo && isChecked && pricingInfo.bundle && !pricingInfo.term && !pricingInfo.budget && (
                        <div className="mt-1">
                          <span className="text-xs text-gray-400 italic">
                            Bundled with {pricingInfo.bundle}
                          </span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
export default function App() {
  // Navigation state
  const [currentView, setCurrentView] = useState('home'); // 'home', 'draft', 'review'
  
  // Shared state
  const [apiKey, setApiKey] = useState('');
  
  // Draft SOW state
  const [draftNotes, setDraftNotes] = useState('');
  const [draftEngagementType, setDraftEngagementType] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isAnalyzingTranscript, setIsAnalyzingTranscript] = useState(false);
  const [transcriptAnalysis, setTranscriptAnalysis] = useState(null);
  const [detectedTriggers, setDetectedTriggers] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showOtherServices, setShowOtherServices] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [generatedSOW, setGeneratedSOW] = useState(null);
  const [draftError, setDraftError] = useState(null);
  
  // Review SOW state
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [reviewEngagementType, setReviewEngagementType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [rawResponse, setRawResponse] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftedSOW, setDraftedSOW] = useState(null);
  const [reviewDraftError, setReviewDraftError] = useState(null);
  const [selectedRecommendations, setSelectedRecommendations] = useState({
    critical: [],
    recommended: [],
    redFlags: []
  });

  // Toggle a recommendation selection
  const toggleRecommendation = (type, index) => {
    setSelectedRecommendations(prev => {
      const current = prev[type] || [];
      if (current.includes(index)) {
        return { ...prev, [type]: current.filter(i => i !== index) };
      } else {
        return { ...prev, [type]: [...current, index] };
      }
    });
  };

  // Select/deselect all in a category
  const toggleAllInCategory = (type, items) => {
    setSelectedRecommendations(prev => {
      const current = prev[type] || [];
      const allSelected = items.length > 0 && current.length === items.length;
      if (allSelected) {
        return { ...prev, [type]: [] };
      } else {
        return { ...prev, [type]: items.map((_, idx) => idx) };
      }
    });
  };

  // ============================================================================
  // DRAFT SOW FUNCTIONS
  // ============================================================================
  
  const analyzeTranscript = async () => {
    if (!apiKey || !transcript.trim()) return;
    
    setIsAnalyzingTranscript(true);
    setDraftError(null);
    setTranscriptAnalysis(null);
    setDetectedTriggers([]);
    setSelectedServices([]);
    
    try {
      // Build comprehensive service categories description for AI using enhanced trigger patterns
      const serviceCategoriesPrompt = SERVICE_TRIGGERS.map(cat => {
        const patterns = cat.triggerPatterns || {};
        const directExamples = patterns.direct?.slice(0, 3).join(', ') || '';
        const indirectExamples = patterns.indirect?.slice(0, 3).join(', ') || '';
        const sampleLanguage = patterns.sampleLanguage?.slice(0, 3).join('" | "') || '';
        const situational = patterns.situational?.slice(0, 2).join(', ') || '';
        const performance = patterns.performance?.slice(0, 2).join(', ') || '';
        
        return `- ${cat.id}: "${cat.category}" - ${cat.description}
    Direct triggers: ${directExamples}
    Indirect signals: ${indirectExamples}
    Situational triggers: ${situational}
    Performance issues: ${performance}
    Client often says: "${sampleLanguage}"`;
      }).join('\n\n');
      
      // Use AI to analyze transcript AND detect relevant service categories semantically
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
          max_tokens: 6000,
          system: `You are an expert at analyzing client call transcripts to extract key information for Statement of Work development at a marketing and communications agency. Your job is to identify the core elements that will inform the SOW AND recommend relevant service categories based on the client's expressed needs.

## CRITICAL: SEMANTIC TRIGGER DETECTION

Do NOT look for exact phrase matches. Instead, understand the INTENT and MEANING behind what clients say. Client triggers manifest as:

1. **Pain Points**: Problems the client is experiencing (listen for frustration, complaints, "we're struggling with", "our challenge is")
2. **Ambitions**: Goals they want to achieve (listen for "we want to", "our goal is", "we're hoping to")
3. **Situational Changes**: Business events requiring marketing support (mergers, launches, new leadership, funding, expansion)
4. **Performance Gaps**: Metrics that aren't meeting expectations (declining numbers, competitive losses, ROI questions)
5. **Resource Constraints**: Lack of internal capacity or expertise (no team, overwhelmed, don't have time, don't know how)

## TRIGGER INTENSITY INDICATORS

Pay attention to urgency signals:
- **High Intensity** (urgent): "need this for [date]", "priority for the board", "losing money/customers", "competitor just [action]"
- **Medium Intensity** (active): "we've been thinking about", "it's on our roadmap", "want to explore"
- **Low Intensity** (consideration): "curious about", "someday we'd like to"

## COMBINED TRIGGER PATTERNS

Common combinations to look for:
- **Launch Scenarios** (product launch, funding, market entry) → GTM, PR, creative, paid social, website
- **Brand Transformation** (rebrand, repositioning, new leadership) → brand strategy, website, creative, integrated
- **Growth Mode** (scaling, expansion, competitive pressure) → SEO, performance marketing, content, measurement
- **Awareness Building** (low visibility, thought leadership goals) → PR, media outreach, executive visibility, content
- **Performance Optimization** (declining metrics, budget pressure) → performance marketing, measurement, A/B testing

## IMPORTANT GUIDELINES

1. Be GENEROUS in recommendations - it's better to suggest a category that might be relevant than to miss one
2. Look for the underlying NEED, not just the stated want
3. If a client mentions multiple pain points, recommend multiple categories
4. Consider what services often go TOGETHER (e.g., website + brand, PR + executive visibility)
5. If unsure, include the category - the user can deselect services they don't need`,
          messages: [{
            role: 'user',
            content: `Analyze this client call transcript and provide TWO things:

PART 1: TRANSCRIPT ANALYSIS
Extract the following information from the transcript:

1. **SUCCESS DEFINITION** - What does success look like for this engagement? What specific outcomes is the client hoping to achieve? What would make them say "this was worth it"?

2. **PROBLEM STATEMENT** - What specific problem(s) is the client trying to solve? What pain points did they express? What frustrations came through in the conversation?

3. **MANDATORIES** - What explicit requirements or must-haves did the client mention? What are the non-negotiables?

4. **TIMELINE** - Any deadlines, milestones, key dates, or timing requirements mentioned. Note urgency level if apparent.

5. **BUDGET SIGNALS** - Any budget ranges, constraints, expectations, or indications of budget flexibility mentioned.

6. **KEY STAKEHOLDERS** - Who are the decision makers and key contacts? Who needs to be involved in approvals?

7. **CONTEXT** - Important background about the client's situation, industry, competitive landscape, or internal dynamics that should inform the SOW.

8. **TRIGGER INTENSITY** - How urgent is this need? (High/Medium/Low based on language used)

PART 2: RECOMMENDED SERVICE CATEGORIES
Based on the client's expressed needs, challenges, goals, pain points, and situational context, identify which service categories are relevant.

Think about:
- The INTENT behind what the client is saying
- What they need even if they didn't explicitly ask for it
- What services naturally go together for their situation
- Both their stated wants AND their underlying needs

Available categories (with trigger pattern examples):

${serviceCategoriesPrompt}

Format your response EXACTLY as:

## SUCCESS DEFINITION
[Clear statement of what success looks like for this client]

## PROBLEM STATEMENT
[The core problem(s) to solve - be specific about the pain points]

## MANDATORIES
- [Explicit requirement 1]
- [Explicit requirement 2]
(List all non-negotiable requirements mentioned)

## TIMELINE
[Any timeline information, urgency level, or "Not specified" if none mentioned]

## BUDGET SIGNALS
[Any budget information, or "Not specified" if none mentioned]

## KEY STAKEHOLDERS
[Stakeholder information, decision-making structure, or "Not specified" if none mentioned]

## CONTEXT
[Relevant background that should inform the SOW - industry, competition, internal dynamics]

## TRIGGER INTENSITY
[High/Medium/Low with brief explanation of why]

## RECOMMENDED_CATEGORIES
[List ONLY the category IDs that are relevant, comma-separated. Be generous - include any category that might be relevant based on the analysis above.]

Example: website, brand, pr, executive_visibility, content_production

TRANSCRIPT:
${transcript}`
          }]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }
      
      const data = await response.json();
      const analysisText = data.content[0].text;
      
      // Extract recommended categories from the response - try multiple patterns
      let detectedCategoryIds = [];
      
      // Try pattern 1: ## RECOMMENDED_CATEGORIES followed by content
      const categoriesMatch = analysisText.match(/## RECOMMENDED_CATEGORIES\s*\n([^\n#]+)/i);
      if (categoriesMatch) {
        detectedCategoryIds = categoriesMatch[1]
          .split(',')
          .map(s => s.trim().toLowerCase().replace(/[_\s]+/g, '_'))
          .filter(s => s.length > 0);
      }
      
      // Try pattern 2: Look for category IDs anywhere after RECOMMENDED_CATEGORIES header
      if (detectedCategoryIds.length === 0) {
        const altMatch = analysisText.match(/RECOMMENDED_CATEGORIES[:\s]*\n?([^#]+?)(?=\n\n|$)/i);
        if (altMatch) {
          detectedCategoryIds = altMatch[1]
            .split(/[,\n]/)
            .map(s => s.trim().toLowerCase().replace(/[_\s-]+/g, '_').replace(/[^a-z_]/g, ''))
            .filter(s => s.length > 0);
        }
      }
      
      console.log('AI Response categories section:', analysisText.substring(analysisText.indexOf('RECOMMENDED_CATEGORIES')));
      console.log('Extracted category IDs:', detectedCategoryIds);
      
      // Map category IDs to full trigger objects (flexible matching)
      const detected = SERVICE_TRIGGERS.filter(trigger => {
        const triggerId = trigger.id.toLowerCase();
        return detectedCategoryIds.some(detectedId => 
          detectedId === triggerId || 
          detectedId.includes(triggerId) || 
          triggerId.includes(detectedId) ||
          // Also match without underscores
          detectedId.replace(/_/g, '') === triggerId.replace(/_/g, '')
        );
      });
      
      console.log('Matched triggers:', detected.map(t => t.id));
      
      setDetectedTriggers(detected);
      
      // Auto-select services marked as 'always' recommend from detected triggers
      const autoSelectedServices = detected.flatMap(trigger => 
        trigger.services
          .filter(service => typeof service === 'object' && service.recommend === 'always')
          .map(service => service.name)
      );
      
      console.log('Auto-selected services:', autoSelectedServices);
      
      const selectedServicesList = [...new Set(autoSelectedServices)];
      setSelectedServices(selectedServicesList);
      
      // Auto-set engagement type based on billing model analysis
      if (selectedServicesList.length > 0) {
        const billingAnalysis = analyzeServiceBillingModels(selectedServicesList);
        console.log('Billing analysis:', billingAnalysis);
        
        if (billingAnalysis.needsIntegrated) {
          // Multiple billing models needed - use integrated
          setDraftEngagementType('integrated');
        } else if (detected.length > 0) {
          // Single billing model - use the appropriate type
          const dominantCategory = detected[0].id;
          if (ENGAGEMENT_TYPE_RECOMMENDATIONS.fixed_fee_preferred.includes(dominantCategory)) {
            setDraftEngagementType('fixed_fee');
          } else if (ENGAGEMENT_TYPE_RECOMMENDATIONS.tm_preferred.includes(dominantCategory)) {
            setDraftEngagementType('tm');
          } else if (ENGAGEMENT_TYPE_RECOMMENDATIONS.retainer_preferred.includes(dominantCategory)) {
            setDraftEngagementType('retainer');
          }
        }
      }
      
      // Remove the RECOMMENDED_CATEGORIES section from the displayed analysis
      const cleanedAnalysis = analysisText.replace(/## RECOMMENDED_CATEGORIES[\s\S]*$/, '').trim();
      setTranscriptAnalysis(cleanedAnalysis);
      
    } catch (err) {
      setDraftError(err.message);
    } finally {
      setIsAnalyzingTranscript(false);
    }
  };
  
  const toggleService = (service) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };
  
  const generateSOW = async () => {
    if (!apiKey || selectedServices.length === 0) return;
    
    setIsGeneratingDraft(true);
    setDraftError(null);
    
    try {
      const engagementLabel = DRAFT_ENGAGEMENT_TYPES.find(t => t.value === draftEngagementType)?.label || 'Fixed Fee';
      const engagementType = draftEngagementType || 'fixed_fee';
      
      // Get engagement-specific guidance
      const engagementGuidance = {
        fixed_fee: `FIXED FEE ENGAGEMENT REQUIREMENTS:
- Scope must be exhaustively defined - all deliverables with specifications
- All quantities and volumes must be specified
- Revision rounds must be specified and limited (recommend: up to 2 rounds per deliverable)
- Meeting and consultation time must be limited (use "up to X hours")
- Include strong exclusions section listing what is NOT included
- Document all assumptions with consequences if they prove false
- Include change order process requiring written approval for ANY additions
- Client obligations must have specific timeframes and consequences for non-compliance
- Define clear acceptance criteria for each deliverable
- Include deemed acceptance provision (e.g., "if no response within 5 business days")

BUDGET & BILLING STRUCTURE FOR FIXED FEE:
- Present total project fee prominently
- Payment schedule tied to milestones or phases (NOT a single lump sum)
- Recommended structure: 50% at project kickoff, 25% at [mid-project milestone], 25% upon completion
- Alternative for larger projects: Monthly installments over project duration
- All milestone payments are non-refundable once work commences
- State: "Fee is based on scope defined herein. Changes to scope require a Change Order with fee adjustment."
- For branding projects: Minimum project value $50,000
- For brand assessments: $4,000`,
        
        tm_cap: `TIME & MATERIALS WITH CAP (NOT TO EXCEED) REQUIREMENTS:
NOTE: T&M with Cap should only be used when specifically requested by client. It shifts risk to the agency.

- Cap must be clearly stated with inclusions and exclusions
- Cap must be explicitly tied to the defined scope
- Include notification thresholds (e.g., "Agency will notify Client when 75% of cap is consumed")
- Include work stoppage rights when cap is approached
- Scope changes must require cap adjustment
- Assumption failures are grounds for cap adjustment
- Specify billing rates by role
- Specify billing increment (e.g., 15-minute increments)
- Include reporting requirements (frequency and content)
- No obligation to work beyond cap without written authorization

BUDGET & BILLING STRUCTURE FOR T&M WITH CAP:
- Present cap amount prominently with clear statement: "Total fees shall not exceed $[CAP] without prior written authorization"
- Include rate card by role/seniority
- Billing: Monthly in arrears based on actual time incurred
- Payment: Net 30 from invoice date
- Include utilization reporting with each invoice
- State: "Agency will notify Client when 75% of cap has been consumed. Work will pause at cap unless Client authorizes additional budget in writing."
- Cap does NOT include out-of-pocket expenses (list separately)`,
        
        tm: `TIME & MATERIALS REQUIREMENTS:
Best suited for creative retainers and engagements where deliverables evolve based on business needs.

- Complete rate schedule for all roles that may work on the project
- Clear billing increment (e.g., 15-minute increments)
- MINIMUM COMMITMENT required (NOT a cap - this is a floor)
- Scope guidance with intended objectives and boundaries
- Monthly or quarterly planning and prioritization process
- Tracking and reporting requirements

BUDGET & BILLING STRUCTURE FOR T&M:
- Present as MINIMUM COMMITMENT, not a cap or estimate
- State: "Client commits to a minimum of $[AMOUNT] for the term. This commitment enables Agency to reserve capacity and resources."
- For creative retainers: Minimum commitment of $24,000 annually
- For other T&M work: Minimum retainer of $15,000/month
- Include rate card by role/seniority
- Billing: Monthly in arrears based on actual time incurred
- Payment: Net 30 from invoice date
- Work exceeding minimum commitment billed at same rates
- Include: "Agency and Client will conduct [monthly/quarterly] planning sessions to prioritize work and align on objectives."
- DO NOT use "drawdown" language - this is not a deposit to be depleted, it's a minimum spend commitment
- Unused commitment does NOT roll over or create refund obligations`,
        
        retainer: `RETAINER REQUIREMENTS:
Best suited for ongoing professional services like PR, media relations, thought leadership, and social media.

- Minimum term specified (recommend: 6-12 months)
- Monthly fee clearly stated
- Early termination provisions and fees (e.g., 60-day notice, or fee for early termination)
- Services included clearly enumerated
- Monthly hour allocation or deliverable allocation specified
- Services explicitly EXCLUDED
- Rollover policy clearly stated (recommend: limited or no rollover)
- Overage handling defined (rate, notification threshold, pre-approval)
- Utilization tracking and reporting frequency
- Notice period for non-renewal
- Annual rate adjustment provisions if applicable

BUDGET & BILLING STRUCTURE FOR RETAINER:
- Present monthly retainer fee prominently
- Minimum retainer: $15,000/month
- State: "Monthly retainer of $[AMOUNT] payable in advance on the first of each month"
- Include: "Retainer secures [X hours / defined activities] per month"
- Rollover: "Unused hours [do not roll over / may roll over up to X hours to the immediately following month only]"
- Overage: "Work exceeding monthly allocation will be billed at $[RATE]/hour with Client pre-approval required for overages exceeding [X] hours"
- Minimum term: "Initial term of [6/12] months. Either party may terminate with [60] days written notice after initial term."
- Include utilization reporting: "Agency will provide monthly utilization reports showing hours/activities consumed against allocation."`,

        integrated: `INTEGRATED ENGAGEMENT REQUIREMENTS:
This engagement combines multiple billing models based on the nature of different service lines. Structure the SOW with clearly separated sections for each billing model.

STRUCTURE:
The SOW should have distinct sections for each billing type, with clear separation:

SECTION A - FIXED FEE WORK (Project-Based):
For defined deliverables like branding, strategy, website builds, campaigns, events:
- Exhaustively defined scope with all deliverables specified
- Quantities and revision limits stated
- Milestone-based payments
- Clear completion criteria for each phase
- Change order process for scope changes

SECTION B - RETAINER SERVICES (Ongoing Professional Services):
For PR, media relations, thought leadership, paid social, SEO:
- Monthly fee clearly stated
- Included activities/hours per month specified
- Rollover policy (recommend: limited or none)
- Overage handling defined
- Minimum term and termination provisions

SECTION C - TIME & MATERIALS (Creative/Content Retainer):
For creative production, content creation where deliverables evolve:
- Minimum commitment (floor, not cap)
- Rate card by role
- Monthly planning and prioritization process
- Billing in arrears based on actual time

BUDGET & BILLING STRUCTURE FOR INTEGRATED:
Present fees in clearly separated sections matching the structure above.

Example format:
"SECTION A - BRAND STRATEGY (Fixed Fee)
Total Project Fee: $[XX,XXX]
- 50% ($[X,XXX]) due at project kickoff
- 25% ($[X,XXX]) due upon Strategy approval
- 25% ($[X,XXX]) due upon Expression delivery

SECTION B - PUBLIC RELATIONS (Monthly Retainer)
Monthly Retainer: $[XX,XXX]/month
- Minimum term: [X] months
- Includes: [defined scope]

SECTION C - CREATIVE PRODUCTION (Time & Materials)
Minimum Annual Commitment: $[XX,XXX]
- Billed monthly in arrears at rates below
- [Rate card]"

IMPORTANT:
- Each section operates independently with its own terms
- Fixed Fee sections have defined completion; Retainer/T&M sections have terms
- Cross-reference between sections where work depends on other sections
- Include master assumptions and client responsibilities that apply to ALL sections`
      };
      
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
          system: `You are an expert at drafting professional Statements of Work for Antenna Group, a marketing and communications agency. You create SOWs that protect the agency while being fair and professional for clients.

## CORE SOW STANDARDS (Apply to ALL SOWs)

### Structure and Numbering
- Use decimal numbering throughout (1.1, 1.1.1, 1.1.1.1) - NEVER bullet points in formal sections
- Every deliverable, activity, output, and assumption must have a unique reference number

### Language Standards
- Use "up to" language for flexibility (e.g., "up to 4 hours per month", "up to 2 rounds of revisions")
- NEVER use vague terms like: "as needed", "ongoing", "various", "reasonable", "unlimited", "best efforts"
- Use active voice with clear responsibility: "Agency will...", "Client will..."
- Define any terms that could be interpreted differently

### Deliverable Structure
Each deliverable MUST include:
- **Activities**: What Agency will DO (active voice)
- **Outputs**: What Agency will PRODUCE (with quantities using "1x", "up to 3x" notation)
- **Assumptions**: Conditions that must be true for this scope/fee to hold
- **Completion Criteria**: Explicit trigger for when this deliverable is considered complete

### Client Responsibilities Section (REQUIRED)
Must include:
1. Consolidated Feedback: "Client agrees to consolidate all internal feedback before submission to Agency. Feedback must represent unified organizational direction."
2. Approval Windows: "Client commits to providing feedback within [X] business days. Deliverables not rejected within this window shall be deemed approved."
3. Change Control: "Any change to scope, timeline, or budget requires mutual written agreement via change order."
4. Stakeholder Limits: "Agency will interface with a maximum of [X] client stakeholders for feedback purposes."
5. Input Requirements: What materials, access, or information client must provide
6. Consequences: What happens if client fails to meet obligations

### Master Assumptions Section (REQUIRED)
Must include:
1. Scope Boundaries: "This SOW does not include..." with specific exclusions
2. Revision Limits: "Up to [X] rounds of revisions included per deliverable"
3. Response Times: Expected client response times for different actions
4. Pause/Termination Ladder: "If Client delays exceed [X] business days, Agency may pause work"

### Out of Scope / Exclusions (REQUIRED)
Explicitly list what is NOT included. Consider:
- Rush fees and expedited timelines
- Additional revision rounds beyond stated limits
- Crisis communications (unless included)
- Paid media spend management
- Travel outside defined geography
- Third-party vendor management
- Content creation not explicitly listed
- Legal or regulatory review

${engagementGuidance[engagementType] || engagementGuidance.fixed_fee}

${ASSESSMENT_FRAMEWORK}`,
          messages: [{
            role: 'user',
            content: `Create a professional Statement of Work based on the following information:

## ENGAGEMENT TYPE
${engagementLabel}
${engagementType === 'integrated' ? `
## BILLING MODEL BREAKDOWN
${(() => {
  const billingAnalysis = analyzeServiceBillingModels(selectedServices);
  let breakdown = '';
  if (billingAnalysis.billingModelCategories.fixed_fee.length > 0) {
    breakdown += `\nFIXED FEE SECTION (Project-Based):\n${billingAnalysis.billingModelCategories.fixed_fee.map(c => `- ${c.category}: ${c.services.join(', ')}`).join('\n')}`;
  }
  if (billingAnalysis.billingModelCategories.retainer.length > 0) {
    breakdown += `\nRETAINER SECTION (Ongoing Services):\n${billingAnalysis.billingModelCategories.retainer.map(c => `- ${c.category}: ${c.services.join(', ')}`).join('\n')}`;
  }
  if (billingAnalysis.billingModelCategories.tm.length > 0) {
    breakdown += `\nTIME & MATERIALS SECTION (Creative/Content):\n${billingAnalysis.billingModelCategories.tm.map(c => `- ${c.category}: ${c.services.join(', ')}`).join('\n')}`;
  }
  return breakdown;
})()}

IMPORTANT: Structure the SOW with clearly separated sections for each billing model as shown above. Each section should have its own fee structure, terms, and deliverables appropriate to that billing model.
` : ''}
## ADDITIONAL NOTES FROM ACCOUNT TEAM
${draftNotes || 'None provided'}

## CLIENT TRANSCRIPT ANALYSIS
${transcriptAnalysis || 'No transcript analyzed'}

## SELECTED SERVICES TO INCLUDE
${selectedServices.map(s => `- ${s}`).join('\n')}

## REQUIREMENTS FOR THIS SOW

Generate a complete, client-ready SOW that:

1. **Addresses Client Needs**: Directly addresses the success criteria and problems identified in the transcript analysis

2. **Structured Deliverables**: Includes all selected services as properly structured deliverables with:
   - Clear activities (what Agency will DO)
   - Specific outputs (what Agency will PRODUCE with quantities)
   - Assumptions for each deliverable
   - Explicit completion criteria

3. **Client Responsibilities**: Comprehensive section including:
   - Consolidated feedback requirement
   - Approval windows with deemed acceptance
   - Change control process
   - Stakeholder limits
   - Input requirements with deadlines
   - Consequences for non-compliance

4. **Master Assumptions**: Including:
   - Scope boundaries and exclusions
   - Revision limits
   - Response time expectations
   - Pause/termination provisions

5. **Proper Formatting**:
   - Decimal numbering throughout (1.1, 1.1.1, etc.)
   - "Up to" language for all quantities and timeframes
   - Clear section headers
   - Professional tone

6. **Fee Summary**: Appropriate for a ${engagementLabel} engagement with:
   - Clear fee structure
   - Payment schedule tied to milestones or phases
   - Rate card for additional work if applicable
   - Expense handling

7. **Scope Protection**: Clear exclusions and boundaries to prevent scope creep

The SOW should be ready for client presentation with minimal editing needed. Make it thorough but readable.`
          }]
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }
      
      const data = await response.json();
      setGeneratedSOW(data.content[0].text);
      
    } catch (err) {
      setDraftError(err.message);
    } finally {
      setIsGeneratingDraft(false);
    }
  };
  
  const downloadGeneratedSOW = async () => {
    if (!generatedSOW) return;
    const filename = `SOW_Draft_${new Date().toISOString().split('T')[0]}.docx`;
    await downloadAsDocx(generatedSOW, filename, {
      title: 'Statement of Work (SOW)',
      client: '', // Could extract from transcript analysis
    });
  };
  
  const resetDraft = () => {
    setDraftNotes('');
    setDraftEngagementType('');
    setTranscript('');
    setTranscriptAnalysis(null);
    setDetectedTriggers([]);
    setSelectedServices([]);
    setShowOtherServices(false);
    setGeneratedSOW(null);
    setDraftError(null);
  };

  // ============================================================================
  // REVIEW SOW FUNCTIONS
  // ============================================================================
  
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
    if (!apiKey || !fileContent || !reviewEngagementType) return;

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setRawResponse('');
    setDraftedSOW(null);

    try {
      const engagementLabel = REVIEW_ENGAGEMENT_TYPES.find(t => t.value === reviewEngagementType)?.label || reviewEngagementType;
      
      const promptText = `${ASSESSMENT_FRAMEWORK}

You are reviewing an SOW for a ${engagementLabel} engagement.

## CRITICAL FORMATTING REQUIREMENTS

Every issue you report MUST include:
1. A clear description of the problem
2. The specific action needed to fix it
3. Either the exact text to change OR the exact text to add

DO NOT output simple bullet lists without context. Each issue must be self-contained and actionable.

## Issue Format

**For LANGUAGE ISSUES (text exists but needs improvement):**
Section X.X: [Clear description of the problem]
Current: "[quote the EXACT problematic text from the document]"
Recommended: "[the replacement text - ready to copy/paste]"
Why: [one sentence explaining the risk]

**For MISSING ELEMENTS (something is entirely absent):**
Section: [where to add it, or "New section needed"]
Missing: [what element is missing - be specific]
Add: "[the complete language to add - ready to copy/paste]"
Why: [one sentence explaining the risk]

## IMPORTANT RULES

1. NEVER output orphaned bullet points without context
2. NEVER just list items that are in the SOW without explaining what's wrong
3. Every issue MUST have either "Current/Recommended" OR "Missing/Add" format
4. If something is GOOD (like having an exclusions section), don't list it as a critical issue
5. Only flag actual problems that need fixing
6. CREATIVE/DEPOSIT RETAINERS: If you see language like "minimum commitment... held as deposit and drawn down" this is NOT an "up to" cap - it's a FLOOR. The client pays the minimum upfront and CAN spend MORE on T&M. Do NOT recommend adding rollover policies or "up to" language to deposit amounts.
7. BUDGET NUMBERS: Do NOT invent budget numbers in recommendations. Use "$xxxx.xx" as a placeholder unless:
   - The SOW already specifies a budget value (use that value)
   - It's one of these known Antenna Group minimums:
     • Branding Strategy & Expression projects: $50,000 minimum
     • Creative T&M retainer deposit: $24,000 minimum
     • Brand assessment: $4,000
     • Minimum retainers: $15,000

## Response Structure

1. CRITICAL ISSUES - Things that MUST be fixed before issuing
(Each issue must follow the format above with full context)

2. RECOMMENDED IMPROVEMENTS - Things that SHOULD be fixed
(Each issue must follow the format above with full context)

3. RED FLAGS FOUND - Problematic phrases that need replacement
Format EACH as: "[exact phrase found]" in Section X.X → "[recommended replacement]"
Prefer "UP TO" language (e.g., "up to 4 hours per month") rather than exact quantification.

4. STRUCTURAL COMPLIANCE - Check each required element for ${engagementLabel} engagements
✓ Present: [element] - [where found]
✗ Missing: [element] - [what to add]

5. BUDGET VERIFICATION - Check fee table arithmetic, billing schedule alignment

6. OVERALL ASSESSMENT
- Compliance score (1-10) with justification
- Top 3 priorities to address
- What's working well

Remember: Quality over quantity. Only report actual issues that need action, with complete context for each.`;


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
          messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API request failed');
      }

      const data = await response.json();
      const responseText = data.content[0].text;
      setRawResponse(responseText);

      // Parse response into sections - improved to handle various AI formatting styles
      const parseSection = (text, startMarkers, endMarkers) => {
        // Try multiple possible start markers
        const markers = Array.isArray(startMarkers) ? startMarkers : [startMarkers];
        let startIdx = -1;
        let usedMarkerLength = 0;
        
        for (const marker of markers) {
          const idx = text.indexOf(marker);
          if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
            startIdx = idx;
            usedMarkerLength = marker.length;
          }
        }
        
        if (startIdx === -1) return [];
        
        let endIdx = text.length;
        for (const marker of endMarkers) {
          const idx = text.indexOf(marker, startIdx + usedMarkerLength);
          if (idx !== -1 && idx < endIdx) endIdx = idx;
        }
        
        const section = text.slice(startIdx + usedMarkerLength, endIdx).trim();
        
        // Split on issue boundaries - handle various formats:
        // **Section D.2.2:** or Section D.2.2: or ### Section or numbered items
        const issuePattern = /\n(?=\*{0,2}Section\s+[\d.A-Za-z]+[:\*]|#{1,3}\s+Section|(?:^|\n)\d+\.\s+[A-Z])/gi;
        let items = section.split(issuePattern).map(s => s.trim()).filter(s => s.length > 0);
        
        // If no splits occurred, try splitting on double newlines (paragraph breaks)
        if (items.length <= 1 && section.length > 100) {
          items = section.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 0);
        }
        
        // Filter out items that are:
        // 1. Too short (< 20 chars) - likely orphaned fragments
        // 2. Just simple bullet points without context
        // 3. Headers without content
        return items.filter(item => {
          // Must be substantial
          if (item.length < 30) return false;
          
          // Skip if it's just a header line
          if (/^#{1,3}\s+\w+$/.test(item.trim())) return false;
          
          // If it starts with "- " and doesn't contain actionable markers, skip it
          if (item.startsWith('- ') && !item.includes(':') && !item.includes('→') && item.length < 100) {
            return false;
          }
          
          // Keep items that have structure (Section, Current/Recommended, Missing/Add, etc.)
          const hasStructure = /Section|Current:|Recommended:|Missing:|Add:|Why:|→/i.test(item);
          const isSubstantive = item.length > 60 || hasStructure;
          
          return isSubstantive;
        });
      };

      // Try multiple variations of section headers the AI might use
      const parsedAnalysis = {
        critical: parseSection(responseText, 
          ['## CRITICAL ISSUES', '1. CRITICAL ISSUES', '**CRITICAL ISSUES', '# CRITICAL ISSUES', 'CRITICAL ISSUES'], 
          ['## RECOMMENDED', '2. RECOMMENDED', '**RECOMMENDED', '## 2.', '3. RED FLAGS', '## RED FLAGS']
        ),
        recommended: parseSection(responseText, 
          ['## RECOMMENDED IMPROVEMENTS', '2. RECOMMENDED IMPROVEMENTS', '**RECOMMENDED', '# RECOMMENDED'], 
          ['## RED FLAGS', '3. RED FLAGS', '**RED FLAGS', '## 3.', '4. STRUCTURAL', '4. SERVICE-LINE', '## STRUCTURAL', '## SERVICE-LINE']
        ),
        redFlags: parseSection(responseText, 
          ['## RED FLAGS', '3. RED FLAGS FOUND', '3. RED FLAGS', '**RED FLAGS'], 
          ['## STRUCTURAL', '## SERVICE-LINE', '4. STRUCTURAL', '4. SERVICE-LINE', '**STRUCTURAL', '**SERVICE-LINE', '## 4.', '5. BUDGET', '## BUDGET']
        ),
        compliance: responseText.match(/(?:##?\s*)?(?:4\.\s*)?(?:STRUCTURAL|SERVICE-LINE) COMPLIANCE[\s\S]*?(?=(?:##?\s*)?(?:5\.\s*)?BUDGET|(?:##?\s*)?(?:6\.\s*)?OVERALL|$)/i)?.[0]
          ?.replace(/(?:##?\s*)?(?:4\.\s*)?(?:STRUCTURAL|SERVICE-LINE) COMPLIANCE/i, '').trim(),
        budget: responseText.match(/(?:##?\s*)?(?:5\.\s*)?BUDGET VERIFICATION[\s\S]*?(?=(?:##?\s*)?(?:6\.\s*)?OVERALL|$)/i)?.[0]
          ?.replace(/(?:##?\s*)?(?:5\.\s*)?BUDGET VERIFICATION/i, '').trim(),
        overall: responseText.match(/(?:##?\s*)?(?:6\.\s*)?OVERALL ASSESSMENT[\s\S]*$/i)?.[0]
          ?.replace(/(?:##?\s*)?(?:6\.\s*)?OVERALL ASSESSMENT/i, '').trim()
      };

      setAnalysis(parsedAnalysis);
      
      // Initialize all recommendations as selected (checked) by default
      setSelectedRecommendations({
        critical: (parsedAnalysis.critical || []).map((_, idx) => idx),
        recommended: (parsedAnalysis.recommended || []).map((_, idx) => idx),
        redFlags: (parsedAnalysis.redFlags || []).map((_, idx) => idx)
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateRevisedDraft = async () => {
    if (!apiKey || !fileContent || !analysis) return;
    
    setIsDrafting(true);
    setReviewDraftError(null);
    
    try {
      // Build filtered analysis based on selected recommendations
      const selectedCritical = (analysis.critical || [])
        .filter((_, idx) => selectedRecommendations.critical.includes(idx));
      const selectedRecommended = (analysis.recommended || [])
        .filter((_, idx) => selectedRecommendations.recommended.includes(idx));
      const selectedRedFlags = (analysis.redFlags || [])
        .filter((_, idx) => selectedRecommendations.redFlags.includes(idx));
      
      const filteredAnalysis = `## SELECTED CHANGES TO APPLY

### Critical Issues to Fix (${selectedCritical.length} selected):
${selectedCritical.length > 0 ? selectedCritical.map((issue, i) => `${i + 1}. ${issue}`).join('\n\n') : 'None selected'}

### Recommended Improvements to Apply (${selectedRecommended.length} selected):
${selectedRecommended.length > 0 ? selectedRecommended.map((issue, i) => `${i + 1}. ${issue}`).join('\n\n') : 'None selected'}

### Red Flag Language to Replace (${selectedRedFlags.length} selected):
${selectedRedFlags.length > 0 ? selectedRedFlags.map((flag, i) => `${i + 1}. ${flag}`).join('\n') : 'None selected'}

### Additional Context (Structural Compliance, Budget, Overall):
${analysis.compliance || 'N/A'}
${analysis.budget || 'N/A'}
${analysis.overall || 'N/A'}`;

      let messages = [];
      const draftPrompt = `Based on the SELECTED changes provided below, create a COMPLETE REVISED VERSION of this SOW that:

1. Applies ONLY the critical fixes that were selected
2. Incorporates ONLY the recommended improvements that were selected
3. Replaces ONLY the red flag language that was selected (using "up to" language)
4. Adds any missing required sections mentioned in the selected items
5. Maintains the original structure and intent while improving quality
6. Uses proper decimal numbering throughout
7. KEEP unchanged any sections where the recommendation was NOT selected

${filteredAnalysis}

Output the complete revised SOW text. Mark sections you've modified with [REVISED] and new sections with [NEW].`;

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
          content: `${draftPrompt}\n\n=== ORIGINAL SOW ===\n${fileContent.data}`
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
          messages
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate draft');
      }

      const data = await response.json();
      setDraftedSOW(data.content[0].text);
    } catch (err) {
      setReviewDraftError(err.message);
    } finally {
      setIsDrafting(false);
    }
  };

  const downloadRevisedDraft = async () => {
    if (!draftedSOW) return;
    const originalName = file?.name?.replace(/\.[^/.]+$/, '') || 'SOW';
    const filename = `${originalName}_REVISED.docx`;
    await downloadAsDocx(draftedSOW, filename, {
      title: `${originalName} - Revised`,
    });
  };

  const resetReview = () => {
    setFile(null);
    setFileContent(null);
    setReviewEngagementType('');
    setAnalysis(null);
    setRawResponse('');
    setDraftedSOW(null);
    setError(null);
    setSelectedRecommendations({ critical: [], recommended: [], redFlags: [] });
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8E6E1' }}>
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-10" style={{ backgroundColor: '#E8E6E1' }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentView('home')} className="hover:opacity-80 transition-opacity">
              <AntennaLogo className="h-8" />
            </button>
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

      <main className="max-w-6xl mx-auto px-6 py-16">
        
        {/* ================================================================== */}
        {/* HOME VIEW */}
        {/* ================================================================== */}
        {currentView === 'home' && (
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              SOW Workbench
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-16">
              Draft new Statements of Work from client calls or review existing SOWs against Antenna Group quality standards.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Draft SOW Card */}
              <button
                onClick={() => setCurrentView('draft')}
                className="group relative p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-[#12161E] transition-all text-left overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gray-100 group-hover:bg-[#12161E] rounded-xl flex items-center justify-center mb-6 transition-colors">
                    <PenTool className="w-7 h-7 text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Draft a New SOW</h2>
                  <p className="text-gray-500 mb-4">
                    Create a Statement of Work from scratch using client call transcripts. AI analyzes the conversation to identify services and requirements.
                  </p>
                  <div className="flex items-center gap-2 text-[#12161E] font-semibold">
                    <span className="relative overflow-hidden">
                      <span className="relative inline-block">
                        Get started
                        {/* Yellow highlight with black text - slides down on hover */}
                        <span 
                          className="absolute inset-0 flex items-center transition-transform duration-300 ease-out group-hover:translate-y-full pointer-events-none"
                          style={{ backgroundColor: '#E8FF00' }}
                        >
                          <span style={{ color: '#12161E' }}>Get started</span>
                        </span>
                      </span>
                    </span>
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
              
              {/* Review SOW Card */}
              <button
                onClick={() => setCurrentView('review')}
                className="group relative p-8 bg-white rounded-2xl border-2 border-gray-200 hover:border-[#12161E] transition-all text-left overflow-hidden"
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gray-100 group-hover:bg-[#12161E] rounded-xl flex items-center justify-center mb-6 transition-colors">
                    <Search className="w-7 h-7 text-gray-600 group-hover:text-white transition-colors" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">Review an Existing SOW</h2>
                  <p className="text-gray-500 mb-4">
                    Upload an SOW for automated quality assessment against Antenna Group standards. Get specific recommendations and generate revised drafts.
                  </p>
                  <div className="flex items-center gap-2 text-[#12161E] font-semibold">
                    <span className="relative overflow-hidden">
                      <span className="relative inline-block">
                        Get started
                        {/* Yellow highlight with black text - slides down on hover */}
                        <span 
                          className="absolute inset-0 flex items-center transition-transform duration-300 ease-out group-hover:translate-y-full pointer-events-none"
                          style={{ backgroundColor: '#E8FF00' }}
                        >
                          <span style={{ color: '#12161E' }}>Get started</span>
                        </span>
                      </span>
                    </span>
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            </div>
            
            {/* Version number */}
            <div className="mt-16 text-right">
              <span className="text-xs text-gray-400 font-mono">v{APP_VERSION}</span>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* DRAFT SOW VIEW */}
        {/* ================================================================== */}
        {currentView === 'draft' && !generatedSOW && (
          <>
            <button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to home
            </button>
            
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Draft a New SOW</h1>
              <p className="text-xl text-gray-500">
                Paste a client call transcript and we'll analyze it to identify services and requirements.
              </p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Inputs */}
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-6">
                  <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
                  
                  {/* Engagement Type */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Engagement Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {DRAFT_ENGAGEMENT_TYPES.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => setDraftEngagementType(type.value)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            draftEngagementType === type.value
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className="font-semibold text-gray-900 text-sm">{type.label}</p>
                          <p className="text-xs text-gray-500">{type.description}</p>
                        </button>
                      ))}
                    </div>
                    
                    {/* Engagement Type Recommendation */}
                    {(() => {
                      console.log('Checking engagement recommendation - selectedServices:', selectedServices, 'draftEngagementType:', draftEngagementType);
                      const recommendation = getEngagementTypeRecommendation(selectedServices, detectedTriggers, draftEngagementType);
                      console.log('Engagement recommendation result:', recommendation);
                      if (!recommendation) return null;
                      
                      const bgColor = recommendation.type === 'warning' 
                        ? 'bg-amber-50 border-amber-200' 
                        : recommendation.type === 'suggestion'
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-green-50 border-green-200';
                      const textColor = recommendation.type === 'warning'
                        ? 'text-amber-800'
                        : recommendation.type === 'suggestion'
                        ? 'text-blue-800'
                        : 'text-green-800';
                      const iconColor = recommendation.type === 'warning'
                        ? 'text-amber-600'
                        : recommendation.type === 'suggestion'
                        ? 'text-blue-600'
                        : 'text-green-600';
                      
                      return (
                        <div className={`mt-3 p-3 rounded-lg border ${bgColor}`}>
                          <div className="flex items-start gap-2">
                            {recommendation.type === 'warning' ? (
                              <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
                            ) : recommendation.type === 'suggestion' ? (
                              <Lightbulb className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
                            ) : (
                              <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
                            )}
                            <div>
                              <p className={`text-sm font-medium ${textColor}`}>{recommendation.title}</p>
                              <p className={`text-xs ${textColor} opacity-80 mt-1`}>{recommendation.message}</p>
                              {recommendation.type !== 'confirmation' && recommendation.recommendedType && (
                                <button
                                  onClick={() => setDraftEngagementType(recommendation.recommendedType)}
                                  className={`mt-2 text-xs font-medium ${textColor} underline hover:no-underline`}
                                >
                                  Switch to {DRAFT_ENGAGEMENT_TYPES.find(t => t.value === recommendation.recommendedType)?.label}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Additional Notes (optional)
                    </label>
                    <textarea
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="Any specific requirements, budget constraints, timeline notes, or context the AI should know..."
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all text-gray-900 placeholder:text-gray-400 min-h-[100px] resize-y"
                    />
                  </div>
                  
                  {/* Transcript */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Client Call Transcript
                      </div>
                    </label>
                    <textarea
                      value={transcript}
                      onChange={(e) => setTranscript(e.target.value)}
                      placeholder="Paste the transcript of your client call here. The AI will analyze it to identify what services they need and extract key requirements..."
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none transition-all text-gray-900 placeholder:text-gray-400 min-h-[200px] resize-y font-mono text-sm"
                    />
                  </div>
                  
                  {draftError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-start gap-3 text-red-600">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <p className="text-sm">{draftError}</p>
                      </div>
                    </div>
                  )}
                  
                  <AntennaButton
                    onClick={analyzeTranscript}
                    disabled={!apiKey || !transcript.trim()}
                    loading={isAnalyzingTranscript}
                    loadingText="Analyzing Transcript..."
                    icon={Lightbulb}
                    className="w-full"
                    size="large"
                  >
                    Analyze Transcript
                  </AntennaButton>
                </div>
              </div>
              
              {/* Right Column - Analysis Results */}
              <div className="space-y-6">
                {transcriptAnalysis && (
                  <>
                    {/* Analysis Summary */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Target className="w-5 h-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Transcript Analysis</h3>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg overflow-auto text-gray-700 font-sans">
                          {transcriptAnalysis}
                        </pre>
                      </div>
                    </div>
                    
                    {/* Detected Service Triggers */}
                    {detectedTriggers.length > 0 && (
                      <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Recommended Services</h3>
                            <p className="text-sm text-gray-500">Based on client needs identified in the transcript</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {detectedTriggers.map((trigger) => (
                            <ServiceCard
                              key={trigger.id}
                              trigger={trigger}
                              isSelected={getServiceNames(trigger).some(s => selectedServices.includes(s))}
                              selectedServices={selectedServices}
                              onToggleService={toggleService}
                            />
                          ))}
                        </div>
                        
                        {/* Other Services - categories not auto-detected */}
                        {SERVICE_TRIGGERS.filter(t => !detectedTriggers.some(d => d.id === t.id)).length > 0 && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <button
                              onClick={() => setShowOtherServices(!showOtherServices)}
                              className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 mb-4"
                            >
                              {showOtherServices ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              Other Services ({SERVICE_TRIGGERS.filter(t => !detectedTriggers.some(d => d.id === t.id)).length} categories)
                            </button>
                            {showOtherServices && (
                              <div className="space-y-4">
                                {SERVICE_TRIGGERS.filter(t => !detectedTriggers.some(d => d.id === t.id)).map((trigger) => (
                                  <ServiceCard
                                    key={trigger.id}
                                    trigger={trigger}
                                    isSelected={getServiceNames(trigger).some(s => selectedServices.includes(s))}
                                    selectedServices={selectedServices}
                                    onToggleService={toggleService}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {selectedServices.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-sm font-semibold text-gray-900">
                                {selectedServices.length} services selected
                              </p>
                              <button
                                onClick={() => setSelectedServices([])}
                                className="text-sm text-gray-500 hover:text-gray-900"
                              >
                                Clear all
                              </button>
                            </div>
                            <AntennaButton
                              onClick={generateSOW}
                              disabled={!draftEngagementType}
                              loading={isGeneratingDraft}
                              loadingText="Generating SOW..."
                              icon={Sparkles}
                              className="w-full"
                              size="large"
                            >
                              Generate SOW Draft
                            </AntennaButton>
                            {!draftEngagementType && (
                              <p className="text-sm text-amber-600 mt-2 text-center">Please select an engagement type first</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* All Service Categories (if no triggers detected) */}
                    {detectedTriggers.length === 0 && (
                      <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">Select Services Manually</h3>
                            <p className="text-sm text-gray-500">Choose the services to include in your SOW</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          {SERVICE_TRIGGERS.map((trigger) => (
                            <ServiceCard
                              key={trigger.id}
                              trigger={trigger}
                              isSelected={getServiceNames(trigger).some(s => selectedServices.includes(s))}
                              selectedServices={selectedServices}
                              onToggleService={toggleService}
                            />
                          ))}
                        </div>
                        
                        {selectedServices.length > 0 && (
                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-sm font-semibold text-gray-900">
                                {selectedServices.length} services selected
                              </p>
                              <button
                                onClick={() => setSelectedServices([])}
                                className="text-sm text-gray-500 hover:text-gray-900"
                              >
                                Clear all
                              </button>
                            </div>
                            <AntennaButton
                              onClick={generateSOW}
                              disabled={!draftEngagementType}
                              loading={isGeneratingDraft}
                              loadingText="Generating SOW..."
                              icon={Sparkles}
                              className="w-full"
                              size="large"
                            >
                              Generate SOW Draft
                            </AntennaButton>
                            {!draftEngagementType && (
                              <p className="text-sm text-amber-600 mt-2 text-center">Please select an engagement type first</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                
                {!transcriptAnalysis && (
                  <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Paste a transcript to get started</h3>
                    <p className="text-sm text-gray-500">
                      The AI will analyze the conversation to identify client needs, problems to solve, and recommended services.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Generated SOW View */}
        {currentView === 'draft' && generatedSOW && (
          <>
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">SOW Draft Generated</h1>
                <p className="text-gray-500">
                  {DRAFT_ENGAGEMENT_TYPES.find(t => t.value === draftEngagementType)?.label} • {selectedServices.length} services included
                </p>
              </div>
              <div className="flex gap-3">
                <AntennaButton
                  onClick={downloadGeneratedSOW}
                  icon={Download}
                  size="default"
                >
                  Download Word Doc
                </AntennaButton>
                <AntennaButton
                  onClick={resetDraft}
                  variant="secondary"
                  size="default"
                >
                  Start Over
                </AntennaButton>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="font-semibold text-gray-900">Generated SOW</span>
                <CopyButton text={generatedSOW} />
              </div>
              <div className="p-6 max-h-[70vh] overflow-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono leading-relaxed">{generatedSOW}</pre>
              </div>
            </div>
          </>
        )}

        {/* ================================================================== */}
        {/* REVIEW SOW VIEW */}
        {/* ================================================================== */}
        {currentView === 'review' && !analysis && (
          <>
            <button
              onClick={() => setCurrentView('home')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to home
            </button>
            
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Review an Existing SOW</h1>
              <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                Upload a Statement of Work for automated quality assessment against Antenna Group standards.
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-8">
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
                  {REVIEW_ENGAGEMENT_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setReviewEngagementType(type.value)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        reviewEngagementType === type.value
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                          reviewEngagementType === type.value ? 'border-gray-900' : 'border-gray-300'
                        }`}>
                          {reviewEngagementType === type.value && <div className="w-2.5 h-2.5 rounded-full bg-gray-900" />}
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

              <AntennaButton
                onClick={analyzeSOW}
                disabled={!apiKey || !file || !reviewEngagementType}
                loading={isAnalyzing}
                loadingText="Analyzing SOW..."
                className="w-full"
                size="large"
              >
                Analyze SOW
              </AntennaButton>
            </div>
          </>
        )}

        {/* Review Results View */}
        {currentView === 'review' && analysis && (
          <>
            <div className="flex items-start justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Analysis Complete</h1>
                <p className="text-gray-500">{file?.name} • {REVIEW_ENGAGEMENT_TYPES.find(t => t.value === reviewEngagementType)?.label} Engagement</p>
              </div>
              <AntennaButton onClick={resetReview} variant="secondary" size="default">
                Review Another
              </AntennaButton>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              {analysis.critical?.length > 0 && (
                <CollapsibleSection title="Critical Issues" icon={AlertCircle} count={analysis.critical.length} defaultOpen variant="critical">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-red-600">Must be addressed before issuing to client.</p>
                    <button
                      onClick={() => toggleAllInCategory('critical', analysis.critical)}
                      className="text-xs text-gray-500 hover:text-gray-900 underline"
                    >
                      {selectedRecommendations.critical.length === analysis.critical.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {analysis.critical.map((issue, idx) => (
                    <IssueCard 
                      key={idx} 
                      issue={issue} 
                      type="critical"
                      isSelected={selectedRecommendations.critical.includes(idx)}
                      onToggle={() => toggleRecommendation('critical', idx)}
                    />
                  ))}
                </CollapsibleSection>
              )}

              {analysis.recommended?.length > 0 && (
                <CollapsibleSection title="Recommended Improvements" icon={AlertTriangle} count={analysis.recommended.length} defaultOpen variant="recommended">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-amber-600">Would strengthen the SOW but not blocking.</p>
                    <button
                      onClick={() => toggleAllInCategory('recommended', analysis.recommended)}
                      className="text-xs text-gray-500 hover:text-gray-900 underline"
                    >
                      {selectedRecommendations.recommended.length === analysis.recommended.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {analysis.recommended.map((issue, idx) => (
                    <IssueCard 
                      key={idx} 
                      issue={issue} 
                      type="recommended"
                      isSelected={selectedRecommendations.recommended.includes(idx)}
                      onToggle={() => toggleRecommendation('recommended', idx)}
                    />
                  ))}
                </CollapsibleSection>
              )}

              {analysis.redFlags?.length > 0 && (
                <CollapsibleSection title="Red Flags Found" count={analysis.redFlags.length} icon={AlertTriangle}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">Problematic language to replace. Click the copy button to grab the replacement text.</p>
                    <button
                      onClick={() => toggleAllInCategory('redFlags', analysis.redFlags)}
                      className="text-xs text-gray-500 hover:text-gray-900 underline"
                    >
                      {selectedRecommendations.redFlags.length === analysis.redFlags.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  {analysis.redFlags.map((flag, idx) => (
                    <RedFlagCard 
                      key={idx} 
                      flag={flag}
                      isSelected={selectedRecommendations.redFlags.includes(idx)}
                      onToggle={() => toggleRecommendation('redFlags', idx)}
                    />
                  ))}
                </CollapsibleSection>
              )}

              {analysis.compliance && (
                <CollapsibleSection title="Structural Compliance" icon={CheckCircle}>
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
                  <p className="text-gray-400 mb-4">
                    Create an updated draft incorporating your selected recommendations. Use the checkboxes above to include or exclude specific changes.
                  </p>
                  
                  {/* Selection Summary */}
                  <div className="flex flex-wrap gap-3 mb-6">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-900/30 border border-red-500/40 rounded-full text-red-300 text-sm">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {selectedRecommendations.critical.length}/{analysis.critical?.length || 0} Critical
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-900/30 border border-amber-500/40 rounded-full text-amber-300 text-sm">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {selectedRecommendations.recommended.length}/{analysis.recommended?.length || 0} Recommended
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 border border-gray-600 rounded-full text-gray-300 text-sm">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {selectedRecommendations.redFlags.length}/{analysis.redFlags?.length || 0} Red Flags
                    </span>
                  </div>

                  {reviewDraftError && (
                    <div className="mb-4 p-4 bg-red-900/30 border border-red-500/40 rounded-xl">
                      <p className="text-red-300 text-sm">{reviewDraftError}</p>
                    </div>
                  )}

                  {!draftedSOW ? (
                    <AntennaButton
                      onClick={generateRevisedDraft}
                      disabled={selectedRecommendations.critical.length === 0 && selectedRecommendations.recommended.length === 0 && selectedRecommendations.redFlags.length === 0}
                      loading={isDrafting}
                      loadingText="Generating Draft..."
                      icon={Sparkles}
                      variant="secondary"
                      className="bg-white hover:bg-gray-100"
                    >
                      Draft Updated SOW
                    </AntennaButton>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-900/30 border border-green-500/40 rounded-full text-green-300 text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          Draft Generated
                        </span>
                        <AntennaButton
                          onClick={downloadRevisedDraft}
                          icon={Download}
                          variant="secondary"
                          size="small"
                          className="bg-white hover:bg-gray-100"
                        >
                          Download Word Doc
                        </AntennaButton>
                        <button
                          onClick={generateRevisedDraft}
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

      {/* Footer */}
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
