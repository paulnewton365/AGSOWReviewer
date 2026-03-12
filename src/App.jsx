import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Upload, FileText, CheckCircle, AlertTriangle, AlertCircle, Loader2,
  ChevronDown, ChevronRight, Key, Eye, EyeOff, Copy, Check,
  ArrowRight, Download, Sparkles, PenTool, Search, MessageSquare,
  Lightbulb, Target, Users, DollarSign, Save, FolderOpen,
  Building2, Globe, TrendingUp, FileQuestion, Send, RotateCcw, X,
  Plus, Edit3, Trash2, ChevronLeft, Star, Clock, Archive, ArrowUpRight,
  RefreshCw, ChevronUp, Layers, BookOpen, ShieldCheck, Zap,
  LogOut, UserCog, UserPlus, Shield, Lock, User, ToggleLeft, ToggleRight
} from 'lucide-react';
import {
  Document, Packer, Paragraph, TextRun, Header, Footer,
  AlignmentType, HeadingLevel, BorderStyle, LevelFormat, PageNumber
} from 'docx';
import { saveAs } from 'file-saver';

const APP_VERSION = '3.0.0';
const MODEL = 'claude-sonnet-4-5-20250929';

// ============================================================================
// PIPELINE CONFIG
// ============================================================================
const PIPELINE_STAGES = [
  { id: 'research', number: 1, label: 'Research', Icon: Search, description: 'Company discovery & intake questions' },
  { id: 'brief', number: 2, label: 'Return Brief', Icon: FileText, description: 'Transcript analysis & client brief' },
  { id: 'proposal', number: 3, label: 'Proposal', Icon: Sparkles, description: 'Service selection & proposal' },
  { id: 'sow', number: 4, label: 'SOW', Icon: PenTool, description: 'Statement of Work generation' },
];

