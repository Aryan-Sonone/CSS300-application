import React, { useState } from 'react'
import { motion } from 'framer-motion'

const pillarGrid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const pillarCard = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
}

import { Card, CardContent } from '../components/ui/Card'
import { 
  BookOpen, 
  Github, 
  ExternalLink, 
  Copy, 
  Check, 
  Database, 
  ShieldCheck, 
  Brain, 
  Award, 
  Cpu, 
  FileText, 
  Sparkles,
  Monitor,
  Share2
} from 'lucide-react'

export function AboutPage() {
  const [copied, setCopied] = useState(false)

  const bibtexCitation = `@article{sonone2026css300,
  title={CSS-300: A Multi-Dimensional Benchmark for Decomposing Source-Preference Sycophancy in Retrieval-Augmented Generation},
  author={Sonone, Aryan and Agarwal, Nikhil and Rajasekar, Vani},
  journal={Vellore Institute of Technology},
  year={2026},
  doi={10.5281/zenodo.20478137},
  url={https://doi.org/10.5281/zenodo.20478137}
}`

  const handleCopyBibtex = () => {
    navigator.clipboard.writeText(bibtexCitation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">

        {/* Hero Header */}
        <div className="relative p-8 rounded-3xl bg-surface border border-border shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-truth/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-4xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-truth/10 text-truth border border-truth/20">
                Dataset v1.0.1
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-thinking/10 text-thinking border border-thinking/20">
                CC BY 4.0 Licence
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-mono font-semibold bg-mid/10 text-mid border border-mid/20">
                MIT License Code
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-serif italic font-normal text-text tracking-tight leading-tight">
              CSS-300: Decomposing Source-Preference Sycophancy in RAG
            </h1>

            <p className="text-text text-sm sm:text-base leading-relaxed max-w-3xl">
              A multi-dimensional evaluation benchmark assessing LLM resilience against source conflict across 300 controlled pairs in 6 misinformation-prone domains.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://doi.org/10.5281/zenodo.20478137"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-bg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-accent/25 transition-all"
              >
                <Database className="w-4 h-4" />
                <span>Zenodo Repository</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>

              <a
                href="https://github.com/Aryan-Sonone/CSS300"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-border text-text border border-border text-xs font-semibold flex items-center gap-2 transition-all"
              >
                <Github className="w-4 h-4" />
                <span>GitHub Source</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          </div>
        </div>

        {/* Bento Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Three Pillars Framework */}
          <Card className="lg:col-span-2 bg-surface border border-border shadow-xl rounded-2xl">
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Brain className="w-5 h-5 text-truth" />
                <h2 className="text-lg font-bold text-text">Three Evaluation Pillars</h2>
              </div>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                variants={pillarGrid}
                initial="hidden"
                animate="show"
              >
                <motion.div variants={pillarCard} className="p-4 rounded-xl bg-surface-2 border border-border space-y-2">
                  <div className="text-xs font-mono font-bold text-thinking uppercase">Pillar 1 · Cognitive</div>
                  <h3 className="text-sm font-semibold text-text">Reasoning Dissonance</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Evaluates conflicts where models correctly resolve source evidence in reasoning traces but fail in final output generation.
                  </p>
                </motion.div>

                <motion.div variants={pillarCard} className="p-4 rounded-xl bg-surface-2 border border-border space-y-2">
                  <div className="text-xs font-mono font-bold text-mid uppercase">Pillar 2 · Social</div>
                  <h3 className="text-sm font-semibold text-text">Authority Sensitivity</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Measures susceptibility to social credential cues, driven by credential specificity rather than rank.
                  </p>
                </motion.div>

                <motion.div variants={pillarCard} className="p-4 rounded-xl bg-surface-2 border border-border space-y-2">
                  <div className="text-xs font-mono font-bold text-truth uppercase">Pillar 3 · Temporal</div>
                  <h3 className="text-sm font-semibold text-text">Memory Anchoring</h3>
                  <p className="text-xs text-muted leading-relaxed">
                    Quantifies temporal belief anchoring susceptibility, particularly pronounced in small/local model architectures.
                  </p>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>

          {/* Card 2: Authors & Affiliation */}
          <Card className="bg-surface border border-border shadow-xl rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Award className="w-5 h-5 text-mid" />
                <h2 className="text-lg font-bold text-text">Research Team</h2>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                  <div className="text-sm font-bold text-text">Aryan Sonone</div>
                  <div className="text-xs font-mono text-muted">Co-Author</div>
                </div>

                <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                  <div className="text-sm font-bold text-text">Nikhil Agarwal</div>
                  <div className="text-xs font-mono text-muted">Co-Author</div>
                </div>

                <div className="p-3 rounded-xl bg-surface-2 border border-border space-y-1">
                  <div className="text-sm font-bold text-text">Vani Rajasekar</div>
                  <div className="text-xs font-mono text-truth">Corresponding Author</div>
                </div>

                <p className="text-[11px] text-muted pt-1">
                  School of Computer Science and Engineering,<br />
                  Vellore Institute of Technology, Vellore, India.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Citation Snippet */}
          <Card className="lg:col-span-2 bg-surface border border-border shadow-xl rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-truth" />
                  <h2 className="text-lg font-bold text-text">Academic Citation</h2>
                </div>
                <button
                  onClick={handleCopyBibtex}
                  className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-border border border-border text-xs font-mono text-text flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-truth" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy BibTeX'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-surface-2 border border-border text-xs font-mono text-text overflow-x-auto leading-relaxed">
                {bibtexCitation}
              </pre>
            </CardContent>
          </Card>
        </div>

    </div>
  )
}