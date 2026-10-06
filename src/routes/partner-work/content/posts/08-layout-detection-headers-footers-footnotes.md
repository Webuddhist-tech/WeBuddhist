# Finding the main text: header, footer and footnote detection

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

In modern Tibetan books, running headers, page numbers and footnotes get mixed into the OCR output and spoil the text. We built a benchmark, evaluated models, trained our own detector and shipped tools that strip the noise.

## At a glance

|                             |                                                        |
| --------------------------- | ------------------------------------------------------ |
| Benchmark                   | **313** diverse pages, in YOLO format, on Hugging Face |
| Annotated training images   | **2,795** (four classes)                               |
| Off-the-shelf models tested | **9**                                                  |
| Best off-the-shelf result   | **82.2% mAP@0.5** (Surya)                              |
| Our fine-tuned model        | YOLO26m on our custom data                             |

![The four classes](images/chart-d-layout-classes.png)

## What we delivered

- A **layout benchmark and training set** for Tibetan books with four classes: header, main text area, footnote and footer.
- A standard **YOLO format** for all layout data, with code to read and write it.
- An **evaluation pipeline** and a comparison of nine models (Surya, PaddleLayout, DocLayout-YOLO, YOLO11 variants, vision-language models including Gemini).
- A **fine-tuned model** for Tibetan modern book layout, and the **HFF-Remover** header/footer stripper, released open source.

## Challenges, and how we overcame them

**No public data existed.** There was no Tibetan book layout data to train or test on. We annotated it ourselves; since no dedicated annotators were available at first, developers did the first batches.

**Everyone used different formats.** Time was wasted converting data between formats, so we standardized on YOLO.

**Models hard to run.** Setting up one vision-language model took effort because of thin documentation.

**A wrong assumption.** We expected vision-language models to beat conventional detectors. In practice they didn't, and the purpose-built detector won, which saved effort later.

## Why it matters

Clean main text means cleaner OCR output for modern publications, the most accurate source in the corpus.
