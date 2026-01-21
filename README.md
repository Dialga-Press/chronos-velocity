CHRONOS VELOCITY README

Project overview
CHRONOS VELOCITY is an immersive, TP‑BON inspired storytelling archive that blends historical events with collaborative fiction. The platform treats each entry as a living archive node: readers can read, contribute, and shape how the story of humankind unfolds. Community members are honored inside the narrative (for example, contributor u/SHOT-MANAGER-7012 inspired the in‑story AI SMYLNYX). Content is curated, credited, and published under the project content license.

Key features
• 	Immersive narrative nodes that combine historical research and creative vignettes.
• 	Community contributions with a moderation queue and curator approval.
• 	Provenance and licensing for every entry (sources, contributor attribution, license).
• 	Branching story mechanics: lightweight voting and branching to let the community choose canonical directions.
• 	Simple static site architecture for easy hosting on GitHub Pages.

Data model and example
Recommended fields for each archive entry
• 	id — unique string identifier
• 	title — short descriptive title
• 	date — ISO 8601 date (use earliest relevant date)
• 	location — human readable location; optional geo coordinates
• 	narrative — markdown content for the story node
• 	sources — array of  objects for provenance
• 	contributors — array of contributor handles (credited in UI)
• 	license — content license string (e.g., CC-BY-SA-4.0)
• 	status — , , or 
Example JSON entry

Rendered HTML snippet


How to contribute
Quick contribution flow
1. 	Fork the repository and add a JSON file to  following the data model above.
2. 	Set  to  for new submissions.
3. 	Open a pull request with a short description of sources and intent.
4. 	Curators review submissions and either publish, request edits, or move to draft.
Contribution guidelines
• 	Cite sources for historical claims and clearly label speculative or fictional passages.
• 	Credit contributors by handle; include permission if using a real name.
• 	Respect the license: all contributions must be compatible with the project content license.
• 	Moderation: curators may edit for clarity, provenance, and policy compliance before publishing.
CONTRIBUTING template to paste in PR
• 	Title: 
• 	Description: one paragraph describing the entry and its sources.
• 	Sources: list of URLs and short notes.
• 	Intent: whether the entry is historical, speculative, or community honor.

Governance and moderation
Roles
• 	Contributors submit nodes and propose branches.
• 	Curators review submissions, verify provenance, and publish.
• 	Moderation queue holds  entries until reviewed.
Branching and canonical decisions
• 	Branch proposals can be created by contributors.
• 	Community voting helps prioritize branches; curators make final canonical calls and record decisions in a changelog.
Code of conduct
• 	Be respectful and constructive.
• 	Do not submit plagiarized content.
• 	Flag sensitive or potentially harmful content for curator review.

License and provenance
Content license: See  in the repository for the full terms.
Attribution: Every published entry must include contributor attribution and source links. Curators will add provenance metadata when necessary.

Local development and deployment
Run locally
• 	The site is a static HTML/CSS/JS project. Serve  with any static server (for example,  in the project root) to preview locally.
Deploy
• 	Host on GitHub Pages by pushing to the  branch or using the repository Pages settings. The static structure is optimized for simple, low-cost hosting.

Next steps and priorities
• 	Add About section to the landing page describing mission and contribution flow.
• 	Populate  with 3 sample entries (historical, speculative, community honor).
• 	Implement submission form and a simple moderation UI.
• 	Expose provenance UI and a visible changelog for canonical decisions.

Contact and credits
• 	Project: CHRONOS VELOCITY
• 	Inspired by: TP‑BON style collaborative storytelling
• 	Honors: u/SHOT-MANAGER-7012 (SMYLNYX) credited as an early contributor

Copy this README into  in the repo to give visitors immediate context, contribution instructions, and a clear data model to follow.
