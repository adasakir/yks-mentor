# yks-mentor
This is the web site i made for my girlfriend to help her to analize her tests and schedule her studying program the web site link is in the read me file.

https://yks-kocluk-ilknur.vercel.app/

# YKS Coaching & Exam Tracking Platform (yks-kocluk-ilknur)

YKS Coaching & Exam Tracking Platform is an end-to-end, AI-powered web application specifically engineered for students preparing for the Turkish Higher Education Institutions Exam (YKS — TYT & AYT). It serves as a personal academic strategist, combining data-driven practice exam tracking with smart priority analysis, historical exam statistics, and integrated AI tutoring tools.

---

## Key Features

### 1. Interactive Dashboard & Net Progress

* **Net Score Tracking:** Dynamic chart visuals tracking net score performance over time across TYT and AYT sessions.
* **Daily Schedule Snapshot:** Quick-access overview of the current day's study tasks and schedule.
* **Smart Countdown Timer:** Real-time countdown clock tracking remaining days, hours, minutes, and seconds until YKS.
* **Cloud Sync Indicator:** Data synchronization ensuring exam results and study logs are updated across all devices.

### 2. Exam Management & Topic-Based Logging

* **Effortless Exam Entry:** Simplified input flow where students select exam type (TYT/AYT), enter date/name, and log incorrect or blank answers by topic.
* **Automatic Calculation:** Calculates correct responses automatically based on logged errors and omissions.
* **Comprehensive Exam Archive:** Categorized filterable view (TYT vs. AYT) to inspect past exam details and subject breakdowns.
* **Printable Exam Scorecard:** Generates printable diagnostic scorecards for individual practice exams.

### 3. Priority Analysis & Smart Study Recommendations

* **Algorithmic Study Priority:** Calculates custom subject urgency using the formula:
Priority Score = (Incorrect + Blank * 1.5) * OSYM Annual Question Weight
* **OSYM Topic Distribution Matrix:** Interactive historical database showing the exact number of questions asked per subject by OSYM over past years.

### 4. Topic Analytics & Completion Tracking

* **Subject Statistics:** Aggregates overall wrong/blank question counts per topic alongside per-exam averages, with customizable column sorting.
* **Syllabus Progress Tracker:** Two-step completion status marking topic lectures and practice tests, updating visual strike-through status and error rate percentages.

### 5. AI-Powered Assistant & Question Solver

* **YKS AI Assistant:** AI tutor capable of step-by-step problem solving, general YKS guidance, and analyzing uploaded question images/photos.
* **AI Question Generator:** Dynamically generates practice questions based on selected subjects and topics, featuring interactive answering, self-checking, and detailed solution explanations.

### 6. Weekly Study Planner & Comparison Tool

* **Weekly Schedule Manager:** Interactive weekly timetable tracking study tasks by day with visual highlights for the current day and checkbox completion logging.
* **Exam Comparison Tool:** Side-by-side comparative analysis of any two exams, displaying subject-by-subject net score variances.

---

## Tech Stack & Architecture

* **Frontend:** Modern HTML5, CSS3, JavaScript (ES6+), Chart.js / Canvas API (for performance visualization).
* **AI Integration:** LLM API integration for question generation, query handling, and multimodal image analysis.
* **State & Cloud Data:** Cloud synchronization mechanism for multi-device data persistence.
* **Deployment:** Vercel platform hosting.
