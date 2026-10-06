# From a hundred formats to one: converting Tibetan e-texts to Unicode XML

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Tibetan e-texts arrive as Word files, RTF files, legacy-font documents and PDFs with broken character maps. To be searchable, shareable and usable for AI, they all had to become **one clean Unicode XML format**. This deliverable ran for the whole project.

## At a glance

|                               |                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Files converted               | **14,539** (in 126 collections) by February; every available file (477 collections) by June 22 |
| Gold-standard corpus          | **1.9 GB → 6.1 GB** of XML (BDRC)                                                              |
| E-texts converted by our team | **~5.75 GB** cumulative (5 GB target met by end of May)                                        |
| ZIP files processed           | **233 of 333** in the first two months                                                         |
| Team                          | **1 developer plus 2 interns** at first, then a dedicated conversion developer                 |

![Cumulative converted e-texts](images/chart-d-conversion-cumulative.png)

## What we delivered

- A **normalized corpus** in a TEI/XML subset that preserves layout details such as line breaks and _yig chung_ (small letters), so models can later learn to restore them.
- A re-derived version of the **2017 corpus** in the new format, with corrupt files fixed and collections re-catalogued.
- New reference collections, including the **Nyingma Kama**, an important **Drikung Kagyu** collection and the **ACIP** database.
- Open-source tools: a **Python RTF parser** (none existed), a **PDF header/footer remover**, and a tool that **repairs the broken Unicode maps** inside Tibetan PDFs.

## Challenges, and how we overcame them

**PDF fonts that vanish.** Some fonts disappeared during PDF-to-XML conversion. We designed a dedicated glyph-handling workflow and a repair tool for the PDF character maps, which we documented and open-sourced.

**Parentheses turned into letters.** In some files "(" became a Tibetan letter. We corrected the mapping dictionary and added checks.

**Text in the wrong order.** Extraction sometimes scrambled segments. We revised the extraction logic and kept the page order intact.

**Many near-identical ZIP files.** Instead of converting each by hand, we wrote an automated "skill" that recognizes repeated folder structures and processes them in one go.

**Which converter?** After testing, **Microsoft Word** beat LibreOffice and Google Drive on large Tibetan files, so it became the primary engine, with intermediate formats (RTF, DOCX, PDF) where needed.

**Footers that slip through.** Our footer remover missed footers not directly preceded by a line break. We kept refining the logic and used a QC loop with BDRC to catch edge cases.

## Why it matters

This is the high-quality backbone of the corpus: typed text by people, normalized so that it can be shared with AI projects, imported into BDRC's e-text viewer and used in the cataloging tools.