const PROPOSAL_STATUSES = [
  { value: 'draft', label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  { value: 'client_review', label: 'Client Review', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  { value: 'rework', label: 'Rework Needed', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  { value: 'approved', label: 'Approved ✓', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  { value: 'evaporated', label: 'Evaporated', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
];

// ============================================================================
// USER MANAGEMENT SYSTEM
// ============================================================================
const USER_ROLES = {
  growth: {
    label: 'Growth',
    description: 'Business development — research, briefs & proposals',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeColor: 'bg-blue-600',
    allowedStages: ['research', 'brief', 'proposal'],
    canAccessSOWReview: false,
    canAccessAdmin: false,
    canCreateOpportunities: true,
  },
  pm: {
    label: 'PM',
    description: 'Full pipeline access including SOW generation',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeColor: 'bg-purple-600',
    allowedStages: ['research', 'brief', 'proposal', 'sow'],
    canAccessSOWReview: true,
    canAccessAdmin: false,
    canCreateOpportunities: true,
  },
  reviewer: {
    label: 'Reviewer',
    description: 'SOW quality review only',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeColor: 'bg-amber-600',
    allowedStages: [],
    canAccessSOWReview: true,
    canAccessAdmin: false,
    canCreateOpportunities: false,
  },
  admin: {
    label: 'Admin',
    description: 'Full access + user management',
    color: 'bg-gray-900 text-white border-gray-700',
    badgeColor: 'bg-gray-900',
    allowedStages: ['research', 'brief', 'proposal', 'sow'],
    canAccessSOWReview: true,
    canAccessAdmin: true,
    canCreateOpportunities: true,
  },
};

const DEFAULT_ADMIN = {
  id: 'admin-seed-001',
  name: 'Admin',
  email: 'admin@antennagroup.com',
  password: 'antenna2024',
  role: 'admin',
  createdAt: new Date().toISOString(),
  active: true,
};

const PAUL_NEWTON = {
  id: 'admin-seed-paul',
  name: 'Paul Newton',
  email: 'paul.newton@antennagroup.com',
  password: 'Ember2021',
  role: 'admin',
  createdAt: new Date().toISOString(),
  active: true,
};

const SEED_USERS = [DEFAULT_ADMIN, PAUL_NEWTON];

const getStoredUsers = () => {
  try {
    const raw = localStorage.getItem('ag_users');
    const stored = raw ? JSON.parse(raw) : [];
    // Merge seed users — add any that don't already exist by ID
    const merged = [...stored];
    for (const seed of SEED_USERS) {
      if (!merged.find(u => u.id === seed.id)) merged.push(seed);
    }
    if (merged.length !== stored.length) localStorage.setItem('ag_users', JSON.stringify(merged));
    return merged;
  } catch {
    localStorage.setItem('ag_users', JSON.stringify(SEED_USERS));
    return SEED_USERS;
  }
};
const saveStoredUsers = (users) => {
  try { localStorage.setItem('ag_users', JSON.stringify(users)); } catch {}
};
const getStoredSession = () => {
  try { const raw = localStorage.getItem('ag_session'); return raw ? JSON.parse(raw) : null; } catch { return null; }
};
const saveStoredSession = (user) => {
  try {
    if (user) localStorage.setItem('ag_session', JSON.stringify(user));
    else localStorage.removeItem('ag_session');
  } catch {}
};
const getStoredOpportunitiesForUser = (userId) => {
  try { const raw = localStorage.getItem(`ag_opps_${userId}`); return raw ? JSON.parse(raw) : []; } catch { return []; }
};
const saveStoredOpportunitiesForUser = (userId, opps) => {
  try { localStorage.setItem(`ag_opps_${userId}`, JSON.stringify(opps)); } catch {}
};
const getStoredApiKeyForUser = (userId) => {
  try { return localStorage.getItem(`ag_apikey_${userId}`) || ''; } catch { return ''; }
};
const saveStoredApiKeyForUser = (userId, key) => {
  try { localStorage.setItem(`ag_apikey_${userId}`, key); } catch {}
};

const createOpportunity = (companyName, companyUrl = '', industry = '') => ({
  id: Date.now().toString(),
  companyName,
  companyUrl,
  industry,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  currentStage: 'research',
  // Stage 1
  researchComplete: false,
  researchSummary: '',
  intakeQuestions: [],
  // Stage 2
  transcript: '',
  briefNotes: '',
  briefComplete: false,
  returnBrief: '',
  transcriptAnalysis: null,
  // Stage 3
  selectedServices: [],
  selectedArchetypes: [],
  draftEngagementType: 'fixed_fee',
  draftNotes: '',
  proposalDraft: '',
  proposalStatus: 'draft',
  // Stage 4
  sowDraft: '',
  sowStatus: 'draft',
  sowNotes: '',
});

// ============================================================================
// SERVICE TRIGGERS
// ============================================================================
const SERVICE_TRIGGERS = [
  {
    id: 'website', category: 'Website & App Development', description: 'Build or rebuild digital platforms',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Website Strategy & Planning', recommend: 'always', pricing: { termLow: 8, termHigh: 20, budgetLow: 40000, budgetHigh: 140000, bundle: 'Standard Website Offering' } },
      { name: 'Website Design & UX', recommend: 'always', pricing: { bundle: 'Standard Website Offering' } },
      { name: 'Website Development', recommend: 'always', pricing: { bundle: 'Standard Website Offering' } },
      { name: 'CMS Implementation', recommend: 'always', pricing: { bundle: 'Standard Website Offering' } },
      { name: 'Performance Assurance', recommend: 'always', pricing: { bundle: 'Standard Website Offering' } },
      { name: 'Website Refresh', recommend: 'conditional', pricing: { termLow: 5, termHigh: 8, budgetLow: 20000, budgetHigh: 30000 } },
      { name: 'Mobile App Development', recommend: 'conditional', pricing: { termLow: 3, termHigh: 10, budgetLow: 10000, budgetHigh: 60000 } },
      { name: 'Landing Page Development', recommend: 'conditional', pricing: { termLow: 1, termHigh: 3, budgetLow: 10000, budgetHigh: 15000 } },
      { name: 'Website Migration', recommend: 'conditional', pricing: { termLow: 1, termHigh: 4, budgetLow: 10000, budgetHigh: 60000 } },
      { name: 'Performance Optimization and Support', recommend: 'conditional', pricing: { termLow: 52, termHigh: 52, budgetLow: 24000, budgetHigh: 30000, note: 'Annual retainer' } },
    ],
    triggerPatterns: { direct: ['need a new website', 'website redesign', 'site looks outdated', 'rebuild our site', 'new landing page', 'mobile-friendly'], indirect: ['high bounce rates', 'site is slow', 'can\'t update the site', 'CMS is difficult', 'doesn\'t reflect our brand'], situational: ['recent rebrand', 'merger', 'new product launch', 'expansion into new markets', 'adding e-commerce'], performance: ['low conversion rates', 'cart abandonment', 'poor search rankings', 'low time on site', 'website not generating leads'], sampleLanguage: ['people leave our site within seconds', 'can\'t compete with competitors\' sites', 'looks fine on desktop but terrible on mobile'] }
  },
  {
    id: 'integrated_strategy', category: 'Integrated Marketing Strategy', description: 'Develop cohesive marketing plans',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Marketing Strategy Development', recommend: 'conditional', pricing: { termLow: 1, termHigh: 4, budgetLow: 10000, budgetHigh: 25000 } },
      { name: 'Channel Planning & Media Mix', recommend: 'conditional', pricing: { termLow: 1, termHigh: 3, budgetLow: 10000, budgetHigh: 20000 } },
      { name: 'Primary Audience Research', recommend: 'conditional', pricing: { termLow: 4, termHigh: 6, budgetLow: 25000, budgetHigh: 35000 } },
      { name: 'Customer Journey Mapping', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 7000, budgetHigh: 15000 } },
      { name: 'Marketing Audit & Assessment (Compass)', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 3000, budgetHigh: 4000 } },
      { name: 'Market & Competitive Research', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 2000, budgetHigh: 30000 } },
      { name: 'Audience Research & Segmentation', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 2000, budgetHigh: 5000 } },
    ],
    triggerPatterns: { direct: ['need a marketing strategy', 'marketing feels disjointed', 'don\'t have a plan', 'where to focus our budget'], indirect: ['marketing not producing results', 'conflicting messages', 'which channels to prioritize', 'marketing and sales not aligned'], situational: ['new fiscal year', 'leadership change', 'entering new market', 'product launch', 'competitive pressure'], performance: ['declining market share', 'acquisition costs increasing', 'ROI unknown', 'lead quality issues'], sampleLanguage: ['throwing spaghetti at the wall', 'don\'t know what\'s working', 'never had a real strategy', 'reactive instead of proactive'] }
  },
  {
    id: 'brand', category: 'Brand Strategy & Expression', description: 'Define or refresh your brand foundation',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Brand Research (Compass)', recommend: 'always', pricing: { termLow: 2, termHigh: 4, budgetLow: 15000, budgetHigh: 20000, bundle: 'Brand Strategy' } },
      { name: 'Stakeholder Interviews (IDIs)', recommend: 'always', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Rapid Discovery (Landscape & Audience)', recommend: 'always', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Brand Positioning', recommend: 'always', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Brand House Development', recommend: 'always', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Brand Workshop', recommend: 'always', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Authentic Foundation (Why, What, How)', recommend: 'always', pricing: { bundle: 'Brand Strategy' } },
      { name: 'Tone of Voice', recommend: 'always', pricing: { termLow: 3, termHigh: 7, budgetLow: 25000, budgetHigh: 30000, bundle: 'Brand Expression' } },
      { name: 'Manifesto', recommend: 'always', pricing: { bundle: 'Brand Expression' } },
      { name: 'Visual Identity System', recommend: 'always', pricing: { bundle: 'Brand Expression' } },
      { name: 'Logo/Wordmark Development', recommend: 'always', pricing: { bundle: 'Brand Expression' } },
      { name: 'Brand Deck Asset Production', recommend: 'conditional', pricing: { termLow: 1, termHigh: 4, budgetLow: 10000, budgetHigh: 30000, bundle: 'Brand Expression' } },
      { name: 'Social Lock-ups', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 10000, budgetHigh: 15000, bundle: 'Brand Assets' } },
      { name: 'Brand Guidelines', recommend: 'conditional', pricing: { bundle: 'Brand Assets' } },
    ],
    triggerPatterns: { direct: ['need to rebrand', 'brand feels outdated', 'need a new logo', 'brand doesn\'t reflect who we are', 'need brand guidelines'], indirect: ['company evolved but identity hasn\'t', 'inconsistent messaging', 'customer confusion', 'premium pricing not supported'], situational: ['merger or acquisition', 'new leadership', 'expansion beyond original scope', 'company milestone', 'IPO'], performance: ['brand awareness declining', 'can\'t command premium prices', 'losing deals to stronger brands'], sampleLanguage: ['nobody knows who we are', 'look just like everyone else', 'brand worked when small but we\'ve grown', 'visual identity all over the place'] }
  },
  {
    id: 'creative_production', category: 'Creative Production', description: 'Design, video, animation, and content creation',
    engagementType: 'tm',
    services: [
      { name: 'Graphic Design', recommend: 'conditional', pricing: { termLow: 52, termHigh: 52, budgetLow: 24000, budgetHigh: 80000, bundle: 'Creative Retainer', note: 'Annual minimum commitment' } },
      { name: 'Video Production', recommend: 'conditional', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Animation & Motion Graphics', recommend: 'conditional', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Photography', recommend: 'conditional', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Copywriting', recommend: 'conditional', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Sales Collateral', recommend: 'conditional', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Presentation Design', recommend: 'conditional', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Social Media Content', recommend: 'conditional', pricing: { bundle: 'Creative Retainer' } },
      { name: 'Campaign Asset Creation', recommend: 'conditional', pricing: { bundle: 'Creative Retainer' } },
    ],
    triggerPatterns: { direct: ['need a brochure', 'need a video', 'don\'t have creative resources', 'materials look amateurish'], indirect: ['marketing team stretched thin', 'no in-house design', 'high volume of creative needs', 'tight deadlines'], situational: ['campaign launch', 'trade show', 'product launch', 'executive presentations'], performance: ['creative not generating engagement', 'A/B tests showing underperformance'], sampleLanguage: ['don\'t have designers on staff', 'team is overwhelmed', 'competitors\' materials look more polished'] }
  },
  {
    id: 'influencer', category: 'Influencer Marketing', description: 'Leverage creator partnerships',
    engagementType: 'retainer',
    services: [
      { name: 'Influencer Strategy', recommend: 'always', pricing: { termLow: 52, termHigh: 52, budgetLow: 30000, budgetHigh: 100000, bundle: 'Influencer Retainer', note: 'Annual retainer, excludes creator fees' } },
      { name: 'Creator Identification & Vetting', recommend: 'always', pricing: { bundle: 'Influencer Retainer' } },
      { name: 'Influencer Campaign Management', recommend: 'always', pricing: { bundle: 'Influencer Retainer' } },
      { name: 'Ambassador Programs', recommend: 'conditional', pricing: { bundle: 'Influencer Retainer' } },
      { name: 'UGC Programs', recommend: 'conditional', pricing: { bundle: 'Influencer Retainer' } },
    ],
    triggerPatterns: { direct: ['want to work with influencers', 'need an influencer campaign', 'reach audience through creators'], indirect: ['difficulty reaching younger audiences', 'need authentic endorsements', 'brand awareness stalled'], situational: ['product launch needing buzz', 'new demographic market', 'competitors using influencers'], performance: ['social engagement declining', 'high CPA on paid channels', 'brand trust declining'], sampleLanguage: ['can\'t break through on social', 'younger audiences don\'t trust us directly', 'need authentic voices'] }
  },
  {
    id: 'creative_campaigns', category: 'Creative Campaigns & Innovation', description: 'Develop breakthrough campaign concepts',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Creative Platform Development', recommend: 'conditional', pricing: { termLow: 2, termHigh: 7, budgetLow: 18000, budgetHigh: 30000, bundle: 'Creative Campaigns' } },
      { name: 'Big Idea Generation', recommend: 'conditional', pricing: { bundle: 'Creative Campaigns' } },
      { name: 'Experiential Concepts', recommend: 'conditional', pricing: { bundle: 'Creative Campaigns' } },
    ],
    triggerPatterns: { direct: ['need a big idea', 'need a campaign concept', 'want something breakthrough', 'marketing lacks unifying concept'], indirect: ['campaigns feel tactical', 'difficulty creating memorable work', 'brand awareness plateaued'], situational: ['major launch', 'brand repositioning', 'competitive threat', 'company transformation'], performance: ['brand recall declining', 'share of voice decreasing', 'advertising not breaking through'], sampleLanguage: ['need something memorable', 'ads are forgettable', 'cut through the noise', 'want something competitors can\'t copy'] }
  },
  {
    id: 'pr', category: 'Public Relations & Media Outreach', description: 'Media relations, press coverage, and ongoing media engagement',
    engagementType: 'retainer',
    services: [
      { name: 'PR Strategy & Planning', recommend: 'always', pricing: { termLow: 52, termHigh: 52, budgetLow: 72000, budgetHigh: 120000, bundle: 'PR Retainer', note: 'Annual retainer' } },
      { name: 'Media List Development', recommend: 'always', pricing: { bundle: 'PR Retainer' } },
      { name: 'Media Relations & Pitching', recommend: 'always', pricing: { bundle: 'PR Retainer' } },
      { name: 'Press Release Writing & Distribution', recommend: 'always', pricing: { bundle: 'PR Retainer' } },
      { name: 'Media Monitoring & Reporting', recommend: 'always', pricing: { bundle: 'PR Retainer' } },
      { name: 'PR Launch Program', recommend: 'conditional', pricing: { termLow: 4, termHigh: 16, budgetLow: 30000, budgetHigh: 80000 } },
      { name: 'Media Training', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 5000, budgetHigh: 10000 } },
      { name: 'Crisis Communications Planning', recommend: 'conditional', pricing: { termLow: 2, termHigh: 4, budgetLow: 15000, budgetHigh: 25000 } },
    ],
    triggerPatterns: { direct: ['need PR', 'want media coverage', 'need help with press relations', 'need a PR agency'], indirect: ['important news not getting coverage', 'lack of third-party credibility', 'no journalist relationships'], situational: ['product launch', 'funding announcement', 'executive hire', 'research release', 'company milestone', 'crisis situation'], performance: ['low share of voice', 'minimal media mentions', 'lack of third-party validation'], sampleLanguage: ['have great news but nobody covers us', 'competitors are always in the press', 'don\'t have relationships with journalists', 'launching something big and need coverage'] }
  },
  {
    id: 'executive_visibility', category: 'Executive Visibility & Thought Leadership', description: 'Build leadership profiles and industry influence',
    engagementType: 'retainer',
    services: [
      { name: 'Executive Positioning Strategy', recommend: 'always', pricing: { termLow: 52, termHigh: 52, budgetLow: 36000, budgetHigh: 84000, bundle: 'Executive Visibility Retainer', note: 'Annual retainer' } },
      { name: 'Thought Leadership Content', recommend: 'always', pricing: { bundle: 'Executive Visibility Retainer' } },
      { name: 'Speaking Opportunity Pipeline', recommend: 'always', pricing: { bundle: 'Executive Visibility Retainer' } },
      { name: 'LinkedIn Profile & Content Strategy', recommend: 'conditional', pricing: { bundle: 'Executive Visibility Retainer' } },
      { name: 'Byline & Article Writing', recommend: 'conditional', pricing: { bundle: 'Executive Visibility Retainer' } },
      { name: 'Award Nominations', recommend: 'conditional', pricing: { bundle: 'Executive Visibility Retainer' } },
    ],
    triggerPatterns: { direct: ['want our CEO to be more visible', 'position executives as experts', 'need thought leadership content', 'leaders need higher profile'], indirect: ['competitor executives have stronger presence', 'difficulty attracting talent', 'investor relations require leadership credibility'], situational: ['new CEO', 'IPO preparation', 'fundraising rounds', 'industry conference schedule'], performance: ['low recognition of leadership team', 'executive content not generating engagement', 'speaking invitations not materializing'], sampleLanguage: ['our CEO should be better known', 'competitors\' leaders are always at conferences', 'leadership team has great insights but nobody hears them'] }
  },
  {
    id: 'paid_social', category: 'Paid Social', description: 'Social media advertising across platforms',
    engagementType: 'retainer',
    services: [
      { name: 'Paid Social Strategy', recommend: 'always', pricing: { termLow: 52, termHigh: 52, budgetLow: 36000, budgetHigh: 72000, bundle: 'Paid Social Retainer', note: 'Annual retainer, excludes media spend' } },
      { name: 'Campaign Setup & Management', recommend: 'always', pricing: { bundle: 'Paid Social Retainer' } },
      { name: 'Audience Targeting & Optimization', recommend: 'always', pricing: { bundle: 'Paid Social Retainer' } },
      { name: 'Creative Direction for Ads', recommend: 'conditional', pricing: { bundle: 'Paid Social Retainer' } },
      { name: 'Performance Reporting', recommend: 'always', pricing: { bundle: 'Paid Social Retainer' } },
    ],
    triggerPatterns: { direct: ['need to run social media ads', 'want paid social campaigns', 'help with Facebook/Instagram/LinkedIn ads', 'social ads aren\'t working'], indirect: ['organic reach declining', 'need to target specific audiences', 'current campaigns underperforming'], situational: ['campaign launch', 'product launch', 'event promotion', 'competitive pressure'], performance: ['high CPA on social', 'low conversion rates from social', 'poor targeting results', 'ROAS below benchmarks'], sampleLanguage: ['organic reach has tanked', 'spending money on ads but not seeing results', 'don\'t know if targeting is right'] }
  },
  {
    id: 'seo_geo', category: 'SEO & Generative Engine Optimization', description: 'Search visibility and AI search presence',
    engagementType: 'retainer',
    services: [
      { name: 'SEO Strategy & Audit', recommend: 'always', pricing: { termLow: 52, termHigh: 52, budgetLow: 36000, budgetHigh: 84000, bundle: 'SEO/GEO Retainer', note: 'Annual retainer' } },
      { name: 'On-page Optimization', recommend: 'always', pricing: { bundle: 'SEO/GEO Retainer' } },
      { name: 'Content SEO & Keyword Strategy', recommend: 'always', pricing: { bundle: 'SEO/GEO Retainer' } },
      { name: 'Technical SEO', recommend: 'conditional', pricing: { bundle: 'SEO/GEO Retainer' } },
      { name: 'Generative Engine Optimization (GEO)', recommend: 'conditional', pricing: { bundle: 'SEO/GEO Retainer' } },
      { name: 'Local SEO', recommend: 'conditional', pricing: { bundle: 'SEO/GEO Retainer' } },
    ],
    triggerPatterns: { direct: ['don\'t rank on Google', 'need SEO help', 'organic traffic is declining', 'want to rank for keywords', 'show up in AI search'], indirect: ['website not appearing in search', 'competitors outranking', 'paid search costs too high', 'content not getting discovered'], situational: ['website redesign', 'new content strategy', 'competitive threat in search', 'algorithm update impact'], performance: ['declining organic traffic', 'keyword rankings dropping', 'high reliance on paid search'], sampleLanguage: ['don\'t show up when people search for what we do', 'competitors always rank above us', 'people can\'t find us online', 'people are using AI to search now'] }
  },
  {
    id: 'paid_media', category: 'Paid Media', description: 'Search, display, and programmatic advertising',
    engagementType: 'retainer',
    services: [
      { name: 'Paid Media Strategy', recommend: 'always', pricing: { termLow: 52, termHigh: 52, budgetLow: 36000, budgetHigh: 84000, bundle: 'Paid Media Retainer', note: 'Annual retainer, excludes media spend' } },
      { name: 'Search Advertising (SEM/PPC)', recommend: 'conditional', pricing: { bundle: 'Paid Media Retainer' } },
      { name: 'Display & Programmatic', recommend: 'conditional', pricing: { bundle: 'Paid Media Retainer' } },
      { name: 'Performance Reporting & Optimization', recommend: 'always', pricing: { bundle: 'Paid Media Retainer' } },
    ],
    triggerPatterns: { direct: ['need SEM', 'Google Ads', 'paid search', 'programmatic advertising'], indirect: ['need leads quickly', 'organic too slow', 'competitors showing up in search ads'], situational: ['product launch', 'seasonal push', 'competitive defense'], performance: ['rising CPC', 'ROAS declining', 'budget not being used effectively'], sampleLanguage: ['we need more leads now', 'competitors\' ads are everywhere', 'spending on Google but not seeing returns'] }
  },
  {
    id: 'measurement', category: 'Measurement & Analytics', description: 'Data strategy, reporting, and ROI frameworks',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Analytics Strategy & Measurement Framework', recommend: 'conditional', pricing: { termLow: 2, termHigh: 4, budgetLow: 15000, budgetHigh: 25000 } },
      { name: 'KPI Development', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 5000, budgetHigh: 10000 } },
      { name: 'Marketing ROI Framework', recommend: 'conditional', pricing: { termLow: 2, termHigh: 4, budgetLow: 15000, budgetHigh: 25000 } },
      { name: 'Dashboard Development', recommend: 'conditional', pricing: { termLow: 2, termHigh: 6, budgetLow: 10000, budgetHigh: 30000 } },
      { name: 'Marketing Technology Audit', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 5000, budgetHigh: 15000 } },
    ],
    triggerPatterns: { direct: ['don\'t know if marketing is working', 'need better reporting', 'can\'t prove ROI', 'need to track performance'], indirect: ['decision-making without data', 'multiple tools not integrated', 'leadership asking for accountability', 'budget justification challenges'], situational: ['new leadership', 'board reporting', 'marketing technology audit', 'new marketing initiatives'], performance: ['inability to report on basic metrics', 'data conflicts', 'unknown customer journey'], sampleLanguage: ['have no idea what\'s working', 'data is all over the place', 'can\'t connect marketing to sales', 'board wants to see marketing ROI'] }
  },
  {
    id: 'go_to_market', category: 'Go-to-Market Strategy', description: 'Product and service launch planning',
    engagementType: 'fixed_fee',
    services: [
      { name: 'GTM Strategy Development', recommend: 'always', pricing: { termLow: 2, termHigh: 6, budgetLow: 20000, budgetHigh: 50000, bundle: 'GTM Bundle' } },
      { name: 'Positioning & Messaging', recommend: 'always', pricing: { bundle: 'GTM Bundle' } },
      { name: 'Launch Planning & Execution', recommend: 'always', pricing: { bundle: 'GTM Bundle' } },
      { name: 'Sales Enablement Materials', recommend: 'conditional', pricing: { bundle: 'GTM Bundle' } },
    ],
    triggerPatterns: { direct: ['launching a new product', 'need a GTM strategy', 'bringing this to market', 'entering a new market'], indirect: ['uncertainty about target audience', 'no launch plan', 'questions about pricing and positioning', 'channel strategy unclear'], situational: ['new product completion', 'service line expansion', 'market expansion', 'acquisition of new capabilities'], performance: ['previous launches underperformed', 'new product uptake slow', 'customer acquisition challenges'], sampleLanguage: ['launching in Q[X] and need a plan', 'built something great but don\'t know how to sell it', 'have the product but not the plan'] }
  },
  {
    id: 'impact_purpose', category: 'Impact & Purpose Communications', description: 'Sustainability, impact, and purpose communications',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Impact Report Writing & Design', recommend: 'always', pricing: { termLow: 4, termHigh: 12, budgetLow: 40000, budgetHigh: 80000, bundle: 'Impact Reporting' } },
      { name: 'Sustainability Communications Messaging', recommend: 'conditional', pricing: { termLow: 3, termHigh: 5, budgetLow: 15000, budgetHigh: 20000, bundle: 'Impact Communications' } },
      { name: 'Purpose Discovery Workshop', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 8000, budgetHigh: 10000, bundle: 'Impact Communications' } },
    ],
    triggerPatterns: { direct: ['need an annual report', 'need an impact report', 'CSR report', 'showcase our impact', 'sustainability story', 'ESG communications'], indirect: ['stakeholder expectations for transparency', 'ESG reporting requirements', 'competitor reports setting higher bar'], situational: ['annual reporting cycle', 'sustainability milestones', 'stakeholder meeting', 'B Corp certification'], performance: ['stakeholder feedback on transparency', 'impact not being communicated'], sampleLanguage: ['do great work but don\'t communicate it', 'have the data but need help presenting it', 'competitors have beautiful impact reports'] }
  },
  {
    id: 'content_production', category: 'Content Ideation & Production', description: 'Content strategy and creation',
    engagementType: 'fixed_fee',
    services: [
      { name: 'Content Strategy', recommend: 'always', pricing: { termLow: 2, termHigh: 4, budgetLow: 15000, budgetHigh: 30000, bundle: 'Content Strategy' } },
      { name: 'Content Calendar Development', recommend: 'always', pricing: { bundle: 'Content Strategy' } },
      { name: 'Blog & Article Writing', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 3500, budgetHigh: 8000, bundle: 'Content Production', note: 'T&M ongoing' } },
      { name: 'Podcast Production', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 3500, budgetHigh: 10000, bundle: 'Content Production' } },
      { name: 'Video Content Series', recommend: 'conditional', pricing: { termLow: 2, termHigh: 4, budgetLow: 10000, budgetHigh: 50000, bundle: 'Content Production' } },
      { name: 'Thought Leadership Content', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 6000, budgetHigh: 10000, bundle: 'Content Production' } },
    ],
    triggerPatterns: { direct: ['need more content', 'need a content strategy', 'run out of ideas', 'need help producing content'], indirect: ['content calendar empty', 'team stretched too thin', 'quality inconsistent'], situational: ['blog launch', 'podcast initiative', 'video series', 'thought leadership program'], performance: ['content engagement declining', 'audience growth stalled', 'social content underperforming'], sampleLanguage: ['know we need content but don\'t know what to create', 'team doesn\'t have time to write', 'content isn\'t getting engagement'] }
  },
  {
    id: 'operational_support', category: 'Operational Support', description: 'Project management and agency operations',
    engagementType: 'retainer',
    services: [
      { name: 'Project Management', recommend: 'always', pricing: { termLow: 52, termHigh: 52, percentageOfProject: 10, note: 'Approx 10-15% of total project fee. Not required on PR-only engagements.' } },
      { name: 'Marketing Operations', recommend: 'conditional', pricing: { termLow: 52, termHigh: 52, percentageOfPaidMedia: 10, note: '~10% of paid media management fees' } },
      { name: 'Cross-agency Coordination', recommend: 'conditional', pricing: { termLow: 52, termHigh: 52, budgetLow: 24000, budgetHigh: 50000 } },
      { name: 'Onboarding', recommend: 'conditional', pricing: { termLow: 1, termHigh: 2, budgetLow: 5000, budgetHigh: 15000 } },
    ],
    triggerPatterns: { direct: [], indirect: [], situational: [], performance: [], sampleLanguage: [] }
  },
];


