# Release Notes - electisSpace v1.1.0

**Version:** 1.1.0  
**Release Date:** December 30, 2025  
**Type:** Feature Release

---

## 🎉 Highlights

This release introduces the **People Manager with Virtual Pool IDs** feature, a major enhancement that enables cross-device synchronization of personnel data through SoluM AIMS integration.

---

## 🆕 New Features

### People Manager with Virtual Pool IDs

Manage people/personnel using ESL tags with full synchronization support across multiple devices.

#### How It Works

1. **Virtual Pool IDs**: When a person is not assigned to a physical space, they receive a Virtual Pool ID (`POOL-0001` to `POOL-9999`)

2. **AIMS Integration**: Pool IDs are stored as article IDs in SoluM AIMS, enabling:
   - Cross-device synchronization
   - Data persistence in the cloud
   - Automatic article reuse

3. **Smart ID Allocation**: When importing new people:
   - System checks AIMS for existing empty POOL articles
   - Reuses available POOL IDs before generating new ones
   - Maintains consistency across devices

#### CSV Import Support

Import personnel from CSV files with the following format:
```csv
ITEM_NAME;ENGLISH_NAME;RANK;TITLE;MEETING_NAME;MEETING_TIME;PARTICIPANTS
ישראל ישראלי;Israel Israeli;סא"ל;מפקד;פגישת צוות;09:00-10:00;8
```

- Semicolon-delimited format
- Full Hebrew text support
- 7-column structure for complete person data

---

## 🔧 Technical Improvements

### Enhanced Virtual Pool Service

```typescript
// New preferred pool ID support
generatePoolIds(
  count: number, 
  existingIds: string[], 
  preferredPoolIds?: string[]
): string[]
```

### AIMS Article Reuse

```typescript
// Fetch empty POOL articles from AIMS
fetchEmptyPoolArticlesFromAims(): Promise<string[]>
```

### Test Infrastructure

- 65 total tests (53 unit, 12 integration)
- Full CSV upload integration tests
- Real Hebrew data testing with 106 names

---

## 📋 Requirements

### System Requirements
- Windows 10/11 (64-bit)
- 4GB RAM minimum
- Internet connection for AIMS sync

### AIMS Configuration
- Valid SoluM AIMS account
- Configured cluster, company, and store codes

---

## 🚀 Upgrade Instructions

### From v1.0.x

1. **Automatic Update**: The app will prompt for update automatically
2. **Manual Update**: Download and run `electisSpace.Setup.1.1.0.exe`

### Post-Update Steps

1. Open Settings
2. Enable People Manager mode
3. Configure AIMS credentials (if not already done)
4. Import personnel CSV or start adding people manually

---

## ⚠️ Known Limitations

- Maximum 9,999 virtual pool entries
- Integration tests require valid AIMS credentials to run
- AIMS sync requires active internet connection

---

## 🐛 Bug Fixes

- Fixed TypeScript type errors in test configurations
- Corrected missing required fields in interface implementations

---

## 📊 Test Coverage

| Category | Tests | Passed | Skipped |
|----------|-------|--------|---------|
| People Features | 65 | 53 | 12 |
| Virtual Pool IDs | 15 | 15 | 0 |
| CSV Import | 10 | 10 | 0 |
| AIMS Integration | 12 | 0 | 12 |

---

## 📞 Support

For issues or questions:
- **Email:** aviv@electis.co.il
- **GitHub Issues:** https://github.com/AvivElectis/electisSpace/issues

---

## 🙏 Acknowledgments

Thank you to all testers and early adopters who helped validate this release.

---

**© 2025 Electis. All rights reserved.**
