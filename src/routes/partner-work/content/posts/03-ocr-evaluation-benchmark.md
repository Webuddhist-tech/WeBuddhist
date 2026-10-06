# A yardstick for Tibetan OCR: the evaluation benchmark

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

How good is OCR for Tibetan, really? Nobody could say with confidence, because there was no fair test. We helped build one: a carefully curated benchmark of **1,066 pages**, transcribed by hand, plus a dashboard that compares OCR engines on it.

## At a glance

|                                |                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Benchmark pages                | **1,066**: 426 manuscripts, 364 blockprints (127+ printeries), 66 modern, 210 synthetic |
| Documented styles              | **7** main styles, ~**200** sub-styles                                                  |
| Pages transcribed and reviewed | **856** (all non-synthetic pages)                                                       |
| OCR engines compared           | **7**, in **35** runs, on ~1,070 images                                                 |
| Analysis dimensions            | **7** (script, category, technology, legibility, format, period, popularity)            |

![Benchmark composition](images/chart-p1-benchmark-composition.png)

## What we delivered

**Hand transcription at the highest standard.** Our team recruited and trained transcribers, wrote detailed transcription guidelines with examples (checked by BDRC) and hired specialists for manuscript script and Bonpo ritual texts. Every page was reviewed.

![A benchmark page being transcribed](images/p1-benchmark-transcription.jpg)

**An interactive dashboard.** A portable, single-file tool with heatmaps and leaderboards compares engines such as Gemini, Google Vision, Transkribus, Qwen, Dots and PaddleOCR across all dimensions.

**Evidence about earlier models.** A 631-image evaluation of three earlier BDRC models showed clear specialization: the woodblock model reached 14% character error on metal-type prints but 51% on manuscripts, while the Ume Druma model did best on manuscripts.

![Earlier BDRC models by material](images/chart-d-benchmark-bdrc-models.png)

## Challenges, and how we overcame them

**A score that depends on where you look.** Error rates can exceed 100% when an engine inserts a lot of text, and the dashboard capped them at 100%, so numbers looked different in different places. We standardized the reporting so engines can be compared fairly.

**Engines that only handle certain scripts.** Some of those rules were hard-coded. Splitting the system into a data-generation part and a display part limits the damage: scores can be recalculated without breaking the dashboard.

**Slow re-runs.** The pipeline remembers finished work and only processes new files, with a "force" option to re-run everything.

## Why it matters

The benchmark made progress measurable. It is what showed, months later, that new models cut Uchen errors from 15.2% to 5.5% and Ume errors from 43.5% to 16.9%, and it is intended to give OCR developers a reason to support Tibetan better.
