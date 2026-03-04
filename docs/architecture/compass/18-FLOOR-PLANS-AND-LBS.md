# electisCompass — Floor Plans, Maps & AIMS LBS Integration

**Version:** 1.0
**Date:** 2026-03-04
**Authors:** Aviv Ben Waiss + Claude Opus 4.6
**Status:** Draft
**Key Value:** Visual floor maps with space locations that sync to ESL labels via AIMS LBS, enabling interactive wayfinding on e-ink screens — a capability no competitor offers.

---

## 1. Feature Overview

Floor plans allow admins to:
1. **Upload** floor plan images (PNG/JPG/SVG) for each floor in a building
2. **Place spaces** on the floor plan by dragging them to their physical location (x,y coordinates)
3. **View real-time occupancy** overlaid on the floor plan (available/booked/occupied color coding)
4. **Sync location data to AIMS** so ESL labels at each space can display:
   - Interactive wayfinding arrows
   - Floor/shelf/position metadata (LBS system)
   - Booking status with directional indicators

Compass app employees can:
1. **Browse floors visually** using an interactive map view
2. **Tap a space on the map** to see details and book it
3. **Find friends** by viewing their checked-in locations on the map

---

## 2. AIMS LBS System — Overview & Prerequisites

### 2.0 Critical: LBS Is an Optional Expansion

> **Source:** `LBSMap_Manual_prot.pdf` — AIMS Map Management User Manual

LBS (Location-Based Services) is **not enabled by default** in AIMS. It is an **optional expansion module** that must be:

1. **Activated by SoluM** for the specific AIMS SaaS instance (per customer contract)
2. **Enabled per-store** via the `lbsEnabled: true` flag in the store configuration
3. **Gateway configured** — the AIMS Gateway(s) must have `lbsChannel` configured for BLE beacon communication

**Compass must gracefully handle the case where LBS is not activated.** Floor plans and space placement work independently of AIMS LBS — the AIMS sync is an additional capability layered on top.

### 2.0.1 AIMS Built-in Map Management

AIMS Cloud Dashboard includes a **full Map Management module** (separate from Compass). Key details from the manual:

| AIMS Feature | Description | Compass Relationship |
|---|---|---|
| **Map Design** | CAD-like editor: draw walls (straight/square), doors, floor settings | Compass does NOT replicate this — uses simplified floor plan image upload instead |
| **Components** | Category/Group system: Shelf (W/D/H/Row), custom image components | Compass maps spaces to AIMS shelf IDs, does not manage AIMS components directly |
| **Shelf IDs** | Generated with pattern: Front Part (fixed, 0-3 chars) + Middle Part (none/dot/underscore) + Back Part (counting digits 1-8) | Compass auto-generates shelf IDs matching the configured pattern for the store |
| **Shelf Linking** | Link/unlink shelf IDs to map objects in AIMS Map Design | Compass performs linking via API (`PUT /api/v2/common/labels/update/shelf`), not via AIMS UI |
| **Zones** | Named regions on the map with position, can link shelves to zones | Compass areas/zones map to AIMS zones; shelf-zone linking done via API |
| **Route Management** | Routes between zones with priority ordering, inter-floor connections | Future: Compass could use route data for wayfinding on ESL labels |
| **Search & Analysis** | Label search by location, analytics by zone/shelf | Compass uses `GET /api/v2/common/labels/problemforlbs` for health monitoring |

**Design decision:** Compass provides a **simplified admin experience** (upload floor plan image → drag spaces → auto-sync to AIMS LBS) while the AIMS Cloud Dashboard provides the **full technical map editor** for advanced LBS configuration. Both can coexist — Compass writes shelf/location data via API, AIMS Map Management provides visual editing.

### 2.0.2 Shelf ID Generation Strategy

Based on the AIMS manual, shelf IDs follow a configurable pattern:

