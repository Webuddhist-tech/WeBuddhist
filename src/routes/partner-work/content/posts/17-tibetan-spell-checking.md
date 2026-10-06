# Teaching a model to proofread Tibetan: spell-checking and formatting data

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Even the best OCR leaves some errors. A Tibetan spell-checker catches what voting can't. This deliverable built the training data, tried three approaches and picked a winner.

## At a glance

|                     |                                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| Training pairs      | **92,266** (82,037 for training), nine error types                           |
| Test set            | **3,839** pairs                                                              |
| Winner              | **ByT5 (v12b)**, correction F1 **0.654**, exact match **0.587**              |
| Approaches compared | encoder-based **TiSpell**, **ByT5**, Gemini baseline                         |
| Formatting data     | training sets for detecting verses, chapters and other structure             |
| Team                | 1 annotator FTE for spell-check data, 1 for formatting data, plus developers |

## What we delivered

- A **method and code** (TiSpell) for generating spell-checking data: real-looking OCR errors paired with correct text across nine error types.
- **Three trained approaches:** encoder models (copy-gate and semi-mask variants on RoBERTa), ByT5, including a Tibetan-pretrained checkpoint, and a Gemini API baseline.
- A **formatting dataset** for models that will restore verse and chapter structure.

## Challenges, and how we overcame them

**Which approach really works?** The Gemini baseline detected individual errors well, but only ByT5 scored best on **real OCR errors**, so we used that as the pipeline model.

**Evaluating honestly.** We used a held-out test set and reported correction F1 and exact match rather than detection alone.

## Why it matters

Spell-checking and formatting are among the last steps before a text can be published as a clean, readable edition.
