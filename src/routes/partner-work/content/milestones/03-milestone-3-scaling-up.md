# Milestone 3: Scaling up (Apr – May 2026)

_Part 3 of the BEC series · [← Milestone 2](02-milestone-2-tools-and-teams.md) · [Overview](00-overview-building-the-bdrc-etext-corpus.md) · [Next: Milestone 4 →](04-milestone-4-models-land.md)_

---

By April the tools worked and the workflows were proven. Milestone 3 was about **turning up the volume**: more annotators, more books, and the first AI models trained on the data our teams were producing.

_A note on numbers: from this milestone on, staffing is counted in full-time equivalents (FTE). Two half-time annotators make one FTE._

## At a glance

|                                         |                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| Annotator FTEs                          | **44** (30 outlining, 7 script classification, 4 line alignment, 3 line segmentation) |
| Volumes scanned                         | **384** against a target of 200 (**178%**)                                            |
| Manuscript images classified by script  | **23,086**                                                                            |
| Volumes outlined                        | **3,638**, with **84,000 texts** identified by title and author                       |
| Pages aligned line by line              | **17,813**                                                                            |
| Line-segmentation pages annotated       | **1,397**                                                                             |
| Header, footer and footnote annotations | **2,795** images                                                                      |
| Tibetan Tesseract model                 | **9.7% character error rate** on held-out test lines                                  |

![Outlining progress](images/chart-outlining-growth.png)

## Achievement 1: Thirty annotators cataloging in parallel

Thirty FTEs were onboarded to the outlining tool and by the end of May they had worked through **3,638 volumes**, marking **84,000 individual texts** with their title and author. The dashboard below shows the shape of the work: documents, annotation coverage and quality signals in one place.

![Outline workflow dashboard](images/p3-outline-workflow-overview.jpg)

## Achievement 2: Teaching a machine to read scripts

Tibetan manuscripts are written in many hands (Uchen, Druma, Danyig, Pedri, Tsugdri, Gyuyig and more), and OCR models do not perform equally well on each. A seven-person team classified **23,086 images** by script using a web tool our developers built, with reviewers checking work and a Tibetan Script Guidebook for the team.

![Script classification breakdown](images/chart-p3-script-breakdown.png)

We then trained classifiers on that data (fine-tuning Meta's DINOv3 vision model):

- **Uchen vs. Ume:** **99.3%** accuracy
- **Six main scripts:** **80.3%** accuracy with all data, 70.7% on a balanced set
- **A tougher 18-class version** including multi-script pages: 57.1%, which told us where more data was needed

![Script classification dashboard](images/p3-script-classification-stats.jpg)

## Achievement 3: Data for the next generation of OCR

- **Line segmentation:** 3 FTEs annotated **1,397 pages** in Transkribus (regions, baselines and line polygons) to train models that cut a page into lines.
- **Line alignment:** 4 FTEs aligned **17,813 pages** line by line with their transcriptions.
- **Layout detection:** **2,795 images** annotated for headers, footers and footnotes, and a YOLO model fine-tuned on them to clean up modern books.
- **A better Tesseract model:** fine-tuned on about 100,000 Uchen line images (96K train, 12K validation, 12K test), reaching **9.7% CER** on the test split. Tesseract is cheap and widely used, so a better Tibetan model helps many projects.
- **A Tibetan KenLM** for measuring OCR quality, plus a written analysis of how CER and perplexity relate.

## Achievement 4: More books, more shelves

Our scanning crews delivered **384 volumes** (Dzongsar 152, Sherab Ling 232) against a target of 200, and reported that for three months in a row they beat their weekly and monthly targets without losing scan quality. Five major Dharma e-book libraries were also scraped to widen the e-text pool, and our PDF-conversion pipeline gained a fix for the broken character maps that corrupt text extracted from some Tibetan PDFs.

![The scanning room](images/p3-scanning-room.jpg)

![A scanning station with volumes waiting](images/p3-scanning-desk.jpg)

## Challenges, and how we overcame them

**Daily conditions in the field.** Annotators at Sherab Ling travelled about an hour each way and carried books between the library and scanning room. Power cuts and internet drops interrupted uploads, and one scanner behaved unpredictably. The team kept a steady cadence anyway and verified quality on every batch.

**Changing instructions mid-project.** When the line-segmentation process was revised after three batches were nearly done, we retrained the team, wrote **workflow guidelines in English and Tibetan** and added a second review pass over the first four batches.

**Messy source texts.** In one outlining batch, entries were out of order, spelling varied and many lacked source references, making titles and authors harder to identify. Frequent check-ins with BDRC and the development team resolved doubts quickly and shaped the next batch's instructions.

**Imperfect pairs.** Alignment annotators met blurry scans, blank images and mismatched text. They removed doubtful pairs rather than let them pollute training data.

**Next:** in Milestone 4, [the models arrive and OCR errors fall by about 60% →](04-milestone-4-models-land.md)
