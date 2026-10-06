# Teaching machines to see lines: line-segmentation annotation

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Before a page can be read, it has to be cut into lines, and Tibetan pecha pages, with their long, thin lines and margin notes, are hard for generic tools. Better line detection means better OCR. We built the training data to improve it.

## At a glance

|                 |                                                                               |
| --------------- | ----------------------------------------------------------------------------- |
| Pages annotated | **1,413** carefully selected open-access images                               |
| Team            | **3 FTE annotators**, with a 4th review round                                 |
| Platform        | Transkribus (regions, baselines and full line polygons)                       |
| Tools evaluated | Transkribus and alternatives, with workflow guides in **English and Tibetan** |

![Line detection on a pecha page](images/p2-line-detection.jpg)

## What we delivered

- A **platform choice** (Transkribus), after research and a requirements session with BDRC's OCR specialists, and trained annotators.
- **1,413 pages** annotated with text regions (main text vs. margins and illustrations), baselines and line polygons.
- **Written guidelines in English and Tibetan**, which made later batches smoother.
- A data set intended for open publication and for training line-detection models.

## Challenges, and how we overcame them

**The rules changed mid-project.** After the first three batches were nearly done, the annotation process was revised. We retrained the team with updated explanations and a new guide, and the four batches already finished got a second round of annotation as a quality pass.

**A new annotation format.** Later, when the format was updated again, three annotators corrected all 1,413 pages to the new schema, and a **fourth review round** audited the corrected line boundaries before delivery.

**Learning vowels.** Models that read lines need vowel-sensitive transcription, so training focused on the complexities of Tibetan vowels and line handling. Questions were solved in the team chat and with coordinators.

## Why it matters

Cutting a page into lines was identified as one of the weak spots of the first-generation OCR pipeline. This dataset gives BDRC the precise, consistent ground truth needed to improve it.