```
[Front Part][Middle Part][Back Part]
  │            │            │
  │            │            └── Counting number (1-8 digits, e.g., "001", "002")
  │            └── Separator: none, ".", or "_"
  └── Fixed prefix (0-3 chars, e.g., "C", "D", "ZONE")
```

**Examples:** `C-001`, `D.001`, `ZONE_001`, `A001`

Compass should:
- Store the shelf ID pattern per-store (prefix, separator, digit count)
- Auto-generate shelf IDs when spaces are placed on the floor plan
- Allow admin override of individual shelf IDs
- Validate uniqueness within the store

### 2.1 Store-Level LBS Toggle

```yaml
# From v2AddStore / v2UpdateStore / v2GetStores schemas
lbsEnabled: boolean    # Enable/disable LBS for the entire store
storeConfig:
  location: integer    # Location mode (0 = disabled)
  beaconLossLimit: 10  # Beacon signal loss threshold
```

**Action:** When creating/updating a store in AIMS, set `lbsEnabled: true` and `storeConfig.location: 1` to enable LBS features.

### 2.2 Label Location Data (Shelf Info)

Each label in AIMS carries LBS location metadata:

```yaml
# From label detail response (line 12122-12140)
floor: string          # LBS Floor identifier (e.g., "B1", "F2")
shelfId: string        # LBS Shelf/Zone identifier (e.g., "ZONE-A-12")
shelfFloor: integer    # Position within shelf (vertical position)
order: integer         # Order within shelf floor (horizontal position)
otherLocations: object # Additional location metadata (free-form)
arrow: string          # Arrow direction: UP, DOWN, LEFT, RIGHT
```

### 2.3 Update Label Location — `PUT /api/v2/common/labels/update/shelf`

This is the key endpoint for syncing space locations to ESL labels:

```
PUT /api/v2/common/labels/update/shelf?company={code}&store={store}&updateType=LABELS
```

**Request body** (`shelfInfoUpdateRequest`):
```json
{
  "labelShelfInfo": [
    {
      "updateId": "04507B0AC391",     // Label code (ESL MAC address)
      "floor": "F2",                   // Floor identifier
      "shelfId": "ZONE-A-12",         // Zone/area identifier
      "shelfFloor": 0,                 // Vertical position
      "order": 3                       // Horizontal position / sort order
    }
  ]
}
```

### 2.4 Query Labels by LBS Location — `GET /api/v2/common/labels/problemforlbs`

```
GET /api/v2/common/labels/problemforlbs?company={code}&store={store}&floor=F2&shelfId=ZONE-A-12
```

Returns problem label counts per floor/shelf — useful for monitoring ESL health on floor plans.

### 2.5 Gateway LBS Channel

```yaml
# From v2UpdateGateway schema
lbsChannel: integer    # BLE channel used for LBS beacon communication (e.g., 78)
```

Gateways have dedicated LBS channels for location beacon communication.

---

## 3. Data Model

### 3.1 Floor Plan Entity

```typescript
// server/prisma/schema.prisma additions

model FloorPlan {
  id          String   @id @default(uuid())
  floorId     String   // FK to Floor (from building hierarchy)
  branchId    String   // FK to Store/Branch
  companyId   String   // FK to Company (tenant scoping)

  // Image storage
  imageUrl    String   // Path to stored image (local or S3)
  imageWidth  Int      // Original image width in pixels
  imageHeight Int      // Original image height in pixels
  mimeType    String   // image/png, image/jpeg, image/svg+xml
  fileSize    Int      // File size in bytes

  // Map metadata
  name        String?  // Display name (e.g., "Floor 2 - East Wing")
  scale       Float?   // Optional: pixels per meter for real-world sizing
  rotation    Float    @default(0) // Image rotation in degrees

  // Timestamps
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  company     Company  @relation(fields: [companyId], references: [id])

  // Indexes
  @@unique([floorId, branchId])
  @@index([companyId])
}
```

### 3.2 Space Location (extends existing Space model)

