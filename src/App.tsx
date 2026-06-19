import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Search, 
  Layers, 
  Compass, 
  Lightbulb, 
  FileText, 
  Sparkles, 
  Bot, 
  HelpCircle, 
  Copy, 
  Check, 
  TrendingUp, 
  Eye, 
  Volume2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Monitor,
  Video,
  Download,
  AlertCircle,
  Image as ImageIcon,
  Play,
  RotateCw,
  Info,
  Bookmark,
  CheckCircle
} from "lucide-react";
import { YouTubeKeyword, VideoScript, ThumbnailConcept, AgeGuideline } from "./types";
import { AgeGuide } from "./components/AgeGuide";
import { TRANSLATIONS } from "./translations";

export default function App() {
  // Language Switch State
  const [lang, setLang] = useState<"en" | "vi" | any>(() => {
    try {
      const saved = localStorage.getItem("yt_kids_lang");
      return (saved === "vi" || saved === "en") ? saved : "en";
    } catch {
      return "en";
    }
  });

  const t = TRANSLATIONS[lang as "en" | "vi"] || TRANSLATIONS.en;

  const toggleLanguage = () => {
    const newLang = lang === "en" ? "vi" : "en";
    setLang(newLang);
    try {
      localStorage.setItem("yt_kids_lang", newLang);
    } catch (e) {
      console.warn("Storage write blocked:", e);
    }
  };

  // Navigation & View Tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "analyzer" | "thumbnail" | "script">("dashboard");

  // State management
  const [keywordList, setKeywordList] = useState<YouTubeKeyword[]>([]);
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>("");
  const [isLoadingTrends, setIsLoadingTrends] = useState<boolean>(false);
  const [apiKeysStatus, setApiKeysStatus] = useState<{ gemini: boolean; openai: boolean }>({ gemini: false, openai: false });

  // Custom Keyword Analyzer State
  const [customKeyword, setCustomKeyword] = useState<string>("");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("3-5 years");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzedKeyword, setAnalyzedKeyword] = useState<any>(null);

  // Thumbnail Engine State
  const [thumbKeyword, setThumbKeyword] = useState<string>("");
  const [thumbStyle, setThumbStyle] = useState<string>("Cute 3D Pixar");
  const [isDesigningThumb, setIsDesigningThumb] = useState<boolean>(false);
  const [designedThumb, setDesignedThumb] = useState<ThumbnailConcept | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [selectedDescription, setSelectedDescription] = useState<string>("");
  const [generatedTitlesAndDescs, setGeneratedTitlesAndDescs] = useState<any[]>([]);
  const [isGeneratingTitlesAndDescs, setIsGeneratingTitlesAndDescs] = useState<boolean>(false);
  const [isRefiningTitle, setIsRefiningTitle] = useState<boolean>(false);
  
  // Real Mockup generation (using server-side Gemini Image generation)
  const [isGeneratingMockImage, setIsGeneratingMockImage] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const [imageError, setImageError] = useState<string>("");

  // Error States
  const [analyzerError, setAnalyzerError] = useState<string>("");
  const [thumbnailError, setThumbnailError] = useState<string>("");
  const [scriptError, setScriptError] = useState<string>("");

  // Fallback States
  const [analyzerFallback, setAnalyzerFallback] = useState<boolean>(false);
  const [thumbnailFallback, setThumbnailFallback] = useState<boolean>(false);
  const [scriptFallback, setScriptFallback] = useState<boolean>(false);
  const [imageFallback, setImageFallback] = useState<boolean>(false);

  // Script Builder State
  const [scriptKeyword, setScriptKeyword] = useState<string>("");
  const [scriptAge, setScriptAge] = useState<string>("3-5 years");
  const [scriptDuration, setScriptDuration] = useState<string>("3-5 minutes");
  const [scriptPacing, setScriptPacing] = useState<string>("Moderate, playful & cheerful");
  const [scriptTone, setScriptTone] = useState<string>("Sweet, interactive, educational & humorous");
  const [scriptModel, setScriptModel] = useState<"gemini" | "openai">("gemini");
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [generatedScript, setGeneratedScript] = useState<VideoScript | null>(null);

  // Feedbacks
  const [copyStates, setCopyStates] = useState<Record<string, boolean>>({});

  // Fetch trend and Key statuses
  const fetchTrends = async (age = "") => {
    setIsLoadingTrends(true);
    try {
      const res = await fetch(`/api/trends?age=${encodeURIComponent(age)}`);
      const data = await res.json();
      if (data.success) {
        setKeywordList(data.trends);
      }
    } catch (e) {
      console.error("Error loading trending keywords:", e);
    } finally {
      setIsLoadingTrends(false);
    }
  };

  const fetchKeysStatus = async () => {
    try {
      const res = await fetch("/api/key-status");
      const data = await res.json();
      setApiKeysStatus(data);
    } catch (e) {
      console.error("Error querying API keys status:", e);
    }
  };

  useEffect(() => {
    fetchTrends();
    fetchKeysStatus();
  }, []);

  const handleAgeFilterChange = (age: string) => {
    setSelectedAgeFilter(age);
    fetchTrends(age);
  };

  // 1. Keyword Analysis Trigger
  const handleAnalyzeKeyword = async (targetKw?: string, targetAge?: string) => {
    const kw = targetKw || customKeyword;
    const age = targetAge || selectedAgeGroup;

    if (!kw.trim()) return;

    setIsAnalyzing(true);
    setAnalyzerError("");
    setAnalyzerFallback(false);
    setActiveTab("analyzer");
    
    // Clear and reset state for the next pipeline runs
    setGeneratedTitlesAndDescs([]);
    setSelectedTitle("");
    setSelectedDescription("");

    if (!targetKw) {
      setCustomKeyword(kw);
    }

    try {
      const res = await fetch("/api/analyze-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: kw, ageGroup: age })
      });
      const data = await res.json();
      if (data.success) {
        setAnalyzedKeyword(data.analyzed);
        setAnalyzerFallback(!!data.fallbackActive);
        
        // Sync to other builders for streamlined UX
        setThumbKeyword(kw);
        setScriptKeyword(kw);
        setScriptAge(age);

        // Auto-generate title suggestions immediately for the user
        setIsGeneratingTitlesAndDescs(true);
        try {
          const titleRes = await fetch("/api/generate-titles-descriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keyword: kw, ageGroup: age })
          });
          const titleData = await titleRes.json();
          if (titleData.success && titleData.options) {
            setGeneratedTitlesAndDescs(titleData.options);
          }
        } catch (titleErr) {
          console.error("Auto titles gen failed", titleErr);
        } finally {
          setIsGeneratingTitlesAndDescs(false);
        }

      } else {
        setAnalyzerError(data.error || "Analysis was not successful. Please verify server connection.");
      }
    } catch (e: any) {
      console.error("Failed to analyze keyword:", e);
      setAnalyzerError("Network or server connection error: " + e.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateTitlesAndDescs = async () => {
    if (!analyzedKeyword) return;
    setIsGeneratingTitlesAndDescs(true);
    try {
      const res = await fetch("/api/generate-titles-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: analyzedKeyword.keyword,
          ageGroup: analyzedKeyword.ageGroup
        })
      });
      const data = await res.json();
      if (data.success && data.options) {
        setGeneratedTitlesAndDescs(data.options);
      }
    } catch (err) {
      console.error("Failed to generate titles & descriptions", err);
    } finally {
      setIsGeneratingTitlesAndDescs(false);
    }
  };

  // 2. Thumbnail Concept Trigger
  const handleDesignThumbnail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!thumbKeyword.trim()) return;

    setIsDesigningThumb(true);
    setSelectedTitle("");
    setIsRefiningTitle(false);
    setThumbnailError("");
    setThumbnailFallback(false);
    setGeneratedImageUrl("");
    setImageError("");
    try {
      const res = await fetch("/api/generate-thumbnail-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: thumbKeyword, styleType: thumbStyle })
      });
      const data = await res.json();
      if (data.success) {
        setDesignedThumb(data.thumbConcept);
        setThumbnailFallback(!!data.fallbackActive);
      } else {
        setThumbnailError(data.error || "Thumbnail generation failed.");
      }
    } catch (err: any) {
      console.error("Failed to generate thumbnail concept:", err);
      setThumbnailError("Network or server connection error: " + err.message);
    } finally {
      setIsDesigningThumb(false);
    }
  };

  const handleSelectTitle = async (title: string) => {
    setSelectedTitle(title);
    setIsRefiningTitle(true);
    setThumbnailError("");
    setGeneratedImageUrl("");
    setImageError("");
    setImageFallback(false);
    
    try {
      const res = await fetch("/api/generate-thumbnail-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: title, styleType: thumbStyle })
      });
      const data = await res.json();
      if (data.success) {
        setDesignedThumb(prev => prev ? {
          ...data.thumbConcept,
          suggestedTitles: prev.suggestedTitles // Keep original 5 options
        } : data.thumbConcept);
        setThumbnailFallback(!!data.fallbackActive);
      } else {
        setThumbnailError(data.error || "Failed to refine details for this selected title.");
      }
    } catch (err: any) {
      console.error("Failed to refine title details:", err);
      setThumbnailError("Network error while refining details: " + err.message);
    } finally {
      setIsRefiningTitle(false);
    }
  };

  // 3. Generate Mockup Image via Imagen
  const handleGenerateMockupImage = async () => {
    if (!designedThumb?.aiImagePrompt) return;
    setIsGeneratingMockImage(true);
    setImageError("");
    setImageFallback(false);
    try {
      const res = await fetch("/api/generate-thumbnail-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: designedThumb.aiImagePrompt })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedImageUrl(data.imageUrl);
        setImageFallback(!!data.fallbackActive);
      } else {
        setImageError(data.error || "Could not generate image. Please check API key configuration.");
      }
    } catch (err: any) {
      setImageError("System connection error: " + err.message);
    } finally {
      setIsGeneratingMockImage(false);
    }
  };

  // 4. Script Generation Trigger
  const handleGenerateScript = async (e?: React.FormEvent, overrideKeyword?: string) => {
    if (e) e.preventDefault();
    const keywordToUse = overrideKeyword || scriptKeyword;
    if (!keywordToUse.trim()) return;

    setIsGeneratingScript(true);
    setScriptError("");
    setScriptFallback(false);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keywordToUse,
          ageGroup: scriptAge,
          duration: scriptDuration,
          pacing: scriptPacing,
          tone: scriptTone,
          aiModel: scriptModel
        })
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedScript(data.script);
        setScriptFallback(!!data.fallbackActive);
      } else {
        setScriptError(data.error || "Script generation was not successful.");
      }
    } catch (e: any) {
      console.error("Failed to generate script:", e);
      setScriptError("Network or server connection error: " + e.message);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Helper copy content
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyStates(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStates(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  // Shortcut quick prefill helper
  const handleQuickUseKeyword = (kw: string, age: string) => {
    setCustomKeyword(kw);
    setSelectedAgeGroup(age);
    handleAnalyzeKeyword(kw, age);
  };

  return (
    <div id="main-workflow-root" className="min-h-screen bg-slate-50 text-slate-900 selection:bg-rose-200 selection:text-rose-900">
      
      {/* Dynamic Upper Accent Bar */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 h-2.5 w-full"></div>

      {/* Main Header navigation and Branding */}
      <header id="page-header" className="bg-white border-b border-rose-50 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo area */}
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-rose-500 to-amber-400 p-2.5 rounded-2xl text-white shadow-md animate-bounce-slow">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-rose-500 uppercase tracking-widest block font-sans">YOUTUBE KIDS STUDIO</span>
                <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">AnimateKids <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-500">Global Planner</span></h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/50 font-sans">
              <button
                id="nav-btn-dashboard"
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "dashboard"
                    ? "bg-white text-rose-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-55"
                }`}
              >
                {t.navTrends}
              </button>
              <button
                id="nav-btn-analyzer"
                onClick={() => setActiveTab("analyzer")}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "analyzer"
                    ? "bg-white text-rose-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-55"
                }`}
              >
                {t.navAnalyzer}
              </button>
              <button
                id="nav-btn-thumbnail"
                onClick={() => setActiveTab("thumbnail")}
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "thumbnail"
                    ? "bg-white text-rose-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-55"
                }`}
              >
                {lang === "en" ? "Thumbnail & Script" : "Thumbnail & Kịch Bản"}
              </button>
            </nav>

            {/* Config & status indicator & Lang Toggle */}
            <div className="flex items-center gap-2">
              {/* Language Switch Button */}
              <button
                id="lang-switcher-btn"
                onClick={toggleLanguage}
                title={t.langSwitch}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <span>🌐</span>
                <span className="flex items-center gap-1 font-black">
                  <span className={lang === "en" ? "text-rose-600" : "text-slate-400 font-normal"}>EN</span>
                  <span className="text-slate-305 font-light font-sans">/</span>
                  <span className={lang === "vi" ? "text-rose-600" : "text-slate-400 font-normal"}>VI</span>
                </span>
              </button>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                apiKeysStatus.openai ? 'bg-emerald-55 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                <Bot className="w-3.5 h-3.5" />
                {apiKeysStatus.openai ? t.gptReady : t.geminiActive}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Warning banner when GEMINI_API_KEY is not configured */}
      {!apiKeysStatus.gemini && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs md:text-sm text-center py-2 px-4 font-semibold shadow-xs flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-white shrink-0 animate-pulse" />
          <span>{t.sandboxWarning}</span>
        </div>
      )}

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Mobile quick-tabs selector */}
        <div className="flex md:hidden bg-slate-100 p-1 rounded-xl mb-6 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap grow text-center ${
              activeTab === "dashboard" ? "bg-white text-rose-600 shadow-3xs" : "text-slate-600"
            }`}
          >
            {t.navTrends}
          </button>
          <button
            onClick={() => setActiveTab("analyzer")}
            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap grow text-center ${
              activeTab === "analyzer" ? "bg-white text-rose-600 shadow-3xs" : "text-slate-600"
            }`}
          >
            {t.navAnalyzer}
          </button>
          <button
            onClick={() => setActiveTab("thumbnail")}
            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap grow text-center ${
              activeTab === "thumbnail" ? "bg-white text-rose-600 shadow-3xs" : "text-slate-600"
            }`}
          >
            {lang === "en" ? "Thumbnail & Script" : "Thumbnail & Kịch Bản"}
          </button>
        </div>

        {/* ==================================== */}
        {/* TAB 1: DASHBOARD & TRENDING KEYWORDS */}
        {/* ==================================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-fade-in">
            {/* Quick Hero Banner */}
            <div className="bg-gradient-to-br from-indigo-900 via-purple-950 to-rose-950 text-white rounded-3xl p-6 md:p-10 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-400 via-pink-500 to-rose-600"></div>
              <div className="max-w-2xl relative z-10 space-y-4">
                <span className="bg-rose-500/30 text-rose-300 font-bold text-xs px-3 py-1.5 rounded-full border border-rose-400/20 inline-flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  {t.heroSubtitle}
                </span>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  {lang === "en" ? (
                    <>
                      Go Viral Internationally <br className="hidden md:inline" />
                      With <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-pink-300">Trending Keywords</span>
                    </>
                  ) : (
                    <>
                      Kênh Hoạt Hình Viral <br className="hidden md:inline" />
                      Nhờ <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-pink-300">Từ Khóa Xu Hướng</span>
                    </>
                  )}
                </h2>
                <p className="text-indigo-200 text-sm md:text-base leading-relaxed">
                  {t.heroDescription}
                </p>
                
                {/* Search Bar directly inside Hero */}
                <div className="pt-2">
                  <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl flex items-center border border-white/20 max-w-lg shadow-inner">
                    <Search className="w-5 h-5 text-indigo-300 ml-3" />
                    <input
                      type="text"
                      placeholder={t.searchPlaceholder}
                      value={customKeyword}
                      onChange={(e) => setCustomKeyword(e.target.value)}
                      className="bg-transparent border-0 text-white placeholder-indigo-300 focus:outline-hidden focus:ring-0 text-sm px-3 flex-1 py-2 text-ellipsis"
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyzeKeyword()}
                    />
                    <button
                      onClick={() => handleAnalyzeKeyword()}
                      disabled={isAnalyzing}
                      className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all focus:ring-2 focus:ring-rose-400 active:scale-95 disabled:opacity-50 inline-flex items-center gap-1 shrink-0 animate-pulse-slow"
                    >
                      {isAnalyzing ? t.analyzingBtn : t.analyzeBtn}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyword Trends Display */}
            <div id="trends-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Trending Keywords list */}
              <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                      <TrendingUp className="w-5.5 h-5.5 text-rose-500" />
                      {t.trendingNowTitle}
                    </h3>
                    <p className="text-slate-500 text-xs">
                      {t.trendingNowDesc}
                    </p>
                  </div>

                  {/* Filter age pills */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-xl">
                    <button
                      onClick={() => handleAgeFilterChange("")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedAgeFilter === "" ? "bg-white text-slate-800 shadow-3xs" : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {t.allAges}
                    </button>
                    {["1-3 years", "3-5 years", "5-8 years", "8-10 years"].map((age) => (
                      <button
                        key={age}
                        onClick={() => handleAgeFilterChange(age)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedAgeFilter === age ? "bg-white text-rose-600 shadow-3xs" : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {age === "1-3 years" ? (lang === "en" ? age : "1-3 tuổi") :
                         age === "3-5 years" ? (lang === "en" ? age : "3-5 tuổi") :
                         age === "5-8 years" ? (lang === "en" ? age : "5-8 tuổi") :
                         (lang === "en" ? age : "8-10 tuổi")}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingTrends ? (
                  <div className="flex flex-col items-center justify-center py-16 space-y-3">
                    <RotateCw className="w-10 h-10 text-rose-500 animate-spin" />
                    <p className="text-slate-500 text-sm">{lang === "en" ? "Querying live global trending topics..." : "Đang lọc dữ liệu từ khóa hoạt hình thịnh hành..."}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 tracking-wider uppercase">
                          <th className="pb-3 pl-2">{t.theadKeyword}</th>
                          <th className="pb-3">{t.theadAge}</th>
                          <th className="pb-3 text-center">{lang === "en" ? "Trend Rank" : "Xếp hạng"}</th>
                          <th className="pb-3 text-center">{lang === "en" ? "Difficulty" : "Độ cạnh tranh"}</th>
                          <th className="pb-3 text-right">{t.theadVolume}</th>
                          <th className="pb-3 pr-2 text-right">{t.theadAction}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {keywordList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-rose-50/20 transition-colors group">
                            {/* keyword & subniche */}
                            <td className="py-4 pl-2 pr-4">
                              <span className="font-bold text-slate-800 hover:text-rose-600 block transition-colors">
                                {item.keyword}
                              </span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold py-0.5 px-2 rounded-md">
                                  {item.subNiche}
                                </span>
                                <span className="text-slate-400 text-xs">• Velocity:</span>
                                <span className="text-xs font-bold text-rose-600">{item.viewerVelocity}</span>
                              </div>
                            </td>
                            {/* Target age */}
                            <td className="py-4 whitespace-nowrap">
                              <span className="bg-rose-50 text-rose-700 font-bold text-xs px-2.5 py-1 rounded-full">
                                {item.ageGroup}
                              </span>
                            </td>
                            {/* Growth trend percentage */}
                            <td className="py-4 text-center font-black text-rose-600">
                              +{item.trendPercentage}% 📈
                            </td>
                            {/* Difficulty Score */}
                            <td className="py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-xs font-bold ${
                                  item.difficultyScore < 35 
                                    ? "text-emerald-505" 
                                    : item.difficultyScore < 60 
                                      ? "text-amber-505" 
                                      : "text-rose-505"
                                }`}>
                                  {item.difficultyScore}/100
                                </span>
                                <div className="w-16 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${
                                      item.difficultyScore < 35 
                                        ? "bg-emerald-500" 
                                        : item.difficultyScore < 60 
                                          ? "bg-amber-400" 
                                          : "bg-rose-500"
                                    }`} 
                                    style={{ width: `${item.difficultyScore}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            {/* Search volume */}
                            <td className="py-4 text-right font-semibold text-slate-755">
                              {item.searchVolume.toLocaleString()}
                            </td>
                            {/* Action to build */}
                            <td className="py-4 pr-2 text-right">
                              <button
                                onClick={() => handleQuickUseKeyword(item.keyword, item.ageGroup)}
                                className="bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-700 text-xs py-1.5 px-3 rounded-lg font-bold transition-all focus:ring-1 focus:ring-rose-400 flex items-center gap-1 ml-auto shrink-0"
                              >
                                Optimize <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Column: Mini Guidelines overview or stats */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Why make cartoon animation? summary statistics card */}
                <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-3xl p-6 shadow-sm space-y-4">
                  <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                    <Layers className="w-5 h-5 text-white" />
                    Viral Retention Secrets
                  </h4>
                  <p className="text-rose-100 text-xs leading-relaxed">
                    Children aged 1 to 10 have extremely high repeat view ratios. A stellar preschool cartoon clip can be watched more than 50 times a month by a single devoted child!
                  </p>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center bg-white/10 p-2.5 rounded-xl">
                      <span className="text-rose-100">Loyal Views:</span>
                      <strong className="text-white">+500% (High Retention)</strong>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 p-2.5 rounded-xl">
                      <span className="text-rose-100">Hero Character Size:</span>
                      <strong className="text-white">Oversized Giant Eyes</strong>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 p-2.5 rounded-xl">
                      <span className="text-rose-100">Optimal Soundscapes:</span>
                      <strong className="text-white">Melodic High pitched</strong>
                    </div>
                  </div>
                </div>

                {/* Submitting custom key explanations */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 space-y-3 shadow-3xs">
                  <h4 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-blue-500" />
                    How to configure high-retention AI
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The platform coordinates smart analytics using twin AI agents optimized for high CTR children's content structure:
                  </p>
                  <ul className="text-xs text-slate-600 space-y-1.5 pl-4 list-disc">
                    <li><strong>Google Gemini 3.5 Flash:</strong> Supercharged text intelligence for rapid script building and scenic story arcs.</li>
                    <li><strong>OpenAI GPT-4o:</strong> Specialized preschool comedy dialogues provider (optional with key).</li>
                  </ul>
                  <p className="text-[11px] text-blue-700 font-medium">💡 Quick Tip: Add your API keys under Settings to transition from simulated sandbox responses to 100% active custom production setups!</p>
                </div>

              </div>
            </div>

            {/* Age guidelines notebook part */}
            <AgeGuide />
          </div>
        )}

        {/* ==================================== */}
        {/* TAB 2: KEYWORD ANALYZER DETAILS     */}
        {/* ==================================== */}
        {activeTab === "analyzer" && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Custom interactive Search Input panel */}
            <div className="bg-white rounded-3xl border border-rose-100 p-6 md:p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Search className="w-5 h-5 text-rose-500" />
                {t.analyzerHeaderTitle}
              </h3>
              <p className="text-slate-500 text-xs mb-6">
                {t.analyzerHeaderDesc}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.analyzerInputLabel}</label>
                  <div className="relative">
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-10 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                      placeholder={t.analyzerInputPlaceholder}
                      value={customKeyword}
                      onChange={(e) => setCustomKeyword(e.target.value)}
                    />
                    <Sparkles className="w-4 h-4 text-rose-400 absolute right-3.5 top-3.5 pointer-events-none" />
                  </div>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.analyzerAgeLabel}</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 text-sm focus:outline-hidden focus:ring-2 focus:ring-rose-400"
                    value={selectedAgeGroup}
                    onChange={(e) => setSelectedAgeGroup(e.target.value)}
                  >
                    <option value="1-3 years">1-3 years {lang === "en" ? "(Sensory Play)" : "(Cảm quan)"}</option>
                    <option value="3-5 years">3-5 years {lang === "en" ? "(Preschool Play)" : "(Mầm non)"}</option>
                    <option value="5-8 years">5-8 years {lang === "en" ? "(Early Schoolers)" : "(Tiểu học nhỏ)"}</option>
                    <option value="8-10 years">8-10 years {lang === "en" ? "(Pre-Teens)" : "(Thiếu niên lớn)"}</option>
                  </select>
                </div>

                <div className="md:col-span-3 flex items-end">
                  <button
                    onClick={() => handleAnalyzeKeyword()}
                    disabled={isAnalyzing}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-6 rounded-2xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        {t.btnDeepAnalyzing}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {t.btnDeepAnalyze}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {analyzerError && (
              <div id="analyzer-error-message" className="bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl p-5 text-sm font-semibold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold">{lang === "en" ? "Analysis Error" : "Lỗi Phân Tích"}</p>
                  <p className="text-xs text-rose-650 font-normal mt-0.5">{analyzerError}</p>
                </div>
              </div>
            )}

            {analyzerFallback && (
              <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-3xl p-5 text-sm flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="font-bold">{lang === "en" ? "Dynamic Baseline Mode Active" : "Đang dùng Cơ sở dữ liệu Dự phòng"}</p>
                  <p className="text-xs text-amber-800 font-normal mt-0.5">
                    {lang === "en" 
                      ? "The Gemini model is experiencing high demand (503 Service Unavailable). To keep your experience uninterrupted and fast, we have initialized a highly attuned, professional kids-SEO baseline setup for your keyword."
                      : "Trực quan hoá mô hình Gemini đang bận hoặc quá tải (503 Service). Để bảo đảm trải nghiệm không bị tắt nghẽn, chúng tôi đã chuẩn bị sẵn sơ đồ SEO & tâm lý phát triển mầm non bám sát từ khóa này."}
                  </p>
                </div>
              </div>
            )}

            {/* Analysis Result display */}
            {analyzedKeyword ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Result Block */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div>
                        <span className="bg-rose-50 text-rose-700 font-bold text-xs px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Target Segment: {analyzedKeyword.ageGroup}
                        </span>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-2 flex items-center gap-2">
                          {analyzedKeyword.keyword}
                        </h3>
                        <p className="text-slate-400 text-xs mt-1">Recommended Sub-Niche: <span className="text-indigo-600 font-bold">{analyzedKeyword.subNiche}</span></p>
                      </div>
                      
                      {/* Big KPI trend metric */}
                      <div className="bg-rose-50 border border-rose-100 px-5 py-3.5 rounded-2xl text-center md:text-right shrink-0">
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest block">Daily Velocity</span>
                        <strong className="text-xl font-black text-rose-600 whitespace-nowrap block">+{analyzedKeyword.trendPercentage}% Growth 🚀</strong>
                      </div>
                    </div>

                    {/* Mini dashboard widgets */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                        <span className="text-xs font-bold text-slate-400 block uppercase">Calculated Searches</span>
                        <strong className="text-lg font-black text-slate-800">{analyzedKeyword.searchVolume?.toLocaleString() || "50,000"}</strong>
                        <span className="text-[10px] text-slate-400 block">Queries per month</span>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                        <span className="text-xs font-bold text-slate-400 block uppercase">Difficulty Index</span>
                        <strong className="text-lg font-black text-slate-800">{analyzedKeyword.difficultyScore}/100</strong>
                        <span className={`text-[10px] font-bold ${analyzedKeyword.difficultyScore < 35 ? "text-emerald-500" : "text-amber-500"}`}>
                          {analyzedKeyword.difficultyScore < 35 ? "Very Easy Opportunity" : "Moderate Competition"}
                        </span>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                        <span className="text-xs font-bold text-slate-400 block uppercase">Niche Competition</span>
                        <strong className="text-lg font-black text-slate-800">{analyzedKeyword.competition || "Medium"}</strong>
                        <span className="text-[10px] text-slate-400 block">Competing channel density</span>
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1">
                        <span className="text-xs font-bold text-slate-400 block uppercase">Commercial CPC</span>
                        <strong className="text-lg font-black text-slate-800">${analyzedKeyword.avgCpc || "0.18"}</strong>
                        <span className="text-[10px] text-slate-400 block">High CPM advertiser rate</span>
                      </div>
                    </div>

                    {/* Deep Analysis Text Block */}
                    <div className="space-y-4 pt-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Search Intent & Child-Parent Psychology:</h4>
                        <div className="p-4 bg-slate-50 border border-slate-100 text-slate-600 text-sm leading-relaxed rounded-2xl">
                          {analyzedKeyword.intentDescription}
                        </div>
                      </div>

                      {analyzedKeyword.analyticsInDepth && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Strategic Feasibility Evaluation:</h4>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {analyzedKeyword.analyticsInDepth}
                          </p>
                        </div>
                      )}

                      {analyzedKeyword.demographics && (
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Viewer Demographic Personas:</h4>
                          <p className="text-slate-600 text-sm leading-relaxed">
                            {analyzedKeyword.demographics}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recommendation action plan card */}
                  {analyzedKeyword.recommendations && (
                    <div className="bg-amber-50/20 border border-amber-100 rounded-3xl p-6 md:p-8 space-y-4 shadow-3xs text-slate-700">
                      <h4 className="font-extrabold text-amber-800 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-500" />
                        Targeted Production Playbook:
                      </h4>
                      <ul className="space-y-2.5 text-sm">
                        {analyzedKeyword.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex gap-2">
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">{i+1}</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
                <div className="lg:col-span-4 space-y-6">
                  {/* Title & Description Optimizer Card */}
                  <div className="bg-white rounded-3xl border border-rose-100 p-6 shadow-sm space-y-5">
                    <div className="border-b border-slate-100 pb-4">
                      <h4 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                        <Compass className="w-5 h-5 text-rose-500" />
                        {lang === "en" ? "Title & Description Optimizer" : "Tối Ưu Hóa Tiêu Đề & Mô Tả SEO"}
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-1">
                        {lang === "en" 
                          ? "Generate kid-focused, high-clickability viral titles and safe search descriptions tailored to child psychology."
                          : "Tạo danh sách tiêu đề hấp dẫn & mô tả tối ưu hóa SEO đạt lượng click mầm non cao."}
                      </p>
                    </div>

                    <button
                      onClick={handleGenerateTitlesAndDescs}
                      disabled={isGeneratingTitlesAndDescs}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                      {isGeneratingTitlesAndDescs ? (
                        <>
                          <RotateCw className="w-3.5 h-3.5 animate-spin" />
                          {lang === "en" ? "Generating Proposals..." : "Đang tạo tiêu đề..."}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          {lang === "en" ? "Generate SEO Titles" : "Tạo Bộ Tiêu Đề & Mô Tả"}
                        </>
                      )}
                    </button>

                    {/* Active Selected Selection Banner */}
                    {(selectedTitle || selectedDescription) && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1.5 text-slate-705">
                        <div className="flex items-center gap-2 text-emerald-850 font-bold text-[10px] uppercase tracking-wider">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                          {lang === "en" ? "Selected Configuration" : "Đã chọn Cấu hình"}
                        </div>
                        {selectedTitle && (
                          <p className="text-xs">
                            <span className="font-semibold text-slate-500">{lang === "en" ? "Title:" : "Tiêu đề:"}</span>{" "}
                            <span className="text-slate-850 font-bold leading-tight">{selectedTitle}</span>
                          </p>
                        )}
                        {selectedDescription && (
                          <div className="text-[11px]">
                            <span className="font-semibold text-slate-500">{lang === "en" ? "Description:" : "Mô tả:"}</span>
                            <div className="bg-white p-2.5 rounded-lg mt-1 text-slate-650 leading-relaxed font-mono text-[9px] max-h-20 overflow-y-auto border border-slate-150">
                              {selectedDescription}
                            </div>
                          </div>
                        )}
                        <div className="pt-1.5">
                          <button
                            onClick={() => {
                              setThumbKeyword(selectedTitle);
                              setScriptKeyword(selectedTitle);
                              setActiveTab("thumbnail");
                              handleDesignThumbnail();
                              handleGenerateScript(undefined, selectedTitle);
                            }}
                            className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-3 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 shadow-3xs cursor-pointer"
                          >
                            🚀 {lang === "en" ? "Generate Thumbnail & Screenplay" : "Tạo Thumbnail & Kịch Bản"}
                          </button>
                        </div>
                      </div>
                    )}

                    {generatedTitlesAndDescs.length > 0 ? (
                      <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                        {generatedTitlesAndDescs.map((option, idx) => {
                          const isOptionSelected = selectedTitle === option.title && selectedDescription === option.description;
                          return (
                            <div 
                              key={idx} 
                              className={`p-4 rounded-xl border transition-all space-y-3 text-left ${
                                isOptionSelected 
                                  ? "bg-rose-50/10 border-rose-300 ring-2 ring-rose-500/10 shadow-3xs" 
                                  : "bg-slate-50/50 border-slate-150 hover:border-slate-200"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${
                                    isOptionSelected ? "bg-rose-100 text-rose-800" : "bg-slate-200 text-slate-600"
                                  }`}>
                                    {lang === "en" ? `Option #${idx + 1}` : `Mẫu #${idx + 1}`}
                                  </span>
                                  <span className="text-[9px] font-mono text-slate-400">
                                    {option.title.length}/100 chars
                                  </span>
                                </div>

                                <button
                                  onClick={() => {
                                    setSelectedTitle(option.title);
                                    setSelectedDescription(option.description);
                                    // Sync to search inputs
                                    setThumbKeyword(option.title);
                                    setScriptKeyword(option.title);
                                  }}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer select-none ${
                                    isOptionSelected 
                                      ? "bg-rose-500 text-white shadow-3xs hover:bg-rose-600" 
                                      : "bg-white border border-slate-250 hover:border-slate-350 text-slate-800 hover:bg-slate-50"
                                  }`}
                                >
                                  {isOptionSelected ? (
                                    <>
                                      <Check className="w-3" />
                                      {lang === "en" ? "Selected" : "Đã Chọn"}
                                    </>
                                  ) : (
                                    <>
                                      <Bookmark className="w-3" />
                                      {lang === "en" ? "Select" : "Chọn Bảng"}
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="space-y-1.5">
                                <h5 className="font-extrabold text-slate-800 text-xs leading-snug">
                                  {option.title}
                                </h5>
                                <div className="bg-white rounded-lg p-2.5 border border-slate-100 text-[10px] text-slate-500 leading-relaxed font-sans relative">
                                  <p className="whitespace-pre-line text-[10px] pr-6">
                                    {option.description}
                                  </p>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(option.description);
                                      setCopyStates(prev => ({ ...prev, [`desc-${idx}`]: true }));
                                      setTimeout(() => {
                                        setCopyStates(prev => ({ ...prev, [`desc-${idx}`]: false }));
                                      }, 1500);
                                    }}
                                    className="absolute right-1 top-1 p-1 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-md text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
                                    title={lang === "en" ? "Copy to clipboard" : "Sao chép mô tả"}
                                  >
                                    {copyStates[`desc-${idx}`] ? (
                                      <Check className="w-2.5 h-2.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50/50">
                        <Compass className="w-7 h-7 text-slate-300 mx-auto animate-pulse" />
                        <h5 className="text-[11px] font-bold text-slate-650">
                          {lang === "en" ? "No Proposals Generated" : "Chưa có danh sách tiêu đề"}
                        </h5>
                        <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                          {lang === "en" 
                            ? "Click Generate SEO Titles or analyze a keyword to automatically formulate five child-psychology aligned YouTube options."
                            : "Click nút 'Tạo Bộ Tiêu Đề & Mô Tả' để sản xuất 5 bộ Tiêu đề & Mô tả YouTube Kids chuẩn SEO mầm non."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div id="no-analysis-state" className="bg-white rounded-3xl border border-slate-150 p-16 text-center shadow-xs">
                <Search className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-bounce-slow" />
                <h4 className="text-lg font-bold text-slate-700">No keyword has been analyzed yet</h4>
                <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
                  Type a kid-centered search phrase in the panel above, or click on "Optimize" for any high-performing keyword on the trends dashboard to unlock custom deep insights.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================================== */}
        {/* TAB 3: THUMBNAIL DESIGNER & TITLES   */}
        {/* ==================================== */}
        {activeTab === "thumbnail" && (
          <div className="space-y-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Parameter Panel */}
              <div className="lg:col-span-4 bg-white rounded-3xl border border-rose-100 p-6 shadow-sm space-y-6 self-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-rose-500" />
                    {t.thumbnailHeaderTitle}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    {t.thumbnailHeaderDesc}
                  </p>
                </div>

                <form onSubmit={handleDesignThumbnail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.thumbConceptLabel}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs focus:ring-1 focus:ring-rose-400"
                      placeholder={t.thumbConceptPlaceholder}
                      value={thumbKeyword}
                      onChange={(e) => setThumbKeyword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.artStyleLabel}</label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs focus:ring-1 focus:ring-rose-400"
                      value={thumbStyle}
                      onChange={(e) => setThumbStyle(e.target.value)}
                    >
                      <option value="Cute 3D Pixar">{lang === "en" ? "Cute 3D Pixar Style (Glistening huge eyes)" : "Phong cách 3D Pixar Đáng yêu (Mắt to tròn lấp lánh)"}</option>
                      <option value="Flat 2D CoComelon Style">{lang === "en" ? "Flat 2D CoComelon Style (Bold, highly legible)" : "Phong cách Flat 2D CoComelon (Nổi bật, dễ nhìn)"}</option>
                      <option value="Classic Watercolor Whimsical">{lang === "en" ? "Classic Watercolor Whimsical (Soothing bedtime stories)" : "Hội họa màu nước Cổ điển Thần tiên (Ru ngủ ấm cúng)"}</option>
                      <option value="Playful Claymation">{lang === "en" ? "Playful Claymation Study (Stop-motion style)" : "Phong cách Đất sét nặn Playful Claymation (Kiểu Stop-motion)"}</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isDesigningThumb}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    {isDesigningThumb ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        {t.btnDesigningConcept}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                        {t.btnDesignConcept}
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Results Panel */}
              <div className="lg:col-span-8 space-y-6">
                {thumbnailError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl p-5 text-sm font-semibold flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
                    <div>
                      <p className="font-bold">{lang === "en" ? "Thumbnail Design Error" : "Lỗi Thiết kế Thumbnail"}</p>
                      <p className="text-xs text-rose-650 font-normal mt-0.5">{thumbnailError}</p>
                    </div>
                  </div>
                )}

                {thumbnailFallback && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-3xl p-5 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold">{lang === "en" ? "Dynamic Baseline Mode Active" : "Đang dùng Cơ sở dữ liệu Dự phòng"}</p>
                      <p className="text-xs text-amber-800 font-normal mt-0.5">
                        {lang === "en"
                          ? "Creative models are experiencing temporary high demand (503 Service Unavailable). We have generated high-CTR children cartoon outline concepts and title ideas using our local expert database."
                          : "Mô hình sáng tạo đang tạm bận (503 Service). Chúng tôi đã chuẩn bị sẵn gợi ý phác thảo Thumbnail có CTR cao & ý tưởng tự động bám sát đề tài của bạn."}
                      </p>
                    </div>
                  </div>
                )}

                {designedThumb ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-8 animate-fade-in">
                    
                    {/* Headers & visual styles */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                      <div>
                        <span className="bg-amber-100 text-amber-800 font-bold text-xs px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Dynamic Preset: {designedThumb.styleType}
                        </span>
                        <h4 className="text-xl font-bold text-slate-800 mt-2 font-sans">High-CTR Titles & Thumbnail Breakdown</h4>
                        <p className="text-slate-400 text-xs mt-1">
                          Strictly configured to secure parent clicks and children validation loops.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      {/* Sub-left: suggested titles */}
                      <div className="md:col-span-6 space-y-4">
                        <div>
                          <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">🌟 5 High-CTR YouTube Video Titles:</h5>
                          <p className="text-slate-400 text-[10px] mt-1 italic">
                            {t.titleSelectionHint}
                          </p>
                        </div>
                        <div className="space-y-2">
                          {designedThumb.suggestedTitles?.map((title, i) => {
                            const isSelected = selectedTitle === title;
                            return (
                              <div
                                key={i}
                                onClick={() => handleSelectTitle(title)}
                                className={`group flex items-start gap-2.5 p-3 border transition-all rounded-xl cursor-pointer ${
                                  isSelected
                                    ? "bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/20 shadow-xs"
                                    : "bg-rose-50/10 border-slate-100 hover:border-rose-200 hover:bg-rose-50/20"
                                }`}
                              >
                                <span className={`font-bold text-xs w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 tracking-normal ${
                                  isSelected ? "bg-rose-500 text-white" : "bg-rose-100 text-rose-700"
                                }`}>
                                  {i + 1}
                                </span>
                                <div className="flex-1 space-y-1">
                                  <p className="text-xs font-bold text-slate-700 select-all leading-relaxed">
                                    {title}
                                  </p>
                                  {isSelected && (
                                    <span className="inline-flex items-center gap-1 bg-rose-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full uppercase scale-90 origin-left">
                                      <Check className="w-2.5 h-2.5 stroke-[3px]" /> {t.selectedTitleBadge}
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(title, `title-${i}`);
                                  }}
                                  className="text-slate-400 group-hover:text-rose-500 transition-colors shrink-0"
                                  title="Copy Title"
                                >
                                  {copyStates[`title-${i}`] ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {/* Interactive Script Generator Button inside same left col */}
                        {selectedTitle && !isRefiningTitle && (
                          <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-4 text-white space-y-3 shadow-xs animate-fade-in mt-4">
                            <div>
                              <span className="bg-white/20 text-white font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {lang === "en" ? "Interactive Pipeline" : "Quy trình Tương tác"}
                              </span>
                              <p className="text-xs font-bold mt-1.5 line-clamp-2 italic text-rose-100">
                                "{selectedTitle}"
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setScriptKeyword(selectedTitle);
                                setActiveTab("script");
                                handleGenerateScript(undefined, selectedTitle);
                              }}
                              className="w-full bg-white hover:bg-slate-50 text-rose-600 font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                            >
                              {t.btnGenerateScriptFromTitle}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Sub-right: design instructions (layout, text, color) */}
                      <div className="md:col-span-6 space-y-4 relative">
                        {isRefiningTitle ? (
                          <div className="flex flex-col items-center justify-center h-full min-h-[260px] p-6 text-center space-y-3 bg-slate-50 border border-dashed border-slate-200 rounded-3xl animate-pulse">
                            <RotateCw className="w-8 h-8 text-rose-500 animate-spin" />
                            <h6 className="text-sm font-bold text-slate-800">{t.refiningDetailsTitle}</h6>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">{t.refiningDetailsDesc}</p>
                          </div>
                        ) : !selectedTitle ? (
                          <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl h-full min-h-[260px] space-y-3">
                            <span className="text-3xl">🎨</span>
                            <h6 className="text-sm font-bold text-slate-700">{t.titleSelectPlaceholderTitle}</h6>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                              {t.titleSelectPlaceholderDesc}
                            </p>
                          </div>
                        ) : (
                          <>
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">🎨 Composition Directions for Designers:</h5>
                            
                            <div className="space-y-3 text-xs">
                              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                                <span className="font-bold text-slate-700 block">🔹 Hero Characters / Emotional Focal Points:</span>
                                <ul className="list-disc pl-4 space-y-1 text-slate-500">
                                  {designedThumb.focusElements?.map((elem, idx) => (
                                    <li key={idx}>{elem}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                                <span className="font-bold text-slate-700 block">🎨 Optimal Contrasting Color Palette:</span>
                                <p className="text-slate-500 leading-relaxed">{designedThumb.colorScheme}</p>
                              </div>

                              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                                <span className="font-bold text-slate-700 block">🖼️ Background Scenic Concept:</span>
                                <p className="text-slate-500 leading-relaxed">{designedThumb.backgroundIdea}</p>
                              </div>

                              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                                <span className="font-bold text-rose-600 block">✍️ Giant Overlay Cartoon Text:</span>
                                <p className="font-black text-rose-700 uppercase tracking-wide bg-rose-50 px-2 py-1 rounded inline-block">{designedThumb.overlayText}</p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* AI image prompt copy block - only shown if a title is selected */}
                    {selectedTitle && (
                      <div className={`bg-indigo-950 text-indigo-150 rounded-2xl p-5 md:p-6 space-y-4 transition-all duration-300 ${isRefiningTitle ? "opacity-30 pointer-events-none" : "opacity-100"} animate-fade-in`}>
                        <div className="flex justify-between items-center h-8">
                          <h5 className="text-xs font-bold uppercase tracking-widest text-indigo-300 font-sans">English AI Image Generator Prompt (Midjourney / Imagen):</h5>
                          <button
                            onClick={() => copyToClipboard(designedThumb.aiImagePrompt, "ai-prompt")}
                            className="bg-indigo-900 hover:bg-slate-800 text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all"
                          >
                            {copyStates["ai-prompt"] ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Prompt
                              </>
                            )}
                          </button>
                        </div>
                        
                        <div className="p-3 bg-indigo-1000 rounded-xl text-xs font-mono leading-relaxed select-all border border-indigo-900 text-slate-100 overflow-x-auto">
                          {designedThumb.aiImagePrompt}
                        </div>

                        {/* AI Thumbnail Painter Interactive Tool */}
                        <div className="pt-4 border-t border-indigo-900 space-y-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                            <div>
                              <h6 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
                                <Bot className="w-4 h-4 text-pink-400" />
                                Google Imagen Instant Art Painter
                              </h6>
                              <p className="text-indigo-300 text-[11px] mt-1 font-sans">
                                Utilizes <strong>gemini-2.5-flash-image</strong> to physically render live kid cartoon preview mockups on correct 16:9 widescreen canvas.
                              </p>
                            </div>

                            <button
                              onClick={handleGenerateMockupImage}
                              disabled={isGeneratingMockImage}
                              className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shrink-0 flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 font-sans cursor-pointer"
                            >
                              {isGeneratingMockImage ? (
                                <>
                                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                  Model is painting artwork...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                                  Render Live 16:9 Image
                                </>
                              )}
                            </button>
                          </div>

                          {imageFallback && (
                            <div className="bg-amber-500/10 border border-amber-500/25 text-amber-200 rounded-2xl p-4 text-xs flex items-start gap-3">
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-amber-300">Dynamic Artwork Fallback Mode Active</p>
                                <p className="text-slate-300 font-normal mt-0.5 leading-relaxed">
                                  Image generation engines are currently experiencing high demand or API quota limits. We have dynamically generated an exquisite, custom kids-cartoon vector illustration matching your selected subject.
                                </p>
                              </div>
                            </div>
                          )}

                          {generatedImageUrl && (
                            <div className="bg-slate-900 border border-indigo-900 rounded-2xl p-3 text-center space-y-3 animate-fade-in relative group">
                              <img 
                                src={generatedImageUrl} 
                                alt="Generated kids anime thumbnail mockup by Gemini" 
                                className="max-h-80 mx-auto rounded-xl object-contain border border-indigo-950 select-none shadow-md"
                              />
                              <div className="flex items-center justify-center gap-2 text-[11px] text-pink-300">
                                <span>🎨 Beautiful, kid-friendly automatic 16:9 illustration mockup!</span>
                                <a 
                                  href={generatedImageUrl} 
                                  download="thumbnail_mockup.png"
                                  className="bg-indigo-900 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 inline-flex shrink-0 ml-2 shadow-sm transition-all hover:scale-105"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download Mockup
                                </a>
                              </div>
                            </div>
                          )}

                          {imageError && (
                            <div className="p-3.5 bg-rose-950/40 border border-rose-900 rounded-xl text-xs text-rose-300 flex items-start gap-2 animate-fade-in">
                              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                              <div>
                                <strong className="block mb-0.5">Image Generation Alert:</strong>
                                <span>{imageError}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 3: Produce Complete Kids Cartoon Script - ONLY shown once a title is selected & ready */}
                    {selectedTitle && !isRefiningTitle && (
                      <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 rounded-2xl p-6 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-md animate-fade-in border border-emerald-400/20">
                        <div className="space-y-1">
                          <span className="bg-white/20 text-white font-black text-[9px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {lang === "en" ? "Interactive Pipeline Step 3" : "Quy trình Tương tác Bước 3"}
                          </span>
                          <h6 className="text-base font-bold leading-snug">
                            {lang === "en" ? "🎬 Step 3: Produce Complete Kids Script" : "🎬 Bước 3: Thiết Kế Kịch Bản Hoạt Hình Cho Tiêu Đề"}
                          </h6>
                          <p className="text-teal-50/90 text-xs leading-normal max-w-xl">
                            {lang === "en"
                              ? `Everything looks great! Assemble the fully structured screenplay and sound guides based on "${selectedTitle}".`
                              : `Tuyệt vời! Tiến hành biên dịch kịch bản hoàn chỉnh, giọng thoại nhân vật và hiệu ứng âm thanh cho ý tưởng "${selectedTitle}".`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setScriptKeyword(selectedTitle);
                            setActiveTab("script");
                            handleGenerateScript(undefined, selectedTitle);
                          }}
                          className="bg-white hover:bg-teal-50 text-emerald-700 font-extrabold text-xs py-3.5 px-6 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0 cursor-pointer"
                        >
                          {lang === "en" ? "Generate Script Now" : "Tiến hành Tạo Kịch Bản"}
                        </button>
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-150 p-16 text-center shadow-xs">
                    <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-bounce-slow" />
                    <h4 className="text-lg font-bold text-slate-700">No layout concept analyzed yet</h4>
                    <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                      Fill in a core search word on the left panel or choose any keyword from the Playbook dashboard to outline characters, vivid themes, and custom Midjourney imagery prompts.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ==================================== */}
        {/* TAB 4: INTELLIGENT VIDEO SCRIPT     */}
        {/* ==================================== */}
        {activeTab === "script" && (
          <div className="space-y-8 animate-fade-in">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Parameter Panel for generating script */}
              <div className="lg:col-span-4 bg-white rounded-3xl border border-rose-100 p-6 shadow-sm space-y-6 self-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
                    <Video className="w-5 h-5 text-rose-500" />
                    {t.scriptHeaderTitle}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1">
                    {t.scriptHeaderDesc}
                  </p>
                </div>

                <form onSubmit={handleGenerateScript} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.scriptThemeLabel}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs focus:ring-1 focus:ring-rose-400"
                      value={scriptKeyword}
                      onChange={(e) => setScriptKeyword(e.target.value)}
                      placeholder={t.scriptThemePlaceholder}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.theadAge}</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-rose-400"
                        value={scriptAge}
                        onChange={(e) => setScriptAge(e.target.value)}
                      >
                        <option value="1-3 years">1-3 years</option>
                        <option value="3-5 years">3-5 years</option>
                        <option value="5-8 years">5-8 years</option>
                        <option value="8-10 years">8-10 years</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.scriptDurationLabel}</label>
                      <select
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:ring-1 focus:ring-rose-400"
                        value={scriptDuration}
                        onChange={(e) => setScriptDuration(e.target.value)}
                      >
                        <option value="1-3 minutes">{lang === "en" ? "1 - 3 mins (Shorts/Songs)" : "1 - 3 phút (Shorts/Bài hát)"}</option>
                        <option value="3-5 minutes">{lang === "en" ? "3 - 5 mins (Standard episode)" : "3 - 5 phút (Tập phim chuẩn)"}</option>
                        <option value="5-10 minutes">{lang === "en" ? "5 - 10 mins (Long narrative)" : "5 - 10 phút (Kể chuyện dài)"}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.scriptPacingLabel}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs focus:ring-1 focus:ring-rose-400"
                      value={scriptPacing}
                      onChange={(e) => setScriptPacing(e.target.value)}
                      placeholder={t.scriptPacingPlaceholder}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.scriptToneLabel}</label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-xs focus:ring-1 focus:ring-rose-400"
                      value={scriptTone}
                      onChange={(e) => setScriptTone(e.target.value)}
                      placeholder={t.scriptTonePlaceholder}
                    />
                  </div>

                  {/* AI engine selection */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.coordinatingAgentLabel}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setScriptModel("gemini")}
                        className={`py-2 px-3 text-[11px] font-bold rounded-lg border transition-all text-center ${
                          scriptModel === "gemini" 
                            ? "bg-rose-50 border-rose-300 text-rose-700" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        Google Gemini (Free)
                      </button>
                      <button
                        type="button"
                        onClick={() => setScriptModel("openai")}
                        className={`py-2 px-3 text-[11px] font-bold rounded-lg border transition-all text-center ${
                          scriptModel === "openai" 
                            ? "bg-rose-50 border-rose-300 text-rose-700" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                        title={apiKeysStatus.openai ? "GPT-4o Mini Ready" : "Requires OPENAI_API_KEY"}
                      >
                        GPT-4o Mini Proxy
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isGeneratingScript}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    {isGeneratingScript ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        {t.btnGeneratingScript}
                      </>
                    ) : (
                      <>
                        <Video className="w-3.5 h-3.5" />
                        {t.btnGenerateScript}
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right results display for Script */}
              <div className="lg:col-span-8">
                {scriptError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-3xl p-5 mb-6 text-sm font-semibold flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
                    <div>
                      <p className="font-bold">{lang === "en" ? "Script Generation Error" : "Lỗi Tạo Kịch Bản"}</p>
                      <p className="text-xs text-rose-650 font-normal mt-0.5">{scriptError}</p>
                    </div>
                  </div>
                )}

                {scriptFallback && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-3xl p-5 mb-6 text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold">{lang === "en" ? "Dynamic Baseline Mode Active" : "Đang dùng Cơ sở dữ liệu Dự phòng"}</p>
                      <p className="text-xs text-amber-800 font-normal mt-0.5">
                        {lang === "en"
                          ? "Animation screenplay engines are currently at peak processing capacity (503 Service Unavailable). A complete, high-retention structured interactive cartoon script has been prepared for you offline."
                          : "Bộ máy kịch bản AI đang bận (503 Service). Chúng tôi đã cung cấp bản kịch bản nhịp độ mầm non đặc trưng, được thiết kế sẵn bám sát đề tài của bạn."}
                      </p>
                    </div>
                  </div>
                )}

                {generatedScript ? (
                  <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6 animate-fade-in">
                    
                    {/* Header meta */}
                    <div className="border-b border-slate-100 pb-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-rose-50 text-rose-700 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md">
                          👶 Target Segment: {generatedScript.targetAge}
                        </span>
                        <span className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase px-2.5 py-1 rounded-md">
                          ⏳ Duration Suggestion: {generatedScript.videoDuration}
                        </span>
                      </div>
                      <h4 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mt-3 font-sans">
                        🎬 {generatedScript.title}
                      </h4>
                      <p className="text-slate-400 text-xs mt-1.5 flex items-center gap-1.5">
                        <span>Baseline focus:</span>
                        <strong className="text-slate-700">{generatedScript.keyword}</strong>
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider block">📌 Master Narrative Concept & Moral Lessons:</h5>
                      <div className="bg-indigo-50/20 border border-indigo-100 rounded-2xl p-4 text-xs text-slate-600 leading-relaxed shadow-3xs text-balance">
                        {generatedScript.summary}
                      </div>
                    </div>

                    {/* Timeline of segments */}
                    <div className="space-y-6 pt-4">
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">📜 Detailed Segment Storyboards (Dialogue & Interactions)</h5>

                      <div className="space-y-6 border-l-2 border-indigo-100 pl-4 md:pl-6 ml-2">
                        {generatedScript.segments?.map((segment, idx) => (
                          <div id={`segment-card-${idx}`} key={idx} className="relative space-y-3">
                            
                            {/* Segment connector timeline dot */}
                            <div className="absolute -left-[25px] md:-left-[33px] bg-white border-2 border-indigo-500 rounded-full w-4 h-4 flex items-center justify-center">
                              <div className="bg-rose-500 rounded-full w-1.5 h-1.5"></div>
                            </div>

                            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 shadow-3xs hover:border-slate-250 transition-colors">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  segment.segmentType === "Hook" 
                                    ? "bg-rose-500 text-white" 
                                    : segment.segmentType === "Intro" 
                                      ? "bg-indigo-500 text-white" 
                                      : segment.segmentType === "Engagement"
                                        ? "bg-amber-500 text-white animate-pulse"
                                        : "bg-slate-205 text-slate-700"
                                }`}>
                                  {segment.segmentType || "Scene"}
                                </span>
                                <h6 className="text-slate-800 font-bold text-xs">{segment.sceneName}</h6>
                                <span className="bg-slate-100 text-slate-600 font-bold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ml-auto select-none">
                                  <Clock className="w-3 h-3" /> {segment.durationSeconds} seconds
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs md:text-sm">
                                <div className="md:col-span-8 space-y-3">
                                  {/* Voiceover block with play action */}
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-100 space-y-1 relative">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Voice-Over Dialogue (English):</span>
                                    <p className="text-slate-700 leading-relaxed font-sans">{segment.audioVoiceover}</p>
                                    
                                    {/* Web Speech API voice synthesis */}
                                    <button 
                                      onClick={() => {
                                        if ("speechSynthesis" in window) {
                                          const utterance = new SpeechSynthesisUtterance(segment.audioVoiceover);
                                          utterance.lang = "en-US"; // English voiceovers!
                                          utterance.rate = 0.85;
                                          window.speechSynthesis.cancel();
                                          window.speechSynthesis.speak(utterance);
                                        } else {
                                          alert("Your browser does not support Speech Synthesis API.");
                                        }
                                      }}
                                      className="absolute right-2.5 bottom-2.5 bg-slate-105 hover:bg-rose-500 hover:text-white text-slate-500 p-1.5 rounded-lg transition-all"
                                      title="Simulate / Pronounce Voiceover Dialogue"
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="md:col-span-4 space-y-2.5">
                                  <div className="p-3 bg-amber-50/30 rounded-xl space-y-0.5 border border-amber-100">
                                    <span className="text-[9px] font-bold text-amber-700 uppercase block">Scene Graphics Blueprint:</span>
                                    <p className="text-[11px] text-slate-650 leading-relaxed">{segment.visualDescription}</p>
                                  </div>

                                  <div className="p-3 bg-indigo-50/30 rounded-xl space-y-0.5 border border-indigo-100">
                                    <span className="text-[9px] font-bold text-indigo-700 uppercase block">Hero Animated Actions:</span>
                                    <p className="text-[11px] text-slate-650 leading-relaxed">{segment.animationAction}</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Copy Full script helper */}
                    <div className="pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h5 className="text-[11px] font-bold text-rose-600 uppercase tracking-widest block">🎤 Global Audio Style Directions:</h5>
                        <p className="text-slate-505 text-xs mt-0.5 leading-relaxed">{generatedScript.promptForVoiceover}</p>
                      </div>

                      <button
                        onClick={() => {
                          const fullScriptText = `GLOBAL KIDS CARTOON SCREENPLAY: ${generatedScript.title}\n\n` + 
                            `Narrative Summary: ${generatedScript.summary}\n\n` + 
                            generatedScript.segments.map((seg, i) => 
                              `SCENE ${i+1} (${seg.segmentType} - ${seg.durationSeconds}s):\n- Dialogue (English): ${seg.audioVoiceover}\n- Graphic Setting: ${seg.visualDescription}\n- Animated Gestures: ${seg.animationAction}`
                            ).join("\n\n");
                          copyToClipboard(fullScriptText, "full-script");
                        }}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs self-start"
                      >
                        {copyStates["full-script"] ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Screenplay Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Standard Script Format
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-150 p-16 text-center shadow-xs">
                    <Video className="w-12 h-12 text-slate-300 mx-auto mb-3 animate-bounce-slow" />
                    <h4 className="text-lg font-bold text-slate-700">No screenplay drafted yet</h4>
                    <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                      Fill in standard keywords on the parameters form on the left, then trigger "Assemble Screenplay" to render sequence cards instantly.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer information */}
      <footer id="page-footer" className="bg-slate-900 text-slate-400 border-t border-slate-800 py-12 mt-20 select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex justify-center items-center gap-2">
            <Sparkles className="w-5 h-5 text-rose-500" />
            <span className="text-white font-bold text-sm tracking-wider uppercase">ANIMATEKIDS BLUEPRINT ENGINE</span>
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Helping independent creative channels design preschool and toddler-friendly visual universes with top-tier AI orchestration.
          </p>
          <div className="text-[11px] text-slate-600">
            © 2026 YouTube Kids Animation Development Planner. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
