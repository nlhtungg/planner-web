# LUỒNG CALENDAR (LỊCH & QUẢN LÝ TASK)

## TỔNG QUAN KIẾN TRÚC

Luồng Calendar quản lý hệ thống lịch làm việc và tasks trong ứng dụng. Không giống các hệ thống calendar truyền thống, luồng này **không có collection riêng** mà **sử dụng Task model** với điều kiện tasks phải có `dueDate`. Calendar là một **view layer** trên Task collection, cung cấp time-based visualization và management cho tasks.

## KIẾN TRÚC ĐẶC BIỆT

### Calendar ≠ Separate Collection

**Thiết kế quan trọng:**
- Calendar events **chính là Tasks** có `dueDate`
- Không có CalendarEvent model riêng
- Service layer transform Tasks thành Calendar Event format
- Tất cả CRUD operations thực chất là Task operations

**Lý do thiết kế:**
- **Single Source of Truth:** Tasks là entity chính
- **Avoid Duplication:** Không lưu cùng data ở 2 nơi
- **Consistency:** Task updates tự động reflect trên calendar
- **Flexibility:** Tasks có thể có hoặc không có dueDate

---

## CẤU TRÚC FILE VÀ CHỨC NĂNG

### 1. MODEL LAYER

#### **Task.js** (`backend/src/models/Task.js`)
**Chức năng:** Schema MongoDB cho tasks, đồng thời là data source cho calendar.

**Đặc điểm kỹ thuật:**
- **Database Engine:** MongoDB với Mongoose ODM
- **Schema Structure:**
  - `title`: String (required) - Event title
  - `description`: String (optional) - Event details
  - `assignees`: Array of User ObjectIds
  - `dueDate`: **Date (KEY FIELD)** - Calendar event date
  - `priority`: Enum ['low', 'medium', 'high'] (default: 'medium')
  - `status`: Enum ['todo', 'in-progress', 'done'] (default: 'todo')
  - `progress`: Number (0-100, default: 0)
  - `estimatedHours`: Number (optional)
  - `loggedHours`: Number (default: 0)
  - `timeEntries`: Array of time logs:
    - `user`: ObjectId
    - `hours`: Number
    - `description`: String
    - `loggedAt`: Date
  - `workspace`: ObjectId (optional - null cho personal tasks)
  - `createdBy`: ObjectId (required)
  - `isPersonal`: Boolean (default: false)
  - Timestamps: createdAt, updatedAt

**Calendar Relevance:**
- **dueDate:** Quyết định task có appear trên calendar không
- **priority:** Color coding trên calendar
- **status:** Visual indicators
- **workspace:** Calendar filtering by workspace

**Indexing Strategy:**
- `{workspace: 1}`: Filter tasks by workspace
- `{createdBy: 1}`: Personal tasks
- `{status: 1}`: Status-based queries
- `{assignees: 1}`: Tasks assigned to user
- `{estimatedHours: 1}`, `{loggedHours: 1}`: Time tracking queries

**Virtual Properties:**
- **autoProgress:** Computed từ loggedHours / estimatedHours
  - Formula: `Math.min(100, Math.round(ratio * 100))`
  - Return: 0-100 percentage
  - Available in JSON/Object serialization

**Pre-save Hook:**
- Update `updatedAt` timestamp automatically

**Đặc điểm nổi bật:**
- **Flexible Scope:** Có thể personal (workspace=null) hoặc workspace-based
- **Time Tracking:** Detailed timeEntries array
- **Progress Tracking:** Manual progress + auto-calculated progress

---

### 2. SERVICE LAYER

#### **calendarService.js** (`backend/src/services/calendarService.js`)
**Chức năng:** Business Logic Layer - Transform tasks thành calendar events và xử lý calendar-specific operations.

**Các phương thức chính:**

