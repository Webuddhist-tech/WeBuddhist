# Reading the handwriting: classifying Tibetan manuscript scripts

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

Tibetan manuscripts are written in many hands (Uchen, Druma, Danyig, Pedri, Tsugdri, Gyuyig and others), and OCR does far better on some than others. To target improvements, BDRC needed to know which script each of **millions of manuscript images** was written in. We built the tool, trained the annotators and then taught machines to do it.

## At a glance

|                           |                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| Images classified by hand | **~33,000** (23,086 counted in our P3 report)                                                       |
| Team                      | **14 people** at the start (10 annotators and 4 reviewers); **7 FTE** in the scaling phase          |
| Classifier accuracy       | **99%** Uchen vs. Ume · **91%** Gyuyig vs. Tsugdri · **89%** six scripts · **85%** Danyig vs. Pedri |
| Models published          | **5** (including a page-orientation classifier)                                                     |
| Archive coverage          | built to process the entire BDRC manuscript archive in one pass (an anticipated ~6M images)         |

![Hand classification by script](images/chart-p3-script-breakdown.png)

## What we delivered

**A web tool for annotation and review.** Administrators upload batches, annotators label images, reviewers approve or send them back with feedback, and dashboards track progress.

![Script classification batches](images/p2-script-batches-tool.jpg)

**Trained annotators.** BDRC's paleography consultant wrote the classification guidelines; we trained the team and documented the rules in a Tibetan Script Guidebook.

**Models.** All fine-tuned from Meta's DINOv3 Small vision model on the human-labelled data, supplemented by synthetic images:

![Classifier accuracy](images/chart-p4-script-classifiers.png)

**A page-orientation classifier.** Roughly 1% of BDRC's manuscript images are rotated 180°. Detecting and fixing them improves OCR automatically. This is open on Hugging Face along with the other models and training data.

![Script classification dashboard](images/p3-script-classification-stats.jpg)

## Challenges, and how we overcame them

**One backend, two jobs.** The first backend couldn't handle both transcription-style and classification work at once, so we redesigned it.

**Fast feedback.** If annotators struggled with a button or layout, developers could fix it right away. If a reviewer found an error, they could send work back without stopping the rest.

**Hard images.** Some scripts are subtle, and the data quality at first was uneven. We iterated on class groupings and image pre-processing (center-cropping worked best) and added hierarchical models for the hardest pairs.

**Guidelines that don't feel traditional.** BDRC's categories differ from traditional calligraphy names, so we recruited annotators comfortable learning a new scheme.

## Why it matters

Knowing the script lets BDRC choose the right OCR model for each page and see exactly where the weak spots are.
