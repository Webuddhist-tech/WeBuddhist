# Can you grade OCR without an answer key? Quality assessment with Tibetan language models

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Hand-checked benchmarks are precious but small. To judge OCR output on **26 million** images, we needed a "blind" test: does this output look like normal Tibetan? Our developers built one with statistical language models.

## At a glance

|                                         |                                                        |
| --------------------------------------- | ------------------------------------------------------ |
| Language models trained                 | **7** KenLM models plus SentencePiece tokenizers       |
| Gold-standard volumes used for training | **1,038** across 8 collections                         |
| Images the method was applied to        | **26,234,612** (every Tibetan image in BDRC's archive) |
| Developers                              | **1** (supervised by BDRC)                             |

![Training corpora](images/chart-d-kenlm-corpus.png)

## What we delivered

- A **corpus-preparation pipeline** and **seven KenLM models**, trained on classical and contemporary collections (Bon Kangyur, Derge Kangyur and Tengyur, Tsadra and Dharma e-books, Rinchen Terzod, Drilug Bangzod and more).
- A **correlation study** of OCR error rate against perplexity, confidence indexes and entropy, for several OCR systems.
- Open models and code on Hugging Face and GitHub.

## What we learned

The method gives a useful signal only in a certain range (roughly 15–40% error), and it works well for BDRC's first-generation OCR and Google Vision. It does **not** work for large vision-language models, because their strong language component "normalizes" the text and hides errors. Confidence scores from Gemini showed no correlation with real error, and Google Vision's had medium correlation. The practical advice for the project: use perplexity to triage older OCR, and rely on the benchmark for new models.

## Challenges, and how we overcame them

**Finding clean training text.** Gold-standard collections were hard to gather. With help from BDRC's technical lead we assembled a diverse set.

**Noise in the corpus.** Unexpected noise showed up, so we iterated on normalization and tokenization after each training round, folding in feedback from BDRC.

## Why it matters

It showed where first-generation OCR was weakest and shaped decisions about which pages needed human attention, and the findings tell the community where this kind of evaluation can and cannot be trusted.