```typescript
// Additional nullable columns on Space model

model Space {
  // ... existing fields ...

  // Floor plan location (nullable — only set when placed on map)
  mapX          Float?    // X coordinate on floor plan (0-1 normalized, percentage of image width)
  mapY          Float?    // Y coordinate on floor plan (0-1 normalized, percentage of image height)
  mapRotation   Float?    // Label/icon rotation on map (degrees)

  // AIMS LBS fields (synced to AIMS when updated)
  lbsFloor      String?   // AIMS floor identifier (e.g., "F2")
  lbsShelfId    String?   // AIMS zone/shelf identifier (e.g., "ZONE-A-12")
  lbsShelfFloor Int?      // AIMS vertical position within shelf
  lbsOrder      Int?      // AIMS horizontal order
  lbsArrow      String?   // Arrow direction for wayfinding: UP, DOWN, LEFT, RIGHT
}
```

**Design decision:** Coordinates are stored as **normalized values (0–1)** representing percentage of the floor plan image dimensions. This makes them resolution-independent — if the floor plan image is replaced with a higher-resolution version, all space positions remain valid.

### 3.3 AIMS LBS Mapping

```
┌─────────────────────────────────────────────────────────────────┐
│                    Compass ←→ AIMS LBS Mapping                   │
├──────────────────────┬──────────────────────────────────────────┤
│ Compass Concept      │ AIMS LBS Field                           │
├──────────────────────┼──────────────────────────────────────────┤
│ Floor name           │ floor (e.g., "F2", "B1")                 │
│ Area / Zone name     │ shelfId (e.g., "ZONE-A", "EAST-WING")   │
│ Space sortOrder      │ order (position within zone)              │
│ Space vertical pos.  │ shelfFloor (0 = ground level)             │
│ Wayfinding direction │ arrow (UP/DOWN/LEFT/RIGHT)                │
│ Label MAC address    │ updateId (label code for shelf update)    │
│ Additional metadata  │ otherLocations (JSON — booking status)    │
└──────────────────────┴──────────────────────────────────────────┘
```

---

## 4. Admin UI — Floor Plan Management

### 4.1 Floor Plan Upload & Editor

```
┌────────────────────────────────────────────────────────────────────┐
│  🗺️ Floor Plans — Building A, Floor 2                    [Upload] │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                                                              │ │
│  │         ┌─────────────────────────────────────┐              │ │
│  │         │          FLOOR PLAN IMAGE           │              │ │
│  │         │                                     │              │ │
│  │         │   [D-201]●    [D-202]●   [D-203]●  │              │ │
│  │         │                                     │              │ │
│  │         │          ┌───────────┐              │              │ │
│  │         │   [D-204]●│ Meeting  │  [D-206]●   │              │ │
│  │         │          │  Room     │              │              │ │
│  │         │   [D-205]●│          │  [D-207]●   │              │ │
│  │         │          └───────────┘              │              │ │
│  │         │                                     │              │ │
│  │         │   [D-208]●    [D-209]●   [D-210]●  │              │ │
│  │         │                                     │              │ │
│  │         └─────────────────────────────────────┘              │ │
│  │                                                              │ │
│  │  Zoom: [−] ████████░░ [+]    Pan: drag background           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────┐                          │
│  │ Unplaced Spaces (drag to map)       │                          │
│  │                                     │                          │
│  │  [D-211]  [D-212]  [D-213]         │                          │
│  └─────────────────────────────────────┘                          │
│                                                                    │
│  Space Details (click to edit):                                    │
│  ┌─────────────────────────────────────┐                          │
│  │ D-201  │ Type: Desk                 │                          │
│  │ Zone:  │ [ZONE-A  ▾]               │                          │
│  │ Arrow: │ [← LEFT  ▾]               │                          │
│  │ LBS:   │ Floor: F2  Order: 1       │                          │
│  │        │ [Sync to AIMS]  [Remove]   │                          │
│  └─────────────────────────────────────┘                          │
│                                                                    │
│  [Save All Positions]  [Sync All to AIMS]  [Reset]                │
└────────────────────────────────────────────────────────────────────┘
```

