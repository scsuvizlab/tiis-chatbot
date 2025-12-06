# Changelog

All notable changes to the TIIS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Voice input support (Phase 13)
- Real-time multi-device sync (Phase 14)
- AWS migration (Phase 15)

---

## [1.0.0] - TBD

### Added
- Initial release of TIIS platform
- User authentication system (JWT + bcrypt)
- Onboarding conversation flow
- Task conversation system
- Multimodal file upload (images, PDFs)
- Mobile-responsive design
- Admin dashboard
- AI-powered analysis (corporation-wide + individual)
- Data export functionality

### Features
- Auto-save conversations
- Resume conversations from any device
- Task creation and deletion
- File attachment support (10MB max per file)
- User storage quota (25MB per user)
- Password change functionality
- Remember me login option

### Security
- Password hashing with bcrypt
- JWT token authentication
- HTTPS required in production
- Rate limiting on auth endpoints
- File type and size validation
- User data isolation

---

## Version Numbering

**Format:** MAJOR.MINOR.PATCH

- **MAJOR:** Breaking changes, major new features
- **MINOR:** New features, backwards-compatible
- **PATCH:** Bug fixes, minor improvements

**Examples:**
- `1.0.0` - Initial MVP release
- `1.1.0` - Add voice input support
- `1.1.1` - Fix mobile camera upload bug
- `2.0.0` - AWS migration (breaking change in data structure)

---

## Change Categories

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Security improvements

---

## Template for Future Entries

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature description

### Changed
- Changed feature description

### Fixed
- Bug fix description

### Security
- Security improvement description
```

---

**Current Version:** Pre-release (development)  
**Last Updated:** December 2024
