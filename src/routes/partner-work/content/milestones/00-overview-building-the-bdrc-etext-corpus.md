# Building the BDRC E-Text Corpus: five milestones, one shared goal

_How WeBuddhist (Dharmaduta Services LLP) and the Buddhist Digital Resource Center (BDRC) are turning a vast Tibetan archive into an open, AI-ready corpus._

---

Tibetan Buddhist literature is one of the largest textual traditions in the world. Much of it still sits in scans: tens of millions of page images of woodblock prints, manuscripts and modern books. Scholars, translators and AI developers can't search it, quote it or build on it until it becomes **clean, correctly cataloged digital text**.

That is the job of the **BDRC E-Text Corpus (BEC)** project, supported by a grant from the **Khyentse Foundation**. BDRC leads the project. WeBuddhist, working as Dharmaduta Services LLP, is its main delivery partner: we run the annotation teams, build the tools, scan books in monastic libraries and prepare the data that trains the OCR models.

This post is the big picture. Five more posts, one per milestone, tell each chapter in detail.

![The five steps of the BEC project](images/chart-bec-five-steps.png)

## The plan in five steps

1. **Gold standard.** Gather every high-quality, manually typed e-text we can find and normalize it into one Unicode XML format.
2. **Silver standard.** Run OCR on the whole archive, then improve it with better models and better training data.
3. **Catalog.** Find every individual text inside every volume, with its title and author, and work out which versions are the same work.
4. **Corpus.** Merge the versions, vote on the best reading, spell-check and format, so each work has one best text.
5. **Publish.** Release the corpus openly on platforms such as Wikisource, WikiData and Hugging Face.

## Five milestones, at a glance

![Project timeline, Milestones 1 to 5](images/chart-project-timeline.png)

| Milestone                                    | Period              | Theme             | Headline results                                                                                    |
| -------------------------------------------- | ------------------- | ----------------- | --------------------------------------------------------------------------------------------------- |
| [1](01-milestone-1-laying-the-foundation.md) | Dec 2025 – Jan 2026 | Foundations       | OCR output for 26.2M archive images; a 1,066-page benchmark; 34,969 pages aligned to transcriptions |
| [2](02-milestone-2-tools-and-teams.md)       | Feb – Mar 2026      | Tools and teams   | ~51 annotators; 1,991,405 aligned training pages; 374 volumes scanned                               |
| [3](03-milestone-3-scaling-up.md)            | Apr – May 2026      | Scaling up        | 44 annotator FTEs; 23,086 manuscript images classified by script; 384 volumes scanned               |
| [4](04-milestone-4-models-land.md)           | Jun – Jul 2026      | Models land       | OCR error down about 60%; 10,000 volumes outlined; script classifiers at up to 99% accuracy         |
| [5](05-milestone-5-toward-one-corpus.md)     | Aug – Sep 2026      | Toward one corpus | Four OCR engines fused into one text; 5,081 Ume pages transcribed; first Tibetan spell-checker      |

## The numbers so far

- **26.2 million** archive images now have OCR output, and the OCR error rate on the benchmark has dropped by roughly **60%** with the new generation of models (BDRC).
- **6.1 GB** of gold-standard XML e-texts, up from 1.9 GB (BDRC), with **5.75 GB** converted by our conversion team alone.
- **10,000 volumes** and **186,300 individual texts** outlined by title and author by the end of July.
- **~2 million** page images aligned to their transcriptions for model training, plus **5,081** new Ume manuscript pages and **2,050** Uchen pages typed from scratch.
- **1,526 volumes** acquired from monastic libraries in India (150% of the original India target), with scanning led by our field teams.
- **15+ open tools, datasets and models** released for the Tibetan NLP community.

![Gold-standard corpus growth](images/chart-gold-corpus-growth.png)

## The people behind the numbers

Behind every figure is a team. At each milestone roughly **44 to 51 annotators** worked alongside our developers, cataloguers, scanning crews and BDRC's project leads. They are Tibetan readers, many of them monastics, and many learned new web tools along the way.

![Annotators by milestone](images/chart-team-size-by-milestone.png)

_Annotator headcounts are the planned staffing from each period's agreement (full-time equivalents from Milestone 3 on), summed across workstreams._

## What the work taught us

**Build the tool, then listen to the people using it.** Our outlining tool changed repeatedly after weekly screen-sharing sessions with annotators. When linking titles to BDRC's database caused duplicate records, we split the workflow in two and the problem eased.

**Benchmarks beat assumptions.** We expected large vision-language models to win at page-layout detection. They didn't; a purpose-trained model did. We expected a Gemini-based extractor to need fallbacks; a smarter page-number rule fixed most of the errors and cut cost by 75%.

**Field work is real work.** Scanning in monastic libraries meant power cuts, monsoon rains, slow internet and temperamental scanners. The teams adapted with offline processing and overnight uploads, and kept beating their targets.

**Open by default.** Tools, benchmarks and models were published as they were finished, so the wider community could use them while the project was still under way.

## What's next

The final stretch of the project (October and November 2026) is about turning cataloged texts into **one best version of each work**: deduplicating versions, building a majority-vote text, running spell-checking and formatting models, and publishing the result, with a target of **5,000 texts on Wikisource** and updated metadata on WikiData.

## Thank you

To **BDRC** for leading with vision and trusting us with so much of the work; to the **Khyentse Foundation** for supporting it; to the monastic libraries that opened their shelves to us; to our partner projects (including MonlamAI, Esukhia, ACIP, Adarsha, PaganTibet and others) whose transcriptions became training data; and above all to our **annotators, scanners, reviewers and developers**.

_Read the milestone posts: [1](01-milestone-1-laying-the-foundation.md) · [2](02-milestone-2-tools-and-teams.md) · [3](03-milestone-3-scaling-up.md) · [4](04-milestone-4-models-land.md) · [5](05-milestone-5-toward-one-corpus.md)_
