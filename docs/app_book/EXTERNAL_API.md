# External API & Integration Spec

> **Specifications for integrating `electisSpace` with external systems.**

## 1. SoluM AIMS API (SoluM Mode)

The application integrates with the SoluM Advanced Information Management System (AIMS).

### Capabilities
- **Authentication**: JWT output.
- **Version**: API v2.
- **Clusters**: Supports 'Common' and 'C1' (EU) clusters.

### Key Endpoints Used
| Operation | Endpoint | Method | Description |
|-----------|----------|--------|-------------|
| **Login** | `/common/api/v2/login/token` | POST | Get Access/Refresh Tokens. |
| **Get Labels** | `/common/api/v2/labels` | GET | List available ESL tags. |
| **Get Articles** | `/common/api/v2/articles/page` | GET | Download current articles. |
| **Push Articles** | `/common/api/v2/articles` | PUT | Create/Update articles. |
| **Delete Articles** | `/common/api/v2/articles` | DELETE | Remove articles. |
| **Assign Label** | `/common/api/v2/labels/assign` | POST | Link Label MAC to Article ID. |

### Article Data Schema
The app maps internal `Space` data to the SoluM `article.data` object.
```json
{
  "articleId": "ROOM-101",
  "articleName": "Meeting Room",
  "data": {
    "customField1": "Value",
    "occupancy": "Occupied"
  }
}
```

---

## 2. SFTP Integration (SFTP Mode)

In SFTP mode, the application acts as a file processor.

### workflow
1.  **Import**: App reads CSV from a designated source (or manual upload).
2.  **Process**: App updates internal state based on CSV.
3.  **Export**: App generates a new CSV and uploads it to the SFTP server.

### CSV Specification
- **Format**: Delimited text (configurable: `;`, `,`, `\t`).
- **Encoding**: UTF-8.
- **Required Columns**:
    - `ID`: Unique identifier.
- **Conference Room Detection**:
    - Any row where ID starts with `C` (case-insensitive) is treated as a Conference Room.
