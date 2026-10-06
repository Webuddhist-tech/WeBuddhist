# Milestone 5: Toward one corpus (Aug – Sep 2026)

_Part 5 of the BEC series · [← Milestone 4](04-milestone-4-models-land.md) · [Overview](00-overview-building-the-bdrc-etext-corpus.md)_

---

The first four milestones produced raw material: converted e-texts, OCR output, catalogs and models. Milestone 5 started to answer the central question of the project: **how do we turn many noisy versions of a text into one trustworthy one?**

## At a glance

|                                    |                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Annotators                         | **~49 FTEs** (30 outlining, 13 Ume transcription, plus author correction, outline-model and spell-check data teams) |
| Developers                         | **~5 FTEs** across tools, models and conversion                                                                     |
| Ume pages transcribed              | **2,081** (target 2,000); **5,081** across Milestones 4 and 5                                                       |
| Pages used to compare OCR fusion   | **4,119**                                                                                                           |
| Pages getting a majority-vote text | **97.6%** of Tibetan pages                                                                                          |
| Text-boundary model                | **0.8 F1**, trained on 16,000 documents                                                                             |
| Spell-checking training pairs      | **92,266**                                                                                                          |
| E-texts converted (cumulative)     | **~5.75 GB** of XML                                                                                                 |

_Staffing figures are the planned FTE counts from the period agreement._

## Achievement 1: Four OCR engines, one text

Different OCR engines make different mistakes. Our developers built a **fusion pipeline** that merges four of them (BDRC OCR, Qwen OCR, Google Vision and PaddleOCR):

1. Each page is **routed by script type**, using the script classifiers from Milestone 4.
2. Each engine's output is checked by a **hallucination detector**, which catches cases where a model invents repetitive text.
3. The surviving outputs are combined by **token-level majority voting** using Pydurma, our open-source consensus tool, which we also upgraded to **Pydurma 2.0**.

On 4,119 pages, **97.6% of Tibetan pages now receive a consensus vote** rather than relying on one engine. The need to fall back on classical engines dropped from **2.5% to 0.2%**: only 9 of 4,070 Tibetan pages.

![Fallback rate](images/chart-p5-ocr-fusion-fallback.png)

## Achievement 2: Two ways to transcribe, compared with data

We finished the last 2,081 Ume pages with 13 FTE annotators, bringing the total to **5,081 pages**. We also built **Image Transcription v3**, which uses a different workflow, and ran both tools on the same 385-page batch to compare them:

- **v2:** two annotators, two reviewers and a final reviewer (5 people per page)
- **v3:** three annotators and one reviewer (4 people per page)

![Workflow comparison](images/chart-p5-itv2-vs-itv3.png)

v2 was more accurate (annotation error **3.77% vs. 4.87%**; agreement **0.939 vs. 0.922**) and had fewer rejections. v3 was simpler, which reviewers liked. Cost per page was nearly identical. Rather than guess, the team now has evidence for choosing a workflow in future projects, and published the comparison.

## Achievement 3: Better boundaries and a first Tibetan spell-checker

- **Text-boundary detection v2:** BDRC's page-level outlines were converted to character-level outlines, giving enough training data to train a new model on **16,000 documents**. It scores **0.8 F1** on a 100-document benchmark. A sanity-checker package flags suspicious boundaries.
- **Spell-checking:** from **92,266 training pairs** covering nine error types, we compared three approaches. **ByT5** came out on top at **0.654 correction F1**, even though a general-purpose model detected individual errors well.

## Achievement 4: A thirty-person cataloging operation, kept running

Throughout August and September the **Outliner** supported 30 annotators, with a developer maintaining and improving it. Another **332 MB** of e-texts was converted, taking the total past **5.75 GB**.

## Challenges, and how we overcame them

**Not all engines are equally trustworthy.** Some models hallucinate repeated text when a page is difficult. We added a per-engine hallucination detector and script-aware routing so a faulty output is dropped before voting.

**One-page outlines, character-level texts.** BDRC's earlier outlines are by page, but a page often contains several texts. We tested several methods to locate breaks inside pages and built a benchmark to compare them.

**Choosing a workflow with data.** Instead of debating transcription methods, we ran both on the same pages and measured error, agreement, rejection rate and time.

## The road to the final corpus

With a fusion pipeline, a consensus tool, a boundary model and a first spell-checker, the pieces for one best text per work now exist. The last stretch (October and November) will deduplicate versions with the help of **15 annotators**, run Pydurma on every cluster of versions, extract bibliographic information, spell-check and format the texts, and publish them, with a goal of **5,000 texts on Wikisource** plus updated metadata on WikiData.

Thank you for following along: to BDRC, the Khyentse Foundation, and every annotator, scanner, reviewer and developer who made these milestones real.

_Back to the [overview](00-overview-building-the-bdrc-etext-corpus.md)._