// ============================================================================
// FIT ARCHETYPES
// ============================================================================
const FIT_ARCHETYPES = {
  architect: { id: 'architect', title: 'Architect', emoji: '📐', short: 'Strategic & Systematic', description: 'Values systematic approaches, formal planning, and proven methodologies.', boostCategories: ['integrated_strategy', 'brand', 'measurement'], boostServices: ['Marketing Strategy Development', 'Analytics Strategy & Measurement Framework', 'Customer Journey Mapping', 'Brand Research (Compass)', 'Brand Workshop', 'Marketing Audit & Assessment (Compass)'] },
  visionary: { id: 'visionary', title: 'Visionary', emoji: '✨', short: 'Creative & Bold', description: 'Prioritizes authentic brand expression, breakthrough ideas, and bold creative risks.', boostCategories: ['brand', 'creative_production', 'creative_campaigns', 'influencer'], boostServices: ['Creative Platform Development', 'Big Idea Generation', 'Visual Identity System', 'Manifesto', 'Tone of Voice', 'Video Production'] },
  connector: { id: 'connector', title: 'Connector', emoji: '🤝', short: 'Relationship & Community', description: 'Prioritizes relationships, community building, and earned trust through authentic connection.', boostCategories: ['pr', 'executive_visibility', 'influencer', 'content_production'], boostServices: ['PR Strategy & Planning', 'Media Relations & Pitching', 'Executive Positioning Strategy', 'Influencer Strategy', 'Content Strategy'] },
  catalyst: { id: 'catalyst', title: 'Catalyst', emoji: '⚡', short: 'Growth & Performance', description: 'Focused on measurable results, rapid growth, and performance-driven marketing.', boostCategories: ['paid_social', 'paid_media', 'seo_geo', 'measurement', 'go_to_market'], boostServices: ['Paid Social Strategy', 'SEO Strategy & Audit', 'Marketing ROI Framework', 'GTM Strategy Development', 'Campaign Setup & Management'] },
  champion: { id: 'champion', title: 'Champion', emoji: '🎯', short: 'Purpose & Impact', description: 'Driven by values, impact, and authentic purpose beyond profit.', boostCategories: ['impact_purpose', 'brand', 'pr'], boostServices: ['Impact Report Writing & Design', 'Sustainability Communications Messaging', 'Purpose Discovery Workshop', 'Brand Positioning', 'Authentic Foundation (Why, What, How)'] },
};

// ============================================================================
// PRICING UTILITIES
// ============================================================================
const getServiceName = (service) => typeof service === 'object' ? service.name : service;
const getServiceNames = (trigger) => trigger.services.map(getServiceName);
const PAID_MEDIA_CATEGORY_IDS = ['paid_media'];

const calculatePricingTotal = (selectedServices) => {
  let totalLow = 0, totalHigh = 0, paidMediaLow = 0, paidMediaHigh = 0;
  const countedBundles = new Set();
  let pmPercentageCount = 0, mktOpsPercentage = 0;
  for (const trigger of SERVICE_TRIGGERS) {
    const isPaidMedia = PAID_MEDIA_CATEGORY_IDS.includes(trigger.id);
    for (const service of trigger.services) {
      const name = getServiceName(service);
      if (!selectedServices.includes(name)) continue;
      if (!service.pricing) continue;
      const pricing = service.pricing;
      if (pricing.percentageOfProject) { pmPercentageCount++; continue; }
      if (pricing.percentageOfPaidMedia) { mktOpsPercentage = pricing.percentageOfPaidMedia; continue; }
      if (pricing.bundle && !pricing.budgetLow) { continue; }
      if (pricing.bundle) { if (countedBundles.has(pricing.bundle)) continue; countedBundles.add(pricing.bundle); }
      if (pricing.budgetLow) totalLow += pricing.budgetLow;
      if (pricing.budgetHigh) totalHigh += pricing.budgetHigh;
      if (isPaidMedia) { if (pricing.budgetLow) paidMediaLow += pricing.budgetLow; if (pricing.budgetHigh) paidMediaHigh += pricing.budgetHigh; }
    }
  }
  if (totalLow === 0 && totalHigh === 0 && pmPercentageCount === 0) return null;
  const pmLow = pmPercentageCount > 0 && totalLow > 0 ? Math.round(totalLow * 0.10) : 0;
  const pmHigh = pmPercentageCount > 0 && totalHigh > 0 ? Math.round(totalHigh * 0.10) : 0;
  const mktOpsLow = mktOpsPercentage > 0 && paidMediaLow > 0 ? Math.round(paidMediaLow * (mktOpsPercentage / 100)) : 0;
  const mktOpsHigh = mktOpsPercentage > 0 && paidMediaHigh > 0 ? Math.round(paidMediaHigh * (mktOpsPercentage / 100)) : 0;
  const grandLow = totalLow + pmLow + mktOpsLow, grandHigh = totalHigh + pmHigh + mktOpsHigh;
  const fmt = (n) => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;
  return { low: grandLow, high: grandHigh, lowFormatted: fmt(grandLow), highFormatted: fmt(grandHigh) };
};

const formatPricingForService = (service) => {
  if (!service.pricing) return null;
  const p = service.pricing;
  if (p.percentageOfProject) return { term: null, budget: `~${p.percentageOfProject}% of project`, note: p.note };
  if (p.percentageOfPaidMedia) return { term: null, budget: `~${p.percentageOfPaidMedia}% of paid media fees`, note: p.note };
  if (p.bundle && !p.termLow) return { term: null, budget: null, note: null, bundle: p.bundle };
  const fmtC = (n) => n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;
  const term = p.termLow && p.termHigh ? (p.termLow === p.termHigh ? (p.termLow === 52 ? 'Annual' : `${p.termLow} weeks`) : `${p.termLow}-${p.termHigh} weeks`) : null;
  const budget = p.budgetLow && p.budgetHigh ? (p.budgetLow === p.budgetHigh ? fmtC(p.budgetLow) : `${fmtC(p.budgetLow)}-${fmtC(p.budgetHigh)}`) : null;
  return { term, budget, note: p.note, bundle: p.bundle };
};

// ============================================================================
// SOW BEST PRACTICES (condensed)
// ============================================================================
const SOW_BEST_PRACTICES = `
AGENCY SOW QUALITY STANDARDS — ANTENNA GROUP

REQUIRED SECTIONS: Project Overview, Objectives, Scope of Work, Out of Scope & Exclusions, Deliverables (with specs/quantities), Acceptance Criteria (with review window + deemed acceptance), Timeline & Milestones, Roles & Responsibilities (BOTH parties), Assumptions (with consequences), Change Management Process, Fees & Payment Terms, Termination Provisions.

CRITICAL LANGUAGE RULES:
- Replace "unlimited revisions" → "up to X rounds of revisions"
- Replace "as needed" → specify with "up to X hours/items"
- Replace "reasonable" → define specifically
- Replace "ongoing" → add time boundary
- Flag: "support", "assistance", "management" without defined activities
- Use "up to" language for all quantities (sets ceiling, not floor)
- Active voice: "Agency will deliver..." not "Deliverables will be provided"
- Client obligations MUST have timeframes AND consequences for non-compliance
- Consolidated feedback requirement: "Client will consolidate all stakeholder feedback into a single submission per revision round"
- Deemed acceptance: "If Client does not respond within X business days, deliverable is deemed accepted"

CONTRACT TYPES:
- Fixed Fee: exhaustive scope, revision limits, strong assumptions, change order process required
- Retainer: term commitment, utilization management, rollover policy, overage handling, monthly fee
- T&M: rate schedule, estimate (NOT cap), notification thresholds, reporting requirements
- T&M with Cap: all T&M elements + scope-cap linkage, notification thresholds, work stoppage rights

HIGH PRIORITY FLAGS:
✗ No exclusions section | ✗ No client obligations | ✗ No revision limits | ✗ No change order process
✗ No assumptions | ✗ No acceptance criteria | ✗ "Unlimited" anything | ✗ No termination protection
✗ Payment not tied to milestones | ✗ No consequences for client non-performance
`;

// ============================================================================
// API CALL UTILITY
// ============================================================================
const callClaude = async (apiKey, { system, userMessage, maxTokens = 4000, useWebSearch = false, fileContent = null }) => {
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
  const body = { model: MODEL, max_tokens: maxTokens };
  if (system) body.system = system;
  if (useWebSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  
  let content;
  if (fileContent && fileContent.type !== 'text') {
    const mediaType = fileContent.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    content = [
      { type: 'document', source: { type: 'base64', media_type: mediaType, data: fileContent.data } },
      { type: 'text', text: userMessage }
    ];
  } else if (fileContent && fileContent.type === 'text') {
    content = `${userMessage}\n\n${fileContent.data}`;
  } else {
    content = userMessage;
  }
  
  body.messages = [{ role: 'user', content }];
  const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) });
  if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message || 'API error'); }
  const data = await response.json();
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
};

// ============================================================================
// DOCX GENERATION
// ============================================================================
const createAntennaHeader = () => new Header({ children: [new Paragraph({ children: [new TextRun({ text: '.antenna', font: 'Arial', size: 36, bold: true }), new TextRun({ text: 'group', font: 'Arial', size: 24, color: '666666' })] })] });
const createFooter = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Page ', font: 'Arial', size: 20, color: '666666' }), new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 20, color: '666666' })] })] });

const generateDocxFromText = async (text, title, meta = {}) => {
  const lines = text.split('\n');
  const children = [];
  
  children.push(new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 48, font: 'Arial' })], spacing: { after: 300 } }));
  if (meta.client) children.push(new Paragraph({ children: [new TextRun({ text: `Prepared for: ${meta.client}`, size: 22, font: 'Arial', color: '666666' })], spacing: { after: 100 } }));
  children.push(new Paragraph({ children: [new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 22, font: 'Arial', color: '666666' })], spacing: { after: 400 } }));
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } }, spacing: { after: 400 } }));

  for (const line of lines) {
    const t = line.trim();
    if (!t) { children.push(new Paragraph({ spacing: { after: 100 } })); continue; }
    if (t.startsWith('# ')) { children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t.replace(/^# /, ''), bold: true, size: 32, font: 'Arial' })], spacing: { before: 400, after: 200 } })); }
    else if (t.startsWith('## ')) { children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t.replace(/^## /, ''), bold: true, size: 26, font: 'Arial' })], spacing: { before: 300, after: 150 } })); }
    else if (t.startsWith('### ')) { children.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t.replace(/^### /, ''), bold: true, size: 24, font: 'Arial' })], spacing: { before: 200, after: 100 } })); }
    else if (t.startsWith('**') && t.endsWith('**')) { children.push(new Paragraph({ children: [new TextRun({ text: t.replace(/\*\*/g, ''), bold: true, size: 22, font: 'Arial' })], spacing: { after: 120 } })); }
    else if (t.startsWith('- ') || t.startsWith('• ')) { children.push(new Paragraph({ numbering: { reference: 'bullet-list', level: 0 }, children: [new TextRun({ text: t.replace(/^[-•] /, ''), size: 22, font: 'Arial' })], spacing: { after: 80 } })); }
    else { children.push(new Paragraph({ children: [new TextRun({ text: t.replace(/\*\*/g, ''), size: 22, font: 'Arial' })], spacing: { after: 150 } })); }
  }

  const doc = new Document({
    numbering: { config: [{ reference: 'bullet-list', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: createAntennaHeader() }, footers: { default: createFooter() }, children }]
  });
  return doc;
};

const downloadDocx = async (text, filename, meta = {}) => {
  try {
    const doc = await generateDocxFromText(text, meta.title || filename.replace('.docx', ''), meta);
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
  } catch (e) {
    console.error('DOCX error:', e);
    saveAs(new Blob([text], { type: 'text/plain' }), filename.replace('.docx', '.txt'));
  }
};

// ============================================================================
// SHARED UI COMPONENTS
// ============================================================================
function AntennaLogo({ className = "h-8" }) {
  return <img src="https://ktuyiikwhspwmzvyczit.supabase.co/storage/v1/object/public/assets/brand/antenna-new-logo.svg" alt="Antenna Group" className={className} />;
}

function AntennaButton({ children, onClick, disabled, loading, loadingText, icon: Icon, className = '', variant = 'primary', size = 'default' }) {
  const sizes = { small: 'px-4 py-2 text-sm rounded-lg gap-2', default: 'px-6 py-3 text-base rounded-xl gap-3', large: 'px-8 py-4 text-lg rounded-xl gap-3' };
  const variants = { primary: 'bg-[#12161E] text-white', secondary: 'bg-white text-[#12161E] border-2 border-[#12161E]', ghost: 'bg-transparent text-[#12161E] hover:bg-[#12161E]/5' };
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`group relative overflow-hidden font-semibold transition-all duration-300 flex items-center justify-center ${variants[variant]} ${sizes[size]} ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      {loading ? (<><Loader2 className="w-5 h-5 animate-spin relative z-10" /><span className="relative z-10">{loadingText || 'Loading...'}</span></>) : (
        <>
          {Icon && <Icon className="w-5 h-5 relative z-10 flex-shrink-0" />}
          <span className="relative z-10 flex-shrink-0 overflow-hidden">
            <span className="relative inline-block">
              {children}
              <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out group-hover:translate-y-full pointer-events-none" style={{ backgroundColor: '#E8FF00' }}>
                <span style={{ color: '#12161E' }}>{children}</span>
              </span>
            </span>
          </span>
          <svg className="w-5 h-5 flex-shrink-0 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7V17" /></svg>
        </>
      )}
    </button>
  );
}

function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) {} }} className={`p-1.5 rounded-md transition-all ${copied ? 'bg-green-600 text-white' : 'bg-white/60 text-gray-500 hover:bg-white hover:text-gray-900'} ${className}`}>
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false, icon: Icon, count, variant }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const variants = { critical: { header: 'bg-red-50 hover:bg-red-100', badge: 'bg-red-600 text-white', icon: 'text-red-600' }, recommended: { header: 'bg-amber-50 hover:bg-amber-100', badge: 'bg-amber-600 text-white', icon: 'text-amber-600' }, default: { header: 'bg-gray-50 hover:bg-gray-100', badge: 'bg-gray-900 text-white', icon: 'text-gray-900' } };
  const s = variants[variant] || variants.default;
  return (
    <div className="border border-gray-200 rounded-xl mb-3 overflow-hidden">
      <button onClick={() => setIsOpen(!isOpen)} className={`w-full px-5 py-4 ${s.header} flex items-center justify-between transition-colors`}>
        <div className="flex items-center gap-3">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}{Icon && <Icon className={`w-5 h-5 ${s.icon}`} />}<span className="font-semibold text-gray-900">{title}</span>{count !== undefined && <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.badge}`}>{count}</span>}</div>
      </button>
      {isOpen && <div className="p-5 bg-white border-t border-gray-100">{children}</div>}
    </div>
  );
}

function ApiKeyInput({ apiKey, setApiKey }) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-6">
      <label className="block text-sm font-semibold text-gray-900 mb-2"><div className="flex items-center gap-2"><Key className="w-4 h-4" />Anthropic API Key</div></label>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-..." className="w-full px-4 py-3 pr-12 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none text-gray-900 placeholder:text-gray-400" />
        <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-900">{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
      </div>
      <p className="mt-2 text-xs text-gray-500">Used only in your browser. <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">Get a key →</a></p>
    </div>
  );
}

