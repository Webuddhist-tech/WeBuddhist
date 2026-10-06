# Milestone 4: When the models landed (Jun – Jul 2026)

_Part 4 of the BEC series · [← Milestone 3](03-milestone-3-scaling-up.md) · [Overview](00-overview-building-the-bdrc-etext-corpus.md) · [Next: Milestone 5 →](05-milestone-5-toward-one-corpus.md)_

---

For months the teams had been collecting, aligning, annotating and checking. In June and July the payoff arrived: **OCR accuracy jumped**, the catalog grew to ten thousand volumes, and a whole family of Tibetan AI tools was published.

## At a glance

|                                    |                                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| Annotators                         | **~48 FTEs** (30 outlining, 15 Ume transcription, 3 line segmentation) plus a conversion developer |
| OCR error (BDRC benchmark)         | **down about 60%** vs. the previous models                                                         |
| Volumes outlined                   | **10,000** volumes, **186,300** texts                                                              |
| Uchen manuscript pages transcribed | **2,050**                                                                                          |
| Ume pages transcribed              | **3,000**                                                                                          |
| Line-segmentation pages corrected  | **1,413**                                                                                          |
| Volumes scanned                    | **263**                                                                                            |
| E-texts converted (cumulative)     | **5.42 GB** of XML                                                                                 |
| India volumes acquired for BDRC    | **1,526**, 150% of the original target                                                             |

## The headline: OCR errors fall by 60%

BDRC fine-tuned a new generation of OCR models on the training data our teams had spent months preparing: millions of aligned page images, line-segmentation data, and carefully transcribed Uchen and Ume pages. The results on the evaluation benchmark:

![OCR error improvement](images/chart-p4-cer-improvement.png)

- **Uchen:** average CER from **15.2% to 5.5%** (a 64% improvement)
- **Ume (manuscript):** average CER from **43.5% to 16.9%** (a 61% improvement)

The training set behind these models holds about **2.3 million page-text pairs** across 4,000 volumes. The OCR modelling was led by BDRC and its research partners, and our contribution was the data: the alignment, annotation and transcription work described in these posts.

## Script classifiers, ready to use

Our developers trained and published a family of classifiers, all fine-tuned from DINOv3 Small and used in an automated pipeline that can process the entire BDRC image archive in one pass:

![Script classifier accuracy](images/chart-p4-script-classifiers.png)

They include a **page-orientation classifier** that spots manuscripts scanned upside down, something that quietly hurts OCR. Wherever possible the models, datasets and code are on Hugging Face and GitHub.

## A new way to transcribe

For Ume manuscripts we built **Image Transcription v2**: two annotators transcribe each page independently, reviewers compare and fix, and a final reviewer locks in the approved version. The tool tracks every person's contribution and rejection rate, so quality is measurable rather than hoped for.

![Transcription tool](images/p4-transcription-tool-ume.jpg)

![Transcription review](images/p4-transcription-tool-review.jpg)

Using it, **3,000 Ume pages** were transcribed in the period, alongside **2,050 Uchen manuscript pages** from Mongolian library collections that target known OCR weak spots.

## Cataloging reaches ten thousand volumes

![Outline workflow dashboard at 10,000 documents](images/p4-outline-workflow-overview.jpg)

Thirty FTEs brought the cumulative total to **10,000 volumes and 186,300 individual texts**. We also trained three experimental models for the cataloging step:

- a **text-boundary detector** (ModernBERT), with a Micro recall of **0.85**, to help annotators find where texts begin and end
- a **title detector** and an **author detector**, built as pilots for extracting bibliographic data automatically

An early **OCR merger** was prototyped, combining output from three OCR systems.

## Challenges, and how we overcame them

**New annotators, new to online work.** Some new team members, including Bönpo Kushos recruited for their skill at reading Kungyig cursive, had little experience with digital forms and video calls. We trained them one to one on laptops and screened every candidate for Kungyig reading proficiency before they began.

**Terma titles and authors.** Treasure-text titles can be ambiguous, and treasure revealers are not the original authors. We agreed a protocol with BDRC for how to treat tertöns, reconstructed incomplete titles from BDRC's database, and added a final spot-check round.

**Monsoon and machines.** Power cuts, long commutes and a pecha scanner with worn rollers and unstable settings tested the scanning team. They still delivered **263 volumes** with consistent weekly output.

**Moving annotation standards.** When the line-segmentation annotation format changed, three annotators updated **1,413 pages** and a fourth review round was added so training data stayed precise.

**Next:** in Milestone 5, [four OCR engines become one text →](05-milestone-5-toward-one-corpus.md)