1. **getCalendarEvents(userId, filters)**
   - **Purpose:** Query tasks và transform thành calendar format
   - **Filters:**
     - `startDate`: Date range start (ISO string)
     - `endDate`: Date range end (ISO string)
     - `workspace`: Specific workspace ID hoặc 'personal'
     - `priority`: Filter by priority
     - `status`: Filter by status
   
   - **Query Logic:**
     ```javascript
     {
       $or: [
         {isPersonal: true, createdBy: userId}, // Personal tasks
         {workspace: {$in: workspaceIds}, assignees: userId} // Workspace tasks assigned
       ],
       dueDate: {$exists: true, $ne: null} // MUST have dueDate
     }
     ```
   
   - **Date Range Filtering:**
     - If startDate: `dueDate >= startDate`
     - If endDate: `dueDate <= endDate`
     - If no dates: Return tất cả tasks có dueDate
   
   - **Workspace Filter:**
     - 'personal': Chỉ isPersonal=true tasks
     - workspaceId: Chỉ tasks thuộc workspace đó
     - null: All tasks user có access
   
   - **Transform:** `transformToCalendarEvent(task)` cho mỗi task
   - **Return:** Array calendar event objects

2. **createCalendarEvent(eventData, userId)**
   - **Validation:** dueDate REQUIRED (throw error nếu thiếu)
   - **Workspace Validation:**
     - If workspace provided: Check exists và user isMember
     - If no workspace: Set isPersonal=true
   - **Task Creation:**
     - Set createdBy=userId
     - Add userId to assignees (default)
     - Create Task document
   - **Transform:** Convert task → calendar event format
   - **Return:** Calendar event object

3. **updateCalendarEvent(eventId, updateData, userId)**
   - **Find Task:** taskRepository.findById()
   - **Authorization:**
     - Personal task: createdBy=userId
     - Workspace task: userId trong workspace members
   - **Updatable Fields:**
     - title, description, dueDate (calendar-relevant)
     - priority, status, progress
     - estimatedHours, assignees
   - **Validation:** Preserve workspace scope
   - **Return:** Updated calendar event

4. **deleteCalendarEvent(eventId, userId)**
   - **Authorization:** Same as update
   - **Delete:** taskRepository.delete(eventId)
   - **Return:** Success confirmation

5. **moveCalendarEvent(eventId, newDate, userId)**
   - **Purpose:** Drag & drop support
   - **Authorization:** User must be assigned or creator
   - **Update:** dueDate = newDate
   - **Transform:** Return updated calendar event
   - **Use Case:** Calendar UI drag & drop

6. **getCalendarStats(userId, {startDate, endDate})**
   - **Aggregate Statistics:**
     - Task counts by status (todo, in-progress, done)
     - Task counts by priority (low, medium, high)
     - Completion rate percentage
     - Overdue tasks count
     - Upcoming tasks (next 7 days)
   
   - **Date Range:** Optional filter
   - **Query:** Tasks user có access với dueDate
   - **Return:** Stats object

**Transformation Method:**

**transformToCalendarEvent(task)**
- Convert Task document → Calendar Event format
- **Mapping:**
  ```javascript
  {
    id: task._id,
    title: task.title,
    description: task.description,
    start: task.dueDate, // Event start time
    end: task.dueDate,   // Single-day events
    date: task.dueDate,  // For calendar display
    priority: task.priority,
    status: task.status,
    workspace: task.workspace,
    isPersonal: task.isPersonal,
    assignees: task.assignees,
    progress: task.progress,
    estimatedHours: task.estimatedHours,
    loggedHours: task.loggedHours,
    createdBy: task.createdBy
  }
  ```
- **Purpose:** Standardize format cho calendar libraries

**Đặc điểm nổi bật:**
- **Query Optimization:** Get user workspaces trước, filter tasks hiệu quả
- **Authorization Layer:** Service checks permissions before operations
- **Transform Abstraction:** Separate task data từ calendar representation

---

### 3. REPOSITORY LAYER

#### **taskRepository.js** (`backend/src/repositories/taskRepository.js`)
**Chức năng:** Data Access Layer cho Task operations.

**Các phương thức relevant cho calendar:**

1. **findAll(query)**
   - Generic query method
   - Populate: workspace, assignees, createdBy
   - Select: Các fields cần thiết
   - **Return:** Array Task documents

2. **findById(taskId)**
   - Get single task
   - Full population
   - **Return:** Task document hoặc null

3. **create(taskData)**
   - Insert new Task
   - **Return:** Created task

4. **update(taskId, updateData)**
   - Update task fields
   - Set updatedAt timestamp
   - **Return:** Updated task

5. **delete(taskId)**
   - Hard delete task
   - **Return:** Deleted task

