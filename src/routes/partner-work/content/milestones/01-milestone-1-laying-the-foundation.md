# Milestone 1: Laying the foundation (Dec 2025 – Jan 2026)

_Part 1 of the BEC series · [Overview](00-overview-building-the-bdrc-etext-corpus.md) · [Next: Milestone 2 →](02-milestone-2-tools-and-teams.md)_

---

Every big project has a quiet first chapter where nothing looks dramatic from the outside and everything depends on what gets built. For the BDRC E-Text Corpus, that chapter ran from December 2025 to the start of 2026 (with figures here counted up to mid-February, when BDRC's first period report closed).

The goal was simple to state: **find out exactly what we have, and get the machinery ready to improve it.**

## At a glance

|                                          |                                                      |
| ---------------------------------------- | ---------------------------------------------------- |
| Archive images with OCR output           | **26.2 million**                                     |
| Benchmark pages curated                  | **1,066**, across 7 main scripts and ~200 sub-styles |
| Pages aligned to existing transcriptions | **34,969**                                           |
| E-text files converted to Unicode XML    | **14,539**, in 126 collections                       |
| Gold-standard corpus                     | **1.9 GB → 3.4 GB**                                  |
| E-text volumes cataloged                 | **~6,800**                                           |
| Library catalogues prepared for scanning | **3 libraries, ~25,000 volumes**                     |

## Achievement 1: A gold standard that finally has a shape

For years, Tibetan e-texts had been collected from websites, social media groups, monasteries and old projects. Nobody had a clear picture of what was there. Our team cataloged the material at collection and volume level (about **6,800 volumes**) and harvested **14,292 PDF files** from the web. After removing duplicates, very short files and plain scans, **3,446** usable e-text files were left for conversion.

Then the conversion itself: **14,539 files in 126 collections** were normalized into one Unicode XML format. A small team of one developer and two interns carried it, and the corpus grew from 1.9 GB to **3.4 GB**. It now includes reference collections that were missing before, such as the Nyingma Kama, an important Drikung Kagyu collection and the ACIP database.

![Benchmark composition](images/chart-p1-benchmark-composition.png)

## Achievement 2: A benchmark that tells the truth

You can't improve what you can't measure. With a paleography expert, BDRC selected **1,066 benchmark pages** representing the real diversity of Tibetan writing: **426 manuscript pages, 364 blockprint pages from over 127 printeries, 66 modern pages** and **210 synthetic images**. Our transcription team, trained on detailed guidelines and supported by specialists in manuscript script and Bonpo ritual texts, typed out the ground truth. By mid-February **705 pages** were fully reviewed; by the end of the month, all **856** non-synthetic pages were done.

![A benchmark page being transcribed](images/p1-benchmark-transcription.jpg)

_The benchmark transcription work: every character checked against the original page._

## Achievement 3: OCR at archive scale

BDRC and its partners ran OCR across the entire Tibetan archive, so that every image has at least a baseline text.

![OCR scale](images/chart-p1-ocr-scale.png)

On top of that, our developers built a **quality-assessment method** that asks, without any human reference, "does this OCR output look like normal Tibetan?" It uses a Tibetan language model (KenLM) and was applied to all **26,234,612** images. Early signals: BDRC's own model beat Google Vision on blockprints, while Google's output on manuscripts was workable.

Another good surprise: far more page-level transcriptions turned out to be available than expected. Our annotators aligned **34,969 images** of woodblocks and manuscripts with existing transcriptions, drawing on several partner sources, and sent them on as training data.

## Achievement 4: Ground prepared for scanning and cataloging

- **Scanning:** we produced catalogues for three monastic libraries (Gyuto Library, Sherab Ling Library and Sherab Ling University Library, **about 25,000 volumes**) and, together with BDRC, selected the first **442 volumes** to scan. **191 volumes** were already scanned by mid-February.
- **Outline tool:** the core of the tool our annotators would use to mark where each text begins and ends was built, with a front end by our developers and a back end by BDRC's engineers. User testing began in late February.

## Challenges, and how we overcame them

| Challenge                                                                         | What we did                                                                                                                      |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| No off-the-shelf tool removed headers and footers from Tibetan PDFs               | We built our own PDF header/footer remover and released it as open source, and started annotating images to train a layout model |
| No Python parser existed for old RTF e-text files                                 | We wrote one and published it                                                                                                    |
| Text extraction from Unicode PDFs is sometimes close to impossible                | We prioritized diversity and the largest collections first, rather than perfecting every file                                    |
| Less variety than expected in the gold corpus; fewer texts shared on social media | We shifted toward direct contact with monasteries and publishers and toward partner datasets                                     |
| A first OCR architecture missed characters at the edges of long lines             | BDRC's OCR engineers fixed it; combined with other changes it improved accuracy by an estimated 10%                              |

## What this milestone made possible

By the end of this phase we knew the shape of the archive, had a trustworthy yardstick for OCR, and had the first tools in annotators' hands. Everything that followed built on it.

**Next:** in Milestone 2, [the teams grow and the tools meet real users →](02-milestone-2-tools-and-teams.md)
