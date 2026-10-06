# Taking stock: cataloging and harvesting a decade of Tibetan e-texts

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Before you can build a corpus, you have to know what you already have. For ten years, Tibetan e-texts had piled up from websites, social-media groups, monasteries and earlier projects, in every format imaginable. Our first deliverable was to turn that pile into a **map**.

## At a glance

|                                    |                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Collection catalogues completed    | **8** (4.5 of them in a single two-month period, against a target of 2) |
| Volumes catalogued                 | **~6,800** in the first pass; **62,474 files** catalogued by mid-2026   |
| PDF files harvested from the web   | **14,292**                                                              |
| Usable e-text files after cleaning | **3,446** from the first harvest                                        |
| Major websites scraped             | **6**, plus **5** Dharma e-book libraries                               |
| Team                               | **5 catalogers** (plus our developers for harvesting)                   |

## What we delivered

**A catalog of every e-text collection.** Five catalogers went collection by collection, recording for each file the name of the collection, its BDRC ID where one exists, the quality of the file (published text, unpublished input or reviewed OCR) and its volume and text number. They finished **eight catalogues**, well ahead of the plan, and the result tells BDRC which collections matter most and which are duplicates of one another.

**A harvest from the open web.** We pulled **14,292 PDF files** from social-media groups and websites. After removing duplicates, very short files (under 40 pages) and plain scans, **3,446** files were ready to be converted. Later we scraped six major sites and five large Dharma e-book libraries, and delivered everything to BDRC's servers.

![From the web to usable e-texts](images/chart-d-harvest-funnel.png)

## Challenges, and how we overcame them

**Hard-to-match texts.** Some texts were poorly scanned or cut in the wrong place, which made them tough to match against BDRC's records. Catalogers cross-referenced image numbers and BDRC's database entries to match them, and skipped what could not be found.

**Fewer files than expected on social media.** Buddhist texts were being shared in smaller numbers than in the past. We pivoted toward direct exchange with monasteries and publishers and toward partner datasets.

**A different scraper for every website.** Writing custom scrapers for each site was slow. We switched to a scraping API, which saved developer time and let us deliver much faster.

## Why it matters

This catalog is the foundation of the gold-standard corpus. It showed which collections deserve priority for conversion and, because the same texts are published by many monasteries, it makes it possible to find duplicates and focus effort on what is unique.