**Query Patterns cho Calendar:**

**Get user's calendar tasks:**
```javascript
const userWorkspaces = await workspaceRepository.getWorkspacesByUser(userId);
const workspaceIds = userWorkspaces.map(w => w._id);

const query = {
  $or: [
    {isPersonal: true, createdBy: userId},
    {workspace: {$in: workspaceIds}, assignees: userId}
  ],
  dueDate: {$exists: true, $ne: null}
};

const tasks = await taskRepository.findAll(query);
```

**Get tasks in date range:**
```javascript
query.dueDate = {
  $gte: new Date(startDate),
  $lte: new Date(endDate)
};
```

---

### 4. CONTROLLER LAYER

#### **calendarController.js** (`backend/src/controllers/calendarController.js`)
**Chức năng:** HTTP Request Handler - Calendar-specific endpoints.

**Các endpoint handlers:**

1. **GET /events** - getCalendarEvents()
   - **Query Parameters:**
     - `startDate`: ISO date string (optional)
     - `endDate`: ISO date string (optional)
     - `workspace`: Workspace ID hoặc 'personal' (optional)
     - `priority`: Filter priority (optional)
     - `status`: Filter status (optional)
   
   - **Logic:**
     - Extract query params
     - Call calendarService.getCalendarEvents(userId, filters)
     - Format response
   
   - **Response:**
     ```javascript
     {
       success: true,
       events: [/* calendar event objects */]
     }
     ```
   
   - **Use Cases:**
     - Load calendar month view
     - Filter tasks by workspace
     - Get tasks in date range

2. **POST /events** - createCalendarEvent()
   - **Body:**
     - `title`: String (required)
     - `description`: String (optional)
     - `dueDate`: Date (REQUIRED for calendar)
     - `workspace`: ObjectId (optional)
     - `priority`: Enum (optional, default 'medium')
     - `status`: Enum (optional, default 'todo')
   
   - **Validation:** dueDate required (service enforces)
   - **Logic:**
     - Merge req.body với createdBy=req.user._id
     - Call calendarService.createCalendarEvent()
   
   - **Response:** 201 với event object
   
   - **Use Case:** Add event từ calendar UI

3. **PATCH /events/:id** - updateCalendarEvent()
   - **Body:** Partial update (any field)
     - `title`, `description`, `dueDate`
     - `priority`, `status`, `assignees`
   
   - **Authorization:** Service checks permissions
   - **Logic:** Call calendarService.updateCalendarEvent()
   - **Response:** 200 với updated event
   - **Use Case:** Edit event details inline

4. **DELETE /events/:id** - deleteCalendarEvent()
   - **Logic:** Call calendarService.deleteCalendarEvent()
   - **Authorization:** Service validates
   - **Response:** 200 confirmation
   - **Use Case:** Remove event từ calendar

5. **POST /events/:id/move** - moveCalendarEvent()
   - **Body:** `newDate` (Date)
   - **Purpose:** Drag & drop events trên calendar
   - **Logic:**
     - Extract newDate from body
     - Call calendarService.moveCalendarEvent()
   - **Response:** 200 với updated event
   - **Use Case:** Calendar drag & drop interaction

6. **GET /stats** - getCalendarStats()
   - **Query Parameters:**
     - `startDate`: Date range start (optional)
     - `endDate`: Date range end (optional)
   
   - **Logic:** Call calendarService.getCalendarStats()
   - **Response:**
     ```javascript
     {
       success: true,
       stats: {
         taskCounts: {
           total: 20,
           todo: 8,
           inProgress: 7,
           done: 5
         },
         priorityCounts: {
           low: 5,
           medium: 10,
           high: 5
         },
         completionRate: 25, // percentage
         overdue: 3,
         upcoming: 10
       }
     }
     ```
   
   - **Use Case:** Calendar dashboard metrics

**Đặc điểm kỹ thuật:**
- **Error Handling:** Try-catch với next(err) middleware
- **Middleware:** authenticateToken required
- **Response Format:** Consistent `{success, data}` structure
- **Comments:** JSDoc-style documentation trong code

---

### 5. ROUTING LAYER

#### **calendarRoutes.js** (`backend/src/routes/calendarRoutes.js`)
**Chức năng:** API Endpoint Definition với detailed documentation.