### 4.2 Real-Time Occupancy Overlay (Admin)

```
┌────────────────────────────────────────────────────────────────┐
│  🗺️ Live Occupancy — Floor 2                    [▾ Floor 2]   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Legend:  🟢 Available  🔵 Booked  🟠 Occupied  ⚫ Excluded   │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                    FLOOR PLAN                            │ │
│  │                                                          │ │
│  │    🟢 D-201      🟠 D-202 (Aviv B.)    🟢 D-203       │ │
│  │                                                          │ │
│  │    🔵 D-204      ┌───────────┐         🟢 D-206       │ │
│  │    (Sarah K.)    │ 🟠 Meeting│         🟢 D-207       │ │
│  │    🟢 D-205      │   Room    │                          │ │
│  │                  └───────────┘                          │ │
│  │                                                          │ │
│  │    ⚫ D-208      🟢 D-209            🔵 D-210         │ │
│  │    (maintenance)                      (John D.)         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Stats: 5 Available │ 2 Booked │ 2 Occupied │ 1 Excluded      │
└────────────────────────────────────────────────────────────────┘
```

### 4.3 Floor Selection & Building Navigation

```
┌──────────────────────────────────────────────────┐
│ Building: [Building A  ▾]                         │
│                                                    │
│ Floors:                                            │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐    │
│  │ Floor 1│ │*Floor 2│ │ Floor 3│ │ Floor 4│    │
│  │ 24/30  │ │ 18/25  │ │ 12/20  │ │ 8/15   │    │
│  │  80%   │ │  72%   │ │  60%   │ │  53%   │    │
│  │ [🗺️]  │ │ [🗺️✓] │ │ [🗺️✓] │ │ [—]    │    │
│  └────────┘ └────────┘ └────────┘ └────────┘    │
│                                                    │
│ 🗺️✓ = Floor plan uploaded                         │
│ [—] = No floor plan                                │
└──────────────────────────────────────────────────┘
```

---

## 5. Compass Employee App — Map View

### 5.1 Find Space Tab — Map Mode

The Find Space tab gets a toggle between **List view** (existing) and **Map view** (new):

```
┌────────────────────────────────────┐
│ Find a Space           [≡ List|🗺️]│
├────────────────────────────────────┤
│                                    │
│ ┌────────────────────────────────┐│
│ │  Floor 2 - Building A          ││
│ │  ┌──────────────────────────┐  ││
│ │  │      FLOOR PLAN          │  ││
│ │  │                          │  ││
│ │  │   🟢    🟢    🟠       │  ││
│ │  │  D-201  D-203  D-202    │  ││
│ │  │                          │  ││
│ │  │   🔵   ┌────┐  🟢      │  ││
│ │  │  D-204 │Meet│  D-206    │  ││
│ │  │        └────┘           │  ││
│ │  │   🟢          🟢       │  ││
│ │  │  D-205        D-207    │  ││
│ │  │                          │  ││
│ │  │   🟢    🟢    🔵       │  ││
│ │  │  D-209  D-208  D-210    │  ││
│ │  └──────────────────────────┘  ││
│ │                                ││
│ │  Pinch to zoom • Tap to book   ││
│ └────────────────────────────────┘│
│                                    │
│ ┌──── Floor Selector ────────────┐│
│ │ [F1] [*F2*] [F3] [F4]         ││
│ └────────────────────────────────┘│
│                                    │
│ 🏠 Home   🔍 Find   📋 Book   👤 │
└────────────────────────────────────┘
```

### 5.2 Space Tap → Booking Bottom Sheet

When tapping a space on the map:

```
┌────────────────────────────────────┐
│                                    │
│  ┌──── Bottom Sheet ─────────────┐│
│  │ D-201 — Desk                   ││
│  │ Floor 2, Zone A                ││
│  │ Status: 🟢 Available           ││
│  │                                ││
│  │ Amenities: Monitor, USB-C      ││
│  │                                ││
│  │ 👥 Friends nearby:             ││
│  │   Aviv B. @ D-202 (2m away)   ││
│  │                                ││
│  │ ┌────────────────────────────┐ ││
│  │ │       [Book This Space]    │ ││
│  │ └────────────────────────────┘ ││
│  └────────────────────────────────┘│
└────────────────────────────────────┘
```

### 5.3 Friends on Map

When "Near Friends" filter is active, show friend avatars on the map:

```
┌──────────────────────────────┐
│       FLOOR PLAN             │
│                              │
│   🟢        [👤 Aviv]       │
│  D-201      🟠 D-202        │
│                              │
│              [👤 Sarah]      │
│   🔵 D-204   🟠 D-206      │
│                              │
└──────────────────────────────┘
```

---

## 6. AIMS LBS Sync Flow

### 6.1 When Spaces Are Placed on Floor Plan

```
Admin places space D-201 on floor plan at (0.25, 0.35)
    │
    ▼
Save to DB: Space.mapX=0.25, mapY=0.35
    │
    ▼
Derive AIMS LBS fields from floor plan context:
    ├── lbsFloor = Floor.aimsFloorCode (e.g., "F2")
    ├── lbsShelfId = Area.aimsZoneCode (e.g., "ZONE-A")
    ├── lbsOrder = Space.sortOrder (or auto-calculated from x position)
    └── lbsArrow = admin-selected or auto-calculated direction
    │
    ▼
Queue AIMS sync job (BullMQ)
    │
    ▼
Call PUT /api/v2/common/labels/update/shelf
    with labelShelfInfo = [{
      updateId: space.labelCode,    // ESL label MAC
      floor: "F2",
      shelfId: "ZONE-A",
      shelfFloor: 0,
      order: 3
    }]
    │
    ▼
AIMS updates label's LBS data
    │
    ▼
Label can now display location-aware content:
    ├── Wayfinding arrows to nearest entrance/exit
    ├── Floor/zone info on the ESL screen
    └── Booking status with directional context
```

### 6.2 When Booking Status Changes

```
Employee checks in at Space D-201
    │
    ▼
BookingService updates booking status → CHECKED_IN
    │
    ▼
Existing AIMS article sync updates label content
    (name, booking status, time, employee name)
    │
    ▼
Label already has LBS data from floor plan placement
    → Arrow/floor/zone info persists on label display
    → Template can use LBS fields for layout decisions
```

### 6.3 Batch Sync — "Sync All to AIMS"

```
Admin clicks "Sync All to AIMS" on floor plan editor
    │
    ▼
Collect all spaces on current floor with labelCode set
    │
    ▼
Build batch payload:
    labelShelfInfo: [
      { updateId: "04507B0AC391", floor: "F2", shelfId: "ZONE-A", shelfFloor: 0, order: 1 },
      { updateId: "0A3B7C8D9E0F", floor: "F2", shelfId: "ZONE-A", shelfFloor: 0, order: 2 },
      { updateId: "1B2C3D4E5F6A", floor: "F2", shelfId: "ZONE-B", shelfFloor: 0, order: 1 },
      ...
    ]
    │
    ▼
Call PUT /api/v2/common/labels/update/shelf (batch)
    │
    ▼
AIMS updates all label locations in one operation
```

---

## 7. API Endpoints

### 7.1 Admin Floor Plan Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v2/admin/compass/floors/:floorId/plan` | Get floor plan for a floor |
| `POST` | `/api/v2/admin/compass/floors/:floorId/plan` | Upload floor plan image (multipart/form-data) |
| `PUT` | `/api/v2/admin/compass/floors/:floorId/plan` | Update floor plan metadata (name, scale, rotation) |
| `DELETE` | `/api/v2/admin/compass/floors/:floorId/plan` | Delete floor plan and all space positions |
| `PUT` | `/api/v2/admin/compass/floors/:floorId/plan/spaces` | Batch update space positions on floor plan |
| `PUT` | `/api/v2/admin/compass/spaces/:spaceId/position` | Update single space position + LBS fields |
| `DELETE` | `/api/v2/admin/compass/spaces/:spaceId/position` | Remove space from floor plan (clear mapX/mapY/LBS) |
| `POST` | `/api/v2/admin/compass/floors/:floorId/sync-lbs` | Sync all space LBS data to AIMS for this floor |
| `POST` | `/api/v2/admin/compass/spaces/:spaceId/sync-lbs` | Sync single space LBS data to AIMS |