// ============================================================================
// AUTH: LOGIN VIEW
// ============================================================================
function LoginView({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) return setError('Please enter your email and password.');
    setLoading(true); setError('');
    setTimeout(() => {
      const users = getStoredUsers();
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim() && u.password === password && u.active !== false);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid email or password. Please try again.');
      }
      setLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#E8E6E1' }}>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <AntennaLogo className="h-10 mx-auto mb-8" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">SOW Workbench</h1>
            <p className="text-gray-500 text-sm">Sign in to access your pipeline</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  placeholder="you@antennagroup.com" autoFocus
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none text-gray-900 placeholder:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-gray-900 outline-none text-gray-900 placeholder:text-gray-400"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <AntennaButton onClick={handleLogin} loading={loading} loadingText="Signing in..." className="w-full" size="default">
              Sign In
            </AntennaButton>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Contact your admin if you need access.
          </p>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} Antenna Group · <a href="https://antennagroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">antennagroup.com</a>
      </footer>
    </div>
  );
}

// ============================================================================
// AUTH: USER MENU (header dropdown)
// ============================================================================
function UserMenu({ currentUser, onLogout, onOpenAdmin }) {
  const [open, setOpen] = useState(false);
  const roleInfo = USER_ROLES[currentUser.role] || USER_ROLES.growth;
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 hover:bg-white border border-gray-200 transition-all"
      >
        <div className="w-7 h-7 rounded-full bg-[#12161E] flex items-center justify-center flex-shrink-0">
          <User className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-semibold text-gray-900 leading-none">{currentUser.name}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{roleInfo.label}</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="font-semibold text-gray-900 text-sm">{currentUser.name}</p>
              <p className="text-xs text-gray-500">{currentUser.email}</p>
              <span className={`mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleInfo.color}`}>{roleInfo.label}</span>
            </div>
            {currentUser.role === 'admin' && (
              <button
                onClick={() => { setOpen(false); onOpenAdmin(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Shield className="w-4 h-4 text-gray-500" />Admin Panel
              </button>
            )}
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
            >
              <LogOut className="w-4 h-4" />Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// ADMIN PANEL
// ============================================================================
function AdminView({ currentUser, onClose }) {
  const [users, setUsers] = useState(() => getStoredUsers());
  const [showCreate, setShowCreate] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'growth' });
  const [editingId, setEditingId] = useState(null);
  const [editUser, setEditUser] = useState({});
  const [error, setError] = useState('');

  const saveAndSync = (updated) => {
    setUsers(updated);
    saveStoredUsers(updated);
  };

  const handleCreate = () => {
    setError('');
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) return setError('Name, email and password are required.');
    if (users.find(u => u.email.toLowerCase() === newUser.email.toLowerCase())) return setError('A user with that email already exists.');
    const user = { id: `user-${Date.now()}`, ...newUser, email: newUser.email.toLowerCase(), active: true, createdAt: new Date().toISOString() };
    saveAndSync([...users, user]);
    setNewUser({ name: '', email: '', password: '', role: 'growth' });
    setShowCreate(false);
  };

  const handleToggleActive = (id) => {
    if (id === currentUser.id) return;
    saveAndSync(users.map(u => u.id === id ? { ...u, active: !u.active } : u));
  };

  const handleDelete = (id) => {
    if (id === currentUser.id) return;
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    saveAndSync(users.filter(u => u.id !== id));
  };

  const handleSaveEdit = (id) => {
    setError('');
    if (!editUser.name?.trim() || !editUser.email?.trim()) return setError('Name and email are required.');
    const conflict = users.find(u => u.email.toLowerCase() === editUser.email.toLowerCase() && u.id !== id);
    if (conflict) return setError('That email is already in use.');
    saveAndSync(users.map(u => u.id === id ? { ...u, ...editUser, email: editUser.email.toLowerCase() } : u));
    setEditingId(null);
  };

  const roleOptions = Object.entries(USER_ROLES).map(([value, info]) => ({ value, label: info.label, description: info.description }));

  return (
    <div className="fixed inset-0 z-50 flex" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="absolute inset-4 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#12161E] rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
              <p className="text-xs text-gray-500">Manage users and access</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {Object.entries(USER_ROLES).map(([role, info]) => {
              const count = users.filter(u => u.role === role && u.active !== false).length;
              return (
                <div key={role} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border mt-1 ${info.color}`}>{info.label}</span>
                </div>
              );
            })}
          </div>

          {/* Create User */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Users ({users.length})</h3>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-4 py-2 bg-[#12161E] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              <UserPlus className="w-4 h-4" />{showCreate ? 'Cancel' : 'Add User'}
            </button>
          </div>

          {showCreate && (
            <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-2xl">
              <h4 className="font-semibold text-gray-900 mb-4">New User</h4>
              {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name *</label>
                  <input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Jane Smith" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email *</label>
                  <input value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="jane@antennagroup.com" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Password *</label>
                  <input type="text" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Temporary password" className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Role *</label>
                  <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 outline-none bg-white">
                    {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label} — {r.description}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleCreate} className="px-6 py-2.5 bg-[#12161E] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2">
                <UserPlus className="w-4 h-4" />Create User
              </button>
            </div>
          )}

          {/* Role Access Guide */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
            <p className="text-xs font-semibold text-blue-800 mb-2">Role Access Summary</p>
            <div className="grid grid-cols-4 gap-3">
              {Object.entries(USER_ROLES).map(([role, info]) => (
                <div key={role} className="text-xs text-blue-700">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold border text-[10px] mb-1 ${info.color}`}>{info.label}</span>
                  <p className="text-gray-600 leading-snug">{info.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Users Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Password</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(user => {
                  const roleInfo = USER_ROLES[user.role] || USER_ROLES.growth;
                  const isMe = user.id === currentUser.id;
                  const isEditing = editingId === user.id;
                  return (
                    <tr key={user.id} className={`${isMe ? 'bg-blue-50/40' : 'bg-white'} hover:bg-gray-50 transition-colors`}>
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <div className="space-y-1.5">
                            <input value={editUser.name || ''} onChange={e => setEditUser({ ...editUser, name: e.target.value })} placeholder="Name" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                            <input value={editUser.email || ''} onChange={e => setEditUser({ ...editUser, email: e.target.value })} placeholder="Email" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-gray-900">{user.name} {isMe && <span className="text-xs text-blue-600">(you)</span>}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <select value={editUser.role || user.role} onChange={e => setEditUser({ ...editUser, role: e.target.value })} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
                            {roleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${roleInfo.color}`}>{roleInfo.label}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${user.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {user.active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <input type="text" value={editUser.password || ''} onChange={e => setEditUser({ ...editUser, password: e.target.value })} placeholder="New password (leave blank to keep)" className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                        ) : (
                          <span className="text-xs text-gray-400 font-mono">{'•'.repeat(Math.min(user.password?.length || 8, 10))}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <button onClick={() => handleSaveEdit(user.id)} className="px-3 py-1.5 bg-[#12161E] text-white rounded-lg text-xs font-medium hover:bg-gray-800">Save</button>
                              <button onClick={() => { setEditingId(null); setError(''); }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingId(user.id); setEditUser({ name: user.name, email: user.email, role: user.role, password: user.password }); setError(''); }} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                              {!isMe && (
                                <button onClick={() => handleToggleActive(user.id)} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" title={user.active !== false ? 'Deactivate' : 'Activate'}>
                                  {user.active !== false ? <ToggleRight className="w-3.5 h-3.5 text-green-600" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                                </button>
                              )}
                              {!isMe && (
                                <button onClick={() => handleDelete(user.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {error && !showCreate && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = PROPOSAL_STATUSES.find(p => p.value === status) || PROPOSAL_STATUSES[0];
  return <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>;
}

function StageProgress({ currentStage, opportunity, onStageClick, allowedStages = [] }) {
  const stageOrder = PIPELINE_STAGES.map(s => s.id);
  const currentIdx = stageOrder.indexOf(currentStage);
  const getStageStatus = (stageId) => {
    if (allowedStages.length > 0 && !allowedStages.includes(stageId)) return 'locked';
    const idx = stageOrder.indexOf(stageId);
    if (idx < currentIdx) return 'complete';
    if (idx === currentIdx) return 'active';
    return 'upcoming';
  };
  return (
    <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 py-3">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{opportunity?.companyName}</span>
          {opportunity?.proposalStatus && currentStage === 'proposal' && <StatusBadge status={opportunity.proposalStatus} />}
        </div>
        <div className="flex items-center gap-0">
          {PIPELINE_STAGES.map((stage, idx) => {
            const status = getStageStatus(stage.id);
            const isClickable = status === 'complete' || status === 'active';
            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => isClickable && onStageClick && onStageClick(stage.id)}
                  disabled={!isClickable}
                  title={status === 'locked' ? 'Not available for your role' : ''}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${status === 'active' ? 'bg-[#12161E] text-white' : status === 'complete' ? 'text-gray-700 hover:bg-gray-100 cursor-pointer' : status === 'locked' ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-400 cursor-default'}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${status === 'active' ? 'bg-white text-[#12161E]' : status === 'complete' ? 'bg-green-500 text-white' : status === 'locked' ? 'bg-gray-100 text-gray-300' : 'bg-gray-200 text-gray-400'}`}>
                    {status === 'complete' ? '✓' : status === 'locked' ? '🔒' : stage.number}
                  </span>
                  {stage.label}
                </button>
                {idx < PIPELINE_STAGES.length - 1 && <div className={`w-6 h-0.5 ${status === 'complete' ? 'bg-green-400' : 'bg-gray-200'}`} />}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// STAGE 1: RESEARCH VIEW
// ============================================================================
function ResearchView({ opportunity, onUpdate, apiKey }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [companyName, setCompanyName] = useState(opportunity.companyName || '');
  const [companyUrl, setCompanyUrl] = useState(opportunity.companyUrl || '');
  const [industry, setIndustry] = useState(opportunity.industry || '');
  const [additionalContext, setAdditionalContext] = useState('');

  const runResearch = async () => {
    if (!apiKey) return setError('Please enter your API key first.');
    if (!companyName.trim()) return setError('Please enter a company name.');
    setIsLoading(true); setError(null);
    try {
      const result = await callClaude(apiKey, {
        useWebSearch: true,
        maxTokens: 6000,
        system: `You are a senior business development researcher at Antenna Group, an integrated marketing and communications agency. Your job is to research prospect companies and produce actionable intelligence that prepares the BD team for an initial discovery call. You are sharp, strategic, and concise. You do NOT produce generic corporate summaries — you produce insight that drives better conversations.`,
        userMessage: `Research this company thoroughly and produce a structured intelligence brief.

COMPANY: ${companyName}
WEBSITE: ${companyUrl || 'Search for it'}
INDUSTRY: ${industry || 'Identify from research'}
ADDITIONAL CONTEXT: ${additionalContext || 'None provided'}

Produce your response in this EXACT format:

## COMPANY OVERVIEW
[3-4 sentences: what they do, who they serve, their scale/stage, notable facts]

## POSITIONING & DIFFERENTIATION
[How do they position themselves? What's their stated value proposition? What makes them different from competitors? 2-3 sentences]

## REPUTATION & PRESENCE
[What's their media presence like? PR/coverage? Social engagement? Brand perception? Any notable awards, controversies, or recognition? 2-3 sentences]

## MARKETING OPPORTUNITY ASSESSMENT
**Owned (Website & Content):** [What does their owned presence look like? Website quality, content strategy, SEO presence?]
**Earned (PR & Media):** [What's their earned media presence? Are they getting press? Do they have thought leadership?]
**Paid (Advertising):** [Any visible paid activity? Ads, social campaigns, SEM?]
**Social (Community):** [Social channels, engagement quality, influencer activity, community?]

## KEY STRATEGIC OPPORTUNITIES
[3-5 bullet points: specific integrated marketing opportunities Antenna Group could address for this company based on gaps identified above]

## 10 INTAKE CALL QUESTIONS
[Number 1-10. These should be intelligent, strategic questions that will uncover this company's real marketing needs, priorities, budget range, decision-making process, and where Antenna Group can add the most value. Avoid generic questions. Make them specific to what you found in the research.]`
      });

      // Parse questions
      const questionMatch = result.match(/## 10 INTAKE CALL QUESTIONS([\s\S]*?)(?:$)/);
      const questionsRaw = questionMatch ? questionMatch[1] : '';
      const questions = questionsRaw.split('\n').filter(l => /^\d+\./.test(l.trim())).map(l => l.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);

      onUpdate({
        companyName, companyUrl, industry,
        researchSummary: result,
        intakeQuestions: questions,
        researchComplete: true,
        currentStage: 'research',
      });
    } catch (e) { setError(e.message); }
    finally { setIsLoading(false); }
  };

  const { researchSummary, intakeQuestions, researchComplete } = opportunity;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Input */}
        <div>
          <div className="mb-8">
            <div className="w-12 h-12 bg-[#12161E] rounded-xl flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Research</h2>
            <p className="text-gray-500">AI-powered discovery to understand the prospect, identify marketing gaps, and generate smart intake questions.</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Company Name *</label>
              <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. Cartography Capital" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900 placeholder:text-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Website URL</label>
              <input value={companyUrl} onChange={e => setCompanyUrl(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900 placeholder:text-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Industry / Sector</label>
              <input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Fintech, Healthcare, Climate Tech" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900 placeholder:text-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Additional Context (optional)</label>
              <textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="How did they reach us? Any existing relationship? Specific areas of interest?" className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900 placeholder:text-gray-400 min-h-[100px] resize-y" />
            </div>
          </div>

          {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />{error}</div>}

          <AntennaButton onClick={runResearch} loading={isLoading} loadingText="Researching..." icon={Search} disabled={!apiKey || !companyName.trim()} className="w-full" size="large">
            {researchComplete ? 'Re-run Research' : 'Run Company Research'}
          </AntennaButton>
          {!apiKey && <p className="text-xs text-amber-600 mt-2 text-center">⚠ Enter your API key in settings to enable research</p>}
        </div>

        {/* Right: Results */}
        <div>
          {!researchComplete ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-8">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                <Globe className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Research results will appear here</h3>
              <p className="text-sm text-gray-400">Enter the company details and run research to generate an intelligence brief and intake questions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Research Summary */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-900">Intelligence Brief</span>
                  </div>
                  <CopyButton text={researchSummary} />
                </div>
                <div className="p-5 max-h-80 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{researchSummary}</pre>
                </div>
              </div>

              {/* Intake Questions */}
              {intakeQuestions.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileQuestion className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-gray-900">Intake Call Questions</span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">{intakeQuestions.length}</span>
                    </div>
                    <CopyButton text={intakeQuestions.map((q, i) => `${i+1}. ${q}`).join('\n')} />
                  </div>
                  <div className="p-5 space-y-3">
                    {intakeQuestions.map((q, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#12161E] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                        <p className="text-sm text-gray-700 leading-relaxed">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <AntennaButton onClick={() => onUpdate({ currentStage: 'brief' })} icon={ArrowRight} className="w-full">
                Proceed to Return Brief →
              </AntennaButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAGE 2: BRIEF VIEW
// ============================================================================
function BriefView({ opportunity, onUpdate, apiKey }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState(opportunity.transcript || '');
  const [briefNotes, setBriefNotes] = useState(opportunity.briefNotes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [editedBrief, setEditedBrief] = useState(opportunity.returnBrief || '');

  const generateBrief = async () => {
    if (!apiKey) return setError('Please enter your API key first.');
    if (!transcript.trim()) return setError('Please paste the call transcript.');
    setIsLoading(true); setError(null);
    const serviceTriggerSummary = SERVICE_TRIGGERS.map(t => `- ${t.category}: ${(t.triggerPatterns.direct || []).slice(0,3).join(', ')}`).join('\n');
    try {
      const result = await callClaude(apiKey, {
        maxTokens: 5000,
        system: `You are a senior account strategist at Antenna Group, an integrated marketing and communications agency. Your job is to listen deeply to what clients say and don't say, synthesize their needs, and produce a crisp, strategic Return Brief that demonstrates you truly understand the opportunity. Your writing is warm, direct, and shows genuine intelligence — not corporate jargon.`,
        userMessage: `Analyze this client call transcript and produce a Return Brief.

COMPANY: ${opportunity.companyName}
RESEARCH CONTEXT: ${opportunity.researchSummary ? opportunity.researchSummary.substring(0, 1000) : 'No prior research available'}
ADDITIONAL NOTES: ${briefNotes || 'None'}

TRANSCRIPT:
${transcript}

SERVICE CATEGORIES ANTENNA OFFERS:
${serviceTriggerSummary}

Produce a professional Return Brief in this EXACT format:

---

# Return Brief: ${opportunity.companyName}
**Prepared by Antenna Group | ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}**

## What We Heard
[2-3 sentences capturing the essence of what the client communicated — their situation, their energy, their urgency]

## The Problem We're Solving
[1-2 paragraphs. Be specific about the business challenge. Not just "they need marketing" — what's actually broken, missing, or holding them back?]

## What They Want
[Bullet list of explicit requests and stated desires from the call]

## What They Need
[Bullet list of underlying needs — what they should want, even if they didn't say it directly. This is where your strategic thinking shows]

## What Success Looks Like
[2-3 measurable or tangible outcomes that would make this engagement a success in their eyes]

## Constraints & Parameters
**Budget:** [Stated or implied budget range, or "TBC — to be confirmed in follow-up"]
**Timeline:** [Key dates, launch targets, urgency signals]
**Brand:** [Any brand constraints, existing guidelines, sensitivity areas]
**Decision Making:** [Who are the key stakeholders? Who has sign-off authority?]

## Mandatories
[Things they explicitly stated as non-negotiable or must-haves]

## Services We're Likely To Propose
[Brief bullet list of the Antenna service areas most relevant to this brief — reference the service categories]

## Recommended Next Step
This Return Brief confirms our understanding of the opportunity. We recommend proceeding to a proposal that outlines our recommended approach, service scope, and investment range. We'll follow up within [X] business days.

---
*This brief is a working document and can be updated as our understanding evolves.*

---

Then on a new section add:

## TRIGGER ANALYSIS (Internal — Do Not Share)
[For internal use: list which service trigger categories were detected and why, what the client's FIT archetype most likely is, and any strategic observations about the opportunity]`
      });

      onUpdate({ transcript, briefNotes, returnBrief: result, briefComplete: true, currentStage: 'brief' });
      setEditedBrief(result);
    } catch (e) { setError(e.message); }
    finally { setIsLoading(false); }
  };

  const handleSaveEdit = () => { onUpdate({ returnBrief: editedBrief }); setIsEditing(false); };

  // Split brief from internal analysis
  const briefText = opportunity.returnBrief || '';
  const internalSplit = briefText.indexOf('## TRIGGER ANALYSIS');
  const publicBrief = internalSplit > 0 ? briefText.substring(0, internalSplit).trim() : briefText;
  const internalAnalysis = internalSplit > 0 ? briefText.substring(internalSplit).trim() : '';

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Input */}
        <div>
          <div className="mb-8">
            <div className="w-12 h-12 bg-[#12161E] rounded-xl flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Return Brief</h2>
            <p className="text-gray-500">Paste your call transcript. We'll analyze what they want and need, then produce a brief you can send back to the prospect.</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">
                <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4" />Call Transcript *</div>
              </label>
              <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste the full transcript of your client discovery call here..." className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900 placeholder:text-gray-400 min-h-[250px] resize-y font-mono text-sm" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1.5">Additional Notes (optional)</label>
              <textarea value={briefNotes} onChange={e => setBriefNotes(e.target.value)} placeholder="Any context not captured in the transcript — offline conversations, email exchanges, specific concerns..." className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900 placeholder:text-gray-400 min-h-[80px] resize-y" />
            </div>
          </div>

          {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />{error}</div>}

          <AntennaButton onClick={generateBrief} loading={isLoading} loadingText="Generating Brief..." icon={FileText} disabled={!apiKey || !transcript.trim()} className="w-full" size="large">
            {opportunity.briefComplete ? 'Regenerate Brief' : 'Generate Return Brief'}
          </AntennaButton>

          {opportunity.briefComplete && (
            <p className="text-xs text-gray-500 text-center mt-3">Brief generated. Review and edit on the right before sending to the client.</p>
          )}
        </div>

        {/* Right: Output */}
        <div>
          {!opportunity.briefComplete ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-8">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Return Brief will appear here</h3>
              <p className="text-sm text-gray-400">Paste your transcript and generate to produce a client-ready brief document.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Brief Actions */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-gray-900">Return Brief</span>
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Ready to send</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyButton text={publicBrief} />
                    <button onClick={() => { setIsEditing(!isEditing); setEditedBrief(briefText); }} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"><Edit3 className="w-3 h-3" />{isEditing ? 'Cancel' : 'Edit'}</button>
                    <button onClick={() => downloadDocx(publicBrief, `${opportunity.companyName}_Return_Brief.docx`, { title: `Return Brief: ${opportunity.companyName}`, client: opportunity.companyName })} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5"><Download className="w-3 h-3" />Download</button>
                  </div>
                </div>
                {isEditing ? (
                  <div className="p-5">
                    <textarea value={editedBrief} onChange={e => setEditedBrief(e.target.value)} className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 min-h-[400px] resize-y font-mono focus:ring-2 focus:ring-gray-900 outline-none" />
                    <button onClick={handleSaveEdit} className="mt-3 px-4 py-2 bg-[#12161E] text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">Save Changes</button>
                  </div>
                ) : (
                  <div className="p-5 max-h-[500px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{publicBrief}</pre>
                  </div>
                )}
              </div>

              {/* Internal Analysis */}
              {internalAnalysis && (
                <CollapsibleSection title="Trigger Analysis (Internal Only)" icon={Lightbulb}>
                  <pre className="whitespace-pre-wrap text-sm text-gray-600 leading-relaxed font-sans">{internalAnalysis.replace('## TRIGGER ANALYSIS (Internal — Do Not Share)', '').trim()}</pre>
                </CollapsibleSection>
              )}

              <AntennaButton onClick={() => onUpdate({ currentStage: 'proposal' })} icon={ArrowRight} className="w-full">
                Proceed to Proposal →
              </AntennaButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// SERVICE SELECTION CARD (for Stage 3)
// ============================================================================
function ServiceCard({ trigger, selectedServices, onToggleService, onToggleBundle }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const serviceNames = getServiceNames(trigger);
  const selectedCount = serviceNames.filter(s => selectedServices.includes(s)).length;

  const organizeServices = () => {
    const bundles = {}, standalone = [];
    for (const service of trigger.services) {
      const name = getServiceName(service);
      const bundleName = service.pricing?.bundle;
      if (bundleName) {
        if (!bundles[bundleName]) bundles[bundleName] = { name: bundleName, services: [], pricing: null };
        bundles[bundleName].services.push({ name, service });
        if (service.pricing?.budgetLow) bundles[bundleName].pricing = service.pricing;
      } else { standalone.push({ name, service }); }
    }
    return { bundles: Object.values(bundles), standalone };
  };

  const { bundles, standalone } = organizeServices();
  const isBundleSelected = (bundle) => bundle.services.every(s => selectedServices.includes(s.name));
  const fmtPricing = (p) => {
    if (!p) return null;
    const fmtC = (n) => n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`;
    const term = p.termLow && p.termHigh ? (p.termLow === p.termHigh ? (p.termLow === 52 ? 'Annual' : `${p.termLow}w`) : `${p.termLow}-${p.termHigh}w`) : null;
    const budget = p.budgetLow && p.budgetHigh ? `${fmtC(p.budgetLow)}-${fmtC(p.budgetHigh)}` : null;
    return { term, budget, note: p.note };
  };

  return (
    <div className={`border-2 rounded-xl overflow-hidden transition-all ${selectedCount > 0 ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white'}`}>
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3 text-left">
          {isExpanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
          <div><p className="font-semibold text-gray-900">{trigger.category}</p><p className="text-sm text-gray-500">{trigger.description}</p></div>
        </div>
        {selectedCount > 0 && <span className="px-2.5 py-1 bg-gray-900 text-white text-xs rounded-full font-medium flex-shrink-0">{selectedCount} selected</span>}
      </button>

      {isExpanded && (
        <div className="px-5 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {bundles.map(bundle => {
            const bundleSelected = isBundleSelected(bundle);
            const pi = fmtPricing(bundle.pricing);
            return (
              <div key={bundle.name}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={bundleSelected} onChange={() => onToggleBundle(bundle.services.map(s => s.name), !bundleSelected)} className="w-4 h-4 mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                  <div className="w-full">
                    <span className="text-sm font-medium text-gray-900">{bundle.name}</span>
                    <span className="text-xs text-gray-400 ml-2">({bundle.services.length} services)</span>
                    {bundleSelected && pi && (
                      <div className="mt-1 flex gap-2 flex-wrap">
                        {pi.term && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">⏱ {pi.term}</span>}
                        {pi.budget && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">💰 {pi.budget}</span>}
                        {pi.note && <span className="text-xs text-gray-500 italic">{pi.note}</span>}
                      </div>
                    )}
                  </div>
                </label>
                {bundleSelected && (
                  <div className="ml-7 mt-1 pl-3 border-l-2 border-gray-200 space-y-0.5">
                    {bundle.services.map(svc => <div key={svc.name} className="flex items-center gap-2 text-xs text-gray-500 py-0.5"><Check className="w-3 h-3 text-green-500" />{svc.name}</div>)}
                  </div>
                )}
              </div>
            );
          })}
          {standalone.map(({ name, service }) => {
            const pi = formatPricingForService(service);
            return (
              <label key={name} className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={selectedServices.includes(name)} onChange={() => onToggleService(name)} className="w-4 h-4 mt-0.5 rounded border-gray-300 text-gray-900 focus:ring-gray-900" />
                <div className="w-full">
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                    <span className="text-sm font-medium text-gray-900">{name}</span>
                    {service.recommend === 'conditional' && <span className="text-xs text-gray-400 italic">conditional</span>}
                  </div>
                  {selectedServices.includes(name) && pi && (
                    <div className="mt-1 flex gap-2 flex-wrap">
                      {pi.term && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">⏱ {pi.term}</span>}
                      {pi.budget && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">💰 {pi.budget}</span>}
                      {pi.note && <span className="text-xs text-gray-500 italic">{pi.note}</span>}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STAGE 3: PROPOSAL VIEW
// ============================================================================
const ENGAGEMENT_TYPES = [
  { value: 'fixed_fee', label: 'Fixed Fee', description: 'Defined deliverables, set price' },
  { value: 'retainer', label: 'Retainer', description: 'Ongoing monthly engagement' },
  { value: 'tm', label: 'Time & Materials', description: 'Hourly with minimum commitment' },
  { value: 'integrated', label: 'Integrated', description: 'Multi-phase, mixed models' },
  { value: 'tm_cap', label: 'T&M with Cap', description: 'Hourly with maximum (client request only)' },
];

function ProposalView({ opportunity, onUpdate, apiKey }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState(null);
  const [draftNotes, setDraftNotes] = useState(opportunity.draftNotes || '');
  const [isEditingProposal, setIsEditingProposal] = useState(false);
  const [editedProposal, setEditedProposal] = useState(opportunity.proposalDraft || '');
  const [proposalIteration, setProposalIteration] = useState('');
  const [isIterating, setIsIterating] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  const selectedServices = opportunity.selectedServices || [];
  const selectedArchetypes = opportunity.selectedArchetypes || [];
  const draftEngagementType = opportunity.draftEngagementType || 'fixed_fee';

  const setSelectedServices = (fn) => onUpdate({ selectedServices: typeof fn === 'function' ? fn(selectedServices) : fn });
  const setSelectedArchetypes = (fn) => onUpdate({ selectedArchetypes: typeof fn === 'function' ? fn(selectedArchetypes) : fn });
  const setDraftEngagementType = (v) => onUpdate({ draftEngagementType: v });

  const toggleService = (name) => setSelectedServices(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  const toggleBundle = (names, shouldSelect) => setSelectedServices(prev => shouldSelect ? [...prev, ...names.filter(n => !prev.includes(n))] : prev.filter(n => !names.includes(n)));
  const toggleArchetype = (id) => setSelectedArchetypes(prev => prev.includes(id) ? prev.filter(a => a !== id) : prev.length < 2 ? [...prev, id] : [prev[1], id]);

  const pricingTotal = calculatePricingTotal(selectedServices);

  const detectServices = async () => {
    if (!apiKey) return;
    setIsDetecting(true); setError(null);
    try {
      const context = `${opportunity.returnBrief || ''}\n\n${opportunity.transcript || ''}`.substring(0, 4000);
      const categoryList = SERVICE_TRIGGERS.map(t => `${t.id}: ${t.category} — triggers: ${(t.triggerPatterns.direct || []).concat(t.triggerPatterns.indirect || []).slice(0,4).join(', ')}`).join('\n');
      const result = await callClaude(apiKey, {
        maxTokens: 1500,
        system: 'You are a marketing services expert. Identify which service categories are relevant based on context. Return ONLY a JSON array of category IDs.',
        userMessage: `Based on this client context, identify relevant service categories.\n\nCONTEXT:\n${context}\n\nAVAILABLE CATEGORIES:\n${categoryList}\n\nReturn ONLY valid JSON array of category IDs that are relevant, e.g.: ["brand","pr","website"]`
      });
      const match = result.match(/\[[\s\S]*?\]/);
      if (match) {
        const detectedIds = JSON.parse(match[0]);
        const newServices = [];
        for (const trigger of SERVICE_TRIGGERS) {
          if (detectedIds.includes(trigger.id)) {
            for (const service of trigger.services) {
              const name = getServiceName(service);
              if (service.recommend === 'always' && !selectedServices.includes(name)) newServices.push(name);
            }
          }
        }
        if (newServices.length > 0) setSelectedServices(prev => [...new Set([...prev, ...newServices])]);
      }
    } catch (e) { setError('Could not auto-detect services: ' + e.message); }
    finally { setIsDetecting(false); }
  };

  const generateProposal = async () => {
    if (!apiKey || selectedServices.length === 0) return;
    setIsGenerating(true); setError(null);
    try {
      const servicesText = SERVICE_TRIGGERS.flatMap(t => t.services.filter(s => selectedServices.includes(getServiceName(s))).map(s => {
        const p = formatPricingForService(s);
        const name = getServiceName(s);
        return `- ${name}${p?.budget ? ` (${p.budget}${p.term ? ', ' + p.term : ''})` : ''}`;
      })).join('\n');

      const archetypeContext = selectedArchetypes.length > 0 ? selectedArchetypes.map(id => FIT_ARCHETYPES[id]?.title + ': ' + FIT_ARCHETYPES[id]?.short).join('; ') : 'Architect: Strategic & Systematic';

      const result = await callClaude(apiKey, {
        maxTokens: 6000,
        system: `You are a senior business development writer at Antenna Group, an integrated marketing and communications agency that works with conscious brands that have the courage to lead. 

Your proposals are:
- Warm, direct, and confident — never corporate or generic
- Strategic, not salesy — you demonstrate understanding before recommending
- Specific — you reference the client's actual situation, not generic marketing speak
- Written in first person plural ("we") on behalf of Antenna
- Built around genuine insight into what the client needs

Visit www.antennagroup.com for brand voice context. Antenna believes in work that matters, brands with purpose, and marketing that creates real-world impact.`,
        userMessage: `Write a compelling proposal for this client opportunity.

CLIENT: ${opportunity.companyName}
ENGAGEMENT TYPE: ${ENGAGEMENT_TYPES.find(t => t.value === draftEngagementType)?.label || 'Fixed Fee'}
CLIENT FIT ARCHETYPE: ${archetypeContext}
BRIEF / CONTEXT:
${(opportunity.returnBrief || opportunity.transcript || 'No brief available').substring(0, 2000)}

SELECTED SERVICES WITH PRICING:
${servicesText}

TOTAL ESTIMATED INVESTMENT: ${pricingTotal ? `${pricingTotal.lowFormatted} – ${pricingTotal.highFormatted}` : 'TBC'}

ADDITIONAL NOTES: ${draftNotes || 'None'}

Write the proposal in this exact structure:

---

# Proposal: ${opportunity.companyName}
**Prepared by Antenna Group | ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}**

## About This Document
[2-3 sentences: what this document is, what it covers, and what the next step is. Warm and direct.]

## The Challenge
[1-2 paragraphs: articulate the business problem with real insight. Show you understand what they're dealing with — their competitive context, the gap in their current approach, the opportunity they might be missing. This should feel like you've truly listened.]

## What Success Looks Like
[3-5 bullet points: specific, tangible outcomes that will tell both parties this engagement was worth it. These should be meaningful to the client's actual goals.]

## What We're Proposing

[For each service group or major service, use this format:]

### [Service Name or Group]
**What we'll do:** [1-2 sentences on the work]
**Why this matters for ${opportunity.companyName}:** [1-2 sentences connecting this service to their specific situation]
**What you'll get:** [Key output/deliverable in plain language]

[Repeat for each major service or logical grouping]

## Investment

[Present as a clear breakdown. Group related services if it makes sense. Be direct about ranges.]

| Service Area | Investment Range |
|---|---|
[Table rows for each major service/group]

**Total Estimated Investment: ${pricingTotal ? `${pricingTotal.lowFormatted} – ${pricingTotal.highFormatted}` : 'TBC'}**
[1-2 sentences about what's included / any notes about what's not in scope at this stage]

## How We Work Together
[2-3 sentences on Antenna's working style — collaborative, transparent, integrated. Reference the client's preferred working style based on their archetype.]

## Next Steps
1. [Specific action item for client — e.g., "Review this proposal and share any questions or adjustments"]
2. [Specific action from Antenna — e.g., "Schedule a follow-up call to discuss"]
3. [Path to SOW — e.g., "Once aligned, we'll develop a full Statement of Work for sign-off"]

*We're excited about what we can build together. Let's talk.*

---
**Antenna Group** | www.antennagroup.com

---`
      });
      onUpdate({ proposalDraft: result, proposalStatus: 'draft', draftNotes });
      setEditedProposal(result);
    } catch (e) { setError(e.message); }
    finally { setIsGenerating(false); }
  };

  const iterateProposal = async () => {
    if (!apiKey || !proposalIteration.trim()) return;
    setIsIterating(true);
    try {
      const currentDraft = isEditingProposal ? editedProposal : opportunity.proposalDraft;
      const result = await callClaude(apiKey, {
        maxTokens: 6000,
        system: `You are refining a proposal for Antenna Group, an integrated marketing agency. Apply the requested changes while maintaining the professional, warm, direct Antenna voice.`,
        userMessage: `Update this proposal based on the following feedback:\n\nFEEDBACK: ${proposalIteration}\n\nCURRENT PROPOSAL:\n${currentDraft}\n\nReturn the complete updated proposal.`
      });
      onUpdate({ proposalDraft: result });
      setEditedProposal(result);
      setProposalIteration('');
    } catch (e) { setError(e.message); }
    finally { setIsIterating(false); }
  };

  const statusInfo = PROPOSAL_STATUSES.find(s => s.value === opportunity.proposalStatus) || PROPOSAL_STATUSES[0];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <div className="w-12 h-12 bg-[#12161E] rounded-xl flex items-center justify-center mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Proposal</h2>
          <p className="text-gray-500">Build the service scope, generate a proposal, and track its progress.</p>
        </div>
        {opportunity.proposalDraft && (
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-gray-500 font-medium">Proposal Status</span>
            <select value={opportunity.proposalStatus || 'draft'} onChange={e => onUpdate({ proposalStatus: e.target.value })}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-semibold cursor-pointer focus:outline-none ${statusInfo.border} ${statusInfo.bg} ${statusInfo.text}`}>
              {PROPOSAL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {[{ id: 'services', label: 'Select Services', icon: Layers }, { id: 'proposal', label: 'Proposal Document', icon: FileText }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <tab.icon className="w-4 h-4" />{tab.label}
            {tab.id === 'services' && selectedServices.length > 0 && <span className="w-5 h-5 rounded-full bg-[#12161E] text-white text-[10px] font-bold flex items-center justify-center">{selectedServices.length}</span>}
          </button>
        ))}
      </div>

      {activeTab === 'services' && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: Settings */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-4">Engagement Type</h3>
              <div className="space-y-2">
                {ENGAGEMENT_TYPES.map(et => (
                  <label key={et.value} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${draftEngagementType === et.value ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" name="engagementType" value={et.value} checked={draftEngagementType === et.value} onChange={() => setDraftEngagementType(et.value)} className="text-gray-900" />
                    <div><p className="text-sm font-semibold text-gray-900">{et.label}</p><p className="text-xs text-gray-500">{et.description}</p></div>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-3">Client Archetype</h3>
              <p className="text-xs text-gray-500 mb-3">Tailors proposal voice and emphasis. Up to 2.</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(FIT_ARCHETYPES).map(arch => (
                  <button key={arch.id} onClick={() => toggleArchetype(arch.id)} className={`p-2.5 rounded-xl border-2 text-left transition-all ${selectedArchetypes.includes(arch.id) ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-base mb-1">{arch.emoji}</div>
                    <p className="text-xs font-semibold text-gray-900">{arch.title}</p>
                    <p className="text-[10px] text-gray-500">{arch.short}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-3">Notes for Proposal</h3>
              <textarea value={draftNotes} onChange={e => setDraftNotes(e.target.value)} onBlur={() => onUpdate({ draftNotes })} placeholder="Budget constraints, specific client requests, tone notes..." className="w-full text-sm px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 text-gray-700 min-h-[80px] resize-y" />
            </div>

            {/* Budget Total */}
            {pricingTotal && (
              <div className="bg-[#12161E] rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-[#E8FF00]" /><span className="text-sm font-semibold text-gray-300">Estimated Investment</span></div>
                <p className="text-2xl font-bold">{pricingTotal.lowFormatted} – {pricingTotal.highFormatted}</p>
                <p className="text-xs text-gray-400 mt-1">Based on {selectedServices.length} selected services</p>
              </div>
            )}
          </div>

          {/* Right: Services */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{selectedServices.length} Services Selected</h3>
              <div className="flex gap-2">
                <button onClick={detectServices} disabled={isDetecting || !apiKey || (!opportunity.returnBrief && !opportunity.transcript)} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {isDetecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {isDetecting ? 'Detecting...' : 'Auto-Detect from Brief'}
                </button>
                {selectedServices.length > 0 && <button onClick={() => onUpdate({ selectedServices: [] })} className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">Clear All</button>}
              </div>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}
            <div className="space-y-3">
              {SERVICE_TRIGGERS.map(trigger => (
                <ServiceCard key={trigger.id} trigger={trigger} selectedServices={selectedServices} onToggleService={toggleService} onToggleBundle={toggleBundle} />
              ))}
            </div>

            {selectedServices.length > 0 && (
              <div className="mt-6">
                <AntennaButton onClick={() => { generateProposal(); setActiveTab('proposal'); }} loading={isGenerating} loadingText="Generating Proposal..." icon={Sparkles} disabled={!apiKey} className="w-full" size="large">
                  Generate Proposal
                </AntennaButton>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'proposal' && (
        <div>
          {!opportunity.proposalDraft ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 mx-auto"><Sparkles className="w-10 h-10 text-gray-300" /></div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">No proposal generated yet</h3>
              <p className="text-sm text-gray-400 mb-6">Select services in the Services tab, then generate your proposal.</p>
              <button onClick={() => setActiveTab('services')} className="px-6 py-3 bg-[#12161E] text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors">← Select Services</button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {/* Proposal Document */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">Proposal Document</span>
                      <StatusBadge status={opportunity.proposalStatus || 'draft'} />
                    </div>
                    <div className="flex items-center gap-2">
                      <CopyButton text={isEditingProposal ? editedProposal : opportunity.proposalDraft} />
                      <button onClick={() => { setIsEditingProposal(!isEditingProposal); setEditedProposal(opportunity.proposalDraft); }} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5"><Edit3 className="w-3 h-3" />{isEditingProposal ? 'Cancel' : 'Edit'}</button>
                      <button onClick={() => downloadDocx(opportunity.proposalDraft, `${opportunity.companyName}_Proposal.docx`, { title: `Proposal: ${opportunity.companyName}`, client: opportunity.companyName })} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5"><Download className="w-3 h-3" />Download</button>
                    </div>
                  </div>
                  {isEditingProposal ? (
                    <div className="p-5">
                      <textarea value={editedProposal} onChange={e => setEditedProposal(e.target.value)} className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 min-h-[500px] resize-y font-mono focus:ring-2 focus:ring-gray-900 outline-none" />
                      <button onClick={() => { onUpdate({ proposalDraft: editedProposal }); setIsEditingProposal(false); }} className="mt-3 px-4 py-2 bg-[#12161E] text-white rounded-lg text-sm font-medium">Save Changes</button>
                    </div>
                  ) : (
                    <div className="p-5 max-h-[700px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{opportunity.proposalDraft}</pre>
                    </div>
                  )}
                </div>
              </div>

              {/* Right sidebar */}
              <div className="space-y-4">
                {/* Iterate */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><RefreshCw className="w-4 h-4" />Iterate</h3>
                  <textarea value={proposalIteration} onChange={e => setProposalIteration(e.target.value)} placeholder="Describe what to change... 'Make the investment section clearer', 'Add more about our SEO capabilities', 'Tone down the sales language'..." className="w-full text-sm px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 text-gray-700 min-h-[100px] resize-y" />
                  <button onClick={iterateProposal} disabled={isIterating || !proposalIteration.trim() || !apiKey} className="mt-3 w-full px-4 py-2.5 bg-[#12161E] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                    {isIterating ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : <><RefreshCw className="w-4 h-4" />Update Proposal</>}
                  </button>
                </div>

                {/* Regenerate */}
                <button onClick={() => { generateProposal(); }} disabled={isGenerating} className="w-full px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:border-gray-900 hover:text-gray-900 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" />Generating...</> : <><Sparkles className="w-4 h-4" />Regenerate</>}
                </button>

                {/* Status */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Clock className="w-4 h-4" />Proposal Status</h3>
                  <div className="space-y-2">
                    {PROPOSAL_STATUSES.map(s => (
                      <button key={s.value} onClick={() => onUpdate({ proposalStatus: s.value })} className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-sm font-medium ${opportunity.proposalStatus === s.value ? `${s.bg} ${s.text} ${s.border} border-2` : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Budget Summary */}
                {pricingTotal && (
                  <div className="bg-[#12161E] rounded-2xl p-5 text-white">
                    <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-[#E8FF00]" /><span className="text-sm text-gray-300">Estimated Investment</span></div>
                    <p className="text-xl font-bold">{pricingTotal.lowFormatted} – {pricingTotal.highFormatted}</p>
                  </div>
                )}

                {/* Proceed to SOW */}
                {opportunity.proposalStatus === 'approved' && (
                  <AntennaButton onClick={() => onUpdate({ currentStage: 'sow' })} icon={ArrowRight} className="w-full">
                    Generate SOW →
                  </AntennaButton>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ============================================================================
// STAGE 4: SOW GENERATION VIEW
// ============================================================================
function SOWGenerateView({ opportunity, onUpdate, apiKey }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isIterating, setIsIterating] = useState(false);
  const [error, setError] = useState(null);
  const [sowNotes, setSOWNotes] = useState(opportunity.sowNotes || '');
  const [iterationFeedback, setIterationFeedback] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedSOW, setEditedSOW] = useState(opportunity.sowDraft || '');

  const engagementLabel = ENGAGEMENT_TYPES.find(t => t.value === opportunity.draftEngagementType)?.label || 'Fixed Fee';

  const generateSOW = async () => {
    if (!apiKey) return setError('Please enter your API key.');
    setIsGenerating(true); setError(null);
    try {
      const servicesText = (opportunity.selectedServices || []).join(', ') || 'Services as outlined in proposal';
      const result = await callClaude(apiKey, {
        maxTokens: 12000,
        system: `You are a senior contracts and operations specialist at Antenna Group, an integrated marketing and communications agency. You write Statements of Work that are protective, clear, and professional. You apply the SOW best practices to produce documents that prevent scope creep, establish clear client obligations, and protect both parties.

${SOW_BEST_PRACTICES}`,
        userMessage: `Generate a complete, professional Statement of Work based on the approved proposal and brief below.

CLIENT: ${opportunity.companyName}
ENGAGEMENT TYPE: ${engagementLabel}
SELECTED SERVICES: ${servicesText}
PRICING NOTES: ${opportunity.draftNotes || 'None'}

RETURN BRIEF:
${(opportunity.returnBrief || '').substring(0, 2000)}

PROPOSAL SUMMARY:
${(opportunity.proposalDraft || '').substring(0, 3000)}

ADDITIONAL SOW NOTES: ${sowNotes || 'None'}

Generate a complete SOW that:
1. Applies all SOW best practices (exclusions, client obligations, revision limits, change order process, assumptions with consequences)
2. Uses decimal numbering (1., 1.1, 1.2, etc.)
3. Is specific to the ${engagementLabel} engagement type
4. Includes all required sections: Overview, Objectives, Scope, Out of Scope, Deliverables, Acceptance Criteria, Timeline, Roles & Responsibilities, Assumptions, Change Management, Fees & Payment Terms, Termination
5. Uses controlled language ("up to X revisions", specific timeframes, active voice with clear responsibility)
6. Includes a strong client obligations section with specific timeframes and consequences
7. Is ready to be reviewed by both parties

Use markdown formatting. This is a professional legal/business document — formal but not overly complex.`
      });
      onUpdate({ sowDraft: result, sowNotes, sowStatus: 'draft' });
      setEditedSOW(result);
    } catch (e) { setError(e.message); }
    finally { setIsGenerating(false); }
  };

  const iterateSOW = async () => {
    if (!apiKey || !iterationFeedback.trim()) return;
    setIsIterating(true);
    try {
      const current = isEditing ? editedSOW : opportunity.sowDraft;
      const result = await callClaude(apiKey, {
        maxTokens: 12000,
        system: `You are updating a Statement of Work for Antenna Group. Apply the requested changes while maintaining all SOW quality standards.`,
        userMessage: `Update this SOW based on the following feedback:\n\nFEEDBACK: ${iterationFeedback}\n\nCURRENT SOW:\n${current}\n\nReturn the complete updated SOW.`
      });
      onUpdate({ sowDraft: result });
      setEditedSOW(result);
      setIterationFeedback('');
    } catch (e) { setError(e.message); }
    finally { setIsIterating(false); }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="w-12 h-12 bg-[#12161E] rounded-xl flex items-center justify-center mb-4">
          <PenTool className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Statement of Work</h2>
        <p className="text-gray-500">Generate a complete, protective SOW from the approved proposal and return brief.</p>
      </div>

      {opportunity.proposalStatus !== 'approved' && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Proposal not yet approved</p>
            <p className="text-xs text-amber-700 mt-1">The proposal status is currently <strong>{PROPOSAL_STATUSES.find(s => s.value === opportunity.proposalStatus)?.label || 'Draft'}</strong>. You can still generate an SOW, but typically you'd wait for approval. <button onClick={() => onUpdate({ currentStage: 'proposal' })} className="underline">→ Go to Proposal</button></p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Controls */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-bold text-gray-900 mb-3">SOW Parameters</h3>
            <div className="space-y-3">
              <div><p className="text-xs text-gray-500 mb-1">Client</p><p className="text-sm font-semibold text-gray-900">{opportunity.companyName}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Engagement Type</p><p className="text-sm font-semibold text-gray-900">{engagementLabel}</p></div>
              <div><p className="text-xs text-gray-500 mb-1">Services</p><p className="text-sm text-gray-700">{(opportunity.selectedServices || []).length} services selected</p></div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-900 mb-1.5">Additional SOW Notes</label>
              <textarea value={sowNotes} onChange={e => setSOWNotes(e.target.value)} placeholder="Payment schedule preferences, specific legal requirements, special terms..." className="w-full text-sm px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 text-gray-700 min-h-[80px] resize-y" />
            </div>
          </div>

          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{error}</div>}

          <AntennaButton onClick={generateSOW} loading={isGenerating} loadingText="Generating SOW..." icon={PenTool} disabled={!apiKey} className="w-full">
            {opportunity.sowDraft ? 'Regenerate SOW' : 'Generate SOW'}
          </AntennaButton>

          {/* Iterate */}
          {opportunity.sowDraft && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><RefreshCw className="w-4 h-4" />Iterate</h3>
              <textarea value={iterationFeedback} onChange={e => setIterationFeedback(e.target.value)} placeholder="'Add stronger revision limits', 'Update payment to net 45', 'Add a stop work clause'..." className="w-full text-sm px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 text-gray-700 min-h-[80px] resize-y" />
              <button onClick={iterateSOW} disabled={isIterating || !iterationFeedback.trim() || !apiKey} className="mt-3 w-full px-4 py-2.5 bg-[#12161E] text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {isIterating ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : <><RefreshCw className="w-4 h-4" />Update SOW</>}
              </button>
            </div>
          )}
        </div>

        {/* Right: SOW Document */}
        <div className="lg:col-span-2">
          {!opportunity.sowDraft ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-8 bg-white rounded-2xl border border-gray-200">
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6"><PenTool className="w-10 h-10 text-gray-300" /></div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">SOW will appear here</h3>
              <p className="text-sm text-gray-400">Generate your Statement of Work from the approved proposal.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-gray-900">Statement of Work</span>
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Generated</span>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={isEditing ? editedSOW : opportunity.sowDraft} />
                  <button onClick={() => { setIsEditing(!isEditing); setEditedSOW(opportunity.sowDraft); }} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5"><Edit3 className="w-3 h-3" />{isEditing ? 'Cancel' : 'Edit'}</button>
                  <button onClick={() => downloadDocx(opportunity.sowDraft, `${opportunity.companyName}_SOW.docx`, { title: `Statement of Work: ${opportunity.companyName}`, client: opportunity.companyName })} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1.5"><Download className="w-3 h-3" />Download</button>
                </div>
              </div>
              {isEditing ? (
                <div className="p-5">
                  <textarea value={editedSOW} onChange={e => setEditedSOW(e.target.value)} className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-3 min-h-[600px] resize-y font-mono focus:ring-2 focus:ring-gray-900 outline-none" />
                  <button onClick={() => { onUpdate({ sowDraft: editedSOW }); setIsEditing(false); }} className="mt-3 px-4 py-2 bg-[#12161E] text-white rounded-lg text-sm font-medium">Save Changes</button>
                </div>
              ) : (
                <div className="p-5 max-h-[700px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{opportunity.sowDraft}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAGE 5: SOW REVIEW VIEW (standalone, no opportunity required)
// ============================================================================
function SOWReviewView({ apiKey, onUpdateApiKey }) {
  const [file, setFile] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [engagementType, setEngagementType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [rawResponse, setRawResponse] = useState('');
  const [error, setError] = useState(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftedSOW, setDraftedSOW] = useState(null);
  const [selectedRecs, setSelectedRecs] = useState({ critical: [], recommended: [], redFlags: [] });
  const fileInputRef = useRef(null);

  const handleFileUpload = async (uploadedFile) => {
    setFile(uploadedFile);
    setAnalysis(null);
    setDraftedSOW(null);
    setError(null);
    const ext = uploadedFile.name.split('.').pop().toLowerCase();
    if (ext === 'txt') {
      const text = await uploadedFile.text();
      setFileContent({ type: 'text', data: text });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result.split(',')[1];
        setFileContent({ type: ext === 'pdf' ? 'pdf' : 'docx', data: base64 });
      };
      reader.readAsDataURL(uploadedFile);
    }
  };

  const analyzeSOW = async () => {
    if (!apiKey || !fileContent) return;
    setIsAnalyzing(true); setError(null); setAnalysis(null);
    try {
      const engLabel = ENGAGEMENT_TYPES.find(t => t.value === engagementType)?.label || 'Not specified';
      const promptText = `You are a senior agency contracts specialist reviewing a Statement of Work against Antenna Group quality standards.

ENGAGEMENT TYPE: ${engLabel}

${SOW_BEST_PRACTICES}

Review this SOW and provide:

## CRITICAL ISSUES
[Issues that MUST be fixed before this SOW can be issued. Each as: Section X.X: [Current language/situation] → [Recommended fix] — Why: [brief reason]]

## RECOMMENDED IMPROVEMENTS
[Issues that should be fixed. Same format as above.]

## RED FLAGS
[Problematic phrases found: "[exact phrase]" in Section X.X → "[recommended replacement using 'up to' language"]

## STRUCTURAL COMPLIANCE
[✓ Present or ✗ Missing for each required element]

## PRICING VALIDATION
[Compare fees against standard agency rates. Flag underpriced or overpriced items.]

## BUDGET VERIFICATION
[Check arithmetic and billing schedule alignment]

## OVERALL ASSESSMENT
Compliance Score: [X/10]
Top 3 Priorities: [list]
What's working well: [brief notes]`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: MODEL, max_tokens: 8000,
          messages: [{
            role: 'user',
            content: fileContent.type === 'text'
              ? `${promptText}\n\n=== SOW ===\n${fileContent.data}`
              : [{ type: 'document', source: { type: 'base64', media_type: fileContent.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', data: fileContent.data } }, { type: 'text', text: promptText }]
          }]
        })
      });

      if (!response.ok) { const e = await response.json(); throw new Error(e.error?.message || 'API error'); }
      const data = await response.json();
      const text = data.content[0].text;
      setRawResponse(text);

      const parseSection = (t, start, ends) => {
        const s = Array.isArray(start) ? start : [start];
        let startIdx = -1, len = 0;
        for (const m of s) { const i = t.indexOf(m); if (i !== -1 && (startIdx === -1 || i < startIdx)) { startIdx = i; len = m.length; } }
        if (startIdx === -1) return [];
        let endIdx = t.length;
        for (const m of ends) { const i = t.indexOf(m, startIdx + len); if (i !== -1 && i < endIdx) endIdx = i; }
        const section = t.slice(startIdx + len, endIdx).trim();
        return section.split(/\n\n+/).map(s => s.trim()).filter(s => s.length > 40);
      };

      setAnalysis({
        critical: parseSection(text, ['## CRITICAL ISSUES', '1. CRITICAL ISSUES'], ['## RECOMMENDED', '## RED FLAGS', '2. RECOMMENDED']),
        recommended: parseSection(text, ['## RECOMMENDED IMPROVEMENTS', '2. RECOMMENDED'], ['## RED FLAGS', '3. RED FLAGS', '## STRUCTURAL']),
        redFlags: parseSection(text, ['## RED FLAGS', '3. RED FLAGS'], ['## STRUCTURAL', '## PRICING', '4. STRUCTURAL']),
        compliance: parseSection(text, ['## STRUCTURAL COMPLIANCE', '4. STRUCTURAL'], ['## PRICING', '## BUDGET', '5. PRICING']).join('\n\n'),
        pricing: parseSection(text, ['## PRICING VALIDATION', '5. PRICING'], ['## BUDGET', '## OVERALL', '6. BUDGET']).join('\n\n'),
        budget: parseSection(text, ['## BUDGET VERIFICATION', '6. BUDGET'], ['## OVERALL', '7. OVERALL']).join('\n\n'),
        overall: parseSection(text, ['## OVERALL ASSESSMENT', '7. OVERALL'], []).join('\n\n'),
      });
      setSelectedRecs({
        critical: parseSection(text, ['## CRITICAL ISSUES', '1. CRITICAL ISSUES'], ['## RECOMMENDED', '## RED FLAGS', '2. RECOMMENDED']).map((_, i) => i),
        recommended: parseSection(text, ['## RECOMMENDED IMPROVEMENTS', '2. RECOMMENDED'], ['## RED FLAGS', '3. RED FLAGS', '## STRUCTURAL']).map((_, i) => i),
        redFlags: parseSection(text, ['## RED FLAGS', '3. RED FLAGS'], ['## STRUCTURAL', '## PRICING', '4. STRUCTURAL']).map((_, i) => i),
      });
    } catch (e) { setError(e.message); }
    finally { setIsAnalyzing(false); }
  };

  const generateRevised = async () => {
    if (!apiKey || !analysis) return;
    setIsDrafting(true);
    try {
      const selectedCritical = (analysis.critical || []).filter((_, i) => selectedRecs.critical.includes(i));
      const selectedRecommended = (analysis.recommended || []).filter((_, i) => selectedRecs.recommended.includes(i));
      const selectedRedFlags = (analysis.redFlags || []).filter((_, i) => selectedRecs.redFlags.includes(i));
      const draftPrompt = `Based on ONLY the selected changes below, create a COMPLETE REVISED VERSION of this SOW. Mark modified sections [REVISED] and new sections [NEW].\n\nCritical fixes:\n${selectedCritical.join('\n\n') || 'None'}\n\nRecommended improvements:\n${selectedRecommended.join('\n\n') || 'None'}\n\nRed flags to replace:\n${selectedRedFlags.join('\n') || 'None'}`;
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({
          model: MODEL, max_tokens: 16000,
          messages: [{ role: 'user', content: fileContent.type === 'text' ? `${draftPrompt}\n\n=== ORIGINAL SOW ===\n${fileContent.data}` : [{ type: 'document', source: { type: 'base64', media_type: fileContent.type === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', data: fileContent.data } }, { type: 'text', text: draftPrompt }] }]
        })
      });
      const data = await response.json();
      setDraftedSOW(data.content[0].text);
    } catch (e) { setError(e.message); }
    finally { setIsDrafting(false); }
  };

  const toggleRec = (type, idx) => {
    setSelectedRecs(prev => {
      const current = prev[type] || [];
      return { ...prev, [type]: current.includes(idx) ? current.filter(i => i !== idx) : [...current, idx] };
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="w-12 h-12 bg-[#12161E] rounded-xl flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">SOW Review</h2>
        <p className="text-gray-500">Upload any existing SOW for a quality assessment against Antenna Group best practices.</p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs text-amber-700 font-medium">Senior reviewer tool — for experienced team members</span>
        </div>
      </div>

      {/* Upload */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="space-y-5">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-900 transition-colors cursor-pointer group"
          >
            <Upload className="w-10 h-10 text-gray-300 group-hover:text-gray-500 mx-auto mb-4 transition-colors" />
            {file ? <p className="font-semibold text-gray-900 text-sm">{file.name}</p> : <><p className="font-semibold text-gray-900 text-sm mb-1">Upload SOW</p><p className="text-xs text-gray-500">PDF, DOCX, or TXT</p></>}
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); }} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Engagement Type</label>
            <select value={engagementType} onChange={e => setEngagementType(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900">
              <option value="">Not specified</option>
              {ENGAGEMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {error && <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <AntennaButton onClick={analyzeSOW} loading={isAnalyzing} loadingText="Analyzing..." icon={Search} disabled={!apiKey || !file || !fileContent} className="w-full">
            Review SOW
          </AntennaButton>
        </div>

        {/* Analysis */}
        <div className="lg:col-span-2">
          {!analysis ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-white rounded-2xl border border-gray-200">
              <ShieldCheck className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Upload and review a SOW</h3>
              <p className="text-sm text-gray-400">Quality assessment will appear here after analysis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {analysis.critical?.length > 0 && (
                <CollapsibleSection title="Critical Issues" variant="critical" icon={AlertCircle} count={analysis.critical.length} defaultOpen>
                  <div className="space-y-3">
                    {analysis.critical.map((issue, i) => (
                      <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${selectedRecs.critical.includes(i) ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                        <input type="checkbox" checked={selectedRecs.critical.includes(i)} onChange={() => toggleRec('critical', i)} className="mt-0.5 w-4 h-4 text-red-600" />
                        <p className="text-sm text-gray-800 leading-relaxed">{issue}</p>
                      </label>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
              {analysis.recommended?.length > 0 && (
                <CollapsibleSection title="Recommended Improvements" variant="recommended" icon={AlertTriangle} count={analysis.recommended.length} defaultOpen>
                  <div className="space-y-3">
                    {analysis.recommended.map((issue, i) => (
                      <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${selectedRecs.recommended.includes(i) ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                        <input type="checkbox" checked={selectedRecs.recommended.includes(i)} onChange={() => toggleRec('recommended', i)} className="mt-0.5 w-4 h-4 text-amber-600" />
                        <p className="text-sm text-gray-800 leading-relaxed">{issue}</p>
                      </label>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
              {analysis.redFlags?.length > 0 && (
                <CollapsibleSection title="Red Flag Language" icon={AlertTriangle} count={analysis.redFlags.length}>
                  <div className="space-y-2">
                    {analysis.redFlags.map((flag, i) => (
                      <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${selectedRecs.redFlags.includes(i) ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-100 opacity-60'}`}>
                        <input type="checkbox" checked={selectedRecs.redFlags.includes(i)} onChange={() => toggleRec('redFlags', i)} className="mt-0.5 w-4 h-4" />
                        <p className="text-sm text-gray-700 font-mono">{flag}</p>
                      </label>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
              {analysis.compliance && <CollapsibleSection title="Structural Compliance"><pre className="whitespace-pre-wrap text-sm text-gray-700">{analysis.compliance}</pre></CollapsibleSection>}
              {analysis.pricing && <CollapsibleSection title="Pricing Validation"><pre className="whitespace-pre-wrap text-sm text-gray-700">{analysis.pricing}</pre></CollapsibleSection>}
              {analysis.overall && <CollapsibleSection title="Overall Assessment" defaultOpen><pre className="whitespace-pre-wrap text-sm text-gray-900">{analysis.overall}</pre></CollapsibleSection>}

              {/* Generate Revised */}
              <div className="mt-6 bg-[#12161E] rounded-2xl p-6">
                <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5 text-[#E8FF00]" />Generate Revised SOW</h3>
                <p className="text-gray-400 text-sm mb-4">Create an updated draft incorporating your selected recommendations.</p>
                {!draftedSOW ? (
                  <AntennaButton onClick={generateRevised} loading={isDrafting} loadingText="Generating..." icon={Sparkles} disabled={selectedRecs.critical.length === 0 && selectedRecs.recommended.length === 0 && selectedRecs.redFlags.length === 0} variant="secondary" className="bg-white hover:bg-gray-100">
                    Draft Revised SOW
                  </AntennaButton>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <span className="px-3 py-1.5 bg-green-900/30 border border-green-500/40 rounded-full text-green-300 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" />Draft Generated</span>
                      <button onClick={() => downloadDocx(draftedSOW, `${file?.name?.replace(/\.[^.]+$/, '') || 'SOW'}_REVISED.docx`, { title: 'Revised Statement of Work' })} className="flex items-center gap-2 px-4 py-1.5 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"><Download className="w-4 h-4" />Download</button>
                    </div>
                    <div className="bg-gray-900 rounded-xl p-4 max-h-96 overflow-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-100 font-mono">{draftedSOW}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// HOME / DASHBOARD VIEW
// ============================================================================
function HomeView({ opportunities, onSelectOpportunity, onCreateOpportunity, onDeleteOpportunity, onOpenReview, apiKey, setApiKey, currentUser, roleInfo }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [showApiKey, setShowApiKey] = useState(!apiKey);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const opp = createOpportunity(newName.trim(), newUrl.trim(), newIndustry.trim());
    onCreateOpportunity(opp);
    setShowCreate(false);
    setNewName(''); setNewUrl(''); setNewIndustry('');
  };

  const getStageLabel = (opp) => {
    const stage = PIPELINE_STAGES.find(s => s.id === opp.currentStage);
    return stage?.label || 'Research';
  };

  const getProgress = (opp) => {
    const stages = ['research', 'brief', 'proposal', 'sow'];
    const idx = stages.indexOf(opp.currentStage);
    if (opp.currentStage === 'sow' && opp.sowDraft) return 100;
    return Math.round(((idx + (opp[opp.currentStage + 'Complete'] ? 1 : 0.5)) / stages.length) * 100);
  };

  const groupedByStatus = {
    active: opportunities.filter(o => !['evaporated'].includes(o.proposalStatus)),
    evaporated: opportunities.filter(o => o.proposalStatus === 'evaporated'),
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
          SOW Workbench
          <span className="block text-2xl font-normal text-gray-500 mt-3">v{APP_VERSION}</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
          From first discovery to signed contract — a complete opportunity pipeline for Antenna Group's business development team.
        </p>
      </div>

      {/* Pipeline Overview */}
      <div className="grid grid-cols-4 gap-4 mb-16">
        {PIPELINE_STAGES.map((stage, idx) => (
          <div key={stage.id} className="relative">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <div className="w-10 h-10 bg-[#12161E] rounded-xl flex items-center justify-center mx-auto mb-3">
                <stage.Icon className="w-5 h-5 text-white" />
              </div>
              <div className="w-6 h-6 rounded-full bg-[#E8FF00] flex items-center justify-center mx-auto mb-2">
                <span className="text-xs font-bold text-[#12161E]">{idx + 1}</span>
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{stage.label}</h3>
              <p className="text-xs text-gray-500">{stage.description}</p>
            </div>
            {idx < PIPELINE_STAGES.length - 1 && (
              <div className="hidden md:flex absolute top-1/2 -right-2 -translate-y-1/2 z-10">
                <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center">
                  <ArrowRight className="w-2.5 h-2.5 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* API Key */}
      {(showApiKey || !apiKey) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Key className="w-4 h-4" />API Key</h3>
            {apiKey && <button onClick={() => setShowApiKey(false)} className="text-xs text-gray-500 hover:text-gray-900"><X className="w-4 h-4" /></button>}
          </div>
          <ApiKeyInput apiKey={apiKey} setApiKey={setApiKey} />
        </div>
      )}
      {apiKey && !showApiKey && (
        <div className="flex justify-end mb-6">
          <button onClick={() => setShowApiKey(true)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"><Key className="w-4 h-4" />Update API Key</button>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        {roleInfo?.canCreateOpportunities !== false && (
          <AntennaButton onClick={() => setShowCreate(true)} icon={Plus} size="large">
            New Opportunity
          </AntennaButton>
        )}
        {onOpenReview && (
          <button onClick={onOpenReview} className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-gray-900 hover:text-gray-900 transition-all">
            <ShieldCheck className="w-5 h-5" />
            Review Existing SOW
            <span className="text-xs text-gray-400 font-normal">Senior reviewer</span>
          </button>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">New Opportunity</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-gray-900"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Company Name *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder="e.g. Pacific Fusion" autoFocus className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900 placeholder:text-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Website (optional)</label>
                <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://example.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900 placeholder:text-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1.5">Industry (optional)</label>
                <input value={newIndustry} onChange={e => setNewIndustry(e.target.value)} placeholder="e.g. Climate Tech" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 outline-none text-gray-900 placeholder:text-gray-400" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">Cancel</button>
              <AntennaButton onClick={handleCreate} disabled={!newName.trim()} icon={Plus} className="flex-1">Create</AntennaButton>
            </div>
          </div>
        </div>
      )}

      {/* Opportunities List */}
      {opportunities.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No opportunities yet</h3>
          <p className="text-sm text-gray-400">Create your first opportunity to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 text-lg">Active Opportunities ({groupedByStatus.active.length})</h3>
          {groupedByStatus.active.map(opp => {
            const progress = getProgress(opp);
            const statusInfo = PROPOSAL_STATUSES.find(s => s.value === opp.proposalStatus);
            return (
              <button key={opp.id} onClick={() => onSelectOpportunity(opp)} className="w-full bg-white rounded-2xl border border-gray-200 hover:border-gray-900 transition-all p-5 text-left group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 group-hover:bg-[#12161E] rounded-xl flex items-center justify-center transition-colors flex-shrink-0">
                      <Building2 className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{opp.companyName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-sm text-gray-500">{opp.industry || 'No industry specified'}</span>
                        {opp.companyUrl && <span className="text-xs text-gray-400">{opp.companyUrl}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500 mb-1">{getStageLabel(opp)}</p>
                      <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#12161E] rounded-full transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    {opp.proposalDraft && statusInfo && (
                      <span className={`hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}>{statusInfo.label}</span>
                    )}
                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors flex-shrink-0" />
                  </div>
                </div>
              </button>
            );
          })}

          {groupedByStatus.evaporated.length > 0 && (
            <CollapsibleSection title={`Evaporated (${groupedByStatus.evaporated.length})`} icon={Archive}>
              <div className="space-y-2">
                {groupedByStatus.evaporated.map(opp => (
                  <button key={opp.id} onClick={() => onSelectOpportunity(opp)} className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <span className="text-sm text-gray-600 font-medium">{opp.companyName}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function App() {
  // ---- AUTH ----
  const [currentUser, setCurrentUser] = useState(() => getStoredSession());
  const [showAdmin, setShowAdmin] = useState(false);

  const handleLogin = (user) => {
    saveStoredSession(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    saveStoredSession(null);
    setCurrentUser(null);
    setCurrentView('home');
    setCurrentOpportunity(null);
  };

  // ---- PIPELINE ----
  const [currentView, setCurrentView] = useState('home'); // home | opportunity | sow-review
  const [currentStage, setCurrentStage] = useState('research');
  const [currentOpportunity, setCurrentOpportunity] = useState(null);

  // Per-user API key
  const [apiKey, setApiKey] = useState(() => currentUser ? getStoredApiKeyForUser(currentUser.id) : '');

  // Per-user opportunities
  const [opportunities, setOpportunities] = useState(() => currentUser ? getStoredOpportunitiesForUser(currentUser.id) : []);

  // Reload data when user changes
  useEffect(() => {
    if (currentUser) {
      setApiKey(getStoredApiKeyForUser(currentUser.id));
      setOpportunities(getStoredOpportunitiesForUser(currentUser.id));
      // Reset nav
      setCurrentView('home');
      setCurrentOpportunity(null);
      setCurrentStage('research');
    }
  }, [currentUser?.id]);

  // Save API key per user
  useEffect(() => {
    if (currentUser && apiKey) saveStoredApiKeyForUser(currentUser.id, apiKey);
  }, [apiKey, currentUser?.id]);

  // Save opportunities per user
  useEffect(() => {
    if (currentUser) saveStoredOpportunitiesForUser(currentUser.id, opportunities);
  }, [opportunities, currentUser?.id]);

  const updateOpportunity = useCallback((updates) => {
    setCurrentOpportunity(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      if (updates.currentStage) setCurrentStage(updates.currentStage);
      setOpportunities(prevOpps => prevOpps.map(o => o.id === updated.id ? updated : o));
      return updated;
    });
  }, []);

  const selectOpportunity = (opp) => {
    setCurrentOpportunity(opp);
    setCurrentStage(opp.currentStage || 'research');
    setCurrentView('opportunity');
  };

  const createOpportunityAndSelect = (opp) => {
    setOpportunities(prev => [opp, ...prev]);
    setCurrentOpportunity(opp);
    setCurrentStage('research');
    setCurrentView('opportunity');
  };

  const deleteOpportunity = (id) => {
    setOpportunities(prev => prev.filter(o => o.id !== id));
    if (currentOpportunity?.id === id) { setCurrentOpportunity(null); setCurrentView('home'); }
  };

  // ---- ROLE ACCESS GUARDS ----
  const roleInfo = currentUser ? (USER_ROLES[currentUser.role] || USER_ROLES.growth) : null;

  const canAccessStage = (stageId) => roleInfo?.allowedStages.includes(stageId) ?? false;

  const renderStageView = () => {
    if (!currentOpportunity || !roleInfo) return null;
    if (!canAccessStage(currentStage)) {
      return (
        <div className="max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-500 mb-6">Your <span className="font-semibold">{roleInfo.label}</span> role doesn't include access to this stage.</p>
          <button onClick={() => { const first = roleInfo.allowedStages[0]; if (first) { setCurrentStage(first); updateOpportunity({ currentStage: first }); } else setCurrentView('home'); }} className="px-6 py-3 bg-[#12161E] text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors">
            {roleInfo.allowedStages.length > 0 ? `Go to ${PIPELINE_STAGES.find(s => s.id === roleInfo.allowedStages[0])?.label}` : 'Back to Home'}
          </button>
        </div>
      );
    }
    const props = { opportunity: currentOpportunity, onUpdate: updateOpportunity, apiKey };
    switch (currentStage) {
      case 'research': return <ResearchView {...props} />;
      case 'brief': return <BriefView {...props} />;
      case 'proposal': return <ProposalView {...props} />;
      case 'sow': return <SOWGenerateView {...props} />;
      default: return <ResearchView {...props} />;
    }
  };

  // ---- NOT LOGGED IN ----
  if (!currentUser) return <LoginView onLogin={handleLogin} />;

  // ---- REVIEWER ONLY LAYOUT ----
  if (currentUser.role === 'reviewer') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#E8E6E1' }}>
        <header className="border-b border-gray-200 sticky top-0 z-20" style={{ backgroundColor: '#E8E6E1' }}>
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <AntennaLogo className="h-8" />
            <UserMenu currentUser={currentUser} onLogout={handleLogout} onOpenAdmin={() => {}} />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 py-10">
          <div className="mb-6 flex items-center gap-3">
            <div className="px-3 py-1.5 bg-amber-100 border border-amber-200 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Reviewer Access — SOW Review Only</span>
            </div>
          </div>
          <SOWReviewView apiKey={apiKey} onUpdateApiKey={(k) => setApiKey(k)} />
        </main>
        <AppFooter />
      </div>
    );
  }

  // ---- MAIN LAYOUT ----
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#E8E6E1' }}>
      {showAdmin && <AdminView currentUser={currentUser} onClose={() => setShowAdmin(false)} />}

      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-20" style={{ backgroundColor: '#E8E6E1' }}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentView('home')} className="hover:opacity-80 transition-opacity">
              <AntennaLogo className="h-8" />
            </button>
            <div className="flex items-center gap-3">
              {currentView === 'opportunity' && currentOpportunity && (
                <button onClick={() => { setCurrentOpportunity(null); setCurrentView('home'); }} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  <ChevronLeft className="w-4 h-4" />All Opportunities
                </button>
              )}
              {currentView === 'sow-review' && (
                <button onClick={() => setCurrentView('home')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
                  <ChevronLeft className="w-4 h-4" />Back
                </button>
              )}
              <a href="https://www.antennagroup.com" target="_blank" rel="noopener noreferrer" className="hidden sm:block text-sm text-gray-500 hover:text-gray-900 transition-colors">antennagroup.com ↗</a>
              <UserMenu currentUser={currentUser} onLogout={handleLogout} onOpenAdmin={() => setShowAdmin(true)} />
            </div>
          </div>
        </div>

        {/* Stage Progress Bar */}
        {currentView === 'opportunity' && currentOpportunity && (
          <StageProgress
            currentStage={currentStage}
            opportunity={currentOpportunity}
            allowedStages={roleInfo?.allowedStages || []}
            onStageClick={(stageId) => {
              if (!canAccessStage(stageId)) return;
              setCurrentStage(stageId);
              updateOpportunity({ currentStage: stageId });
            }}
          />
        )}
      </header>

      {/* Main Content */}
      <main>
        {currentView === 'home' && (
          <HomeView
            opportunities={opportunities}
            onSelectOpportunity={selectOpportunity}
            onCreateOpportunity={createOpportunityAndSelect}
            onDeleteOpportunity={deleteOpportunity}
            onOpenReview={roleInfo?.canAccessSOWReview ? () => setCurrentView('sow-review') : null}
            apiKey={apiKey}
            setApiKey={setApiKey}
            currentUser={currentUser}
            roleInfo={roleInfo}
          />
        )}
        {currentView === 'opportunity' && renderStageView()}
        {currentView === 'sow-review' && (
          roleInfo?.canAccessSOWReview
            ? <SOWReviewView apiKey={apiKey} onUpdateApiKey={(k) => setApiKey(k)} />
            : <div className="max-w-xl mx-auto py-20 text-center"><Lock className="w-10 h-10 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Your role doesn't include SOW Review access.</p></div>
        )}
      </main>

      <AppFooter />
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="bg-gray-900 text-white mt-20">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h3 className="text-2xl font-semibold mb-8">For conscious brands with the courage to lead</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-semibold mb-4 text-gray-400">Our Offices</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              {['San Francisco, CA', 'New York, NY', 'Hackensack, NJ', 'Washington, D.C.', 'London, UK', 'Prague, CZ'].map(o => <li key={o}>{o}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-400">Social</h4>
            <ul className="space-y-2 text-sm">
              {[['LinkedIn', 'https://www.linkedin.com/company/antenna-group'], ['Instagram', 'https://www.instagram.com/antennagroup/'], ['Facebook', 'https://www.facebook.com/AntennaGroup'], ['X', 'https://x.com/antenna_group']].map(([n, u]) => <li key={n}><a href={u} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">{n}</a></li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-400">Learn</h4>
            <ul className="space-y-2 text-sm">
              {[["Let's Chat", 'https://www.antennagroup.com/lets-chat'], ['Work', 'https://www.antennagroup.com/work'], ['Podcast', 'https://www.antennagroup.com/age-of-adoption-podcast'], ['Conscious Compass', 'https://fullyconscious.com']].map(([n, u]) => <li key={n}><a href={u} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">{n}</a></li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-gray-400">Legal</h4>
            <ul className="space-y-2 text-sm">
              {[['Terms of Use', 'https://www.antennagroup.com/terms'], ['Privacy Policy', 'https://www.antennagroup.com/privacy-policy']].map(([n, u]) => <li key={n}><a href={u} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white">{n}</a></li>)}
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-gray-800 flex items-center justify-between text-sm text-gray-400 flex-wrap gap-4">
          <span>© {new Date().getFullYear()} Antenna Group — All Rights Reserved</span>
          <span className="text-xs">SOW Workbench v{APP_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
