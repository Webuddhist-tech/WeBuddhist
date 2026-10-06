# Two million pages, one format: consolidating OCR training data

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Good OCR models need enormous amounts of well-organized training data. Tibetan data existed, but it was scattered across projects, websites and formats. We built a pipeline that gathers it, pairs every transcription with its page image and publishes it in a single standard format.

## At a glance

|                                                |                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Aligned pages                                  | **1,991,405** in **3,689** parquet files                                                     |
| Collections                                    | **6** (Derge Kangyur and Tengyur, Lhasa Kangyur, Lithang Kangyur, Narthang Tengyur, Namgyal) |
| Training set built from this work and partners | **~2.3M** page–text pairs in ~4,000 volumes (BDRC)                                           |

![Aligned pages per collection](images/chart-d-consolidation-pages.png)

## How the pipeline works

1. **Collect image information:** page images, page numbers and the existing Google Vision OCR text for each image.
2. **Collect transcriptions:** from structured TEI/XML (Esukhia, ACIP), web pages (Adarsha) or Transkribus PageXML (Namgyal), cleaned down to plain Tibetan text.
3. **Pair them:** each transcription page is matched to its scan image by page number and given a **quality score** by comparing it with the OCR, so weak pairs can be filtered.
4. **Publish:** parquet files on S3, plus catalog files that list every volume and every matched pair.

## Challenges, and how we overcame them

| Challenge                                              | Solution                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Adarsha has no download option                         | Built a crawler that copies the data once to BDRC's servers                                           |
| Web formatting and editorial notes mixed into the text | A cleaning step removes markup, bracketed notes and special symbols but keeps all Tibetan text        |
| Adarsha numbers Derge Kangyur volumes differently      | A remapping table translates volume numbers before matching                                           |
| Chapters split pages in half                           | Removed the first and last page of each chapter file and the blank first page of each volume          |
| Page-header marks removed from transcriptions          | Restored from the OCR so models still learn them                                                      |
| Odd page numbering (restarts, duplicates, gaps)        | Section tracking and a convention for duplicates; gaps skipped                                        |
| Output format kept changing                            | Publishing is a separate layer, uploaded volume by volume, with catalogs rewritten without duplicates |

## Why it matters

New collections can now be added with little effort, and any OCR team can train on the data. The pipeline is documented so that remaining collections (such as TibSchol and PaganTibet) can follow.