### 7.2 Compass App (Employee)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v2/compass/floors/:floorId/map` | Get floor plan image + space positions (read-only) |
| `GET` | `/api/v2/compass/floors/:floorId/occupancy` | Get real-time space status overlay for map |

### 7.3 Request/Response Examples

**Upload floor plan:**
```
POST /api/v2/admin/compass/floors/floor-uuid/plan
Content-Type: multipart/form-data

file: <floor-plan.png>
name: "Floor 2 - East Wing"
scale: 12.5  // pixels per meter (optional)
```

**Batch update space positions:**
```json
PUT /api/v2/admin/compass/floors/floor-uuid/plan/spaces
{
  "spaces": [
    {
      "spaceId": "space-uuid-1",
      "mapX": 0.25,
      "mapY": 0.35,
      "mapRotation": 0,
      "lbsArrow": "LEFT",
      "lbsShelfId": "ZONE-A"
    },
    {
      "spaceId": "space-uuid-2",
      "mapX": 0.50,
      "mapY": 0.35,
      "mapRotation": 0,
      "lbsArrow": "RIGHT",
      "lbsShelfId": "ZONE-A"
    }
  ]
}
```

**Map view response (Compass app):**
```json
GET /api/v2/compass/floors/floor-uuid/map
{
  "floorPlan": {
    "imageUrl": "/uploads/floorplans/floor-uuid.png",
    "imageWidth": 2400,
    "imageHeight": 1600,
    "name": "Floor 2 - East Wing"
  },
  "spaces": [
    {
      "id": "space-uuid-1",
      "number": "D-201",
      "type": "DESK",
      "mapX": 0.25,
      "mapY": 0.35,
      "status": "AVAILABLE",
      "amenities": ["monitor", "usb-c"],
      "currentBooking": null,
      "friendsNearby": []
    },
    {
      "id": "space-uuid-2",
      "number": "D-202",
      "type": "DESK",
      "mapX": 0.50,
      "mapY": 0.35,
      "status": "OCCUPIED",
      "currentBooking": {
        "employeeName": "Aviv B.",
        "checkedInAt": "2026-03-04T09:15:00Z"
      },
      "friendsNearby": [{ "name": "Aviv B.", "spaceNumber": "D-202" }]
    }
  ]
}
```

---

## 8. Server Implementation

### 8.1 Floor Plan Service

```typescript
// server/src/features/compass/floorPlans/floorPlans.service.ts

export class FloorPlanService {

  // Upload floor plan image, store file, create DB record
  async uploadFloorPlan(floorId: string, file: Express.Multer.File, metadata: FloorPlanMetadata): Promise<FloorPlan>;

  // Update space positions (batch) + derive LBS fields
  async updateSpacePositions(floorId: string, positions: SpacePosition[]): Promise<void>;

  // Sync all space LBS data to AIMS for a floor
  async syncFloorToAims(floorId: string, companyId: string): Promise<AimsSyncResult>;

  // Sync single space LBS data to AIMS
  async syncSpaceToAims(spaceId: string, companyId: string): Promise<AimsSyncResult>;

  // Get floor plan with space positions + real-time status
  async getFloorMapWithOccupancy(floorId: string, companyId: string): Promise<FloorMapResponse>;
}
```

### 8.2 AIMS LBS Sync — New Method on SolumService