**Route Configuration:**
```
GET    /api/calendar/events              // Get calendar events với filters
POST   /api/calendar/events              // Create new event
PATCH  /api/calendar/events/:id          // Update event
DELETE /api/calendar/events/:id          // Delete event
POST   /api/calendar/events/:id/move     // Move event (drag & drop)
GET    /api/calendar/stats               // Get calendar statistics
```

**Route Documentation trong Code:**
- Mỗi route có JSDoc comments
- Specify: HTTP method, endpoint path, query params, body fields
- Example:
  ```javascript
  /**
   * GET /api/calendar/events
   * Get calendar events with optional filters
   * Query params: startDate, endDate, workspace, priority, status
   */
  ```

**Đặc điểm:**
- **Global Middleware:** `router.use(authenticateToken)`
- **RESTful Design:** Proper HTTP methods
- **Drag & Drop Support:** Special `/move` endpoint

---

## DATA FLOW DIAGRAM

### Get Calendar Events Flow:

```
HTTP GET /api/calendar/events?startDate=2025-01&endDate=2025-01
    ↓
[authenticateToken] → Verify JWT, attach req.user
    ↓
[calendarRoutes] → Route to getCalendarEvents
    ↓
[calendarController.getCalendarEvents]
    ├→ Extract query params
    └→ Call calendarService.getCalendarEvents(userId, filters)
    ↓
[calendarService.getCalendarEvents]
    ├→ Get user's workspaces (workspaceRepository)
    ├→ Build query với $or logic:
    │   ├→ Personal tasks (isPersonal=true, createdBy=userId)
    │   └→ Workspace tasks (workspace in workspaceIds, assignees=userId)
    ├→ Filter: dueDate exists & in date range
    ├→ Apply priority, status filters
    └→ Query taskRepository.findAll(query)
    ↓
[taskRepository.findAll]
    ├→ Query MongoDB Task collection
    ├→ Populate: workspace, assignees, createdBy
    └→ Return Task documents
    ↓
[calendarService]
    ├→ Transform each task → calendar event format
    │   └→ transformToCalendarEvent(task)
    └→ Return events array
    ↓
[calendarController]
    └→ Format response: {success: true, events: [...]}
    ↓
HTTP Response: 200 JSON
```

---

### Create Calendar Event Flow:

```
HTTP POST /api/calendar/events
Body: {title, dueDate, workspace?, priority?}
    ↓
[calendarController.createCalendarEvent]
    ├→ Merge body với createdBy=req.user._id
    └→ Call calendarService.createCalendarEvent()
    ↓
[calendarService.createCalendarEvent]
    ├→ Validate: dueDate REQUIRED (throw error if missing)
    ├→ If workspace:
    │   ├→ workspaceRepository.getWorkspaceById()
    │   └→ Check workspace.isMember(userId)
    ├→ Else: Set isPersonal=true
    ├→ Prepare taskData:
    │   ├→ Add createdBy, assignees=[userId]
    │   └→ Set workspace or isPersonal
    └→ Call taskRepository.create(taskData)
    ↓
[taskRepository.create]
    ├→ Create Task document trong MongoDB
    ├→ Pre-save hook: Update updatedAt
    └→ Return created task
    ↓
[calendarService]
    ├→ Transform task → calendar event
    └→ Return event object
    ↓
[calendarController]
    └→ Response: 201 {success: true, event: {...}}
    ↓
HTTP Response: 201 JSON
```

---

### Drag & Drop Move Flow:

```
HTTP POST /api/calendar/events/:id/move
Body: {newDate: "2025-12-31"}
    ↓
[calendarController.moveCalendarEvent]
    └→ Call calendarService.moveCalendarEvent(id, newDate, userId)
    ↓
[calendarService.moveCalendarEvent]
    ├→ taskRepository.findById(id)
    ├→ Authorize: User assigned hoặc creator
    ├→ Update: task.dueDate = newDate
    ├→ taskRepository.update(id, {dueDate: newDate})
    └→ Transform → calendar event
    ↓
[taskRepository.update]
    ├→ Update Task document
    └→ Return updated task
    ↓
HTTP Response: 200 {success: true, event: {...}}
```

---

