# LUỒNG WORKSPACE (KHÔNG GIAN LÀM VIỆC)

## TỔNG QUAN KIẾN TRÚC

Luồng Workspace quản lý không gian làm việc nhóm trong ứng dụng, bao gồm tạo workspace, quản lý thành viên, phân quyền (owner/admin/member), và theo dõi hoạt động. Hệ thống được xây dựng theo **Role-Based Access Control (RBAC)**, **Multi-member Management**, và **Statistics Tracking**.

## CẤU TRÚC FILE VÀ CHỨC NĂNG

### 1. MODEL LAYER

#### **Workspace.js** (`backend/src/models/Workspace.js`)
**Chức năng:** Schema MongoDB cho workspace với member management và RBAC.

**Đặc điểm kỹ thuật:**
- **Database Engine:** MongoDB với Mongoose ODM
- **Schema Structure:**
  - `name`: String (required, max 100 chars, trimmed)
  - `description`: String (max 500 chars, optional)
  - `owner`: ObjectId reference tới User (required)
  - `members`: Array of embedded documents:
    - `user`: ObjectId reference
    - `role`: Enum ['owner', 'admin', 'member']
    - `joinedAt`: Date timestamp
  - `color`: String hex color (default '#3B82F6', validated regex)
  - `isActive`: Boolean (soft delete flag, default true)
  - `settings`: Embedded document:
    - `isPublic`: Boolean (default false)
    - `allowMemberInvites`: Boolean (default true)
    - `defaultRole`: String (default 'member')
  - `lastActivity`: Date (tracking workspace usage)
  - Timestamps: createdAt, updatedAt (auto)

**Validation:**
- Name: Required, max length 100
- Description: Max length 500
- Color: Regex validation `/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/`
- Owner: Required reference

**Indexing Strategy:**
- **Single Indexes:**
  - `{owner: 1}`: Query workspaces by owner
  - `{'members.user': 1}`: Query by member participation
  - `{isActive: 1}`: Filter active workspaces
  - `{name: 1, owner: 1}`: Composite for workspace lookup
- **Purpose:** Tối ưu member lookups và ownership queries

**Pre-save Middleware:**
- Auto-add owner vào members array với role='owner'
- Check existing owner: Không duplicate nếu đã tồn tại
- Execute on document creation (isNew check)

**Virtual Properties:**
- `memberCount`: Computed từ members.length
  - Minimum 1 (luôn có owner)
  - Accessor: `workspace.memberCount`
  - Available in JSON/Object output

**Schema Methods:**

1. **isMember(userId)**
   - Check xem userId có trong members array không
   - Return: Boolean
   - Usage: Authorization checks

2. **getMemberRole(userId)**
   - Get role của user trong workspace
   - Return: 'owner' | 'admin' | 'member' | null
   - Usage: Permission checks

3. **canManage(userId)**
   - Check xem user có quyền admin/owner không
   - Return: Boolean
   - Usage: Authorization cho management actions

4. **canInvite(userId)**
   - Check quyền invite members
   - Logic: owner/admin HOẶC (member + allowMemberInvites=true)
   - Return: Boolean

**Đặc điểm nổi bật:**
- **Embedded Members:** Không cần join query cho member list
- **Automatic Owner Addition:** Pre-save hook đảm bảo consistency
- **Soft Delete:** isActive flag thay vì hard delete
- **Color Customization:** Hex validation cho UI theming
- **Activity Tracking:** lastActivity cho usage analytics

---

#### **Task.js** (`backend/src/models/Task.js`) - Related Model
**Chức năng:** Tasks thuộc về workspace (workspace-scoped tasks).

**Workspace Integration:**
- `workspace`: ObjectId reference (optional, null cho personal tasks)
- `isPersonal`: Boolean flag
- `assignees`: Array of User ObjectIds
- `createdBy`: User ObjectId

**Điểm quan trọng:**
- Tasks có thể thuộc workspace HOẶC personal
- Tasks kế thừa permissions từ workspace
- Workspace stats aggregate từ tasks

---

### 2. REPOSITORY LAYER

#### **workspaceRepository.js** (`backend/src/repositories/workspaceRepository.js`)
**Chức năng:** Data Access Layer với member management và permission logic.

**Các phương thức chính:**

