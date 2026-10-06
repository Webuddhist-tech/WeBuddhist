# A free, fast OCR option: training Tesseract for Tibetan Uchen

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Tesseract is the quiet workhorse of open-source OCR. Websites such as archive.org and countless PDF workflows use it because it is cheap and fast. Our deliverable: a better Tibetan Uchen model for it.

## At a glance

|                              |                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Training data                | **~100,000** Uchen line images (96K train, 12K validation, 12K test)         |
| Error rate after fine-tuning | **9.7% CER** on held-out test lines                                          |
| On the 1,066-page benchmark  | **43% CER**, versus **54%** for the earlier Tibetan model (about 20% better) |
| Where to get it              | Hugging Face (BDRC/Bod_uchen_tesseract)                                      |

![Tesseract error rates](images/chart-d-tesseract.png)

## What we did

We started from the best existing Tibetan base model and fine-tuned it on line-to-text data, mostly from the MonlamAI project. Because Tesseract reads one line at a time, we didn't need the page-level preprocessing that other models require.

## Challenges, and how we overcame them

**Why two numbers?** The 9.7% result is on clean line images from the training data's own distribution; the 43% figure is on the tougher, more diverse benchmark pages. Both are real, and the gap shows why a diverse benchmark matters.

**A ceiling we can't lift.** Tesseract's page-layout stage limits what any model can do, and that part can't be changed. So we focused on what we could: a better recognition model.

## Why it matters

Newer vision-language models are much more accurate, but heavier. A modest, open Tesseract model keeps good-enough Tibetan OCR available to anyone with a laptop.
