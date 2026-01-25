import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, AlertCircle, Loader2, ChevronDown, ChevronRight, Key, Eye, EyeOff, ArrowUpRight, Copy, Check, ArrowRight, Download, Sparkles, PenTool, Search, MessageSquare, Lightbulb, Target, Users, ChevronLeft } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber, PageBreak, LevelFormat, ImageRun } from 'docx';
import { saveAs } from 'file-saver';

// ============================================================================
// VERSION
// ============================================================================
const APP_VERSION = '2.1.2';

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

// Parse SOW text into structured sections
const parseSOWContent = (sowText) => {
  const lines = sowText.split('\n');
  const sections = [];
  let currentSection = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check for main headings (# or ##)
    if (trimmed.startsWith('# ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'h1', text: trimmed.replace(/^#+\s*/, ''), children: [] };
    } else if (trimmed.startsWith('## ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'h2', text: trimmed.replace(/^#+\s*/, ''), children: [] };
    } else if (trimmed.startsWith('### ')) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'h3', text: trimmed.replace(/^#+\s*/, ''), children: [] };
    } else if (/^\d+\.\s/.test(trimmed)) {
      // Numbered section (e.g., "1. Services Description")
      if (currentSection) sections.push(currentSection);
      currentSection = { type: 'numbered', text: trimmed, children: [] };
    } else if (/^\d+\.\d+/.test(trimmed)) {
      // Sub-numbered (e.g., "1.1. Something")
      if (currentSection) {
        currentSection.children.push({ type: 'sub', text: trimmed });
      } else {
        sections.push({ type: 'para', text: trimmed, children: [] });
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      // Bullet point
      if (currentSection) {
        currentSection.children.push({ type: 'bullet', text: trimmed.replace(/^[-•]\s*/, '') });
      } else {
        sections.push({ type: 'bullet', text: trimmed.replace(/^[-•]\s*/, ''), children: [] });
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
  
  if (currentSection) sections.push(currentSection);
  return sections;
};

// Generate Word document from SOW content
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
  
  // Process each section
  for (const section of sections) {
    if (section.type === 'h1' || section.type === 'numbered') {
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
      if (child.type === 'sub') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: child.text,
                size: 22,
                font: "Arial",
              }),
            ],
            indent: { left: 360 },
            spacing: { after: 100 },
          })
        );
      } else if (child.type === 'bullet') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "• " + child.text,
                size: 22,
                font: "Arial",
              }),
            ],
            indent: { left: 720 },
            spacing: { after: 80 },
          })
        );
      } else if (child.type === 'para') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: child.text,
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
  
  // Create document
  const doc = new Document({
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
// SERVICE TRIGGER MAPPINGS (Enhanced with comprehensive trigger patterns)
// ============================================================================
const SERVICE_TRIGGERS = [
  {
    id: 'website',
    category: 'Website & App Development',
    description: 'Build or rebuild digital platforms',
    services: [
      'Website Strategy & Planning',
      'Website Design & UX',
      'Website Development',
      'CMS Implementation',
      'E-commerce Development',
      'Mobile App Development',
      'Landing Page Development',
      'Website Migration',
      'Technical SEO Audit',
      'Performance Optimization'
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
    services: [
      'Marketing Strategy Development',
      'Channel Planning & Media Mix',
      'Customer Journey Mapping',
      'Marketing Audit & Assessment',
      'Budget Allocation Strategy',
      'Campaign Planning',
      'Marketing Roadmap',
      'Competitive Analysis',
      'Market Research'
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
    category: 'Brand Strategy & Identity',
    description: 'Define or refresh your brand foundation',
    services: [
      'Brand Strategy Development',
      'Brand Positioning',
      'Visual Identity System',
      'Brand Guidelines',
      'Brand Architecture',
      'Naming & Nomenclature',
      'Brand Messaging Framework',
      'Rapid Discovery Workshop',
      'Brand Refresh',
      'Rebrand'
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
    services: [
      'Graphic Design',
      'Video Production',
      'Animation & Motion Graphics',
      'Photography',
      'Copywriting',
      'Sales Collateral',
      'Presentation Design',
      'Social Media Content',
      'Campaign Asset Creation',
      'Brand Asset Library'
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
    services: [
      'Influencer Strategy',
      'Creator Identification & Vetting',
      'Influencer Campaign Management',
      'Content Collaboration',
      'Ambassador Programs',
      'Influencer Relations',
      'Performance Tracking',
      'UGC Programs'
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
    category: 'Creative Campaigns & Platforms',
    description: 'Develop breakthrough campaign concepts',
    services: [
      'Creative Platform Development',
      'Campaign Concept Development',
      'Big Idea Generation',
      'Integrated Campaign Planning',
      'Storytelling Framework',
      'Brand Anthem Development',
      'Experiential Concepts',
      'Cultural Moments Strategy'
    ],
    triggerPatterns: {
      direct: ['need a big idea', 'need a campaign concept', 'want something breakthrough', 'need a creative platform', 'marketing lacks unifying concept'],
      indirect: ['campaigns feel tactical', 'each effort is standalone', 'difficulty creating memorable work', 'need to differentiate', 'brand awareness plateaued'],
      situational: ['major launch', 'brand repositioning', 'new market entry', 'competitive threat', 'company transformation', 'major anniversary'],
      performance: ['brand recall declining', 'campaign metrics mediocre', 'share of voice decreasing', 'advertising not breaking through', 'content engagement low'],
      sampleLanguage: ['need something memorable', 'all our campaigns look the same', 'want to stand out', 'need an idea that can run for years', 'work doesn\'t break through the clutter', 'want something competitors can\'t copy', 'creative that people talk about', 'ads are forgettable']
    }
  },
  {
    id: 'pr',
    category: 'Public Relations',
    description: 'Media relations and press coverage',
    services: [
      'Media Relations',
      'Press Release Development',
      'Media Pitching',
      'Press Kit Development',
      'Media Training',
      'Crisis Communications',
      'Announcement Strategy',
      'Media Monitoring',
      'Journalist Relationship Building'
    ],
    triggerPatterns: {
      direct: ['need PR', 'want media coverage', 'help with press relations', 'want to be in specific publications', 'need a PR agency'],
      indirect: ['important news not getting coverage', 'lack of third-party credibility', 'competitors in media more', 'no journalist relationships', 'story not being told externally', 'need crisis preparedness'],
      situational: ['product launch', 'funding announcement', 'executive hire', 'research release', 'awards', 'company milestone', 'crisis', 'merger announcement', 'industry event'],
      performance: ['low share of voice', 'minimal media mentions', 'negative coverage without response', 'lack of third-party validation', 'sales team lacking proof points'],
      sampleLanguage: ['have great news but nobody covers us', 'competitors always in the press', 'don\'t have relationships with journalists', 'don\'t know how to pitch media', 'need someone to tell our story', 'launching something big and need coverage', 'not prepared if something goes wrong', 'need credibility with our audience']
    }
  },
  {
    id: 'media_outreach',
    category: 'Media Outreach (Proactive & Reactive)',
    description: 'Ongoing media engagement',
    services: [
      'Proactive Media Pitching',
      'Rapid Response Program',
      'Newsjacking Strategy',
      'Commentary & Quotes',
      'Media List Development',
      'Industry Trend Monitoring',
      'Spokesperson Preparation'
    ],
    triggerPatterns: {
      direct: ['want to be seen as a source', 'want to comment on industry news', 'need rapid response', 'want more media mentions'],
      indirect: ['industry conversations without us', 'journalists covering competitors', 'expertise not leveraged', 'missed opportunities to comment', 'no media monitoring'],
      situational: ['industry news requiring commentary', 'breaking developments', 'regulatory changes', 'seasonal news cycles', 'industry crisis'],
      performance: ['competitors quoted more', 'share of voice declining', 'opportunities going to others', 'reactive coverage only'],
      sampleLanguage: ['when something happens we\'re never quoted', 'journalists don\'t know we exist', 'competitors are the go-to source', 'have expertise but no one asks', 'want to be top of mind for reporters', 'need to respond faster to news']
    }
  },
  {
    id: 'executive_visibility',
    category: 'Executive Visibility & Thought Leadership',
    description: 'Elevate leadership profiles',
    services: [
      'Executive Positioning Strategy',
      'Thought Leadership Content',
      'Byline & Op-Ed Development',
      'Speaking Opportunity Development',
      'Executive Social Media',
      'Media Training',
      'Awards Strategy',
      'LinkedIn Optimization',
      'Podcast Strategy'
    ],
    triggerPatterns: {
      direct: ['CEO needs to be more visible', 'position executives as experts', 'need thought leadership content', 'leaders need higher profile'],
      indirect: ['competitor executives more visible', 'difficulty attracting talent', 'investor relations need credibility', 'sales cycle requires leadership trust', 'industry influence desired'],
      situational: ['new CEO', 'IPO preparation', 'fundraising', 'conference schedule', 'speaking pipeline', 'award nominations'],
      performance: ['low leadership recognition', 'executive content not engaging', 'speaking invitations not coming', 'board feedback about visibility', 'LinkedIn engagement low'],
      sampleLanguage: ['CEO should be better known', 'position executive as expert', 'competitors\' leaders always at conferences', 'need help with LinkedIn presence', 'leadership has insights but nobody hears them', 'want execs writing about industry issues', 'need bylines and speaking opportunities', 'investors want visible leadership']
    }
  },
  {
    id: 'paid_social',
    category: 'Paid Social Media',
    description: 'Social advertising campaigns',
    services: [
      'Paid Social Strategy',
      'Campaign Setup & Management',
      'Audience Development & Targeting',
      'Ad Creative Development',
      'A/B Testing & Optimization',
      'Retargeting Campaigns',
      'Reporting & Analytics',
      'Platform-Specific Campaigns'
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
    services: [
      'SEO Audit & Strategy',
      'Technical SEO',
      'On-Page Optimization',
      'Content SEO Strategy',
      'Link Building',
      'Local SEO',
      'SEO Reporting',
      'Keyword Research',
      'Competitive SEO Analysis'
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
    services: [
      'GEO Strategy & Audit',
      'AI Search Optimization',
      'Structured Data Implementation',
      'Content Optimization for AI',
      'Citation Building',
      'Knowledge Panel Optimization'
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
    services: [
      'Analytics Strategy',
      'Dashboard Development',
      'Attribution Modeling',
      'Marketing ROI Framework',
      'KPI Development',
      'Data Integration',
      'Reporting Automation',
      'Marketing Technology Audit'
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
    services: [
      'Go-to-Market Strategy',
      'Launch Planning',
      'Market Entry Strategy',
      'Positioning & Messaging',
      'Channel Strategy',
      'Sales Enablement',
      'Launch Campaign Planning',
      'Competitive Positioning'
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
    services: [
      'Event Strategy',
      'Conference Planning',
      'Event Production',
      'Virtual Event Production',
      'Trade Show Management',
      'Speaker Management',
      'Event Marketing',
      'Event Logistics'
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
    services: [
      'Media Training',
      'Spokesperson Training',
      'Presentation Training',
      'Crisis Communications Training',
      'Brand Training',
      'Marketing Skills Training'
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
    id: 'impact_reports',
    category: 'Impact Report Writing & Design',
    description: 'Sustainability and impact communications',
    services: [
      'Impact Report Writing',
      'Impact Report Design',
      'Sustainability Communications',
      'ESG Reporting',
      'CSR Communications',
      'Stakeholder Reports'
    ],
    triggerPatterns: {
      direct: ['need an annual report', 'need an impact report', 'need help with CSR report', 'want to showcase our impact'],
      indirect: ['stakeholder expectations for transparency', 'ESG reporting requirements', 'investor relations needs', 'employee engagement communications', 'competitor reports setting higher bar'],
      situational: ['annual reporting cycle', 'sustainability milestones', 'stakeholder meeting', 'grant reporting', 'public accountability'],
      performance: ['stakeholder feedback on transparency', 'competitor reports more compelling', 'internal data not shared', 'impact not being communicated'],
      sampleLanguage: ['do great work but don\'t communicate it', 'report needs to be more compelling', 'have the data but need help presenting it', 'stakeholders want more transparency', 'competitors have beautiful impact reports', 'need to tell our sustainability story']
    }
  },
  {
    id: 'content_production',
    category: 'Content Ideation & Production',
    description: 'Content strategy and creation',
    services: [
      'Content Strategy',
      'Content Calendar Development',
      'Blog & Article Writing',
      'Podcast Production',
      'Video Content Series',
      'Social Content Creation',
      'Thought Leadership Content',
      'Lead Magnet Development'
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
    services: [
      'Conversion Rate Optimization',
      'A/B Testing Program',
      'Landing Page Optimization',
      'Funnel Optimization',
      'Performance Analytics',
      'Campaign Optimization',
      'Marketing Automation'
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
    id: 'marketing_assessment',
    category: 'Brand & Marketing Assessments',
    description: 'Audit and assess current state',
    services: [
      'Marketing Audit',
      'Brand Assessment',
      'Competitive Analysis',
      'Channel Assessment',
      'Content Audit',
      'Technology Audit',
      'Customer Research'
    ],
    triggerPatterns: {
      direct: ['need an audit of our marketing', 'want an assessment of our brand', 'need a fresh perspective', 'want a review of marketing activities'],
      indirect: ['new leadership wanting baseline', 'performance declining without clear cause', 'pre-planning phase', 'budget allocation uncertainty', 'agency review consideration'],
      situational: ['new CMO', 'pre-RFP assessment', 'annual planning', 'post-campaign retrospective', 'merger integration'],
      performance: ['overall marketing underperformance', 'uncertainty about gaps', 'need for prioritization', 'competitive concerns', 'stakeholder questions'],
      sampleLanguage: ['need someone to look at everything we\'re doing', 'new to this role and need to understand where we are', 'not sure what\'s working and what\'s not', 'before we start anything new we need to assess', 'been doing the same things and need fresh eyes', 'where should we be investing', 'what are our biggest gaps']
    }
  },
  // Preserve original categories with enhanced patterns
  {
    id: 'awareness',
    category: 'Awareness & Reach',
    description: 'Build awareness through paid and earned channels',
    services: [
      'Performance Marketing (Paid Media)',
      'SEO Strategy & Implementation',
      'Measurement & Analytics Framework',
      'Thought Leadership Program',
      'Executive Visibility Campaign',
      'Media Outreach & Relations'
    ],
    triggerPatterns: {
      direct: ['need awareness', 'brand awareness', 'nobody knows us', 'increase visibility', 'get our name out', 'build awareness'],
      indirect: ['competitors getting all the attention', 'not on anyone\'s radar', 'market doesn\'t know we exist', 'need to raise our profile'],
      situational: ['market entry', 'new product category', 'relaunch', 'competitive threat'],
      performance: ['low brand recall', 'low aided awareness', 'minimal organic traffic', 'poor search visibility'],
      sampleLanguage: ['need to get on people\'s radar', 'nobody knows what we do', 'want to be recognized', 'need more exposure', 'have to make noise in the market']
    }
  },
  {
    id: 'reputation',
    category: 'Reputation & Trust',
    description: 'Address reputation challenges and build credibility',
    services: [
      'Brand Compass Assessment',
      'GEO (Generative Engine Optimization)',
      'Wikipedia Optimization',
      'Reddit & Community Optimization',
      'Media Messaging Development',
      'Media Outreach & Relations',
      'Impact Communications Training',
      'Impact Report Design & Writing',
      'Purpose Discovery Workshop',
      'Theory of Change Development'
    ],
    triggerPatterns: {
      direct: ['problem with reputation', 'reputation issue', 'reputation management', 'negative perception', 'trust issues', 'credibility problem'],
      indirect: ['bad reviews', 'negative press', 'online critics', 'bad search results about us', 'stakeholders questioning us'],
      situational: ['crisis aftermath', 'leadership scandal', 'product failure', 'negative news cycle', 'industry controversy'],
      performance: ['NPS declining', 'trust scores down', 'negative sentiment', 'customer churn due to trust', 'recruitment challenges'],
      sampleLanguage: ['people don\'t believe us', 'not credible', 'our online reputation is terrible', 'keep getting bad press', 'reviews are killing us', 'need to rebuild trust']
    }
  },
  {
    id: 'influence',
    category: 'Influence & Authority',
    description: 'Establish authority and influence in your sector',
    services: [
      'Original Research & Studies',
      'Strategic Media Relations',
      'Content Ecosystem Development',
      'Convening & Events Strategy',
      'Policy Communications',
      'Strategic Partnerships',
      'Awards Program Strategy',
      'Influencer Marketing'
    ],
    triggerPatterns: {
      direct: ['greater influence', 'visibility in our sector', 'industry influence', 'thought leader', 'landscape visibility', 'sector leadership', 'policy influence'],
      indirect: ['want to shape the conversation', 'be seen as the authority', 'competitors seen as leaders', 'not invited to important discussions'],
      situational: ['regulatory changes', 'industry consolidation', 'emerging category', 'standards setting'],
      performance: ['not cited as source', 'not invited to speak', 'low share of voice in industry', 'competitors winning thought leadership'],
      sampleLanguage: ['want to be seen as the go-to experts', 'want to shape industry direction', 'should be leading this conversation', 'want a seat at the table']
    }
  },
  {
    id: 'audience',
    category: 'Audience Strategy',
    description: 'Identify and connect with your target audiences',
    services: [
      'Audience Research & Segmentation',
      'Content Marketing & Storytelling',
      'Creative Platform Development',
      'Community Management',
      'Sustainability & Impact Communications',
      'Brand Consistency Audit',
      'Connections Plan',
      'Influencer Marketing'
    ],
    triggerPatterns: {
      direct: ['struggling to reach', 'identify our audiences', 'audience identification', 'who are our customers', 'target audience', 'reach the right people'],
      indirect: ['don\'t know who buys from us', 'messaging doesn\'t resonate', 'campaigns not landing', 'content not connecting'],
      situational: ['new market entry', 'product pivot', 'customer base shift', 'demographic changes'],
      performance: ['low engagement rates', 'high bounce rates', 'poor ad targeting results', 'audience mismatch'],
      sampleLanguage: ['need to understand our audience better', 'who are we really talking to', 'content not resonating with anyone', 'can\'t seem to connect with the right people']
    }
  },
  {
    id: 'messaging',
    category: 'PR & Media Messaging',
    description: 'Develop compelling media narratives',
    services: [
      'Earned Media/PR Messaging',
      'Key Message Development',
      'Spokesperson Training',
      'Media Kit Development',
      'Press Release Strategy',
      'Narrative Development',
      'Crisis Messaging'
    ],
    triggerPatterns: {
      direct: ['coherent message for media', 'don\'t know what stories to tell', 'media messaging', 'pr messaging', 'press messaging', 'journalist outreach', 'earned media'],
      indirect: ['can\'t explain what we do simply', 'every interview goes differently', 'no consistent story', 'journalists confused about us'],
      situational: ['media tour', 'product announcement', 'executive transition', 'crisis situation'],
      performance: ['inconsistent coverage', 'message not landing', 'journalists getting it wrong', 'not getting the coverage we want'],
      sampleLanguage: ['need a clearer story', 'don\'t know what to tell journalists', 'message is all over the place', 'need to control the narrative']
    }
  },
  {
    id: 'content',
    category: 'Content & Quality',
    description: 'Improve content quality and consistency',
    services: [
      'Content Strategy & Planning',
      'Integrated Campaign Development',
      'Style Guide Creation',
      'QA & Proofreading Services',
      'Digital Asset Management',
      'Project Management',
      'Channel Optimization',
      'Content Training',
      'Website Content Refresh'
    ],
    triggerPatterns: {
      direct: ['issues with our content', 'content is poor', 'not consistent', 'lacks coherent theme', 'content quality', 'content problems'],
      indirect: ['different teams creating different content', 'no content standards', 'brand voice varies', 'quality all over the place'],
      situational: ['scaling content production', 'new channels launching', 'team growth', 'agency consolidation'],
      performance: ['content engagement low', 'high unsubscribe rates', 'social shares declining', 'content not driving results'],
      sampleLanguage: ['content is poor', 'content is bad', 'content is awful', 'not consistent', 'lacks coherent theme', 'team creates content but it doesn\'t perform']
    }
  },
  {
    id: 'leads',
    category: 'Performance & Conversion',
    description: 'Drive leads, conversions, and engagement',
    services: [
      'Audience Research & Segmentation',
      'Analytics Infrastructure',
      'Customer Journey Mapping',
      'Strategic Planning',
      'Media Strategy',
      'SEO Optimization',
      'Marketing Automation',
      'A/B Testing Program',
      'Attribution Modeling',
      'Website UX & Design Refresh'
    ],
    triggerPatterns: {
      direct: ['need leads', 'need conversions', 'lead generation', 'demand gen', 'pipeline', 'MQLs', 'SQLs'],
      indirect: ['sales team starving for leads', 'pipeline is empty', 'marketing not feeding sales', 'need more qualified opportunities'],
      situational: ['sales target increase', 'new sales team', 'market expansion', 'competitive pressure'],
      performance: ['lead volume down', 'conversion rates declining', 'high cost per lead', 'poor lead quality', 'long sales cycles'],
      sampleLanguage: ['content to work better', 'content not targeted', 'problem with conversion', 'problem with targeting', 'problem with engagement', 'extend our reach', 'target new audiences']
    }
  },
  {
    id: 'creative',
    category: 'Creative & Innovation',
    description: 'Create breakthrough creative work',
    services: [
      'Creative Strategy',
      'Big Ideas & Concept Development',
      'Storytelling Framework',
      'Copywriting Excellence',
      'Visual & Design Innovation',
      'Video Production',
      'Experiential Design',
      'Website Experience Redesign'
    ],
    triggerPatterns: {
      direct: ['marketing is uninspiring', 'creative is ineffective', 'breakthrough ideas', 'inspire our audiences', 'campaigns are dull', 'innovation leader'],
      indirect: ['work is boring', 'looks like everyone else', 'not getting attention', 'nobody talks about our campaigns'],
      situational: ['major launch', 'rebrand', 'new competitive entrant', 'category disruption'],
      performance: ['engagement is low', 'creative fatigue', 'declining response rates', 'ad performance dropping'],
      sampleLanguage: ['cut through the noise', 'campaigns are safe', 'make technical interesting', 'inspire action', 'stunts', 'need something people will remember']
    }
  },
  {
    id: 'impact',
    category: 'Impact & Purpose',
    description: 'Communicate your impact and purpose',
    services: [
      'Impact Communications Training',
      'Impact Report Design & Writing',
      'Purpose Discovery Workshop',
      'Vision Development',
      'Theory of Change',
      'Impact Measurement Framework',
      'Creative Content Creation',
      'Manifesto Writing',
      'Sustainability Communications'
    ],
    triggerPatterns: {
      direct: ['impact story', 'sustainability story', 'esg communications', 'purpose driven', 'CSR', 'social impact'],
      indirect: ['need to show we care', 'customers want to know our values', 'employees asking about purpose', 'investors asking about ESG'],
      situational: ['B Corp certification', 'sustainability milestone', 'stakeholder pressure', 'new impact initiatives'],
      performance: ['brand purpose scores low', 'employee engagement on mission declining', 'customers not seeing our values'],
      sampleLanguage: ['don\'t believe us', 'not credible', 'service makes the world better', 'product makes lives better', 'want people to know we\'re more than just a business']
    }
  },
  {
    id: 'leadership',
    category: 'Executive & Leadership',
    description: 'Elevate leadership visibility and credibility',
    services: [
      'Executive Positioning Strategy',
      'Media Training',
      'Executive Social Media',
      'Media Relations',
      'Bylines & Op-Eds',
      'Analyst Relations',
      'Messaging Architecture',
      'Awards Strategy',
      'Speaking Strategy',
      'Crisis Preparedness'
    ],
    triggerPatterns: {
      direct: ['leadership is invisible', 'ceo needs visibility', 'executive visibility', 'ceo profile', 'leadership profile'],
      indirect: ['board wants more visible CEO', 'investors don\'t know our leaders', 'competitors\' CEOs are famous', 'talent attracted to visible leaders'],
      situational: ['new CEO', 'IPO', 'fundraising', 'acquisition', 'crisis'],
      performance: ['low executive recognition', 'not invited to speak', 'LinkedIn engagement poor', 'no media requests'],
      sampleLanguage: ['credibility problem', 'inspiring leaders', 'audiences don\'t know them', 'communications is timid', 'lacks confidence', 'apologetic']
    }
  },
  {
    id: 'project_management',
    category: 'Project Management',
    description: 'Coordinate complex marketing initiatives',
    services: [
      'Project Management',
      'Marketing Operations',
      'Agency Coordination',
      'Campaign Management',
      'Resource Planning',
      'Process Development'
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

// ============================================================================
// ENGAGEMENT TYPES FOR DRAFTING
// ============================================================================
const DRAFT_ENGAGEMENT_TYPES = [
  { value: 'fixed_fee', label: 'Fixed Fee', description: 'Set price for defined deliverables' },
  { value: 'tm_cap', label: 'Time & Materials with Cap', description: 'Hourly billing with maximum budget' },
  { value: 'tm', label: 'Time & Materials', description: 'Hourly billing without cap' },
  { value: 'retainer', label: 'Retainer', description: 'Ongoing monthly engagement' }
];

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
REQUIRED ELEMENTS:
□ Minimum term specified
□ Monthly fee clearly stated
□ Early termination provisions and fees
□ Services included clearly enumerated
□ Deliverables or hours quantified
□ Services explicitly excluded
□ Monthly allocation specified
□ Rollover policy clearly stated (recommend: limited or no rollover)
□ Overage handling defined (rate, notification, pre-approval)
□ Utilization tracking and reporting
□ Notice period for non-renewal

ROLLOVER POLICY OPTIONS:
- Option A (Recommended): No rollover - unused allocation forfeited
- Option B: Limited rollover to immediately following month only, with cap
- Option C: No monthly rollover with quarterly true-up review

RISK INDICATORS:
✗ No minimum term commitment
✗ Unlimited rollover
✗ Vague scope definition
✗ No overage mechanism
✗ No utilization reporting
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
□ Monthly hour allocation clearly stated
□ Rollover policy defined
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
function IssueCard({ issue, type }) {
  const styles = {
    critical: { bg: 'bg-red-50 border-red-200', icon: 'text-red-600', Icon: AlertCircle },
    recommended: { bg: 'bg-amber-50 border-amber-200', icon: 'text-amber-600', Icon: AlertTriangle },
    info: { bg: 'bg-gray-50 border-gray-200', icon: 'text-gray-900', Icon: CheckCircle }
  };
  
  const { bg, icon, Icon } = styles[type] || styles.info;

  const parseIssue = (text) => {
    const result = { 
      section: null, 
      currentLanguage: null, 
      recommendation: null,
      missingElement: null,
      addLanguage: null,
      why: null,
      issueType: null // 'language' or 'missing'
    };
    
    // Extract section
    const sectionMatch = text.match(/(?:Section|§)[:\s]*([\d.A-Za-z]+)/i);
    if (sectionMatch) result.section = sectionMatch[1];
    
    // Check for "Missing" format (Type B - missing elements)
    const missingMatch = text.match(/Missing:\s*[""]?([^"""\n]+)[""]?/i);
    const addMatch = text.match(/Add:\s*[""]?([^""]+)[""]?/i);
    
    if (missingMatch || addMatch) {
      result.issueType = 'missing';
      if (missingMatch) result.missingElement = missingMatch[1].trim();
      if (addMatch) result.addLanguage = addMatch[1].trim();
    }
    
    // Check for "Current/Recommended" format (Type A - language issues)
    const currentMatch = text.match(/Current:\s*[""]?([^""]+)[""]?/i);
    const recommendedMatch = text.match(/Recommended:\s*[""]?([^""]+)[""]?/i);
    
    if (currentMatch && recommendedMatch) {
      result.issueType = 'language';
      result.currentLanguage = currentMatch[1].trim();
      result.recommendation = recommendedMatch[1].trim();
    }
    
    // Fallback: arrow format
    const arrowMatch = text.match(/[""]([^""]+)[""]\s*[→→>-]+\s*[""]([^""]+)[""]/);
    if (arrowMatch && !result.issueType) {
      result.issueType = 'language';
      result.currentLanguage = arrowMatch[1].trim();
      result.recommendation = arrowMatch[2].trim();
    }
    
    // Extract "Why" explanation
    const whyMatch = text.match(/Why:\s*([^\n]+)/i);
    if (whyMatch) result.why = whyMatch[1].trim();
    
    return result;
  };

  const parsed = parseIssue(issue);
  
  // Get the issue description (text before the structured parts)
  const getIssueDescription = () => {
    let desc = issue;
    // Remove the structured parts to get just the description
    desc = desc.replace(/Current:[\s\S]*?(?=Recommended:|Missing:|Add:|Why:|$)/i, '');
    desc = desc.replace(/Recommended:[\s\S]*?(?=Why:|$)/i, '');
    desc = desc.replace(/Missing:[\s\S]*?(?=Add:|Why:|$)/i, '');
    desc = desc.replace(/Add:[\s\S]*?(?=Why:|$)/i, '');
    desc = desc.replace(/Why:[\s\S]*$/i, '');
    desc = desc.replace(/Section[:\s]*[\d.A-Za-z]+/i, '').trim();
    // Clean up and get first meaningful line
    const lines = desc.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    return lines[0] || '';
  };

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
function RedFlagCard({ flag }) {
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

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-start gap-3">
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
function ServiceCard({ trigger, isSelected, selectedServices, onToggleService }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const selectedCount = trigger.services.filter(s => selectedServices.includes(s)).length;
  
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
          <div className="space-y-2">
            {trigger.services.map((service) => (
              <label key={service} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service)}
                  onChange={() => onToggleService(service)}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{service}</span>
              </label>
            ))}
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
      
      // Extract recommended categories from the response
      const categoriesMatch = analysisText.match(/## RECOMMENDED_CATEGORIES\s*\n([^\n#]+)/i);
      let detectedCategoryIds = [];
      if (categoriesMatch) {
        detectedCategoryIds = categoriesMatch[1]
          .split(',')
          .map(s => s.trim().toLowerCase().replace(/[_\s]+/g, '_'))
          .filter(s => s.length > 0);
      }
      
      // Map category IDs to full trigger objects (flexible matching)
      const detected = SERVICE_TRIGGERS.filter(trigger => {
        const triggerId = trigger.id.toLowerCase();
        return detectedCategoryIds.some(detected => 
          detected === triggerId || 
          detected.includes(triggerId) || 
          triggerId.includes(detected)
        );
      });
      
      setDetectedTriggers(detected);
      
      // Auto-select all services from detected triggers
      const autoSelectedServices = detected.flatMap(t => t.services);
      setSelectedServices([...new Set(autoSelectedServices)]);
      
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
- Fee should be tied to milestones or phases, not a single lump sum payment`,
        
        tm_cap: `TIME & MATERIALS WITH CAP (NOT TO EXCEED) REQUIREMENTS:
- Cap must be clearly stated with inclusions and exclusions
- Cap must be explicitly tied to the defined scope
- Include notification thresholds (e.g., "Agency will notify Client when 75% of cap is consumed")
- Include work stoppage rights when cap is approached
- Scope changes must require cap adjustment
- Assumption failures are grounds for cap adjustment
- Specify billing rates by role
- Specify billing increment (e.g., 15-minute increments)
- Include reporting requirements (frequency and content)
- No obligation to work beyond cap without written authorization`,
        
        tm: `TIME & MATERIALS REQUIREMENTS:
- Complete rate schedule for all roles that may work on the project
- Clear billing increment (e.g., 15-minute increments)
- Initial estimate clearly stated as estimate, NOT a guarantee or cap
- Notification thresholds when approaching estimate
- Tracking increment specified
- Reporting frequency and content defined
- Client access to detailed time logs
- Scope guidance with intended objectives and boundaries
- Conditions that would trigger revised estimate`,
        
        retainer: `RETAINER REQUIREMENTS:
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
- Annual rate adjustment provisions if applicable`
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

## Response Structure

1. CRITICAL ISSUES - Things that MUST be fixed before issuing
(Each issue must follow the format above with full context)

2. RECOMMENDED IMPROVEMENTS - Things that SHOULD be fixed
(Each issue must follow the format above with full context)

3. RED FLAGS FOUND - Problematic phrases that need replacement
Format EACH as: "[exact phrase found]" in Section X.X → "[recommended replacement]"
Prefer "UP TO" language (e.g., "up to 4 hours per month") rather than exact quantification.

4. SERVICE-LINE COMPLIANCE - Check each required element for ${engagementLabel} engagements
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

      // Parse response into sections - improved to handle issues properly
      const parseSection = (text, startMarker, endMarkers) => {
        const startIdx = text.indexOf(startMarker);
        if (startIdx === -1) return [];
        
        let endIdx = text.length;
        for (const marker of endMarkers) {
          const idx = text.indexOf(marker, startIdx + startMarker.length);
          if (idx !== -1 && idx < endIdx) endIdx = idx;
        }
        
        const section = text.slice(startIdx + startMarker.length, endIdx).trim();
        
        // Split on issue boundaries: "Section X.X" or numbered items like "1." "2." etc.
        // But NOT on simple bullet points (- or •) which might be sub-items
        const issuePattern = /\n(?=Section\s+[\d.A-Za-z]+:|(?:^|\n)\d+\.\s+[A-Z])/gi;
        let items = section.split(issuePattern).map(s => s.trim()).filter(s => s.length > 0);
        
        // If no splits occurred, try splitting on double newlines (paragraph breaks)
        if (items.length <= 1 && section.length > 100) {
          items = section.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 0);
        }
        
        // Filter out items that are:
        // 1. Too short (< 20 chars) - likely orphaned fragments
        // 2. Just simple bullet points without context (start with "- " and have no ":" or explanation)
        // 3. Don't contain actionable content
        return items.filter(item => {
          // Must be substantial
          if (item.length < 20) return false;
          
          // If it starts with "- " and doesn't contain actionable markers, skip it
          if (item.startsWith('- ') && !item.includes(':') && !item.includes('→') && item.length < 100) {
            return false;
          }
          
          // Keep items that have structure (Section, Current/Recommended, Missing/Add, etc.)
          const hasStructure = /Section|Current:|Recommended:|Missing:|Add:|Why:|→/i.test(item);
          const isSubstantive = item.length > 50 || hasStructure;
          
          return isSubstantive;
        });
      };

      const parsedAnalysis = {
        critical: parseSection(responseText, '1. CRITICAL ISSUES', ['2. RECOMMENDED', '3. RED FLAGS']),
        recommended: parseSection(responseText, '2. RECOMMENDED IMPROVEMENTS', ['3. RED FLAGS', '4. SERVICE-LINE']),
        redFlags: parseSection(responseText, '3. RED FLAGS FOUND', ['4. SERVICE-LINE', '5. BUDGET']),
        compliance: responseText.match(/4\. SERVICE-LINE COMPLIANCE[\s\S]*?(?=5\. BUDGET|6\. OVERALL|$)/)?.[0]?.replace('4. SERVICE-LINE COMPLIANCE', '').trim(),
        budget: responseText.match(/5\. BUDGET VERIFICATION[\s\S]*?(?=6\. OVERALL|$)/)?.[0]?.replace('5. BUDGET VERIFICATION', '').trim(),
        overall: responseText.match(/6\. OVERALL ASSESSMENT[\s\S]*$/)?.[0]?.replace('6. OVERALL ASSESSMENT', '').trim()
      };

      setAnalysis(parsedAnalysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateRevisedDraft = async () => {
    if (!apiKey || !fileContent || !rawResponse) return;
    
    setIsDrafting(true);
    setReviewDraftError(null);
    
    try {
      let messages = [];
      const draftPrompt = `Based on the analysis provided, create a COMPLETE REVISED VERSION of this SOW that:

1. Applies ALL critical fixes identified
2. Incorporates ALL recommended improvements
3. Replaces ALL red flag language with the suggested alternatives (using "up to" language)
4. Adds any missing required sections (client responsibilities, assumptions, exclusions)
5. Maintains the original structure and intent while improving quality
6. Uses proper decimal numbering throughout

ANALYSIS TO APPLY:
${rawResponse}

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
                              isSelected={trigger.services.some(s => selectedServices.includes(s))}
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
                                    isSelected={trigger.services.some(s => selectedServices.includes(s))}
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
                              isSelected={trigger.services.some(s => selectedServices.includes(s))}
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

                  {reviewDraftError && (
                    <div className="mb-4 p-4 bg-red-900/30 border border-red-500/40 rounded-xl">
                      <p className="text-red-300 text-sm">{reviewDraftError}</p>
                    </div>
                  )}

                  {!draftedSOW ? (
                    <AntennaButton
                      onClick={generateRevisedDraft}
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
