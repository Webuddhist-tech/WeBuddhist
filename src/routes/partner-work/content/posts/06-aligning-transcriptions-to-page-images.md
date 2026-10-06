# Matching text to pictures: line-by-line alignment of existing transcriptions

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Decades of careful Tibetan transcription exist, but often without a link to the page images they came from. To train OCR, each page of text has to be matched to the right page image, and ideally each line to the right line. Our annotators did this at scale.

## At a glance

|                                             |                                                   |
| ------------------------------------------- | ------------------------------------------------- |
| Images aligned in the first push            | **34,969** (woodblocks and Ume manuscripts)       |
| ACIP pages line-aligned                     | **84,000** (83% of the whole ACIP corpus matched) |
| Pages aligned line by line in P3            | **17,813** (4 FTE annotators)                     |
| Images aligned in total by mid-2026         | **136,254** (including 87,248 from ACIP)          |
| Ume pages with line breaks inserted by hand | **21,392**                                        |

![Sources of the first aligned images](images/chart-d-alignment-sources.png)

## What we delivered

A trained team aligned transcriptions to images from several sources: partner e-text projects, transcriptions commissioned by BDRC, a Tibetan publishing house's Ume transcriptions, and data from an academic partner. The ACIP database, a key reference for Gelugpa texts, got its own team of four annotators.

![ACIP page alignment](images/p2-acip-page-alignment.jpg)

_Aligning text to image lines: the circles mark spots needing reconciliation._

For Ume pages whose transcriptions had no line breaks, annotators inserted them, and they also removed pages whose transcription was too weak to train on.

## Challenges, and how we overcame them

**ACIP's catalog was messy.** Before alignment could start, a dedicated sub-team cleaned up the catalog. That investment kept the rest of the work efficient.

**Poor scans.** 37% of ACIP pages were unusable because of scan quality, yet 83% of the entire corpus was matched, around 132% of the processable portion.

**Inconsistent transcriptions.** Some had "improved" text or expanded abbreviations. Annotators removed doubtful pairs, and the team documented what was kept.

**Blank images and mismatches.** Blank images, unreadable scans and typed text that didn't match the page were corrected or removed, in close contact with BDRC.

## Why it matters

Diversity is what makes OCR robust. These pairs brought woodblock and manuscript styles that no earlier dataset had, directly feeding the training data behind BDRC's new models.