1. **createWorkspace(workspaceData)**
   - Create Workspace document
   - Pre-save hook tự động add owner vào members
   - Populate owner info
   - **Return:** Populated workspace object

2. **getWorkspacesByUser(userId)**
   - Query workspaces where:
     - userId trong members.user HOẶC owner=userId
     - isActive=true
   - Populate: owner, members.user (selected fields)
   - Sort: lastActivity descending
   - **Return:** Array workspace objects

3. **getAvailableWorkspaces(userId)**
   - Get workspaces user có access:
     - User workspaces (member/owner)
     - Public workspaces (settings.isPublic=true)
   - Aggregate với `$or` conditions
   - Populate members và owner
   - **Return:** Array workspaces

4. **getWorkspaceById(workspaceId)**
   - Find by ID với populate
   - Populate: owner, members.user
   - Select: firstName, lastName, email, avatar
   - **Return:** Full workspace object hoặc null

5. **updateWorkspace(workspaceId, updateData)**
   - Update fields: name, description, color, settings
   - Update lastActivity timestamp
   - Validate: không update owner hoặc members trực tiếp
   - **Return:** Updated workspace

6. **deleteWorkspace(workspaceId)**
   - Soft delete: set isActive=false
   - Không xóa khỏi database
   - **Reason:** Preserve data integrity, audit trail

7. **addMember(workspaceId, userId, role='member')**
   - Check duplicate: userId đã tồn tại chưa
   - Push vào members array:
     ```javascript
     {user: userId, role: role, joinedAt: new Date()}
     ```
   - Update lastActivity
   - Populate và return workspace

8. **removeMember(workspaceId, memberId)**
   - Pull member khỏi members array
   - Validate: không remove owner
   - Update lastActivity
   - **Return:** Updated workspace

9. **updateMemberRole(workspaceId, memberId, newRole)**
   - Find member trong members array
   - Update role field
   - Validate: không change owner role
   - Limit: Chỉ 1 owner per workspace
   - **Return:** Updated workspace

10. **searchMembers(workspaceId, searchTerm)**
    - Get workspace members
    - Filter by search term (firstName, lastName, email)
    - Case-insensitive regex matching
    - **Return:** Filtered member array

11. **getWorkspaceStats(workspaceId)**
    - Aggregate statistics:
      - Total members count
      - Task counts by status (todo, in-progress, done)
      - Task counts by priority (low, medium, high)
      - Recent activity timestamp
    - Query Task model với workspace filter
    - **Return:** Stats object

**Đặc điểm nổi bật:**
- **Population Strategy:** Always populate cho UI rendering
- **Soft Delete Pattern:** Preserve historical data
- **Activity Tracking:** Update lastActivity on modifications
- **Permission Validation:** Logic kiểm tra roles trước operations

---

### 3. CONTROLLER LAYER

#### **workspaceController.js** (`backend/src/controllers/workspaceController.js`)
**Chức năng:** HTTP Request Handler với RBAC enforcement và validation.

**Các endpoint handlers:**

