# Milestone 2: Tools and teams (Feb – Mar 2026)

_Part 2 of the BEC series · [← Milestone 1](01-milestone-1-laying-the-foundation.md) · [Overview](00-overview-building-the-bdrc-etext-corpus.md) · [Next: Milestone 3 →](03-milestone-3-scaling-up.md)_

---

In its second bi-monthly period the project moved from planning to production. Seventeen workstreams ran in parallel, and on the main measures our teams beat the targets set for the period.

## At a glance

|                                |                                                                                                       |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Annotators and field staff     | **~51** across catalogers, outliners, scanners, script classifiers and aligners (plus 3 coordinators) |
| Training pages consolidated    | **1,991,405** aligned pages in **3,689** files from 6 collections                                     |
| ACIP pages line-aligned        | **84,000** (83% of the whole corpus matched)                                                          |
| Volumes scanned                | **374** (target: 250); 553 cumulative                                                                 |
| Collection catalogues finished | **4.5** (target: 2); 8 in total                                                                       |
| Volumes outlined               | **907**, with **10,838** works found                                                                  |
| Benchmark engines compared     | **7 OCR engines, 35 runs, ~1,070 images**                                                             |

![Delivered versus target](images/chart-p2-delivery-vs-target.png)

## The teams

- **5 catalogers** finished 4.5 collection catalogues, more than twice the target.
- **20 annotators** (9 full-time, 11 part-time) with 3 coordinators started outlining volumes.
- **14 people** (10 annotators and 4 reviewers) learned to tell Ume manuscript scripts apart.
- **4 annotators** aligned the ACIP database page by page.
- **Scanning crews** worked in parallel at Dzongsar (2 annotators) and Sherab Ling (5 annotators and a coordinator).

![Script classification batch tool](images/p2-script-batches-tool.jpg)

_The batch tool our team built to hand out script-classification work and track progress._

## Achievement highlights

### Nearly two million training pages

Our pipeline pairs transcription pages with scan images from six major collections (Derge Kangyur and Tengyur, Lhasa Kangyur, Lithang Kangyur, Narthang Tengyur, Namgyal) and scores each pair against Google Vision's OCR, so weak pairs can be filtered out. The result: **1,991,405 aligned pages** ready for model training.

### Tools that others can use

- **ai-text-outline**, a Python package that finds a Tibetan text's table of contents with Gemini. Over six releases it grew from 5 to **38 tests**, now handles documents of **50 MB+** (ten times more), costs **75% less** per extraction, and reaches **over 95% success**. It is on PyPI.
- A **layout benchmark** of 313 Tibetan book pages and 2,795 pre-annotated images, with nine off-the-shelf models tested. The best (Surya) scored 82.2% mAP, and large vision-language models did **not** beat purpose-built ones.
- **7 KenLM language models** trained on gold-standard corpora, with an analysis showing when perplexity can and cannot be trusted as an OCR-quality signal.
- An **OCR benchmark dashboard** with heatmaps and leaderboards for seven engines.

### ACIP, nearly all of it

Aligning the ACIP database to scanned pages was a big win: **84,000 pages** were line-aligned. 37% of received pages were unusable because of scan quality, yet **83% of the entire corpus** was still matched.

![ACIP page alignment](images/p2-acip-page-alignment.jpg)

_Aligning transcription to image lines: the circled spots are where text and scan needed reconciling._

## Challenges, and how we overcame them

**Messy data from the web.** Adarsha, a key source of transcriptions, has no download option. We built a crawler to copy it once, fixed its different volume ordering with a remapping table, and handled chapter files that split pages in two.

**A confusing score.** OCR error rates (CER) can exceed 100% when a system inserts too much, which made the benchmark dashboard misleading. We standardized the reporting so engines could be compared fairly.

**Two jobs in one step.** In the outlining workflow annotators had to split texts, identify titles and authors _and_ link them to BDRC's database, which led to duplicate records. We split it into two steps: segmentation first, linking by reviewers second.

**Tool adoption.** Annotators often preferred asking a person to using the built-in feedback hub, so we held weekly screen-sharing sessions and kept coordinators close.

**Scanning in the field.** Page-turning scanners needed constant glass cleaning, internet was patchy and the paperwork took time. We processed offline, uploaded at night, and still scanned **374 books against a target of 250**.

**Converting files.** After comparing converters, we chose Microsoft Word as the primary engine for large Tibetan files and wrote an automated "skill" for repeated folder patterns: **233 of 333 ZIP files** were converted by the end of the period. Harvesting also sped up when we replaced hand-written scrapers with a scraping API for six major sites.

![Scanning in a monastic library](images/p2-scanning-pecha-bundles.jpg)

_Pecha bundles ready for scanning._

![Volumes stacked and ready](images/p2-scanning-volumes-ready.jpg)

**Next:** in Milestone 3, [the project scales to more than 44 full-time annotators →](03-milestone-3-scaling-up.md)
