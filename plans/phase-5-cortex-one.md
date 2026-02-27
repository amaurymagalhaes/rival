# Phase 5: Cortex One (1 hour — Separate Track)

## Objective

Sign up for Cortex One at cortexone.rival.io, explore the platform, and create a meaningful function that demonstrates product thinking, system design, practical usefulness, and code quality.

## Time Breakdown

| Task | Minutes |
|------|---------|
| Sign up for Cortex One account | 5 |
| Explore the platform, understand function creation UI | 10 |
| Design a function (choose from options below) | 10 |
| Implement the function | 25 |
| Test and verify it works | 10 |

## When to Do This

**After Phase 4 is complete and the main deliverable is deployed.** Cortex One is a separate deliverable. Do NOT start it at the expense of the blog platform.

## Function Recommendations (Pick One)

### Option A: Blog SEO Analyzer (Recommended)

**Input:** Blog post content (text)
**Output:** Structured analysis:
- Readability score (Flesch-Kincaid or word/sentence ratio)
- Keyword density analysis (top 5 keywords)
- Meta description suggestion (auto-generated from content)
- Estimated reading time (words / 200 wpm)
- Improvement suggestions

**Why:** Demonstrates product thinking (SEO is a real blog problem), uses straightforward text analysis (no external API needed), is practically useful, clean system design.

### Option B: Content Performance Predictor

**Input:** Blog title + summary
**Output:** Predicted engagement metrics:
- Estimated click-through rate (based on title characteristics)
- Suggested improvements for title
- Optimal publish time recommendation
- Similar high-performing titles

### Option C: Automated Workflow Trigger

**Input:** Event type (e.g., "blog_published", "comment_received")
**Output:** Triggered actions:
- Email notification to author
- Social media draft post
- Analytics event logging
- Summary generation request

## Evaluation Criteria (from assessment)

The function is evaluated on:
- **Product thinking**: Does it solve a real problem?
- **System design decisions**: Is the architecture clean?
- **Practical usefulness**: Would someone actually use this?
- **Code quality and structure**: Is the code well-organized?

## Implementation Guidelines

1. **Keep it simple.** One function, one clear purpose, clean code.
2. **No external API dependencies** if possible (no OpenAI, no paid services). Use local computation.
3. **Clean code structure:** Input validation, typed inputs/outputs, error handling.
4. **Zero tests needed.** This is a creativity showcase. Ship it working.
5. **Document what it does** in a comment or description within the platform.

## Acceptance Criteria

- [ ] Account created on cortexone.rival.io
- [ ] Function created and working
- [ ] Code is clean and well-structured
- [ ] Function serves a practical, clearly explained purpose
- [ ] Demonstrates product thinking relevant to a blog/content platform