```typescript
// server/src/shared/infrastructure/services/solumService.ts — new method

/**
 * Update label location/shelf info via AIMS LBS API.
 * PUT /api/v2/common/labels/update/shelf
 */
async updateLabelShelfInfo(
  config: SolumConfig,
  tokens: SolumTokens,
  shelfInfoList: AimsShelfInfoUpdate[]
): Promise<AimsApiResponse> {
  const response = await this.client.put(
    '/api/v2/common/labels/update/shelf',
    { labelShelfInfo: shelfInfoList },
    {
      params: {
        company: config.companyName,
        store: config.storeCode,
        updateType: 'LABELS'
      },
      headers: { Authorization: `Bearer ${tokens.accessToken}` }
    }
  );
  return response.data;
}

// New AIMS type
interface AimsShelfInfoUpdate {
  updateId: string;    // Label code (MAC address)
  floor: string;       // LBS floor identifier
  shelfId: string;     // LBS shelf/zone identifier
  shelfFloor: number;  // Vertical position
  order: number;       // Horizontal order
}
```

### 8.3 Image Storage

Floor plan images are stored on the local filesystem (matching the existing Docker volume approach):

```
/opt/electisSpace/uploads/floorplans/
  {companyId}/
    {floorPlanId}.png
    {floorPlanId}_thumb.png   // 400px wide thumbnail for list views
```

**Docker volume mount** (added to `docker-compose.app.yml`):
```yaml
server:
  volumes:
    - floorplan_uploads:/app/uploads/floorplans

volumes:
  floorplan_uploads:
    name: electisspace-floorplan-uploads
```

**Serve via Nginx** (static file serving for floor plan images):
```nginx
location /uploads/floorplans/ {
    alias /app/uploads/floorplans/;
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

---

## 9. Client Implementation

### 9.1 Map Canvas Component

The floor plan editor and viewer use an **HTML5 Canvas** or **SVG overlay** approach:

```typescript
// Technology choice: react-konva (Canvas) for the editor
//   - Drag-and-drop space placement
//   - Zoom and pan
//   - Performance for 100+ space markers

// For the Compass app map view:
//   - Lighter weight: SVG overlay on <img> with CSS transforms
//   - Touch-friendly: pinch-to-zoom, tap-to-select
//   - Real-time updates via Socket.IO → re-render markers
```

**Dependencies to add:**
- Admin editor: `react-konva` + `konva` (Canvas-based, supports drag-drop)
- Compass app: plain SVG overlay (no extra dependency, lighter bundle)

### 9.2 Admin Editor Component Structure

```
src/features/compass/presentation/
  floorPlans/
    FloorPlanEditor.tsx          ← Main editor with canvas
    FloorPlanUploader.tsx        ← Upload dialog (drag-drop file)
    SpaceMarker.tsx              ← Draggable space icon on canvas
    UnplacedSpacesList.tsx       ← Sidebar list of unplaced spaces
    SpaceDetailPanel.tsx         ← Edit LBS fields for selected space
    FloorSelector.tsx            ← Building → Floor navigation
    OccupancyOverlay.tsx         ← Real-time status color overlay
    LbsSyncButton.tsx            ← "Sync to AIMS" with progress
```

### 9.3 Compass App Map Component Structure

```
compass/src/features/find/presentation/
  MapView.tsx                    ← SVG overlay map with space markers
  MapSpaceMarker.tsx             ← Tappable space dot with status color
  MapFriendMarker.tsx            ← Friend avatar on map
  FloorPicker.tsx                ← Horizontal floor tab bar
```

---

## 10. Real-Time Updates on Map

### 10.1 Socket.IO Events for Map

When a booking status changes, the map view updates in real-time:

```typescript
// Events emitted on /compass namespace
socket.emit('space:statusChanged', {
  floorId: 'floor-uuid',
  spaceId: 'space-uuid',
  status: 'OCCUPIED',           // AVAILABLE | BOOKED | OCCUPIED | MAINTENANCE
  booking: {
    employeeName: 'Aviv B.',
    checkedInAt: '2026-03-04T09:15:00Z'
  }
});

