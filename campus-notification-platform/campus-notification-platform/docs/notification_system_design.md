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

---

## Stage 4: High Load Caching Architectures

To prevent high-volume database saturation during peak traffic periods (e.g., right when a placement or result notification goes live), a high-performance memory caching layer is introduced.

### 1. In-Memory Caching Strategy: Redis Cache-Aside
We implement an asynchronous **Cache-Aside (Lazy Loading)** architecture pattern using Redis as our fast in-memory store. 

* **The Flow:** When a client application fetches notifications, the application gateway first queries Redis using a unique key configuration based on the student's ID (e.g., `user:1042:notifications`). If a cache hit occurs, data is returned instantly within `<2ms`. If a cache miss occurs, the backend reads from PostgreSQL, updates the Redis key with an explicit Time-To-Live (TTL) configuration, and yields the response payload.

---

### 2. Tradeoff Assessment Matrix

| Caching Strategy | Advantages / Pros | Risks / Disadvantages | Architectural Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Redis Cache-Aside (In-Memory)** | • Removes heavy read contention off PostgreSQL disk layers.<br>• Drastically reduces application request latency. | • High risk of serving stale data if database updates occur behind the cache layer. | • Execute strict cache eviction routines inside the API whenever a notification read state changes or a new entry is posted. |
| **HTTP Conditional Headers (`ETag`)** | • Eliminates downstream bandwidth usage completely for unchanged feeds.<br>• Offloads network serialization strains. | • The request must still hit the application gateway to compare validation tags. | • Combine ETags with an ultra-short lifespan memory verification loop to prevent downstream DB checks. |

---

## Stage 5: Mass Broadcast Event Refactoring

### 1. Structural Shortcomings of the Legacy Implementation
The initial implementation relies on a sequential, blocking `for` loop executing over an array of 50,000 student identifiers within a single thread context. This presents fatal scalability issues:
* **Blocking Thread Monopolization:** Issuing individual network requests (`send_email`) and atomic relational table inserts (`save_to_db`) sequentially stalls the execution thread. A single loop execution of this scale would take hours to complete, blocking other system tasks.
* **Lack of Error Isolation (Midway Failures):** If the third-party email service throws an exception or rate-limits the application at student number 200, the loop breaks or hangs. The remaining 49,800 students are starved of their notifications entirely.
* **Database Connection Pool Exhaustion:** Executing 50,000 separate transactions rapidly overloads the open connection limits of a relational database, causing requests to drop or crash.

---

### 2. Decoupled Pipeline Architectural Redesign
To achieve true scalability and resilience, the database persistence operations and the external notification dispatches must be separated into asynchronous tasks using a message queue system (such as RabbitMQ or Apache Kafka):

* **Isolation Principle:** The core web server endpoint should only validate the campaign request, push a high-level broadcast task onto a durable message broker, and instantly return a `202 Accepted` status code to the HR operator.
* **Separation of Concerns:** The database operations should be handled via efficient bulk operations, while email dispatches are delegated to independent worker instances that process messages concurrently from a queue.

---

### 3. Asynchronous Broadcast Blueprint Pseudocode

```javascript
// High-efficiency Publisher Endpoint Handler
function initiateMassBroadcast(targetStudentIds, messageDetails) {
    // Break the massive payload into small, manageable worker chunks
    const CHUNK_SIZE = 500;
    const workerChunks = sliceIntoBatches(targetStudentIds, CHUNK_SIZE);

    for (const batch of workerChunks) {
        // Enqueue batch metadata securely onto a background message queue
        messageBroker.enqueue("broadcast_notification_jobs", {
            studentIds: batch,
            content: messageDetails,
            retryCount: 0
        });
    }
}

// Decentralized Worker Process (Runs across scale-out instances)
async function handleBackgroundJob(jobMessage) {
    try {
        // 1. Optimize storage ingestion using a single database bulk transaction
        await db.bulkInsertNotifications({
            recipients: jobMessage.studentIds,
            message: jobMessage.content
        });

        // 2. Broadcast inside the app using the selected real-time delivery mechanism
        await realtimeStreamServer.broadcastToClients(jobMessage.studentIds, jobMessage.content);

        // 3. Dispatch emails concurrently using network-resilient workers
        await Promise.allSettled(
            jobMessage.studentIds.map(id => emailProviderGateway.send(id, jobMessage.content))
        );

    } catch (error) {
        // Implement automatic exponential backoff retry cycles for transient failures
        if (jobMessage.retryCount < 3) {
            jobMessage.retryCount += 1;
            await messageBroker.requeueWithDelay(jobMessage, 30000 * jobMessage.retryCount);
        } else {
            // Move permanently failing tasks to a Dead Letter Queue for engineering review
            await messageBroker.moveToDeadLetterQueue(jobMessage, error.message);
        }
    }
}