## CALENDAR VIEW PATTERNS

### Month View:
**Query:**
```javascript
{
  startDate: "2025-12-01T00:00:00Z",
  endDate: "2025-12-31T23:59:59Z"
}
```
**Response:** Tất cả tasks với dueDate trong tháng

### Week View:
**Query:**
```javascript
{
  startDate: "2025-12-15T00:00:00Z",
  endDate: "2025-12-21T23:59:59Z"
}
```

### Day View:
**Query:**
```javascript
{
  startDate: "2025-12-24T00:00:00Z",
  endDate: "2025-12-24T23:59:59Z"
}
```

### Workspace Filter:
**Query:**
```javascript
{
  workspace: "workspace_id_here",
  startDate: "2025-12-01",
  endDate: "2025-12-31"
}
```

### Personal Only:
**Query:**
```javascript
{
  workspace: "personal",
  startDate: "2025-12-01"
}
```

---

## STATISTICS & ANALYTICS

### getCalendarStats() Metrics:

**1. Task Status Distribution:**
```javascript
{
  total: 20,
  todo: 8,      // 40%
  inProgress: 7, // 35%
  done: 5       // 25%
}
```

**2. Priority Breakdown:**
```javascript
{
  low: 5,      // 25%
  medium: 10,  // 50%
  high: 5      // 25%
}
```

**3. Completion Rate:**
```javascript
completionRate = (done / total) * 100
// Example: (5 / 20) * 100 = 25%
```

**4. Overdue Tasks:**
```javascript
{
  $match: {
    dueDate: {$lt: new Date()},
    status: {$ne: 'done'}
  }
}
// Count tasks past dueDate và chưa done
```

**5. Upcoming Tasks:**
```javascript
{
  $match: {
    dueDate: {
      $gte: new Date(),
      $lte: new Date(Date.now() + 7*24*60*60*1000)
    }
  }
}
// Tasks in next 7 days
```

**Aggregation Strategy:**
- Multiple aggregate queries cho different metrics
- Client-side computation cho percentages
- Cache results với TTL (recommended)

---

## PERFORMANCE OPTIMIZATION

### Database Level:
1. **Indexes:**
   - `{assignees: 1}`: Fast user task lookup
   - `{workspace: 1}`: Workspace filtering
   - `{status: 1}`: Status-based queries
   - Composite index: `{dueDate: 1, status: 1}` recommended

2. **Query Optimization:**
   - Get workspaceIds trước (single query)
   - Use `$in` operator cho workspace filtering
   - `$or` với 2 conditions thay vì multiple queries

3. **Population:**
   - Select only needed fields
   - Avoid deep population (max 1 level)

### Application Level:
1. **Transform Layer:**
   - Lightweight transformation
   - No additional queries trong transform
   - Cached workspace data

2. **Stats Caching:**
   - Compute stats once, cache for TTL
   - Invalidate on task create/update/delete

3. **Date Range Limits:**
   - Enforce max date range (e.g., 3 months)
   - Prevent full collection scans

---

## INTEGRATION POINTS

### With Task System:
- **Shared Model:** Calendar events là tasks
- **Bidirectional Sync:** Task updates reflect trên calendar
- **Unified API:** Task endpoints cũng work cho calendar

### With Workspace System:
- **Access Control:** Workspace membership determines visibility
- **Filtering:** Calendar filter by workspace
- **Stats:** Workspace-level calendar stats

### With Time Tracking:
- **estimatedHours:** Planning trên calendar
- **loggedHours:** Actual time tracking
- **autoProgress:** Visual progress indicator

---

## SCALABILITY NOTES

**Current Limitations:**
- No pagination cho events (fetch all trong date range)
- Stats computed on-demand (no caching)
- No recurring events support

**Recommended Improvements:**
1. **Pagination:**
   - Limit events per request
   - Lazy load as user scrolls

2. **Caching:**
   - Redis cache for stats (TTL: 5 minutes)
   - Cache invalidation on task mutations
   - Cache workspace IDs per user

3. **Query Optimization:**
   - Composite indexes for common filters
   - Materialized views cho stats

4. **Feature Additions:**
   - Recurring events (cron-like patterns)
   - Event reminders (notifications)
   - Calendar sharing (read-only access)
   - Time blocking (reserve time slots)
   - Meeting integration (external calendars)

