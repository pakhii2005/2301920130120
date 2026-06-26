# Stage 1: Enterprise Notification Service Architecture & Protocol Contracts

This document contains the structural system architecture design blueprints for the real-time campus notification dissemination platform.

---

## 1. Core Core Domain Operations
The API layers are engineered around three key notification verticals within the student portal:
* **Placements:** Dynamic updates detailing company recruitment tracks, corporate onboarding deadlines, eligibility parameters, shortlists, and direct interview slot notifications.
* **Events:** General distribution messages containing information about tech symposia, academic guest-lectures, hackathons, workshops, and sports schedules.
* **Results:** Secure data publishing notifying individuals of GPA distributions, reassessment publications, and individual module grading releases.

---

## 2. API Contract Specification & Resource Enveloping

### Endpoint A: Retrieve Active Notification Streams
* **HTTP Method:** `GET`
* **URI Path:** `/api/v1/notifications`
* **Query Strings Matrix:**
    * `limit` (integer - pagination maximum size boundary)
    * `page` (integer - index pagination page)
    * `notification_type` (string - filter restriction: `Placement`, `Result`, `Event`)

#### Structured Response Schema (`200 OK`)
```json
{
  "status": "success",
  "meta": {
    "total_records": 1280,
    "current_page": 1,
    "total_pages": 86
  },
  "payload": [
    {
      "notification_id": "a901f41d-cb11-4fa2-9391-ee0f331fbc9d",
      "category": "Placement",
      "headline": "CSX Corporation Recruitment Drive",
      "body": "The application portal for the upcoming software validation role is now accepting resumes.",
      "is_read_flag": false,
      "issued_at": "2026-04-22T17:51:18Z"
    },
    {
      "notification_id": "cf6619a0-711c-4318-bd0d-b1088716bce5",
      "category": "Result",
      "headline": "Mid-Semester Grading Reports",
      "body": "The final grades for the advanced web engineering examinations have been updated.",
      "is_read_flag": true,
      "issued_at": "2026-04-22T17:50:54Z"
    }
  ]
}
---

## Stage 2: Persistent Storage Engineering & Relational Blueprints

### 1. Database Paradigm Selection: PostgreSQL (Relational)
To back the data layer of this application, **PostgreSQL** has been selected over non-relational alternatives due to the following structural requirements:
* **Strong ACID Guarantees:** Ensuring absolute consistency during state mutations (e.g., updating an unread flag across multiple logged-in client screens).
* **Advanced Query Engine & Indexing:** Provides robust partial indexing strategies that become critical as raw data sizes swell, reducing storage overhead.
* **Complex Joins:** Future feature flags will inevitably require rich lookups joining the notifications engine directly with campus identity registries (e.g., `Students`, `Courses`, `PlacementWaves`).

---

### 2. Physical Database Schema Architecture

```sql
-- Explicit Domain Enumeration for Strict Data Typing
CREATE TYPE target_domain AS ENUM ('Event', 'Result', 'Placement');

-- Core Student Target Reference Table
CREATE TABLE student_registry (
    student_id BIGSERIAL PRIMARY KEY,
    campus_email VARCHAR(255) UNIQUE NOT NULL,
    is_active_account BOOLEAN DEFAULT TRUE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Core Operational System Notifications Model
CREATE TABLE application_notifications (
    notification_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id INT8 REFERENCES student_registry(student_id) ON DELETE CASCADE,
    vertical_category target_domain NOT NULL,
    display_title VARCHAR(200) NOT NULL,
    text_content TEXT NOT NULL,
    is_read_acknowledged BOOLEAN DEFAULT FALSE NOT NULL,
    disseminated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
---

## Stage 3: Query Optimization Mechanics & Index Strategy

### 1. Architectural Audit of the Legacy Query
The original verification query under review is structured as follows:
```sql
SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt ASC;