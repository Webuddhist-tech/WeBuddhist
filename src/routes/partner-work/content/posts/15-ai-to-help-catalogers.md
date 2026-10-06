# Letting AI do the easy part: automatic text boundaries, titles and authors

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Every minute an annotator spends hunting for the end of a text is a minute not spent on hard judgment calls. Our developers built a set of tools and models that find text boundaries, titles and authors automatically, so human effort goes where it's needed.

## At a glance

|                       |                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------- |
| ai-text-outline       | Python package on PyPI, **95%+** success, **38** tests, **75%** cheaper per extraction |
| Boundary detection v2 | **0.8 F1** (trained on 16,000 documents; tested on 100)                                |
| First boundary model  | Micro recall **0.85**, F1 **0.73** on 30 documents                                     |
| Title model           | **58.9%** F1 (overlap IoU50) on a held-out test set                                    |
| Author model          | exact-string match **31.1%**, overlapping match **62.4%**                              |

![ai-text-outline improvements](images/chart-d-ai-text-outline.png)

## What we delivered

**ai-text-outline.** Reads a Tibetan text and returns where each section of its table of contents starts. Over six releases it grew from a proof of concept to a production tool that handles documents **ten times larger** (50 MB+), runs in about a second and needs manual review only half as often.

**Rule-based detection.** Simple rules built on blank pages, short pages, punctuation such as _yig mgo_ in mid-page and keywords, for volumes without a table of contents.

**Trained models.** A ModernBERT boundary detector (trained on one GPU in 25 hours, using negative-window sampling and focal loss because only 1 token in 639 is a boundary), then a v2 boundary model on 16,000 documents; plus LoRA-tuned title and author models as pilots.

**Benchmarks.** Public benchmark datasets for text-boundary detection and for converting page-level outlines into character-level ones, and a sanity-checker package that flags suspicious boundaries.

## Challenges, and how we overcame them

**Unreliable title matching.** Titles repeat inside documents, causing false matches. We switched to **page-number matching** with an LLM only to break ties, cutting false positives by 70%.

**Models and SDKs that change.** Model deprecations and a new SDK broke workflows. We added automatic model negotiation, migrated to the new SDK and moved to a cheaper, faster model.

**Too-big documents.** Texts over 5 MB overflowed model limits. A progressive slicing fallback now retries automatically.

**Pages with several texts.** BDRC's outlines are by page, but a page can hold several texts. We tried several methods to find breaks inside pages and measured them on a dedicated benchmark.

**Author offsets.** Author names sit deep in long texts, and the model can't count characters well. The lesson: extract the name with the model, then locate it with ordinary text search.

## Why it matters

Better automation shortens the cataloging queue and lets the final corpus scale to millions of pages.