// Client-side handler (MapView.tsx)
socket.on('space:statusChanged', (data) => {
  // Update the specific space marker color without full re-render
  updateSpaceStatus(data.spaceId, data.status, data.booking);
});
```

---

## 11. ESL Label Template Integration

### 11.1 How LBS Data Appears on Labels

With LBS data synced, AIMS label templates can use the location fields:

```
┌─────────────────────────────────────┐
│  ESL Label Display (4.2" e-ink)     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  D-201                      │   │
│  │  Floor 2 • Zone A           │   │  ← lbsFloor + lbsShelfId
│  │                             │   │
│  │  🟢 AVAILABLE               │   │  ← Booking status
│  │                             │   │
│  │  ← EXIT    KITCHEN →       │   │  ← lbsArrow wayfinding
│  │                             │   │
│  │  [QR: Book this space]      │   │  ← NFC/QR to Compass app
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

When booked/occupied:
```
┌─────────────────────────────────────┐
│  ┌─────────────────────────────┐   │
│  │  D-201                      │   │
│  │  Floor 2 • Zone A           │   │
│  │                             │   │
│  │  🟠 OCCUPIED                │   │
│  │  Aviv Ben Waiss             │   │  ← Employee name
│  │  Until 17:00                │   │  ← Booking end time
│  │                             │   │
│  │  ← EXIT    KITCHEN →       │   │  ← Wayfinding persists
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 11.2 AIMS Template Variables

The following template variables become available when LBS is configured:

| Variable | Source | Example |
|----------|--------|---------|
| `{LBS_FLOOR}` | `label.floor` | "F2" |
| `{LBS_SHELF}` | `label.shelfId` | "ZONE-A" |
| `{LBS_ORDER}` | `label.order` | "3" |
| `{LBS_ARROW}` | `label.arrow` | "LEFT" |
| `{SPACE_NUMBER}` | Article data | "D-201" |
| `{BOOKING_STATUS}` | Article data | "AVAILABLE" |
| `{EMPLOYEE_NAME}` | Article data | "Aviv B." |
| `{BOOKING_END}` | Article data | "17:00" |

---

## 12. Wizard Integration

When Compass is enabled in the company wizard, the **Space Configuration** step (P7-04) includes an optional floor plan upload sub-step:

```
Wizard Step 4: Space Configuration
  ├── 4a. Import/assign spaces to buildings
  ├── 4b. Set compass modes, capacity, amenities
  └── 4c. (Optional) Upload floor plans & place spaces on maps
         ├── Upload PNG/JPG for each floor
         ├── Drag spaces onto floor plan
         └── Auto-derive LBS fields from placement
```

This step is optional — spaces work without floor plans, but floor plans unlock:
- Map view in Compass app
- LBS data on ESL labels
- Visual occupancy dashboards

---

## 13. Implementation Considerations

### 13.1 Image Size Limits
- Max upload: **10 MB** per floor plan
- Accepted formats: PNG, JPEG, SVG
- Server generates thumbnail (400px wide) on upload
- Original stored for full-resolution rendering

### 13.2 Performance
- Floor plans cached in browser (7-day expiry, `Cache-Control: public, immutable`)
- Space positions sent as lightweight JSON (no image re-download on position update)
- Canvas editor uses `requestAnimationFrame` for smooth drag-drop
- SVG map view in Compass: only re-render changed markers on Socket.IO events

### 13.3 Offline Support (Compass App)
- Cache last-viewed floor plan image in `@capacitor/filesystem`
- Cache space positions in localStorage
- Show "Last updated: X ago" when offline
- Booking actions queued for sync on reconnect

### 13.4 LBS Sync Error Handling
- If AIMS sync fails, store positions locally, retry on next sync
- Show sync status indicator per floor: ✅ Synced / ⚠️ Pending / ❌ Failed
- Admin can manually trigger re-sync per floor or per space
- Log all AIMS LBS sync attempts in the audit log