---

## SECURITY CONSIDERATIONS

1. **Authorization:**
   - User must be task creator OR assignee
   - Workspace tasks: Check membership
   - Personal tasks: Check creator

2. **Data Filtering:**
   - Users only see own tasks or assigned tasks
   - No cross-user data leakage
   - Workspace permissions enforced

3. **Validation:**
   - dueDate required cho calendar events
   - Date format validation (ISO 8601)
   - Workspace existence check

---

## ERROR HANDLING

**Common Scenarios:**

1. **Missing dueDate:**
   ```javascript
   throw new Error('Calendar events must have a due date');
   ```
   Status: 400 Bad Request

2. **Unauthorized Access:**
   ```javascript
   throw new Error('You are not authorized to access this task');
   ```
   Status: 403 Forbidden

3. **Invalid Workspace:**
   ```javascript
   throw new Error('Workspace not found');
   ```
   Status: 404 Not Found

4. **Invalid Date:**
   ```javascript
   throw new Error('Invalid date format');
   ```
   Status: 400 Bad Request

**Error Response Format:**
```javascript
{
  success: false,
  message: "Error description"
}
```

---

## TESTING CONSIDERATIONS

**Unit Tests:**
- transformToCalendarEvent() accuracy
- Date range filtering logic
- Stats calculation correctness
- Authorization checks

**Integration Tests:**
- Create event → Appears on calendar
- Update task → Calendar reflects change
- Delete task → Removed from calendar
- Drag & drop → Date updates
- Workspace filtering works
- Personal vs workspace tasks separation

**Test Scenarios:**
- Create task without dueDate → Not on calendar
- Create task with dueDate → Appears on calendar
- Update dueDate → Event moves
- Filter by workspace → Correct events
- Filter by date range → Boundary conditions
- Stats calculation → Accurate metrics

---

## MONITORING & OBSERVABILITY

**Current Logging:**
- Console logs trong controller/service (minimal)

**Recommended Additions:**
1. **Metrics:**
   - Calendar load time
   - Events per date range
   - Stats calculation time
   - Most viewed date ranges

2. **Alerts:**
   - Slow queries (>1s)
   - High event counts (>1000 per request)
   - Failed stats calculations

3. **Audit Log:**
   - Event creation timestamps
   - Drag & drop actions
   - Bulk updates

---

## COMPARISON: CALENDAR vs TASK SYSTEM

| Aspect | Task System | Calendar System |
|--------|-------------|-----------------|
| Data Model | Task collection | Same Task collection |
| Required Field | title | title + dueDate |
| Query Filter | All tasks | Tasks với dueDate |
| View Type | List/Board | Time-based grid |
| Sorting | Status/Priority | Date (dueDate) |
| CRUD Endpoint | /api/tasks | /api/calendar/events |
| Transform | Direct | transformToCalendarEvent() |
| Use Case | Task management | Time planning |

---

## CLIENT-SIDE INTEGRATION

**Recommended Calendar Libraries:**
- FullCalendar.js
- React Big Calendar
- Toast UI Calendar

**Event Format Compatible:**
```javascript
{
  id: "event_id",
  title: "Task title",
  start: "2025-12-24T00:00:00Z",
  end: "2025-12-24T23:59:59Z",
  backgroundColor: getPriorityColor(event.priority),
  borderColor: getStatusColor(event.status),
  extendedProps: {
    status, priority, workspace, assignees, progress
  }
}
```

**Drag & Drop Implementation:**
```javascript
// On event drop
const newDate = event.start;
await fetch(`/api/calendar/events/${event.id}/move`, {
  method: 'POST',
  body: JSON.stringify({newDate})
});
```

**Real-time Updates:**
- WebSocket events khi tasks updated
- Refresh calendar view on `task-updated` event
- Optimistic UI updates

---

## SUMMARY

**Luồng Calendar** là một **abstraction layer** trên Task system:
- Không có collection riêng, sử dụng Task model
- Filter tasks theo dueDate để hiển thị trên calendar
- Transform tasks thành calendar event format
- Cung cấp time-based view và operations
- Share authentication, authorization với task system
- Scalable design: Có thể tách thành separate service nếu cần