1. **POST /** - createWorkspace()
   - **Validation:** validateWorkspace() helper
   - **Body:** name, description, color, settings
   - **Default Values:**
     - color: '#3B82F6'
     - settings.isPublic: false
     - settings.allowMemberInvites: true
   - Owner: req.user._id
   - Call repository.createWorkspace()
   - Response: 201 với workspace object

2. **GET /** - getMyWorkspaces()
   - **Query Param:** `includePublic` (boolean)
   - Logic:
     - If includePublic=true: getAvailableWorkspaces()
     - Else: getWorkspacesByUser()
   - Response: Array workspaces

3. **GET /:workspaceId** - getWorkspace()
   - Get workspace by ID
   - **Authorization Check:**
     - User phải là owner HOẶC member
     - Logic: `isOwner || workspace.isMember(userId)`
   - Response: 200 workspace object
   - Error: 403 nếu unauthorized, 404 nếu not found

4. **PUT /:workspaceId** - updateWorkspace()
   - **Body:** name, description, color, settings
   - **Authorization:** Chỉ owner hoặc admin
   - **Validation:** validateWorkspaceUpdate()
   - Update fields: name, description, color, settings
   - Không update owner hoặc members
   - Response: 200 updated workspace
   - Error: 403 nếu không có quyền

5. **DELETE /:workspaceId** - deleteWorkspace()
   - **Authorization:** Chỉ owner
   - Soft delete: repository.deleteWorkspace()
   - **Side Effects:** Tasks vẫn tồn tại (orphaned)
   - Response: 200 confirmation
   - Error: 403 nếu không phải owner

6. **POST /:workspaceId/members** - addMember()
   - **Body:** userId (user để add), role (optional)
   - **Validation:** validateAddMember()
   - **Authorization:** workspace.canInvite(req.user._id)
   - **Logic:**
     - Owner/admin: Add với bất kỳ role
     - Member: Chỉ add nếu allowMemberInvites=true
   - Default role: settings.defaultRole
   - Response: 200 updated workspace
   - Error: 400 nếu user đã là member, 403 nếu không có quyền

7. **DELETE /:workspaceId/members/:memberId** - removeMember()
   - **Authorization:** Owner hoặc admin
   - **Validation:** Không remove owner
   - Repository: removeMember()
   - Response: 200 confirmation
   - Error: 400 nếu trying remove owner, 403 nếu unauthorized

8. **PUT /:workspaceId/members/:memberId/role** - updateMemberRole()
   - **Body:** role ('member' | 'admin')
   - **Validation:** validateUpdateMemberRole()
   - **Authorization:** Chỉ owner
   - **Restrictions:**
     - Không change owner role
     - Chỉ 1 owner per workspace
   - Repository: updateMemberRole()
   - Response: 200 updated workspace
   - Error: 403 nếu không phải owner

9. **POST /:workspaceId/join** - joinWorkspace()
   - User tự join public workspace
   - **Validation:** workspace.settings.isPublic=true
   - **Check:** User chưa là member
   - Add với default role
   - Response: 200 workspace
   - Error: 400 nếu private hoặc đã là member

10. **POST /:workspaceId/leave** - leaveWorkspace()
    - User tự rời workspace
    - **Validation:** User phải là member, không phải owner
    - Repository: removeMember(userId)
    - Response: 200 confirmation
    - Error: 400 nếu owner trying leave

11. **GET /:workspaceId/members/search** - searchMembers()
    - **Query Param:** q (search term)
    - Search members trong workspace
    - Filter: firstName, lastName, email
    - Response: Array member objects

12. **GET /:workspaceId/stats** - getWorkspaceStats()
    - **Authorization:** User phải là member
    - Repository: getWorkspaceStats()
    - **Stats Include:**
      - memberCount
      - taskCounts: {todo, inProgress, done, total}
      - priorityCounts: {low, medium, high}
      - lastActivity timestamp
    - Response: Stats object

**Đặc điểm kỹ thuật:**
- **Middleware:** authenticateToken global
- **Validation Helpers:** Joi schema validation
  - validateWorkspace: name, description, color, settings
  - validateWorkspaceUpdate: optional fields
  - validateAddMember: userId, role
  - validateUpdateMemberRole: role enum
- **Authorization Pattern:**
  - Get workspace → Check role → Execute action
  - Consistent error responses (403 Forbidden)
- **Logging:** Console.log debug info cho permission checks

---

### 4. VALIDATION LAYER

#### **utils/validation.js** (Validation Helpers)
**Chức năng:** Joi schema validation cho workspace operations.

**Validation Schemas:**

1. **validateWorkspace(data)**
   - Required: name (string, min 1, max 100)
   - Optional: description (string, max 500)
   - Optional: color (string, hex pattern)
   - Optional: settings (object)
     - isPublic: boolean
     - allowMemberInvites: boolean
     - defaultRole: enum

2. **validateWorkspaceUpdate(data)**
   - All fields optional (partial update)
   - Same constraints as create

3. **validateAddMember(data)**
   - Required: userId (string, valid ObjectId)
   - Optional: role (enum: member, admin)

4. **validateUpdateMemberRole(data)**
   - Required: role (enum: member, admin)
   - Note: 'owner' không allowed (business rule)

**Error Response Format:**
```javascript
{
  success: false,
  message: error.details[0].message
}
```

---

### 5. ROUTING LAYER

#### **workspaceRoutes.js** (`backend/src/routes/workspaceRoutes.js`)
**Chức năng:** API Endpoint Definition với route ordering optimization.

**Route Configuration:**
```
POST   /api/workspaces/
GET    /api/workspaces/
GET    /api/workspaces/:workspaceId/members/search (specific route first)
POST   /api/workspaces/:workspaceId/members
POST   /api/workspaces/:workspaceId/join
POST   /api/workspaces/:workspaceId/leave
DELETE /api/workspaces/:workspaceId/members/:memberId
PUT    /api/workspaces/:workspaceId/members/:memberId/role
GET    /api/workspaces/:workspaceId/stats (specific route first)
GET    /api/workspaces/:workspaceId (generic route last)
PUT    /api/workspaces/:workspaceId
DELETE /api/workspaces/:workspaceId
```

**Route Ordering:**
- **Critical:** Specific routes (`/members/search`, `/stats`) TRƯỚC generic `/:workspaceId`
- **Reason:** Avoid route parameter collision
- Comment trong code: "must be before /:workspaceId to avoid conflicts"

**Middleware:**
- Global: `router.use(authenticateToken)`

---

## ROLE-BASED ACCESS CONTROL (RBAC)

### Role Hierarchy:

**Owner:**
- Full control
- Create/delete workspace
- Add/remove members (including admins)
- Change member roles
- Update workspace settings
- Cannot leave workspace
- Cannot be removed
- Only 1 owner per workspace

**Admin:**
- Add/remove members (not admins/owner)
- Update workspace metadata
- Manage tasks
- Cannot change member roles
- Cannot delete workspace
- Can leave workspace

**Member:**
- View workspace
- Create/manage own tasks
- Invite members (if allowMemberInvites=true)
- Can leave workspace
- No admin privileges

### Permission Matrix:

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Create Workspace | ✅ | ✅ | ✅ |
| Delete Workspace | ✅ | ❌ | ❌ |
| Update Settings | ✅ | ✅ | ❌ |
| Add Member | ✅ | ✅ | 🔶* |
| Remove Member | ✅ | ✅** | ❌ |
| Change Role | ✅ | ❌ | ❌ |
| Leave Workspace | ❌ | ✅ | ✅ |
| View Stats | ✅ | ✅ | ✅ |

*Member chỉ nếu allowMemberInvites=true  
**Admin không remove được owner/admin khác

---

## DATA FLOW DIAGRAM

```
HTTP Request (với JWT)
    ↓
[authenticateToken] → Verify & attach req.user
    ↓
[workspaceRoutes] → Route matching (order matters!)
    ↓
[workspaceController]
    ├→ Validate input (Joi schemas)
    ├→ Get workspace from repository
    ├→ Check authorization (isMember, canManage, etc.)
    └→ Execute action
    ↓
[workspaceRepository]
    ├→ Query MongoDB
    ├→ Populate references (owner, members.user)
    ├→ Update lastActivity
    └→ Return populated data
    ↓
[MongoDB]
    ├→ Execute with indexes
    ├→ Pre-save hooks (auto-add owner)
    └→ Return documents
    ↓
[workspaceController]
    └→ Format response (success/error)
    ↓
HTTP Response (JSON)
```

---

## WORKSPACE LIFECYCLE

### Creation Flow:
```
User POST /api/workspaces/ {name, description}
    ↓
Controller validates input
    ↓
Repository creates Workspace document
    ↓
Pre-save hook adds owner to members array
    ↓
Workspace saved with 1 member (owner)
    ↓
Response: 201 workspace object
```

### Member Addition Flow:
```
Admin/Owner POST /members {userId, role}
    ↓
Authorization check (canInvite)
    ↓
Repository checks duplicate
    ↓
Push to members array
    ↓
Update lastActivity
    ↓
Response: 200 updated workspace
```

### Soft Delete Flow:
```
Owner DELETE /:workspaceId
    ↓
Authorization check (owner only)
    ↓
Repository sets isActive=false
    ↓
Workspace hidden from queries
    ↓
Tasks remain (orphaned but accessible)
    ↓
Response: 200 confirmation
```

---

## STATISTICS TRACKING

### getWorkspaceStats() Aggregation:

**Data Sources:**
- Workspace model: memberCount, lastActivity
- Task model: tasks filtered by workspaceId

**Computed Metrics:**
1. **Member Count:** members.length
2. **Task Counts:**
   - Total tasks
   - By status: todo, in-progress, done
   - By priority: low, medium, high
3. **Activity:**
   - Last activity timestamp
   - Active members (based on task creation)

**Aggregation Pipeline:**
```javascript
[
  {$match: {workspace: workspaceId}},
  {$group: {
    _id: '$status',
    count: {$sum: 1}
  }},
  {$group: {
    _id: '$priority',
    count: {$sum: 1}
  }}
]
```

**Response Format:**
```javascript
{
  memberCount: 5,
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
  lastActivity: "2025-12-24T10:30:00Z"
}
```

---

## PERFORMANCE OPTIMIZATION

### Database Level:
1. **Index Strategy:**
   - `{'members.user': 1}`: Fast member lookups
   - `{owner: 1}`: Owner queries
   - `{name: 1, owner: 1}`: Workspace lookup
2. **Populate Optimization:** Select chỉ fields cần thiết
3. **Embedded Members:** Không cần join query

### Application Level:
1. **Soft Delete:** Không cascade delete tasks
2. **Virtual Properties:** memberCount computed on-demand
3. **Activity Tracking:** Single timestamp thay vì event log

### Query Level:
1. **$or Queries:** Combine owner và member checks
2. **Aggregation:** Stats computed server-side
3. **Lean Queries:** Sử dụng `.lean()` cho read-only

---

## SECURITY CONSIDERATIONS

1. **Authorization Enforcement:**
   - Every action checks permissions
   - Repository methods không enforce (controller responsibility)
   - Fail-safe: Deny by default

2. **Owner Protection:**
   - Cannot remove owner
   - Cannot change owner role
   - Owner cannot leave
   - Only 1 owner per workspace

3. **Data Validation:**
   - Joi schemas cho input
   - Mongoose validators cho schema
   - Color hex regex validation

4. **Soft Delete:**
   - Preserve audit trail
   - Prevent data loss
   - Allow workspace restoration

---

## ERROR HANDLING

**Common Scenarios:**

1. **403 Forbidden:**
   - User không phải member
   - Insufficient role permissions
   - Trying to modify owner

2. **400 Bad Request:**
   - Invalid input (Joi validation)
   - Duplicate member addition
   - Owner trying to leave

3. **404 Not Found:**
   - Workspace không tồn tại
   - Workspace isActive=false

**Error Response Format:**
```javascript
{
  success: false,
  message: "Descriptive error message"
}
```

**Logging:**
- Permission check failures
- Duplicate operations
- Authorization denials

---

## INTEGRATION POINTS

### With Task System:
- Tasks reference workspace via ObjectId
- Task permissions inherit from workspace
- Stats aggregate task data
- Orphaned tasks remain after workspace delete

### With User System:
- Owner và members reference User collection
- Population cho user info
- Authentication via JWT

### Future Integrations:
- Document management (per workspace)
- Group chat (workspace-scoped)
- Calendar (workspace events)
- Activity feed (workspace timeline)

---

## SCALABILITY NOTES

**Current Limitations:**
- Members embedded (large teams may hit document size limit)
- No pagination cho member list
- Stats computed on-demand (no caching)

**Recommended Improvements:**
- Separate Members collection for large workspaces
- Pagination cho member list và workspace list
- Redis caching cho stats
- Background job cho activity tracking
- Workspace templates
- Member invitations via email
- Workspace archival (move old workspaces)

---

## TESTING CONSIDERATIONS

**Unit Tests:**
- Model validation
- Repository methods
- Authorization logic
- Virtual properties

**Integration Tests:**
- Full CRUD flows
- Permission enforcement
- Member management
- Stats calculation

**Test Scenarios:**
- Create workspace → Auto-add owner
- Add member → Duplicate check
- Update role → Owner protection
- Delete workspace → Soft delete
- Leave workspace → Owner cannot leave
- Public workspace → Join flow
- Stats → Accurate aggregation

---

## MONITORING & OBSERVABILITY

**Current Logging:**
- Permission check details
- Debug info cho authorization
- Error stack traces

**Recommended Additions:**
- Workspace usage metrics
- Member activity tracking
- Role change audit log
- Performance metrics (query times)
- Workspace growth trends
- Most active workspaces
- Member invitation conversion rate
