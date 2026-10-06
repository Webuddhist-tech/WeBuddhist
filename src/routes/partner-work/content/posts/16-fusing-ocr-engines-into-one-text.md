# Four OCR engines, one text: fusion and majority voting

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Different OCR engines make different mistakes. If three of four agree on a character, they are probably right. We built a pipeline that applies that idea to Tibetan, producing a single best text for each page and each work.

## At a glance

|                                              |                                                     |
| -------------------------------------------- | --------------------------------------------------- |
| Engines merged                               | **4**: BDRC OCR, Qwen OCR, Google Vision, PaddleOCR |
| Pages evaluated                              | **4,119**                                           |
| Tibetan pages that received a consensus vote | **97.6%**                                           |
| Pages needing single-engine fallback         | **2.5% → 0.2%** (9 of 4,070 Tibetan pages)          |
| Consensus tool                               | **Pydurma 2.0**, producing 1 majority text per work |

![The fusion pipeline](images/chart-d-fusion-pipeline.png)

![Fallback rate](images/chart-p5-ocr-fusion-fallback.png)

## What we delivered

An early **rule-based merger** of three engines grew into a documented **fusion pipeline**: pages are routed by script, each engine is checked by its own hallucination detector, and the survivors are combined by token-level majority voting. **Pydurma 2.0**, the open-source consensus tool, was upgraded and run to produce a majority text per work.

## Challenges, and how we overcame them

**Engines that invent text.** Some models repeat or hallucinate on difficult pages. Per-engine detectors discard those outputs before voting.

**Not every engine suits every page.** Script classification routes each page to the engines most likely to read it well.

## Why it matters

Fusion turns several imperfect OCRs into one far more reliable text, the core of the "silver standard" corpus.
