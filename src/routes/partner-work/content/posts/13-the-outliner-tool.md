# The Outliner: the tool that lets annotators map a volume text by text

_Part of the BDRC E-Text Corpus project, a collaboration between BDRC and WeBuddhist (Dharmaduta Services LLP), supported by the Khyentse Foundation. [All posts →](00-index.md)_

---

A single Tibetan volume can contain dozens of separate texts. To catalog a corpus, someone has to mark where each text starts and ends and say what it is called and who wrote it. We built the web tool that makes this possible at scale, together with a small PDF cropping tool.

## At a glance

|                    |                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------- |
| Users supported    | **20** annotators at launch, **30 FTE** at full scale, plus reviewers                 |
| Output of the tool | **10,000 volumes** and **186,300 texts** outlined (see the outlining post)            |
| Built by           | Our development team (front end and user management); BDRC (data format and back end) |
| Open source        | Cataloger and PDF-outliner repositories on GitHub                                     |

![Outliner workflow dashboard](images/p3-outline-workflow-overview.jpg)

## What the tool does

- Pulls the list of volumes from **BDRC's back end**.
- Lets an annotator **split a volume into segments**, each with a title and an author.
- **Suggests titles and authors with AI**, shows the OCR'd image beside the text and can build a table of contents automatically from a marked segment.
- Offers a **side-by-side workspace** showing segments with the table of contents.
- Gives **reviewers** a second phase for linking segments to BDRC work and author IDs.
- Includes a **PDF crop tool** to pick the right region of a PDF, used for stripping headers and footers.

## Challenges, and how we overcame them

**Feedback tools nobody used.** Annotators often preferred asking a person to using the built-in feedback hub. We held weekly sessions where an annotator shares their screen, so developers can see real bottlenecks and fix them.

**Training while the UI changes.** Teaching annotators while the interface evolved was hard. Three coordinators kept communication clear, and we aimed changes at what slowed annotators most.

**Keeping it steady.** A developer was assigned to maintain and improve the tool throughout, so that it fully supported the 30-person operation without interruption.

## Why it matters

The Outliner is the engine behind the project's catalog: every outlined volume starts here.
